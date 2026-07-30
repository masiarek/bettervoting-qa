# BetterVoting — preliminary results: integration points & proposed solution

Investigation of `Equal-Vote/bettervoting` for the three linked work items:
**#1350** (disclaimer), **#1353** (public audit vs. immutability), **BV230** (toggle change back and forth).

Repo investigated: `/Volumes/T7/Voting/BetterVoting/BV/bettervoting`
Read-only. Nothing was modified. Date: 2026-07-29.

---

## 0. READ THIS FIRST — four upstream facts that change the work

These were verified directly against a fresh `git fetch origin`. The detailed map in §2 onward was
produced against the local checkout (`feature/clean-json-export`, HEAD `516fbd69`, branched Jun 17),
which is **98 commits behind** upstream `main` (`8d2b3f9a`, Jul 29). Line numbers below can be off by
a few; the architecture is unchanged. Where the two disagree, this section wins.

**(1) BV230 is very likely already fixed — two days ago.**
[`7cbc6079`](https://github.com/Equal-Vote/bettervoting/commit/7cbc6079) (Jul 27, PR #1459,
`JacksonLoper/stalesettings`) — *"Refresh election after setPublicResults / setOpenState"*. Its commit
message is the BV230 repro verbatim: *"toggle 'Show Preliminary Results', navigate to another admin
page, come back, and the switch has reverted to its old value even though the backend was updated. A
reload fixes it."* Cause: `setPublicResults` bypasses `updateElection`, the only thing that folds a
change into the election context; `enqueueWrite` reads only `update_date` off the response, so the
context keeps the pre-write value until the next GET, and the optimistic toggle masks it until
re-mount. **The backend was persisting the change the whole time; the UI was lying.**
Not an ancestor of the local branch — verified with `git merge-base --is-ancestor`.
→ *Re-run the repro against `main` before filing anything.*

**(2) The #1350 article is already written, and linked from nowhere.**
`docs/help/preliminary_results.md` is on `origin/main` (front matter `nav_order: 8`). It already covers
every substantive requirement in the issue: what a live tally exposes, that admins always see who
voted, delta-analysis de-anonymization (`:26`), the editable-ballot interaction, and that turning the
setting off does not un-reveal (`:44-50`). Verified: the only `preliminary_results` hits under
`packages/` on `main` are the i18n label key and its one consumer. **#1350 is a linking + copy task,
not a writing task.**

**(3) #1353 Option A is already built, in an open PR.**
`origin/JacksonLoper/publicaudit` (PR #1365) — 12 files, +912/−14, **no migration**. Its query at
`getElectionHistoryController.ts:230-234` is
`selectFrom('electionDB').where('election_id','=',id).select(['state','settings','update_date']).orderBy('update_date','asc')`
— no head filter, explicit column allow-list. Emits six event types including
`preliminary_results_change`, `voter_revealed`, and state changes — all three sensitive actions Arend
named. Adds 29 i18n keys and a 299-line backend test. Tip `9129ea42` is *main merged into the branch*
today at 12:26 EDT, i.e. open and actively kept current, **not merged**.
**Option A is a review, not a build.**

**(4) The sentence BV230's "Expected results" rests on does not exist in the product.**
The BPML doc highlights *"(Administrators can make results public at any time)"*. That string is in no
locale file on `main`. It survives only on branches dating to Feb 2025 — removed copy. The live tip is
the long `public_results` text at `en.yaml:738-742`. The one live "at any time" in the repo is
`docs/help/preliminary_results.md:46`, and it is about turning results **off**. Your screenshot shows
both tooltip bodies because the two images were captured at different times.
→ *No shipped promise contradicts locking the toggle, which makes §6 easier to settle.*

---

## 1. What's on disk

One boolean, `public_results?: boolean` (`packages/shared/src/domain_model/ElectionSettings.ts:33`),
does all the work. It is set to `true` by the wizard
(`packages/frontend/src/components/ElectionForm/Wizard/Wizard.tsx:54`) — and the wizard exposes no
control for it, so the creator is never shown the choice (a grep across the whole `ElectionForm/` tree
yields that single line, while `is_public: false` is set deliberately two lines earlier at
`Wizard.tsx:35`). Three backend gates read it: results tabulation
(`getElectionResultsController.ts:24-31`), admin ballot list
(`getBallotsByElectionIDController.ts:15-38`), and the *anonymous* raw cast-vote-record endpoint
(`getAnonymizedBallotsByElectionIDController.ts:17-31`). Exactly one endpoint writes it —
`POST /Election/:id/setPublicResults` (`packages/backend/src/Routes/elections.routes.ts:548`) — gated
on `permissions.canEditElectionState = [system_admin, owner]`
(`packages/shared/src/domain_model/permissions.ts:25`, note the `admin` role is excluded) with **no
election-state guard whatsoever** (`setPublicResultsController.ts:14-33`, 37 lines total,
`election.state` never referenced). Every election write goes through `ElectionsDB.updateElection`
(`Models/Elections.ts:60-92`), which is append-only: flip the old `head=true` row to false under an
optimistic-concurrency check on `expected_update_date`, then INSERT a new full row.

---

## 2. The integration-point map

### Frontend — voter-facing

| Surface | path:line | Role | Item |
|---|---|---|---|
| Ballot page banner slot | `packages/frontend/src/components/Election/Voting/VotePage.tsx:259-265` | Already stacks `<DraftWarning/>` + `<ElectionStateWarning state="archived">` above the ballot. **The insertion point for A.** | A |
| Submit-confirm modal | `.../Voting/VotePage.tsx:330-376` (`DialogTitle` :333, `DialogContentText` :336) | The *actual* last-chance-before-cast surface; only its Submit button POSTs | A |
| Reusable banner component | `.../Election/ElectionStateWarning.tsx:6-24` | `{state?, title, description, hideIcon?, children}`; `state` optional so it can render unconditionally; **calls `t(title)`/`t(description)` with no values object** (:17,:19) | A |
| Generic ballot renderer | `.../Voting/GenericBallotView/GenericBallotView.tsx:48-49,123-135` | In-ballot external-link precedent: `<Link href={learnLink} target='_blank'>` | A (rejected placement) |
| Draggable IRV renderer | `.../Voting/DraggableIRVBallotView.tsx:106-155` | **Bypasses GenericBallotView entirely**; no footer, no learn-more. Anything added to the ballot *view* misses draggable RCV | A trap |
| Voter landing page | `.../Election/ElectionHome.tsx:86,101,126` | Three separate `public_results === true` gates rendering a results link | A |
| Post-submit page | `.../Voting/Thanks.tsx:38` | Where the voter is first *shown* preliminary results — i.e. too late for #1350 | A |
| Ballot receipt page | `.../Voting/VerifyBallot.tsx:32` | **Not** a pre-submit screen: `/{id}/ballot/:ballot_id`, needs a persisted ballot | — |
| Results page | `.../Results/ViewElectionResults.tsx:19` (fetch gate), `:38-41` (PRELIMINARY vs OFFICIAL title), `:47-52` (hardcoded English fallback), `:81-92` (export), `:96-107` (ShareButton) | Only voter surface that says "preliminary". ShareButton is gated on `voter_access !== "closed"` — **not** on `public_results` | A, B |
| Public CSV/JSON export | `.../Results/BallotDataExport.tsx:46` | `ballot_id` is column 1 of the public export | A, privacy |
| Analytics | `packages/frontend/index.html:44-57` (Matomo, `trackPageView` in `<head>`), `:92` (Freshworks) | Loads on `/vote` and `/results`. `setExcludedQueryParams` (:47) covers query strings only, **not path segments** | privacy |
| Crawlers | `packages/frontend/public/robots.txt:2-3` | `User-agent: *` / `Disallow:` — allow everything; no `noindex` anywhere in the repo | A |

### Frontend — admin-facing

| Surface | path:line | Role | Item |
|---|---|---|---|
| The toggle | `.../Election/Admin/ElectionSettings.tsx:52-62` (`useSetPublicResults` + `useOptimisticToggle` + `enqueueWrite`), `:106-111` (`SwitchSetting`, no `disabled` prop) | Only entry point. Label flips `election_settings.public_results` ↔ `preliminary_results` on state (:108) | A, C |
| Fieldset disable | `.../Admin/ElectionSettings.tsx:69` `<FormControl disabled={election.state !== 'draft'}>` | Does **not** reach this switch — MUI 9 resolves the child's explicit `disabled={false}` first (`FormControlLabel.js:142`, `internal/SwitchBase.js:156-159`; default set at `components/util.tsx:383`). Ruled out as BV230's cause | C |
| Sibling switches | `.../Admin/ElectionSettings.tsx:27,31,102-105` — `isDisabled = disabled ?? (election.state !== 'draft' && !availableDuringElection)` | The pre-existing "editable after draft" idiom; `availableDuringElection` is currently used by nobody | C |
| Helper-text slot | `components/util.tsx:383,393,416-420` | `FormHelperText` renders **only when `disabled`** — no slot for a warning on an enabled switch | privacy warning |
| Optimistic toggle | `hooks/useOptimisticToggle.ts:23-32` | Reverts local value on falsy commit; **no try/catch** around `await commit()` | C |
| OCC token | `components/ElectionContextProvider.tsx:68-72` (advance from GET), `:74-100` (`enqueueWrite`, sends `latestUpdateDate.current`) | The single source of `expected_update_date` | C |
| API hook / error surface | `hooks/useAPI.ts:102-104`; `hooks/useFetch.ts:39-41` | Error text is `Error making request: {status}: {server detail}` — enough to distinguish 401/400/409 from the snackbar alone | C |
| Finalize | `.../Admin/PublishAndShare.tsx:46-47` `await enqueueWrite(... finalize ...); await fetchElection();` | The `fetchElection()` is what re-syncs the token after finalize | C |
| Admin nav | `.../Election/Sidebar.tsx:27` (Settings), `:29` `{ label: isDraft ? 'Preview Results' : 'Live Results', path: /${id}/results }`, `:86` "Proceed to …" | Funnels the admin to the live tally as a workflow step; **hardcoded English literals, not `t()` keys** | B, C |
| Settings route | `.../Admin/Admin.tsx:37` | No state or permission gate on the route (contrast `PublishAndShare.tsx:36`, which bails on `canEditElectionState`) | C |
| Duplicate election | `.../Admin/AdminHome.tsx:49-53` | `structuredClone` resets only title/frontend_url/owner_id/state — `settings.public_results` carries over into the new draft | A |
| CVR upload | `.../UploadElections.tsx:73,81-82` | Spreads `makeDefaultElection().settings`, i.e. inherits `public_results: true` | A |
| Voter roll UI | `.../Admin/EditElectionRoll.tsx:157` (`Has Voted: …`), `:96-119` (copy voting URL), `:122-133` (reveal snackbar "Action has been logged"), `:275-291` (Action/Actor/Timestamp table) | The "admins see who voted" premise, verbatim; the only history UI in the app | A, B |

### Backend

| Surface | path:line | Role | Item |
|---|---|---|---|
| Write endpoint | `Controllers/Election/setPublicResultsController.ts:14-33` | `expectPermission(canEditElectionState)` → type check → assign → `expectUpdateDate` → `updateElection(..., 'Publish Results', ...)`. No state guard | A, B, C |
| Results gate | `Controllers/Election/getElectionResultsController.ts:24-31` | Flag off + state `open` → `Forbidden` **before any permission check**, so even the owner cannot see a live tally; other states fall through to `canViewPreliminaryResults` | A, B |
| Anonymous CVR | `Controllers/Ballot/getAnonymizedBallotsByElectionIDController.ts:17-31` | Flag on ⇒ **no permission check, no state check**; returns `{ballot_id, election_id, precinct, votes}` per ballot to anonymous callers, in any state including draft | A |
| Admin ballot list | `Controllers/Ballot/getBallotsByElectionIDController.ts:15-38` | Permission first, then `!public_results && state !== 'closed'` → 401; response scrubbed + `secureShuffle`d | A |
| Unguarded per-ballot read | `Controllers/Ballot/getBallotByBallotIDController.ts:10-41` | No `expectPermission`, no flag check, no state check | privacy |
| Write-in names | `Controllers/Ballot/getWriteInNamesController.ts:16-18` | `canViewBallots` only — returns ballot *content* mid-election with the flag off | B |
| The one immutability guard | `Controllers/Election/editElectionController.ts:24-27` | `state !== 'draft' && public_archive_id === null` → `BadRequest("Election is not editable")`. Reads the **client-supplied** `req.body.Election.state` | B, C |
| Auto state transition | `Controllers/Election/elections.controllers.ts:120-172` (invoked at `:74`) | Runs on **every** `:id` request incl. POSTs (`Routes/elections.routes.ts:845-847`); performs its own `updateElection` at `:158`, minting a new `update_date` mid-request | C, B |
| Finalize | `Controllers/Election/finalizeElectionController.ts:20-52` | Copies `settings` through untouched; rejects non-draft | C |
| Other state writes | `setOpenStateController.ts:24-33`, `archiveElectionController.ts:20-27`, `editElectionRolesController.ts:19-22` (guard **commented out**, `// TODO: should this only be allowed in draft??`), `setWriteInResultsController.ts:85-89` | No state guards; the last one reads `expected_update_date` **server-side** — the in-repo precedent for de-risking C | B, C |
| Shared guards | `Controllers/controllerUtils.ts:42-46` (`expectPermission` → 401), `:50-57` (`expectUpdateDate` → 400), `:65-76` (`secureShuffle`, defeats *order* correlation only) | | B, C |
| Append-only store | `Models/Elections.ts:60-92`; `head = true` filters at `:102,120,131,146,167,178,194,211,228,263`; `reason` at `:46,60,270,289` — signatures only, never persisted | The audit substrate, and its gap | B |
| Voter-ID reveal | `Controllers/Roll/revealVoterIdController.ts:34-37` (mode gate **before** permission), `:39`, `:62-69` (`action_type: '🚨 VOTER_ID_REVEALED'` + actor + timestamp) | The one sensitive action already durably audited | B |
| Roll read | `Controllers/Roll/getElectionRollController.ts:28-52` (`sanitizeHistory` keeps `timestamp` and `submit`/`update`), `:108-110` (refuses open elections), `:140-156` (`ballot_id`/`ip_hash` scrubbed **unconditionally**; `voter_id` deleted only when `invitation === 'email'`) | The timing index behind delta analysis | A |
| Ballot cast | `Controllers/Ballot/castVoteController.ts:76-93` (**reuses `ballot_id` across edits**, :86), `:100-112` (roll history + `roll.ballot_id`), `:275-279` (scrubs `ballot_id` from the response "to prevent voters from creating receipts (vote buying/coercion)") | A, privacy |
| Email | `Services/Email/EmailTemplates.ts:69` (vote URL = `/{eid}/id/{voter_id}`), `:91-92` (`/{eid}/ballot/{ballot_id}`, `/{eid}/id/{voter_id}`) | Earliest voter surface; also the analytics leak vector | A, privacy |
| SSR meta injection | `app.ts:61-79` + `Util.ts:63-68,82-83,91-111` | Unauthenticated `getElectionByID` per page URL; title/description into OG tags, title + first 5 candidate names into an `ik.imagekit.io` URL | privacy |

### Shared + DB

| Surface | path:line | Role | Item |
|---|---|---|---|
| The flag | `shared/src/domain_model/ElectionSettings.ts:33` | `public_results?: boolean` | all |
| Edit-vote flag | `.../ElectionSettings.ts:32` | `ballot_updates?: boolean` (label "Allow Voters To Edit Vote") | A, C |
| Compatibility rule | `.../ElectionSettings.ts:44-56`, enforced at `:103` via `electionValidation` ← `Models/Elections.ts:62` | `ballot_updates` requires `voter_access != 'open'` **and** `invitation == 'email'` | A, C |
| Access modes | `.../VoterAuthenticationMode.ts:23-30` (`MODE_SHAPES`), `:53` (throws on non-canonical) | Only `closed_admin_managed_ids` and `closed_bv_managed_ids` carry `voter_access: 'closed'`; only the latter has `invitation: 'email'` | A |
| Permissions | `.../permissions.ts:8,12,19,25,27` | `canEditElectionState` excludes `admin`; `canViewPreliminaryResults` is a misnomer (unreachable for a live open election) | C |
| Versioning | `Migrations/2024_01_29_pkeys_and_heads.ts:57-59`; `Migrations/2026_04_27_unique_head.ts:4-9` | pkey `(election_id, update_date)` + unique partial index on `head` | B |
| Roll audit shape | `.../ElectionRoll.ts:11,15,37` | `ballot_id` persists the voter→ballot link; `history: ElectionRollAction[]` = `{action_type, actor, timestamp}` | A, B |
| ID entropy | `shared/src/utils/makeID.ts:7,36-38` | Election id = 6 chars from a 24-symbol alphabet via `Math.random()` (~1.9e8 keyspace); no rate limiting anywhere in the backend | privacy |
| Artifacts | `.gitignore:6` (`**/dist`), `:18` (`swagger.json`) | **Both untracked** — `git ls-files` confirms. Nothing generated gets committed | mechanics |

### i18n / docs

| Surface | path:line | Role | Item |
|---|---|---|---|
| The tip to rewrite | `frontend/src/i18n/en.yaml:737-742` | `tips.public_results` — verbatim the #1350 As-Is text, as a `\|` block with `{{election}}`/`{{elections}}` | A |
| The two labels | `en.yaml:1167` `preliminary_results: Show Preliminary Results !tip(public_results)`, `:1169` `public_results: Make Results Public !tip(public_results)` | **One tip serves both**; `ElectionSettings.tsx:108` swaps them by state | A |
| Edit-vote label | `en.yaml:1165` `ballot_updates: Allow Voters To Edit Vote !tip(ballot_updates)`; tip at `:733-735` titled "Allow Voters To Update Ballot" | Label/tip title disagree | A |
| Dead keys | `en.yaml:209` `results.admin_results_toggle` (grep: definition only); `en.yaml:689` `disabled_msgs.ballot_updates_when_open` (no consumer) | Traps for a copy pass | A |
| Translated key | `en.yaml:211` / `es.yaml:189` / `pt-BR.yaml:181` / `pl.yaml:179` (still English) | The only preliminary-results string in the other locales | A |
| Link precedents | `en.yaml:701-703` (markdown link in a tip description), `en.yaml:793` (`learn_link: https://equal.vote/pr`) | Proof a tip can carry a link | A |
| Renderer | `components/util.tsx:25-27` (`rLink`/`rBold`/`rTip`), `:235` (**`target={v['newWindow'] ? '_blank' : '_self'}`**), `:240-246` (`**bold**` → `<i>`, i.e. italic), `:258-262`, `:269-272` | | A |
| Tip component | `components/styles.tsx:27,33` | `learn_link` auto-renders a hardcoded-English `Learn More` anchor with `target='_blank'` | A |
| Priority bands | `en.yaml:2,374,429,557,692,844` | PRIORITY 0 = core voting path (translators' scope); `tips:` is PRIORITY 4, `election_settings:` is PRIORITY 99 | A |
| The article | `docs/help/preliminary_results.md` (front matter `nav_order: 8`); key claims at `:26`, `:44-50` | **Already written, already on `origin/main`, linked from nowhere in `packages/`** | A |
| Second doc | `docs/other_tools/google_forms.md:99` | Instructs users to verify a test ballot via "the preliminary election results" | B |

### Tests

| Surface | path:line | Role |
|---|---|---|
| All existing `public_results` references | `backend/src/test/exportFormat.test.ts:37` (inert — `buildElectionExport` never reads it), `backend/src/test/writeIns.test.ts:45`, `testing/tests/election-with-rolls.spec.ts:120`, `testing/tests/election-without-rolls.spec.ts:109` | **Four inert fixture literals. Zero tests call the endpoint.** |
| OCC test pattern to copy | `backend/src/test/editElection.test.ts:117-157` | 200 / 409-on-stale / 400-on-missing against `/edit` |
| Finalize scaffolding | `backend/src/test/finalizeElection.test.ts:18-49`; `TestHelper.ts:107-118` | Note `finalizeElection.test.ts:19-20` mutates a shared fixture in place |
| Mock store blocker | `backend/src/Models/__mocks__/Elections.ts:30-35` | Overwrites in place, keeps **no** versions — an audit-history test cannot pass against it as written |
| Only settings-toggle spec | `testing/tests/full-runthrough.spec.ts:51-57` | Toggles a setting **while still draft** — which is exactly why BV230 was never caught |
| CI | `.github/workflows/node.js.yml`, `end-to-end-tests.yml` | Both trigger on `main` only; no frontend test suite, no lint in CI |

---

## 3. Work item A — #1350 disclaimer

**The article does not need writing** (see §0.2). A grep for `preliminary_results` across `packages/`
returns only the label key (`en.yaml:1167`) and its consumer (`ElectionSettings.tsx:108`). #1350 is a
**linking + copy** task.

**Can the tip renderer carry a link? Yes — but the anchor target is the blocker, not the capability.**
`util.tsx:25` defines `rLink = /\[([^\]]*?)\]\(([^)]*?)\)/` and the pipeline at `:269-272` applies
links *before* tips, so both coexist in one value; `en.yaml:703` already ships a markdown link inside
`tips.random_tie_order.description`. The problem is `util.tsx:235`:
`target={v['newWindow'] ? '_blank' : '_self'}` — same-tab by default. `ElectionStateWarning.tsx:17,19`
calls `t(title)`/`t(description)` with **no values object**, so it cannot pass `newWindow`. On the
ballot that would navigate away and destroy the in-progress ballot (`VotePage`'s `pages` array is
React state with no draft persistence). **Decision: never express the ballot-side link as markdown in
an i18n value.** Use an explicit `<Link target='_blank' rel='noreferrer'>` in
`ElectionStateWarning`'s `children` slot (`:20`), copying `GenericBallotView.tsx:130-134`.

### File-by-file

**1. `packages/frontend/src/i18n/en.yaml:737-742` — the copy edit.**

Old:
```yaml
  public_results:
    title: Public Results
    description: |
      Allows voters to see the results of the {{election}}.
      If enabled while voting is open then voters will be shown to the preliminary results after completing their ballot.
      High profile {{elections}} will usually keep the results hidden, and then reveal them after the {{election}} is closed.
```

New:
```yaml
  public_results:
    title: Public Results
    description: >
      Controls whether voters can see {{election}} results.
      When enabled during an open {{election}}, voters will see preliminary results after submitting their {{ballot}}.
      High-profile {{elections}} typically keep results hidden until the {{election}} closes.
    learn_link: https://docs.bettervoting.com/help/preliminary_results.html
```

Three deliberate deviations from the issue's literal Should-be text, each defensible in review:
**(a) keep the `{{election}}`/`{{elections}}` templates and add `{{ballot}}`** — the issue quotes the
*rendered* string; pasting it verbatim hard-codes "election" and regresses poll terminology for every
poll. **(b) `|` → `>`** — the Should-be is one paragraph, and `applyLineBreaks`
(`util.tsx:258-262`) turns the `|` block's newlines into three `<br/>`-separated lines.
**(c) add `learn_link`** — one line, zero TypeScript, gets the admin-side article link for free via
`styles.tsx:33`, precedent at `en.yaml:793`. Note the description must read sensibly under *both*
labels (`en.yaml:1167` "Show Preliminary Results" and `:1169` "Make Results Public"), since they share
this one tip. `es/pl/pt-BR` carry no `tips:` block at all, so this is en-only; `tips:` is PRIORITY 4
(`en.yaml:692`) so it creates no translator obligation.

Also delete the dead `en.yaml:209 results.admin_results_toggle` in the same pass — it is the third
`!tip(public_results)` call site, reads exactly like "the results-page toggle help text", and has no
consumer.

**2. New `packages/frontend/src/components/Election/PreliminaryResultsNotice.tsx`.** Modelled on
`TemporaryAccessWarning.tsx` (the precedent for a notice with no `state` prop that computes its own
visibility and puts an action element in `children`). Wraps `ElectionStateWarning`. Gate:
`election.settings.public_results === true` **and** `election.state === 'open' || election.state === 'draft'`.
The state condition matters: `public_results` does two jobs, and after close the flag means "final
results published", which carries none of the live-tally risk — the codebase already recognises the
split at `ElectionSettings.tsx:108` and `ViewElectionResults.tsx:38-41`.

**3. `VotePage.tsx:265` — the chosen insertion point.** Immediately after the existing
`<ElectionStateWarning state="archived">` block and before `<BallotContext.Provider>`. This is the only
spot that (i) is above the ballot on every race page, (ii) renders once rather than once per race,
(iii) covers **`DraggableIRVBallotView`**, which bypasses `GenericBallotView` entirely
(`.../DraggableIRVBallotView.tsx:106-155` re-implements its own instructions block with no footer), and
(iv) is unambiguously pre-submission. Placing it in the ballot footer is the rejected alternative for
exactly reason (iii). `VotePage` reads `precinctFilteredElection`, which spreads the whole election, so
`settings` is in hand.

**4. `VotePage.tsx:336` — one sentence inside the submit Dialog**, above the receipt-email
`TextField`. The banner is scrollable-past; the modal is the only surface the voter must actively
confirm, which is what "transparent BEFORE they cast" actually demands. Keep it to one sentence — the
dialog already lists every race and score.

**5. The closed-list extra warning — predicate: `election.settings.voter_access === 'closed'`.** Not
`getVoterAuthenticationMode()`, which **throws** on any non-canonical settings shape
(`VoterAuthenticationMode.ts:53`) and would crash a ballot render for a legacy row. The raw check is
exactly equivalent here: `MODE_SHAPES` (`:23-30`) shows only `closed_admin_managed_ids` and
`closed_bv_managed_ids` carry `voter_access: 'closed'`, and `'registration'` is declared
(`ElectionSettings.ts:22`) but matches no canonical shape. Every voter-facing screen already
hand-rolls it this way (`Thanks.tsx:60`, `ViewElectionResults.tsx:96`).

**What the closed-list copy may and may not say.** It may say: admins see *which voters have cast a
ballot* — that is a first-class feature, rendered per voter at `EditElectionRoll.tsx:157`, and it is
true equally in **both** closed modes. It may say: combined with a live tally, timing inference can
reveal how a particular person voted. It must **not** say admins can look up a voter's ballot:
`ballot_id` is scrubbed from every roll response unconditionally
(`getElectionRollController.ts:141-156` sets `ballot_id: undefined` for every roll; only `voter_id`
deletion is mode-conditional), and the voter→ballot join primitive `getBallotByVoterID`
(`Models/Ballots.ts:121-137`) is called from exactly one place — `castVoteController.ts:78`, the
edit-vote path — never from an admin endpoint. The redaction asymmetry between the two closed modes
concerns the ability to *act as* a voter, not to *read* their ballot.

**6. Optional, lower priority:** the article link beside `results.preliminary_title` on
`ViewElectionResults.tsx:38-41` (the one place the word already appears, and where the audit-log link
will also want to live), beside the two `election_home.or_view_results` buttons
(`ElectionHome.tsx:86,101`), and one sentence in `EmailTemplates.ts:46-74` `Invites` —
chronologically the *first* voter surface for closed lists, though English-only by construction
(backend templates have no i18n) and defeatable because the flag can flip after invites go out.

**One correction the article itself needs.** `docs/help/preliminary_results.md:26` states "BetterVoting
hides the link between a voter and their specific ballot." That is true of the API and false of the
deployment: Matomo runs on every route (`index.html:44-57`) and the voter's credential and their
ballot id are both **path** segments (`EmailTemplates.ts:69` → `/{eid}/id/{voter_id}`; `:91` →
`/{eid}/ballot/{ballot_id}`; route at `Election.tsx:45`), so one analytics visitor profile joins the
two. `setExcludedQueryParams` (`index.html:47`) covers query strings only. Shipping a first-ever
privacy notice on the ballot while that line stands unqualified is the kind of thing that gets quoted
back at the project.

**7. New PRIORITY 0 i18n keys** (`preliminary_results_notice:` block with `title`, `description`,
`closed_list_title`, `closed_list_description`, `link_text`, `article_url`, plus a
`ballot.dialog_warning*` pair). This is the one part of A that lands in PRIORITY 0 and therefore
creates real translator work for es/pl/pt-BR. `fallbackLng: 'en'` (`i18n/i18n.ts`) makes untranslated
keys render English rather than a raw key, and `pl.yaml:179` already ships untranslated English in this
very block — so English-first is precedented, but a privacy disclaimer in English for a Spanish voter
is a worse look than ordinary UI copy. Avoid `**…**` in the new copy: `util.tsx:244` renders it as
`<i>`, not bold.

**8. Playwright.** Both `election-with-rolls.spec.ts:120` and `election-without-rolls.spec.ts:109`
create elections with `public_results: true`, so both will start rendering the new notice and the new
dialog text. Expect selector churn; add one positive and one negative assertion.

---

## 4. Work item B — #1353

### Verdict on Arend's premise: two-thirds right, and the right two-thirds are the headline

**WHAT changed and WHEN is already on disk, completely, with no migration needed.** `electionDB` has
been append-only since `Migrations/2024_01_29_pkeys_and_heads.ts:57-59` (pkey
`(election_id, update_date)`), with a unique partial index guaranteeing one head row per election
(`Migrations/2026_04_27_unique_head.ts:4-9`). `Models/Elections.ts:73-88` never UPDATEs a payload — it
flips `head=false` and INSERTs a new row carrying the entire `settings` JSON. Nothing prunes: the only
`deleteFrom` calls are `Elections.ts:270-277` and `:289-296`, both whole-election. So every historical
value of `public_results` exists as a timestamped row.

**WHO and WHY are not recoverable at any price.** `updateElection` takes a `reason: string` and
discards it — `grep -n reason packages/backend/src/Models/Elections.ts` returns exactly four hits
(`:46,60,270,289`), all signatures, no function body, no insert, no log. Every call site passes
something useful (`setPublicResultsController.ts:25` → `` `Publish Results` ``;
`finalizeElectionController.ts:52` → `` `Finalizing election` ``). There is no actor column. Somebody
built the audit-log interface and never connected the wire.

**And there is no read path.** All eleven `head` references in `Models/Elections.ts` outside the write
are `.where('head', '=', true)` (`:102,120,131,146,167,178,194,211,228,263`). No
`getElectionVersions`, no history route.

### What Option A costs

**No migration, no new table.** New: one model method that omits the head filter, one controller, one
route + `@swagger` JSDoc block, one frontend page + route + `useAPI` hook, one i18n block. That's it —
and the load-bearing design constraint is that the endpoint must project an **explicit allow-list**,
never `selectAll()`: superseded election rows carry `auth_key`, `claim_key_hash`, and
`admin_ids`/`audit_ids`/`credential_ids` (email addresses), and `removeHiddenFields` is applied only on
the single-election read path (`elections.controllers.ts:193-197`).

**Which is exactly what already exists upstream** — see §0.3. **Option A is not a build; it is a
review.** Two nits for that review: the i18n block was inserted at `en.yaml:18`, inside PRIORITY 0,
which is the wrong band for an audit page; and a `GET /Election/:id/history` routed through
`electionsRouter.param('id')` (`Routes/elections.routes.ts:845-847`) will itself trigger
`updateElectionStateIfNeeded`, so **reading the audit log can append to the audit log** — assert that
two consecutive GETs return the same entry count.

The one thing Option A cannot honestly show is who acted. If that is wanted, it is two nullable varchar
columns (`update_reason`, `updated_by`) on `electionDB` plus two lines in `updateElection` — a
migration, a shared-model change, and pre-migration rows that must render as "unknown (pre-audit)"
rather than implying nobody acted. The cleaner alternative is a purpose-built `electionEventsDB` copied
structurally from `Migrations/2026_03_19_email_events.ts` (the only existing event table, and the only
one that correctly uses `timestamptz` — `update_date` is a `varchar` holding a ms-epoch string).

Arend's second metric — how many times the reveal flow was used — is computable today with no new
writes, by counting `'🚨 VOTER_ID_REVEALED'` entries (`revealVoterIdController.ts:62-69`).
**Publish an integer, never a list:** a per-voter reveal timeline combined with `roll.submitted` is
itself de-anonymizing, and `getRollsByElectionID` is permission-gated and refuses open elections
outright for that reason.

### What Option B costs

Mechanically trivial — one state guard in `setPublicResultsController.ts:17`, mirroring
`editElectionController.ts:24-27`, keyed off `req.election.state` (not `req.body`, the mistake the
existing guard makes). Substantively expensive: it is the direct negation of BV230, it invalidates
`docs/help/preliminary_results.md:46,50` in print, and it does not actually close the hole — an
election finalized with `public_results: true` still leaks the live tally *and* the full raw CVR
(`getAnonymizedBallots…:17-31`, no permission check) for its entire duration.

Also worth knowing: the predicate cannot be `state === 'finalized'`. `updateElectionStateIfNeeded`
(`elections.controllers.ts:129-144`) promotes finalized→open on the very next request when there is no
`start_time`, so "finalized" is nearly a phantom state. The only workable predicate is
`state !== 'draft'`.

### Recommendation

**Option A, via review of `origin/JacksonLoper/publicaudit` (PR #1365), actor-less for now**, with the
page stating plainly that the acting admin is not recorded. Ship it behind a beta flag as Arend asked:
one line in `flagDefinitions` (`components/FeatureFlagContextProvider.tsx:39-54`) plus
`flags.isSet('ELECTION_HISTORY')` at the route and the results-page link — copying the existing
`ELECTION_ROLES` nav pattern at `Sidebar.tsx`. **No `SharedConfig` `FF_` entry is needed**: `isSet`
falls back to `sharedConfig['FF_'+name] === 'true'`, and an absent key is `undefined !== 'true'` ⇒
false — three existing flags (`PR_CONTROLS`, both `FORCE_DISABLE_*`) have no `FF_` entry. So the flag
is frontend-only and needs no shared rebuild. Gate only the frontend route and link, not the endpoint —
no route in `elections.routes.ts` is flag-gated today and inventing that pattern for this is scope
creep, though it does mean the endpoint stays reachable by direct URL during beta.

Note one hard gap for testing: `Models/__mocks__/Elections.ts:30-35` overwrites in place and keeps no
versions, so an audit-history jest test cannot pass until the mock appends versions and head-filters
its reads — and that mock backs *every* backend test.

---

## 5. Work item C — BV230

### What is ruled out, from code

- **Not a backend state guard.** `setPublicResultsController.ts:14-33` never references
  `election.state`. The backend already does what the help text promises.
- **Not the disabled toggle.** `ElectionSettings.tsx:69`'s
  `<FormControl disabled={election.state !== 'draft'}>` looks like the smoking gun and is not: MUI 9
  resolves `disabledProp ?? control.props.disabled ?? muiFormControl?.disabled`
  (`FormControlLabel.js:142`) and `if (typeof disabled === 'undefined') disabled = muiFormControl.disabled`
  (`internal/SwitchBase.js:156-159`), while `SwitchSetting` passes an explicit `disabled=false` default
  (`components/util.tsx:383,393`). The `component="fieldset"` does not emit a native
  `<fieldset disabled>` either — `FormControl` destructures `disabled` out and spreads only `...other`.
  **The switch is live in all five states.** Anyone who "fixes" line 69 fixes the wrong thing.

### The most likely cause — confirmed upstream

See §0.1. `7cbc6079` is the stale-context bug and its description matches the repro exactly.

### The historical cause, also provable

Before `da5122f2` (Arend Peter, 2026-04-20, "Use dedicated API hook for public_results toggle and
remove open state UI"; confirmed an ancestor of the local HEAD), the toggle was
`<ElectionSwitchSetting settingKey="public_results" … availableDuringElection />`.
`availableDuringElection` kept it clickable after finalize (`ElectionSettings.tsx:31`), and its
`defaultOnToggle` (`:30`) routes through `updateElection` → `POST /Election/:id/edit` →
`editElectionController.ts:24-27` → **400 `"Election is not editable"`**. That is BV230's symptom
exactly: toggle looks live, click fails. If the reporter tested a build predating 2026-04-20, this is
the whole answer and the issue closes as fixed.

### Three remaining live candidates if it still reproduces on `main`

The mechanism most agents converged on — `updateElectionStateIfNeeded` consuming the client's OCC token
inside the POST — is real code but does **not** close for the plain repro. Every link verified: it runs
from `electionPostAuthMiddleware` (`elections.controllers.ts:74`) on every `:id` route
(`Routes/elections.routes.ts:845-847`); on a transition it writes at `:158`; `Models/Elections.ts:74-83`
throws `Conflict('Concurrent write detected, please try again')` when the head-row update matches zero
rows; `expectUpdateDate` reads the **client-supplied** `req.body.expected_update_date`
(`controllerUtils.ts:52`). But `PublishAndShare.tsx:46-47` does
`await enqueueWrite(… finalize …); await fetchElection();` — that GET performs the finalized→open
transition itself and returns the post-transition row, and `ElectionContextProvider.tsx:68-72` advances
`latestUpdateDate` from it. So the plain create→finalize→toggle path should present a fresh token and
succeed.

The 409 **is** deterministic for a *scheduled* election: finalize while `start_time` is still future
(state stays `finalized`, client caches that version), then toggle at or after `start_time` with no
intervening GET — `ElectionContextProvider`'s fetch effect keys on `[id]`, so in-election route changes
do not refetch. It is also reachable via `sendEmailController.ts:134-136`, which bumps
`email_campaign_count` using the *server's* version and returns no election, while
`ViewElectionRolls.tsx:54-68` fires it outside `enqueueWrite` and never refreshes — and
`PublishAndShare.tsx:59-61` navigates the admin straight to `/admin/voters` after finalizing an email
election.

Candidate 2: **role.** `canEditElectionState = [system_admin, owner]` (`permissions.ts:25`) excludes
`admin`, yet `ElectionSettings.tsx` has no permission check and the Settings route/nav are ungated
(`Admin.tsx:37`, `Sidebar.tsx:27`). A co-admin gets 401 on this one switch while every other setting
works for them in draft, and `useOptimisticToggle.ts:26-31` reverts silently. This presents
*identically* to the 409 and is the cheapest thing to check first.

Candidate 3: **whole-election revalidation.** `updateElection` runs `electionValidation(election)` over
the entire object (`Models/Elections.ts:62`), which reaches `settingsCompatiblityValidation`
(`ElectionSettings.ts:44-56`). Any row carrying an invalid `ballot_updates` combination — creatable
before that check existed — makes **every** election write fail with a 400 whose message is about
ballot updates and never mentions results. Permanently bricked, maximally confusing.

### The repro to run, and what to instrument

**Against `main`, not this branch.** Create an election with preliminary results OFF, as the **owner**,
with **no** `start_time`/`end_time`, finalize via Publish & Share, go to `/{id}/admin/settings`, flip
the switch, then navigate away and back. With the network tab open, capture the
`POST /API/Election/:id/setPublicResults` status and `error` body. `useFetch.ts:39-41` embeds both in
the snackbar verbatim, so even a screenshot decides it:
- `409 Concurrent write detected, please try again` → OCC
- `401 Does not have permission` → role
- `400 expected_update_date is required` or ballot-updates text → validation
- **200, but the switch reverts after navigating away** → `7cbc6079`, already fixed on `main`

Then repeat with a `start_time` set 5 minutes out, and repeat as a co-admin.

### The fix, whichever candidate lands

Give `setPublicResults` a server-side version read instead of the client token, following
`setWriteInResultsController.ts:85-89` and `claimElectionController.ts:34-38`, both of which re-read
the election and use `election.update_date` with an explanatory comment. `public_results` is a single
boolean with no read-modify-write of client state, so it does not need cross-client conflict detection
— and the *stale-branch* form of this controller (pre-`de0dc930`) did exactly that, so the change is a
revert-in-spirit rather than a novelty. Add the permission gate to `ElectionSettings.tsx:107-111`
(hide or disable with `disabledMessage` unless `canEditElectionState`) so a co-admin is not shown a
switch that always 401s. Add try/catch to `useOptimisticToggle.ts:23-32` so a thrown commit reverts
instead of leaving the UI silently disagreeing with the DB. And add the two tests that do not exist: a
backend test that finalizes then POSTs true and false expecting 200 both times, and a Playwright spec
that finalizes then flips the switch and asserts it survives a reload (`full-runthrough.spec.ts:51-57`
has the `aria-pressed` settle-point idiom).

---

## 6. The conflict that has to be resolved first

C says the toggle must work after finalize. B Option B says it must not. And the sentence BV230 leans
on — "Administrators can make results public at any time" — **does not exist in the product** (§0.4).
A grep across `packages/frontend/src/i18n/*.yaml` and `docs/help/*.md` for "at any time" returns one
hit, `docs/help/preliminary_results.md:46`, and it is about turning the setting **off**. So the bug
report's "Expected" is grounded in a document, not in shipped copy.

The two directions are not the same risk, and that asymmetry is the resolution.

**Turning results ON after finalize** makes the election *more* transparent to everyone
simultaneously. It is a visible, one-way act: `docs/help/preliminary_results.md:48` already tells
voters that revealing cannot be undone, and the repo makes that literally true — CSV/JSON export
(`BallotDataExport.tsx:46`), print styling (`ViewElectionResults.tsx:34`), one-click social share
(`:96-107`), and an `Disallow:`-empty `robots.txt` all ensure a revealed tally persists outside the
app. Nobody gains a *private* advantage from it. It is also the direction the product defaults to
(`Wizard.tsx:54`).

**Turning results OFF after having them on** is the move that creates a private information
asymmetry: peek, then hide. Combine it with the roll's exact per-voter submit timestamps
(`castVoteController.ts:106-110`, preserved through `sanitizeHistory`) and it is the
screenshot-before-and-after monitoring vector the BPML doc describes. That is the risk #1353 Option B
actually names, and it is *entirely* in the ON→OFF direction.

**Recommendation: a one-way ratchet, plus the audit log.** After `state !== 'draft'`, permit
`false → true` and forbid `true → false`. This satisfies BV230's literal repro (create INACTIVE →
finalize → set ACTIVE), blocks the peek-then-hide vector, and keeps
`docs/help/preliminary_results.md:50` ("turning preliminary results **on** mid-election — is also
possible") true while requiring `:46` ("can turn it off at any time") to be narrowed to draft. If the
ratchet is judged too clever, then the fallback is: fix C as written (fully bidirectional) and treat
Option A's audit log as a **hard prerequisite** rather than a parallel feature — because with a
bidirectional toggle the audit log is the only thing that makes a peek observable at all. Do not ship
Option B as written; it forbids the harmless direction to stop the harmful one.

Whichever way it goes, `docs/help/preliminary_results.md:46-50` moves in the same PR as the code.
`docs/` ships to docs.bettervoting.com from `main` independently of the frontend deploy, so a doc that
contradicts the product can stay live indefinitely.

---

## 7. The privacy analysis nobody wrote down

Three structural facts first, because they reframe the hazard.

**(i) Preliminary results publish every ballot, not a tally.** With the flag on,
`getAnonymizedBallotsByElectionIDController.ts:17-31` applies **no permission check and no state
check** — the complete cast-vote record, `{ballot_id, election_id, precinct, votes}` per ballot, is
readable by anonymous callers in any state, including draft, which is the wizard default. No rate
limiting exists anywhere in the backend, and the only credential is a 6-character id from a 24-symbol
alphabet generated with `Math.random()` (`shared/src/utils/makeID.ts:7,36-38`).

**(ii) `ballot_id` is stable across edits and it is published.** `castVoteController.ts:86` reuses the
prior `ballot_id` on an update, and `BallotDataExport.tsx:46` makes it column 1 of the public CSV. So
with edit-vote on, an observer does not diff aggregates — they watch one row's scores change. That is
strictly stronger than the delta attack the help article describes, and it sits awkwardly beside
`castVoteController.ts:275-279`, which scrubs `ballot_id` from the cast response *specifically* "to
prevent voters from creating receipts (vote buying/coercion)" — while `EmailTemplates.ts:91` emails the
voter that same id.

**(iii) `secureShuffle` does not defend against this.** `controllerUtils.ts:65-76` randomizes order
*within* one response (its comment says so: to stop zipping against roll timestamps). It does nothing
about fetching twice and diffing. Do not let a reviewer see it and conclude the threat is handled.

**And edit-vote implies closed list.** `settingsCompatiblityValidation` (`ElectionSettings.ts:44-56`,
enforced on every write via `:103`) rejects `ballot_updates` unless `voter_access != 'open'` **and**
`invitation == 'email'`; the only `MODE_SHAPES` entry with `invitation: 'email'` is
`closed_bv_managed_ids` (`VoterAuthenticationMode.ts:29`). So `ballot_updates: true` is legal in
exactly 1 of 6 canonical modes, and that mode is always a closed list. #1350's "extra closed-list
layer" and BV230's edit-vote cross-reference are the same population, not two independent axes.

### Hazard table

Edits require `state === 'open'`; the public tally is served in draft/open/closed; `finalized` has no
ballots (finalize deletes them); `archived` accepts none. So the hazard lives in `open` (plus `draft`
for test ballots).

| # | public_results | edit-vote | access | electorate | state | Risk | Warning |
|---|---|---|---|---|---|---|---|
| 1 | OFF | any | any | any | any | **Safe.** `getElectionResultsController.ts:25-28` Forbids everyone during open, incl. the owner; `getAnonymizedBallots` 401s | none |
| 2 | ON | OFF | open | large | open | **Low.** No per-voter list to attribute deltas to | voter disclosure (base) |
| 3 | ON | OFF | open | **small** | open | **Moderate.** Any ballot cast in a quiet window is fully revealed by the delta; the attacker just needs to arrange the timing out-of-band. *Small electorates are hazardous independent of edit-vote* | voter disclosure (base) |
| 4 | ON | OFF | **closed** | any | open | **High.** Roll gives `Has Voted` per named voter (`EditElectionRoll.tsx:157`) + exact timestamped `submit` history (`castVoteController.ts:106-110`); public tally gives the delta. One shot per voter, no cooperation needed. This is `preliminary_results.md:26` verbatim | **admin-time warning** + voter closed-list layer |
| 5 | ON | **ON** | closed (only legal combo) | any | open | **Highest.** Adds (a) repeatability — each edit is a fresh confirming sample; (b) *manufactured* quiet windows — `sendEmailController.ts:33` `target: 'single'` is a built-in nudge-one-voter button, so the attacker schedules the window instead of waiting; (c) a stable pseudonymous key per (ii), so no aggregate arithmetic is needed | **admin-time warning, strongest** + voter layer |
| 6 | flipped ON mid-election | any | any | any | open | **High.** No state guard, so flipping at time *t* exposes the whole accumulated tally at once and retroactively validates every prior nudge | audit log (B) — copy alone cannot cover this |
| 7 | ON | ON | closed | any | closed | Residual. Edits refused (`castVoteController.ts:245`), but the full CVR with stable `ballot_id`s stays publicly downloadable | none new |

**Admin-time warning** (rows 4, 5) belongs in `ElectionSettings.tsx:103-111`, the only screen where
both switches are visible together, fired on `election.settings.ballot_updates && publicResults` and
escalated for closed lists. The helper-text slot exists but only renders when disabled
(`components/util.tsx:416-420`), so this needs either a `warningMessage` prop on `SwitchSettingProps`
(`util.tsx:375-381`) or a sibling `ElectionStateWarning`. **Do not block the combination** —
`preliminary_results.md:42` states the maintainers' position: "BetterVoting will let you enable both,
but you should do so deliberately." While there, wire up the dead
`en.yaml:689 disabled_msgs.ballot_updates_when_open` so the email-list-only rule stops surfacing only
as a server 400.

**Voter-time disclosure** (rows 2–5) is the `VotePage` notice from §3. Row 6 is the case copy cannot
fix, and it is the strongest argument for landing B before or alongside A: a disclaimer that implies
the setting is fixed is a false promise while `setPublicResults` has no state guard. The disclaimer
should say the setting *can* change mid-election and point at the audit log.

**Adjacent findings — held back pending disclosure.** Reading this area surfaced several issues outside
#1350's scope that touch data access rather than copy. They are **deliberately not listed here**,
because this repo is public and they have not yet been reported to the maintainers. They are held
locally and will be raised on the #bettervoting Slack channel or directly with Arend, one at a time,
with an "is this deliberate?" framing — most have a plausible innocent explanation, and leading with an
accusation on a volunteer open-source project is both rude and likely wrong. Once reported, whatever
the maintainers are comfortable publishing moves into this file.

The one that *is* in scope for #1350 and has already been raised: the help article's own claim at
`docs/help/preliminary_results.md:26` — "BetterVoting hides the link between a voter and their specific
ballot" — is true of the API and needs qualifying for the deployment. That's in the posted #1350
comment.

---

## 8. Sequencing

**Independently landable today, no upstream decision needed:**

1. **A1 — the copy edit + `learn_link` + delete `en.yaml:209`.**
   `packages/frontend/src/i18n/en.yaml` only. Trivial, en-only, no translation obligation
   (PRIORITY 4), no test asserts on it.
2. **The C diagnostic repro** (§5), **against `main`**. Costs nothing, decides everything about C, and
   must precede any C code.
3. **The missing backend tests** for the three read gates and the toggle — `preliminaryResults.test.ts`
   modelled on `editElection.test.ts:117-157`, plus a draft fixture with races in `testInputs.ts`
   (none exists that is draft + has races + names `public_results`). Write these *before* any fix so
   B Option B and C cannot silently undo each other.

**Needs an upstream decision from Arend before code:**

4. **The §6 ratchet-vs-bidirectional call.** Blocks both C's fix and any B Option B work, and
   determines the wording of both `en.yaml:1169`'s tip and `docs/help/preliminary_results.md:46-50`.
5. **A2 — the wording of the closed-list warning.** "An admin may be able to work out how you voted"
   is a strong claim on Equal Vote's own product on the ballot page. Engineering should not sign that
   off, and per §3 the honest version differs from the issue's framing.
6. **B — review `origin/JacksonLoper/publicaudit` (PR #1365) and add the beta flag** Arend asked for
   on 2026-05-18 and which is still absent (no `FeatureFlag`/`isSet` reference in the branch's new
   frontend files; no `HISTORY`/`AUDIT` key in `flagDefinitions`). This is the fastest path to
   unblocking the PR. Do **not** propose building an audit log.

**Then:**

7. **A3 — the `VotePage` notice + submit-dialog sentence + the closed-list layer**, once (5) lands.
8. **C's fix** (server-side version read + permission gate + `useOptimisticToggle` try/catch), once
   (4) lands — *and only if the repro still fails on `main` after `7cbc6079`*.
9. **The admin-time combination warning** from §7.

### Mechanical PR requirements

- **Migrations: none needed for any of A, B-as-Option-A, or C.** If one is ever added it goes in
  `packages/backend/src/Migrations/` as `YYYY_MM_DD_snake_name.ts` sorting after
  `2026_04_27_unique_head.ts` (`FileMigrationProvider` orders by filename,
  `Migrators/migration-utils.ts:16`), with a genuinely inverse `down()`, and
  `npm run build -w @equal-vote/star-vote-backend` must precede `migrate:latest` because the runner
  executes `./build/`.
- **Generated artifacts: commit nothing.** `.gitignore:18` ignores
  `packages/backend/src/OpenApi/swagger.json` and `:6` ignores `**/dist`; `git ls-files` confirms
  neither is tracked. The only swagger deliverable for a new route is the `@swagger` JSDoc block above
  the route line in `Routes/*routes.ts` (the glob at `OpenApi/swaggerSpec.ts:59`).
  `packages/shared/dist` must be *built* before the backend runs (`swaggerSpec.ts` throws "Could not
  find shared module") but never committed.
- **Shared package:** a frontend-only beta flag needs no shared change. Adding a new *setting* to
  `shared/src/domain_model/ElectionSettings.ts` would require rebuilding `dist` + `dist/schema.json` —
  which is exactly the `strict_ballot_privacy` change Arend told #1365 to strip out.
- **i18n:** `tips:` / `election_settings:` edits are en-only (es/pl/pt-BR carry neither block). New
  PRIORITY 0 keys create real translator work. `!tip()` requires a **leading space**
  (`util.tsx:27`) and is greedy — one tip per string, and no `)` may follow it, so it cannot be
  combined with a markdown link in the same value. `TipName = keyof typeof en.tips` provides no real
  safety (`styles.tsx:11-13` documents the vite-plugin-yaml issue), so a misspelled tip name fails
  silently at runtime.
- **PR shape:** conventional title `<type>(scope): <desc>` per
  `docs/contributions/developers/2_how_to_open_a_pull_request.md`, base `Equal-Vote/bettervoting`
  `main`, `Closes #NNNN`, squash-merged. #1350 is currently labelled `Role: Missing` /
  `Complexity: Missing`, i.e. never triaged — it should probably be split four ways (docs link / copy /
  on-ballot notice / closed-list layer). CI runs `npm run build -ws && npm test` (backend jest only —
  no frontend suite, no lint) plus the Playwright E2E job, **both on `main` only**, so neither runs on
  PRs targeting a feature branch.
- **Git hygiene for this checkout:** `origin` here **is** `github.com/Equal-Vote/bettervoting.git`.
  The fork's own `CLAUDE.md:7` forbids pushing to `Equal-Vote/*` without explicit confirmation, so a
  habitual `git push origin <branch>` would violate it. Push by full fork URL
  (`masiarek/star-server`). Also: **rebase onto `main` first** — the checkout is 98 commits behind.

---

## 9. Open questions for upstream

1. **Which build did the BV230 reporter test?** If it predates `7cbc6079` (2026-07-27) the stale-context
   bug is the answer; if it predates `da5122f2` (2026-04-20) the cause is
   `editElectionController.ts:26`. Either way the issue may close as fixed. Cheapest, highest-value
   question.
2. **What status code and `error` string did the tester see?** 401 / 400 / 409 / 200-then-revert map to
   four different fixes (§5) and the snackbar text alone decides it.
3. **§6: ratchet, or fully bidirectional plus a mandatory audit log?** Blocks C's fix, B Option B, and
   the wording of two docs. Note the source of "at any time" is
   `docs/help/preliminary_results.md:46`, not shipped UI copy, and it is about turning results *off*.
4. **Should `getAnonymizedBallots` really be unauthenticated in *any* state when the flag is on?**
   Publishing the full raw CVR — including in `draft`, where the flag is the wizard default — is either
   a deliberate transparency feature or an oversight. The answer changes what the #1350 article must
   say, and I would not change the endpoint unilaterally: `ballot_id` is a documented
   hand-count/tiebreak affordance (`docs/help/ties.md`) and the CSV's join key for third-party
   recounts.
5. **Does the #1350 disclaimer belong in the submit dialog as well as the ballot banner?** The spec
   says "on the BALLOT", which reads as the banner; the modal is what actually satisfies "before they
   cast". I recommend both, one sentence in the modal — but the extra friction is a product call.
6. **What exactly may the closed-list warning claim?** Per §3 the honest version is "admins see who
   voted, and combined with a live tally, timing can reveal how" — not "admins can see your ballot".
   Someone with authority over messaging should sign the wording, and the same person should decide
   whether `docs/help/preliminary_results.md:26` gets qualified given the Matomo path-segment issue.
7. **B: is an actor-less audit log acceptable?** `reason` and actor are both unrecorded
   (`Models/Elections.ts:46,60`). Actor-less ships now with no migration; adding an actor is a schema
   change and a new privacy-relevant data flow.
8. **B: should the history endpoint be public for elections that are not themselves public?**
   `is_public` and `settings.public_results` are different flags. An unauthenticated `/history` on a
   private draft leaks title/state/setting churn for an election never meant to be visible — and PR
   #1365's own open question notes turnout milestones leak even when an admin deliberately hid
   preliminary results.
9. **Is #1365's beta flag still wanted, and frontend-only or endpoint too?** Frontend-only leaves the
   endpoint reachable by URL during beta.
10. **Do any production rows carry the invalid `ballot_updates` combination that predates
    `settingsCompatiblityValidation`?** On those rows *every* election write, including the results
    toggle, fails permanently with a 400 about ballot updates. A one-off DB query confirms or kills
    BV230 candidate 3.

---

## 10. Unknowns / needs a live repro

- **Whether the BV230 repro still fails on `main` after `7cbc6079`.** Not run — no stack was started.
  This is the single most important open item and it is a five-minute manual test.
- **Whether `editElectionController.ts:24`'s client-supplied `state` read is actually bypassable.** It
  reads `req.body.Election.state` and `updateElection` inserts the body verbatim, so posting
  `state: 'draft'` on a finalized election *appears* to slip past. Not executed — treat as unverified,
  but any new guard must key off `req.election.state` regardless.
- **PR #1365's current labels and review threads.** Branch contents verified locally (`9129ea42`, 12
  files, +912/−14, no migration, no `isSet` in the new frontend files); GitHub was not queried.
- **That `https://docs.bettervoting.com/help/preliminary_results.html` resolves.** The file, its front
  matter (`nav_order: 8`), and `docs/CNAME` are confirmed in-tree on `origin/main`; the URL shape is
  inferred from the existing `App.tsx` docs redirects, not fetched.
- **Whether any production election has `ballot_updates: true` at all.** The wizard hardcodes `false`
  (`Wizard.tsx:53`) and the full-editor switch has no client-side compatibility gate, so flipping it on
  an open-access election 400s and silently reverts. If the answer is "essentially none", row 5 of the
  hazard table is theoretical for now and A's sequencing should reflect that.
- **Exact line numbers on `main`.** The map was built against the June checkout; `en.yaml` keys have
  shifted by ~6 lines (`preliminary_results` is `:1173` on `main`, `:1167` locally). Re-anchor before
  editing.

---

*Produced read-only: 12 agents (9 subsystem explorers → adversarial verify + completeness critic →
synthesis), 220 raw integration points, plus a direct upstream-delta check against a fresh
`git fetch`. No files in the BetterVoting fork were modified.*
