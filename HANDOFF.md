# Handoff

Newest session first. Older sections stay as written.

---

# Session — 2026-08-08: reporting, mapped end to end

Started as *"what reports should we ask BV for?"*. Reading the source turned the question around twice, and the answer is a four-page cluster in `analysis/` rather than any new issue.

## The three findings that changed the plan

**1. The bounce data is already collected.** `emailEventsDB` (2026-03-19 migration) is written by a signature-verified SendGrid webhook, and `getRollsByElectionID` attaches **every voter's events to the roll list response** (`getElectionRollController.ts:125-152`). It is rendered per voter only, inside `EditElectionRoll` — so "how many bounced?" costs one click per voter. **#789 is not a greenfield 18-column report; a third of it is a table and a download button over data the client already holds.** That reframing is plausibly why it has been `Complexity: Missing` since March.

Two spec corrections for #789 fell out of the same function: `voter_id` is deliberately deleted when `invitation === 'email'` (so the report keys on `email`), and **IP Address cannot be delivered at all** — BV stores only `sha256(req.ip)` and strips even that at `:149`.

**2. The tie seed has a trap that manufactures integrity accusations.** BV's random tiebreak is deterministic and we already replay it independently (`bv_replay_tiebreak.py`, verified at 3 and 9 candidates). Seed is `(rawVoteCount + hash(raceId)) >>> 0` — but `rawVoteCount` is the **raw** ballot count and the results page shows **tally** votes, a filtered subset, with no `nVotes` field anywhere. An auditor who uses the displayed number computes a plausible-but-wrong order and concludes the tiebreak doesn't reproduce. Also: the shuffle takes `electionCreateDate` and never uses it, with a comment saying it is for versioning — and nothing records which version produced a result.

**3. Reporting is over-filed, not under-filed.** 88 open issues match `report|export|csv|download|statistics|quorum`, most `Complexity: Missing`, many ours, mutually overlapping. Every idea raised in planning was already filed. The missing artefact was never another issue — it was the tree that makes the leaves navigable.

## The governing decision

Reports split on **whether the data can leave BV**, and that cut decides every case:

- **Tabulation** (ballots → winner, matrix, ties) — data leaves fully. Stays in the library.
- **Electorate** (voter status, turnout, bounces, quorum) — data does **not** leave and must not; the roll endpoint strips `ballot_id`/`voter_id` precisely to stop voters being linked to ballots. Necessarily BV's, and we should stop imagining we could take it on.

With the trap named: **a conclusion cannot cross-check a conclusion.** The cross-check is worth something because LH / `pref_voting` / `abcvoting` / RCTab are systems nobody at BV wrote. So every conclusion BV computes is one we can no longer verify independently — **ask for raw data and schema stability, not reports.** That puts `#1420` (export leaks the tabulator's internal object shape) above every new report, and argues for politely declining `#1071`/`#1154` (BV emitting an LH-format report), since the pipeline already exists on our side.

## Where it landed

| Page | What |
|---|---|
| [`analysis/report-catalogue.md`](analysis/report-catalogue.md) | **the complete view** — 5 families, ~40 artefacts, 5 consumers, status per item, a 17-row scenario matrix, and a slicing order |
| [`analysis/where-reports-should-live.md`](analysis/where-reports-should-live.md) | the governing decision above |
| [`analysis/reporting-and-voter-status-map.md`](analysis/reporting-and-voter-status-map.md) | Family 3 — roll, email events, quorum |
| [`analysis/tiebreak-audit-report.md`](analysis/tiebreak-audit-report.md) | Family 5 — the tie report spec and the seed trap |

## What's next

Two of four upstream items are **posted**; two remain.

| # | Where | Status |
|---|---|---|
| 1 | comment on **#789** | ✅ **posted** — [5226638146](https://github.com/Equal-Vote/bettervoting/issues/789#issuecomment-5226638146) · [record](issues/789-comment-posted.md) |
| 2 | comment on **#1432** | ✅ **posted** — [5226640606](https://github.com/Equal-Vote/bettervoting/issues/1432#issuecomment-5226640606) · [record](issues/1432-comment-posted.md) |
| 3 | **new issue** — voter roll CSV export | not filed. Offered in the #789 comment, so it is now expected — worth filing rather than leaving dangling |
| 4 | **the epic** | not filed. [`report-catalogue.md`](analysis/report-catalogue.md) as the body, framed as an *index of the existing 88*, not new asks |

Item 3 is also the natural **first PR**: frontend-only, and `BallotDataExport.tsx` already has the `triggerDownload` + RFC-4180 `csvField` helpers to copy.

**On a first PR:** the roll CSV export (3) is the right candidate when the time comes — frontend-only, no backend or schema change, and `BallotDataExport.tsx` already contains the `triggerDownload` + RFC-4180 `csvField` helpers to copy. Deliberately *not* done yet: requirements first, so the PR arrives as the first slice of a mapped plan rather than as a drive-by.

**Still unrun, and the only thing source cannot answer:** a manual election with a voter roll. It must be manual — `POST rolls` is gated on `canAddToElectionRoll` and our synthetic script identity never gets that binding (`admin_ids` was tried and ignored on `xb8r6v`), and the election must be **restricted** (`:108` 401s on open ones). Six-voter plan is in the Family 3 page. What it is *for* is the one empirical question left: whether a human-readable bounce cause survives into `details.reason`.

---

# Session — 2026-08-03: election creation, and a wizard orphan

Started as "document how to create an election on BetterVoting" and turned up a functional bug in the create wizard.

## The finding

**The wizard's PUBLISH NOW button creates an election that nobody can ever own.** It writes a `claim_key_hash` but leaves `owner_id` null, so the guest-owner grant can't fire, the election can't be claimed by signing in later, and it can never be closed, edited, or deleted. It stays `open` and accepting ballots forever. Only a `system_admin` can intervene.

Root cause is two lines that disagree, both in `Wizard.tsx`: `:119` passes `owner_id: null` explicitly, and `:83` assigns the temp id only `if (election.owner_id != null)`. The guard reads inverted. `claim_key_hash` is set just below it, outside the guard — which is why the elections come out half-configured.

Executed, not inferred, on production:

| | PUBLISH NOW (`jd78xd`) | SEE MORE OPTIONS (`rqq2pw`) |
|---|---|---|
| `owner_id` | `null` | `v-dbg9w2gt` = the `temp_id` cookie |
| `state` on creation | `open` | `draft` |
| `voterAuth.roles` | `[]` | `["owner"]`, 23 permissions |
| Owner-only call | `setOpenState` → `401` | `DELETE` → `200 Election Deleted` |

`rqq2pw` was deleted by its creator immediately after — the capability the quick path never grants. `jd78xd` cannot be cleaned up; it is the repro, and it is frozen at [`reference/frozen/jd78xd-snapshot.json`](reference/frozen/jd78xd-snapshot.json).

This **falsifies a claim that was in `bv-api-checks.md`** — that hand-rolled API calls were the only way to orphan an election. Corrected there, along with condition 1 of the guest-owner list: `null` clears the `v-` test (the source is `!owner_id || startsWith('v-')`) and dies on the `owner_id == cookies.temp_id` line instead.

## What's next on it

| # | What | Blocked on |
|---|---|---|
| 1 | **Raise it on Slack**, framed as "is this deliberate?" — `owner_id: null` was typed on purpose, so there may be a reason. Draft is in the issue note. | you |
| 2 | **One signed-in PUBLISH NOW run.** The only gap in the provenance table. Source says `:119` makes the `isLoggedIn()` branch unreachable, so logged-in creators should be orphaned too — unrun. | you |
| 3 | **File upstream** once (1) says it isn't intended. Body is written and ready to paste. | Arend |
| 4 | **Second item on the same expression** — comparison semantics in `tempUserAuth`. Deliberately not in this repo; raise it in the same conversation, since a correct patch covers both. | you |

→ [`issues/wizard-publish-now-orphans-election.md`](issues/wizard-publish-now-orphans-election.md) · [`reference/creating-an-election.md`](reference/creating-an-election.md)

## What I got wrong, and how it got caught

**One finding was retracted before it reached anyone.** The wizard's Description field came back `null` and looked like a second defect. It wasn't: `Wizard.tsx:110-116` maps description through on the same object as the title, and the title persisted. The null was the automation — programmatic value-setting fills the DOM without reaching React state. Confirmed the next run, when the *title* written the same way triggered `Title required` on a visibly populated field.

Two lessons, both now written up in [`reference/automation-gotchas.md`](reference/automation-gotchas.md):

1. **The screen is not evidence.** A field can look filled, read back filled, and still arrive `null`. Verify against the API, and run a control field written the same way before blaming the product.
2. **Read the source before filing.** It resolved both candidate findings, in opposite directions — one confirmed with a one-line fix, one retracted. Neither was reachable from the browser alone.

Also corrected mid-session: I first wrote that `null` fails the `v-` convention. It doesn't — it fails the equality on the next line. Same conclusion, wrong mechanism, and the wrong version would have been embarrassing in an upstream issue.

## Switching machines — what's where

Everything from this session is pushed. `git clone https://github.com/masiarek/bettervoting-qa.git` gets all of it; nothing from 2026-08-03 lives only on the old machine.

**Two exceptions, both deliberate:**

| Not in the repo | Where it actually is |
|---|---|
| The second `tempUserAuth` item (see the end of the issue note) | **Nowhere on disk.** `/Volumes/T7` was not mounted, so it was never appended to `bv-security-findings-unreported.md`. Handed to Adam in chat only. Carry it or re-derive it |
| Claude's memory files, `~/.claude/projects/-Users-adam/memory/` | Local. But the durable content is duplicated into this repo on purpose — the corrected guest-ownership mechanics are in `reference/bv-api-checks.md`, the automation lessons in `reference/automation-gotchas.md`. Losing the memory files loses convenience, not knowledge |

**Also worth knowing:** `star-voting-library` was being committed to by another session while this one ran — its `master` moved three times in as many minutes. The `/new_election` link fix landed there and is on `origin/master`, but under a different SHA than the one this session created (`e0bc8947` was absorbed by the concurrent work). Let that session finish before switching; it had an uncommitted `_notes/handoff-2026-08-04-bloc-star-criteria.md` in flight.

## Housekeeping

- `jd78xd` is a live orphan cited as evidence. It will accept ballots from anyone who reads the issue. Snapshot frozen at 0 ballots, `2026-08-04T02:09:49Z` — re-freeze if the issue ends up citing tallies.
- **`README.md` had the repo's visibility wrong** — the Related-repos table said `bettervoting-qa` was private; `gh` reports public, as does the top of the same README. Since the no-credentials rule hangs on knowing it's public, that mattered. **Left unfixed pending your call** — it's a one-word edit to that table.
- Unrelated: `star-voting-library` `readme.md:21` now points "run your own free election" at `/new_election` instead of the bare homepage (`e0bc8947`).

---

# Handoff — 2026-07-30

Everything from the 29–30 July session, and how to pick it up on another machine.

## Get it all with three clones

```bash
# 1. This repo — QA test cases, analysis, issue notes  (public)
git clone https://github.com/masiarek/bettervoting-qa.git

# 2. The BetterVoting fork, with both feature branches
git clone https://github.com/masiarek/star-server.git
cd star-server
git fetch origin
git checkout fix/preliminary-results-tip-copy      # PR #1465
git checkout feat/preliminary-results-ballot-notice # PR #1466

# 3. Upstream, if you want main
git remote add upstream https://github.com/Equal-Vote/bettervoting.git && git fetch upstream
```

## Open pull requests

| PR | Branch | State | What |
|---|---|---|---|
| [#1465](https://github.com/Equal-Vote/bettervoting/pull/1465) | `fix/preliminary-results-tip-copy` | ready | The admin tip rewrite: new copy, `\|`→`>` so it renders as one paragraph, plus `learn_link` to the help article. 5 lines. |
| [#1466](https://github.com/Equal-Vote/bettervoting/pull/1466) | `feat/preliminary-results-ballot-notice` | **draft** | The on-ballot notice + closed-list layer + the submit-dialog line. ~70 lines across 4 files. |

Both branched off upstream `main` at `8d2b3f9a`.

**#1466 is a draft for one reason:** the closed-list wording is a privacy claim about BetterVoting printed on a ballot, and someone who owns messaging should sign that sentence. Everything else in it is verified.

## Issues touched

- **[#1350](https://github.com/Equal-Vote/bettervoting/issues/1350)** — you're assigned. Three comments posted: the [analysis](https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5125205974), the [test-plan link](https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5129794398), and availability/ETA (8 hrs this week, target 12 Aug).
- **[#1043](https://github.com/Equal-Vote/bettervoting/issues/1043)** (BV230) — [closing comment posted](https://github.com/Equal-Vote/bettervoting/issues/1043#issuecomment-5125655744). Not reproducible; still open pending a view on the `is_public` half. You can close it.
- **[#1420](https://github.com/Equal-Vote/bettervoting/issues/1420)** — your v2 JSON export issue, unchanged. Note: when v2 ships, `fetch_bv_export.py`'s "byte-equivalent to the UI export" claim in the `bettervoting` skill becomes false.

## To pick up where we left off

**The code is done.** What remains is mostly other people's decisions rather than your hours — roughly **1–2 hours of real work**, plus half a day if you want the Playwright automation.

| # | What's left | Effort | Blocked on |
|---|---|---|---|
| 1 | **Attach the tooltip screenshot to #1465** — the As-Is three-line rendering. It makes the `\|`→`>` change self-evident; without it the diff reads as YAML pedantry. Then #1465 is mergeable. | ~10 min | you |
| 2 | **Get the closed-list wording signed off** (Q2). Gates BV240c, BV240d, and taking #1466 out of draft. It's a five-minute conversation, not work — the sentence is already written and deliberately claims only what the code supports. | ~5 min to ask | **Arend** |
| 3 | **Answer Q7** — split #1350 four ways? Would let #1465 merge independently of the rest. | ~0 | Arend |
| 4 | **Qualify the help article's L26 claim** — `docs/help/preliminary_results.md` says BetterVoting hides the voter↔ballot link. True of the API, needs a caveat for the deployment. Do this in the same pass as reporting the Matomo finding, since they're the same fact. | 30–60 min | you (after #4 in the findings file is raised) |
| 5 | **Report the four findings** in the file named below. Slack, one at a time. Item 4 there (Matomo) unblocks row 4 above. | ~30 min | you |
| 6 | **Playwright specs for the new cases** — 11 of the 16 are automatable, the harness exists, and `full-runthrough.spec.ts:51-57` has the `aria-pressed` settle idiom to copy. Entirely optional; nothing depends on it. | 3–4 hrs | you |
| 7 | **BV240o** (non-English fallback) and **BV240p** (two-browser mid-election flip) — the two manual cases the local stack couldn't cover. | ~30 min together | you |
| 8 | **Change the Gmail passwords** — decouple them from the BetterVoting one. Unrelated to #1350; see the note at the bottom. | ~15 min | you |

Against the 8 hrs/week and 12 Aug target posted on the issue, you're well ahead. The remaining calendar time is review latency, not effort.

**Deliberately not doing:** changing `util.tsx`'s global `_self` default for markdown links. It would fix the same class of problem everywhere, but it affects existing tips (e.g. `random_tie_order`) and is scope creep on #1350. Separate ticket if anyone wants it.

## Not in this repo — copy it before you switch machines

`/Volumes/T7/Voting/BetterVoting/bv-security-findings-unreported.md`

Four unreported data-access findings, deliberately kept out of this public repo until they've been raised with the maintainers. **This file exists nowhere else — it is not in any git repo.** Copy it to wherever you keep things, or it's gone when you switch.

The sharpest is `editElectionRolesController`'s commented-out draft guard. Slack rather than public issues, one at a time, framed as "is this deliberate?".

## Local-only leftovers you can discard

| Path | What | Keep? |
|---|---|---|
| `bv-copy-fix/` | worktree for the #1465 branch | no — branch is pushed |
| `bv-ballot-notice/` | worktree for the #1466 branch, plus 681 MB of `node_modules` | no — branch is pushed |
| `bvnotice-db` container | throwaway Postgres on 5433, seeded then hand-edited | no — `docker rm -f bvnotice-db` |

Two npm dev servers (backend 5055, frontend 3000) were backgrounded from the session and die with it.

To rebuild the local stack on the new machine: clone the fork, `npm install`, `npm run build -w @equal-vote/star-vote-shared`, run Postgres from `test-data.sql`, then the backend and frontend dev servers. The seeded `4xtfb4` election is configuration E1 out of the box (`state=open`, `public_results=true`, `voter_access=open`), so no login or election creation is needed to see the notice.

## What got verified, and what didn't

Seven of the sixteen BV240 cases have empirical backing from a running stack: **a, b, c** (structure), **e, g, j, k**. The submit-dialog line is verified too.

Not verified: the non-English locales, and the two-browser mid-election flip (BV240p).

Four of my own claims were **wrong** and got corrected by checking — recorded in the pages so they don't get re-inherited:

1. BV240h's article URL was marked an unverified prediction; it returns 200.
2. BV240o claimed the new keys create translator work. The *banner* keys don't (PRIORITY 99, beside `draft_warning`). The *dialog* key does (PRIORITY 0).
3. A first "history rewrite" of this repo left a credential in `b4fcff7`, and my own verification misread the hits as harmless. Now genuinely one clean commit.
4. I said the two existing Playwright specs would need selector updates. A read of them says otherwise — all selectors are role-plus-accessible-name, and the one loose `getByText('open')` runs on Admin Home where the notice doesn't render. Corrected in #1466 and in three case pages.

Also worth knowing: the test-account credential was briefly public in this repo's history. The dangling commit `00dbb72` may still be reachable by SHA on GitHub — deleting and recreating the repo would purge it.
