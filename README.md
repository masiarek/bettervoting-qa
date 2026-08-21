# bettervoting-qa

QA test cases, bug analysis, and issue notes for [Equal-Vote/bettervoting](https://github.com/Equal-Vote/bettervoting).

**Start here if you are picking this up:** [HANDOFF.md](HANDOFF.md).

**Read it as a website:** <https://masiarek.github.io/bettervoting-qa/> — the same pages, searchable, built from this repo by [`.github/workflows/docs.yml`](https://github.com/masiarek/bettervoting-qa/blob/master/.github/workflows/docs.yml) on every push. Handy when linking a specific paragraph from an upstream issue: heading anchors match GitHub's.

Working notes between Adam and Claude. One test case = one Markdown page, versioned, so it can be updated in place instead of copy-pasted between chat and Google Docs.

## Ground rules

This repo is **public**, so that its pages can be cross-referenced from upstream GitHub issues. Two rules follow from that, and they are not optional.

**No credentials.** Test-account logins live in the sheet's testing-credentials tab, never in a page here. (One slipped in on the first draft and was removed before this went public — if you see a password in a diff, that's a bug.)

**Report before publishing.** Anything sharper than a UI or copy defect — unauthenticated data access, missing guards, ID entropy — goes to the maintainers **first**, on the #bettervoting Slack channel or directly to Arend, one item at a time, framed as "is this deliberate?" rather than as a finding. Most such things have a plausible innocent explanation, and leading with an accusation on a volunteer open-source project is both rude and usually wrong. Only after it's been raised does it belong on a page here.

`analysis/preliminary-results-integration-map.md` §7 notes where items were held back for exactly this reason. That's a live queue, not an oversight.

**This is not a security assessment** and shouldn't read as one. It's QA on a voting product Adam helps run, written to make specific issues fixable.

## Layout

| Path | What's in it |
|---|---|
| `test_cases/` | One page per test case. `BV<id>-<slug>.md` |
| `issues/` | Per-issue notes: findings, resolution, and a copy of whatever was posted upstream |
| `analysis/` | Deep reads of a subsystem — the integration maps that back the test cases |
| `reference/` | Reusable how-to: API checks, commands, gotchas |
| `docs_proposals/` | Draft pages for <https://docs.bettervoting.com>, written as finished user documentation. The proposal README carries the QA cross-references; the drafts themselves carry none, so they lift straight into `docs/` |
| `adam_bv_process/` | Adam's local runbook: starting and stopping the dev stack and the docs preview, and which checkout to be in |

## Conventions

- **One test case, one page.** `test_cases/BV240a-notice-appears-on-ballot.md`. Structure: purpose → prerequisites → master data → steps → expected results → pass/fail → actual results → notes → related.
- **Test IDs come from the [test-case sheet](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)**, which stays the canonical index for non-tabulation QA. This repo holds the *detail*; the sheet holds the *roster*. `*-sheet-rows.tsv` files are paste-ready rows for it.
- **Assert on requirements, not on literal strings**, when the copy hasn't been approved yet. A test pinned to unapproved wording fails on every review tweak and trains people to ignore it.
- **Mark predictions as predictions.** If a expected result is derived from reading source rather than from running the product, say so. Two in this repo were later refuted by screenshots.
- **Say when a case is vacuous.** A negative case run against a build where the feature doesn't exist yet proves nothing. Note the required build.

## Related repos

| Repo | Purpose | Visibility |
|---|---|---|
| [star-voting-library](https://github.com/masiarek/star-voting-library) | STAR Voting education — teaching pages, YAML elections, tabulation engines | public |
| [star-voting-research-topics](https://github.com/masiarek/star-voting-research-topics) | Research-paper prospectuses using the library as reproducibility artifact | private |
| **bettervoting-qa** | QA of the BetterVoting product itself | public |
| [Equal-Vote/bettervoting](https://github.com/Equal-Vote/bettervoting) | upstream | public |

Tabulation test cases do **not** belong here — they go in `star-voting-library` with a YAML and a frozen BV export, indexed by the auto-generated `BV_registry.md`. This repo is for the QA that has no YAML home: UI, settings, roles, archive, casting, copy.

## Current work

### Six code fixes, parked behind the PR freeze (#1469, #1507, #1484, #1035, #1470, #1480)

Written, tested and committed to local branches; **not** submitted, because Adam was asked to hold new PRs until Arend catches up with the existing queue. The branches, the evidence, and the checklist for opening them later are in [`docs_proposals/PARKED_ready_for_bv.md` §7](docs_proposals/PARKED_ready_for_bv.md).

- **[#1469](issues/1469-ranked-robin-degrees-of-ties.md)** — Ranked Robin never runs its own tiebreakers, so a tie among three or more candidates goes straight to the random rung. With three candidates and no drawn matchups *every* Condorcet cycle is such a tie, so the shuffle is the entire cycle path at the field size BetterVoting sees most. The fix walks the method's published ladder (1st Degree over the finalists, 2nd Degree over the field) and stops there, as the spec recommends for public elections. **Running the same question against our own engine found the mirror-image bug in it** — 11 of star-voting-library's 100 Ranked Robin cases changed winner, and two BV-backed cases that we had written up as an "LH vs BetterVoting divergence" turn out to have been BetterVoting being right.
- **[#1507](issues/1507-star-pr-tiebreaktype-always-random.md)** — every STAR-PR result ever tabulated reported `tieBreakType: 'random'`, because the check was tautological. The results page turns that into a "Tied!" heading. 2026-08-20: the mirror-image gap in `IRV.ts` — an elimination tie among three or more standing candidates is broken but never flagged — was [posted on the issue](issues/1507-irv-mirror-comment-posted.md).
- **[#1484](issues/1484-race-details-runner-up.md)** — one `NaN` in `runBlocTabulator`'s comparator stops its sort a key early, so Race Details shows the second-highest scorer where the page means the tiebreak runner-up.
- **[#1035](issues/1035-runoff-zero-denominator-fix.md)** — `NaN%` in the runoff table and a blank pie when every counted ballot rates both finalists equally. Display guard only; no tally changes.
- **[#1470](issues/1470-writein-abstention-discards-ballots.md)** — approving a write-in silently discards every ballot that scored the official candidates equally, because the abstention test runs on the ballot's raw mark keys before they are zero-filled over the candidate set. On live [`43jp39`](https://bettervoting.com/43jp39/results) that hands the race to the write-in, 3 tallied ballots against 7. The fix normalizes first, exactly as the issue proposed; the #884/#1508 flat-ballot *policy* is deliberately untouched and a regression test pins that.
- **[#1480](issues/rr-winner-highlight-positional-vs-elected.md)** — Ranked Robin is the only tabulator that neither re-sorts `summaryData.candidates` winners-first nor is order-safe by construction, so the frontend's by-convention trust in the backend's order stars the wrong candidate whenever the head-to-head rung elects past the pre-sort (live: `8h4bvh`). One line, the idiom IRV already uses. Double-gated: the freeze, plus the issue's by-design closure — the PR opens only if the backend reframe is accepted.


### 🚦 PR freeze on upstream (2026-08-20)

Adam was asked not to open new PRs on Equal-Vote/bettervoting until Arend catches up with the existing queue. Ready and specified work is parked in [`docs_proposals/PARKED_ready_for_bv.md`](docs_proposals/PARKED_ready_for_bv.md) with per-item flags (READY / READY-AFTER-MERGE / AWAITING-DIRECTION). The docs/i18n/fixes program itself is indexed upstream in [issue #1556](https://github.com/Equal-Vote/bettervoting/issues/1556); its consistency review and judgment-call notes are preserved here under [`analysis/`](analysis/help-pages-consistency-review.md).



### #1035 — `NaN%` in the STAR runoff table (OPEN, Adam's — FIX WRITTEN, unpushed)

The runoff denominator is `finalistVotes`, and it is **zero** whenever every counted ballot rates the two finalists equally — no scoring-round tie needed, no abstention needed, `nTallyVotes` perfectly healthy. Three ballots of `5,5,0` do it. The root cause went upstream in August; this is the fix.

- **Two surfaces, two symptoms.** The runoff **table** prints `NaN%` and a `100%` total of nothing; the **pie chart** renders a blank circle, because recharts draws no sectors when every value is zero and so never runs the label callback that would have printed `NaN`. The **bar** view was already safe — `ResultsBarChart.tsx:53` has done `Math.max(1, percentDenominator)` all along. The guard existed on one of the three views.
- **The fix is a display guard and nothing else.** `formatPercent` returns `—` for a non-finite input (which also nets two unreported `x/0` call sites), the hard-coded `'100%'` total row is guarded explicitly, and `ResultsPieChart` says what happened instead of drawing an empty circle. No tabulator source changes; winner, scores and every finite percentage are byte-identical, shown against two controls including the `<1%` branch.
- **Evidence, and its limit.** A new backend test pins the *condition* (`[5,5,0] × 3` → 3 votes, 0 abstentions, denominator 0) so a future change to the abstention rule trips it. The display guards have no harness at all — `packages/frontend` has zero test files — so they were verified by extracting the shipped `formatPercent` out of `util.tsx` and executing it against real `Star()` output. **Nothing was rendered in a browser**; [BV2264](test_cases/BV2264-nan-in-runoff-table.md)'s *Expected after the fix* is still the assertion to run, and the last prediction made about this pie chart was refuted by a screenshot.
- **Why it goes first:** it is R2 from the abstention analysis. Today's `markAllEqualAsAbstention` rule is the only thing keeping the trigger set narrow, so any fix to #1053 / #1407 widens it.

→ [`issues/1035-runoff-zero-denominator-fix.md`](issues/1035-runoff-zero-denominator-fix.md) · root cause: [`issues/1035-nan-root-cause-comment-posted.md`](issues/1035-nan-root-cause-comment-posted.md) · probe: [`analysis/flat-scores-abstention/probe/nan-fix-verify.ts`](analysis/flat-scores-abstention/probe/nan-fix-verify.ts) · fix on `fix/1035-runoff-zero-denominator` (`47d241a4`), **not pushed, no PR**

### #1484 — the STAR Race Details tables name the wrong finalist (FILED, ours — FIXED locally, unpushed)

A STAR results page states two runoffs at once whenever a scoring-round tie picks the second finalist: the charts and Tabulation Steps read `roundResults` and name the candidate the tiebreak advanced, while the Race Details tables read positions 0 and 1 of `summaryData.candidates` — score order — and recompute the runoff against the second-highest scorer. On [`qhjyr2`](https://bettervoting.com/qhjyr2/results) that is *Ana 2, Cora 1, Equal Support 2* in the chart against *Ana 3, Ben 2, Equal Support 0* in the table directly below it.

Root cause is **one `NaN`**. `runBlocTabulator`'s comparator (`Util.ts:331`) separates the sort keys by subtracting them, and `Star.ts` uses `-Infinity` for "didn't win / wasn't runner-up". `-Infinity - -Infinity` is `NaN`, `Array.prototype.sort` coerces that to `+0`, so any two losing candidates compare *equal at the first key* and the `runnerUpRound` key that exists to lift the runner-up is never read. The frontend contract was right; the sort it depends on stopped one key early. `sortCandidates()` avoids the identical trap deliberately 140 lines up, with `999999` and a comment saying why.

- **Not a deploy gap**, which the issue floats as the alternative: replaying `main`'s comparator over the payload production served reproduces that payload's order exactly.
- **A frontend-only fix is not enough.** It repairs the Runoff Table but not the gold highlight, which is CSS `nth-child` over the served order. The backend fix is the necessary one; the `STARDetailedResults.tsx` change is defence in depth and matches what `Results.tsx:51` already does.
- Four regression tests, three of which fail on `main`; `npx jest src/Tabulators/` goes 53/56 → 56/56. `VoterProfileWidget.tsx:33` takes the same two positions and is corrected without an edit.

→ [`issues/1484-race-details-runner-up.md`](issues/1484-race-details-runner-up.md) · probe: [`analysis/1484-race-details-probe/`](analysis/1484-race-details-probe/README.md) · fix on `fix/1484-race-details-runner-up` (`a892a0ff`), **not pushed, no PR**

### #1507 — every STAR-PR result claims a random tiebreak (FILED, ours — FIX WRITTEN, unpushed)

`AllocatedScore` asked *"was this decided by a tiebreak?"* by testing membership of `results.tied` — an array it appended the round winner to on **every** round — so the answer was yes for every Allocated Score election ever tabulated. `Results.tsx:444` turns any non-STAR `'random'` into the heading **"Tied!"**, so those results pages announced a draw instead of their winners.

Confirmed live on `bvhchj` (BV2130): `tieBreakType: random`, `tied` == `elected`, and its own `weightedScoresByRound` show a **unique maximum in all seven rounds** — while the Plurality race on the same election reports `none`. Fixed by recording the tie where it happens (`ties.length > 1`); the 102-ballot production election replays to `none` with its published winner order intact. Two tests, one for each direction, so the fix can't be "delete the flag".

Sibling defect found on the way, executed, and filed 2026-08-20 as [#1582](https://github.com/Equal-Vote/bettervoting/issues/1582) ([record](issues/1582-bloc-final-seat-tiebreaktype-filed.md)): `runBlocTabulator` (`Util.ts:312`) copies only the **final** round's `tieBreakType`, so a tie that decided seat 1 of a bloc race is reported as `none` — the same bug inverted, across four methods.

→ [`issues/1507-star-pr-tiebreaktype-always-random.md`](issues/1507-star-pr-tiebreaktype-always-random.md) · probe: [`analysis/1507-probe/`](analysis/1507-probe/probe1507.ts) · fix on `fix/1507-star-pr-tiebreaktype` (`9a2b8b2a`), **not pushed, no PR**

### #1470 — approving a write-in discards flat official-slate ballots (FILED, ours — FIX WRITTEN, unpushed)

`filterInitialVotes` runs the abstention and bounds tests on a ballot's **raw** mark keys and zero-fills over the full candidate set only afterwards, for the ballots that survive. A write-in candidate's key exists only on the ballots that wrote that name in, so `{Ann: 4, Ben: 4}` tests as "all marks equal" → abstention, when the ballot the tally would actually count is `{Ann: 4, Ben: 4, Cedar: 0}` — a strict preference for both officials over the write-in. On live [`43jp39`](https://bettervoting.com/43jp39/results) the same seven ballots elect **Ben** when Cedar is official and **Cedar** when Cedar is an approved write-in, because four of the seven voters are silently discarded.

The fix normalizes before testing — exactly the issue's own sketch — and is behavior-preserving for any ballot that already covers the candidate set, so the contested [#884](https://github.com/Equal-Vote/bettervoting/issues/884)/[#1508](https://github.com/Equal-Vote/bettervoting/issues/1508) flat-ballot policy is untouched (a regression test pins that a full-set-flat ballot is still dropped). Three tests: the tabulator-level 43jp39 reproduction (the existing test helper can't even express a missing key, which is why nothing caught this), the policy pin, and the end-to-end write-in flow the issue said was missing from `writeIns.test.ts`. Both result assertions fail on `main`; 49/49 and the full 179-test suite pass with the fix. After deploy, [#1478](https://github.com/Equal-Vote/bettervoting/issues/1478) should be re-tested — same root cause if those partial ballots reach the tabulator as missing keys.

→ [`issues/1470-writein-abstention-discards-ballots.md`](issues/1470-writein-abstention-discards-ballots.md) · acceptance: [`test_cases/BV2263-writein-discards-ballots.md`](test_cases/BV2263-writein-discards-ballots.md) · probe: [`analysis/1470-probe/`](analysis/1470-probe/live-43jp39.out) · fix on `fix/1470-write-in-abstention-normalization` (`c2fc5bd8`, clone `bv-1470`), **not pushed, no PR**

### #1059 / #1524 / #1525 — finding an election by its ID (PR OPEN, defect FILED, docs drafted)

An admin pasted an election ID into the only search box on `/manage` and was told *"You don't have any elections yet."* One screen, two independent defects, and the second was hiding the first.

- **#1059** (Adam's, open since Oct 2025) — the Title box does not match the election ID. PR [#1524](https://github.com/Equal-Vote/bettervoting/pull/1524) teaches it to, and relabels the header **Election Title or ID**, rather than adding a column: in `EnhancedTable` a column *is* a search box, and the table already scrolls sideways at 5 columns on a phone. Verified locally, six queries, at 320px and 1280px.
- **#1525** (filed 2026-08-15) — `emptyContent` renders on the *filtered* row set, so a query that matches nothing produces the new-user empty state. Reproduced on `/browse`: three elections loaded, `0–0 of 0`, *"No open elections at this time"*. On `/manage` it also offers a CREATE ELECTION button to someone who was searching for an existing one.
- **Still undecided:** whether the ID should be *visible* as well as searchable. Three prototypes built and measured; recommendation is the ID on its own line under the title, the only one that costs zero horizontal space.
- **User documentation drafted** from the same source reading — [`docs_proposals/help/finding_your_elections.md`](docs_proposals/help/finding_your_elections.md). Nothing on the help site currently describes `/manage`, what an election ID is, or that archived elections are hidden by default.

→ [`test_cases/BV2285-index.md`](test_cases/BV2285-index.md) (four cases) · [`issues/1059-1524-search-elections-by-id.md`](issues/1059-1524-search-elections-by-id.md) · [`issues/1525-empty-state-conflates-no-data-with-no-matches.md`](issues/1525-empty-state-conflates-no-data-with-no-matches.md)

### #1512 / #1513 — Manage Voters / Add Voters (REVIEWED and FILED)

[#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) reports a scroll/save annoyance on
mobile. It is valid. But its screen recording documents a second, unreported defect that costs
voters, and the two are on different screens — **the issue's written steps and its video do not
match**: the steps describe the race editor, the video is entirely Manage Voters / Adding Voters.

- **The duplicate check keys on `email` only** (`AddElectionRoll.tsx:158`, `:173`). In
  admin-managed-voter-ID mode `roll.email` is `undefined` on every row, so all rows key to `""`:
  any submission of 2+ rows is reported as *"duplicate emails"*, and answering YES keeps **one row**
  and discards the rest with no message. The reporter's roll goes **2 → 3 → 4 → 5** across
  submissions of 3, 2 and 1 rows. Silent data loss on a voter roll. **Filed as
  [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513)**, with the three functions
  transcribed verbatim and executed — they replay the reporter's roll counts number for number.
- **#1512's own root cause** is `scrollToElement()` (`util.tsx:324`), a page-level scroller
  (`window.scrollTo`) called from inside `<Dialog scroll='paper'>`, whose scroll container is
  `.MuiDialogContent-root` in a fixed overlay. It can only move the page behind the modal. The same
  helper is correct in the Wizard styling, which is why the behaviour looks inconsistent.
- Two smaller ones, both raised in the #1512 comment rather than filed: the shared confirm dialog
  **blanks its own text and button labels** while closing (`ConfirmationDialogProvider.tsx:46`), and
  the voter table overflows the viewport horizontally (may be covered by #704 / #1170). The first is
  offered to the maintainers as a separate ticket if they want it.

**After the fixes land:** [`test_cases/BV250-post-fix-verification.md`](test_cases/BV250-post-fix-verification.md) —
the acceptance list for both issues, the nine user stories behind it, and the three ways a plausible
#1513 fix goes wrong (deleting the check, repairing only the typed path, fixing detection but not the
message). All eleven BV250 cases now have their own page.

**Reusable as user documentation:** the same source reading produced a draft help page —
[`docs_proposals/help/voter_list.md`](docs_proposals/help/voter_list.md). The site documents *whether*
to restrict an election but never how to build the list; two of the test cases exist only because the
product's own copy could not answer the question. See [`docs_proposals/README.md`](docs_proposals/README.md)
for the one blocker — its Duplicates section describes post-#1513 behaviour and must not ship before the fix.

**Method, for reuse.** The evidence came out of the reporter's screen recording read frame by frame,
not out of a repro run — browser automation could not deliver input events at all that session. Both
halves are written up: [`reference/reading-a-bug-report-video.md`](reference/reading-a-bug-report-video.md)
(ffmpeg contact sheets, why 1 fps lies about transitions, reading counters instead of impressions)
and [`reference/automation-gotchas.md`](reference/automation-gotchas.md) §6 (the escalation ladder
when the browser will not take input, and the transcribe-and-execute harness).

→ finding: [`issues/add-voters-duplicate-check-keys-on-email.md`](issues/add-voters-duplicate-check-keys-on-email.md) ·
review: [`issues/1512-scroll-save-review.md`](issues/1512-scroll-save-review.md) ·
map: [`analysis/manage-voters-map.md`](analysis/manage-voters-map.md) ·
cases: [`test_cases/BV250-index.md`](test_cases/BV250-index.md) (11, none blocked; BV250a/b are the
baseline captures) · probe: [`analysis/add-voters-probe/`](analysis/add-voters-probe/README.md) ·
posted: [#1512 comment](https://github.com/Equal-Vote/bettervoting/issues/1512#issuecomment-5294012191)

### Wizard "Publish Now" orphans the election (UNFILED — Slack first)

Creating an election through the wizard's **PUBLISH NOW** button while signed out produces one that can never be owned: `claim_key_hash` is written, `owner_id` is left null, so the guest-owner grant can't fire and signing in later can't claim it. It stays `open` and accepting ballots forever; only a `system_admin` can intervene.

Root cause is two lines that disagree in `Wizard.tsx` — `:119` passes `owner_id: null`, `:83` assigns the temp id only when `owner_id` is already non-null. One-line fix.

Verified on production against a same-session control that took the other button:

| | PUBLISH NOW (`jd78xd`) | SEE MORE OPTIONS (`rqq2pw`) |
|---|---|---|
| `owner_id` | `null` | `v-dbg9w2gt` = the `temp_id` cookie |
| `voterAuth.roles` | `[]` | `["owner"]` |
| Owner-only call | `setOpenState` → `401` | `DELETE` → `200` |

Not posted anywhere yet — `owner_id: null` is written deliberately, so it goes to Slack as "is this deliberate?" before it becomes an issue. One gap left in the provenance: the signed-in case is read from source, not run.

→ [`issues/wizard-publish-now-orphans-election.md`](issues/wizard-publish-now-orphans-election.md) · how-to: [`reference/creating-an-election.md`](reference/creating-an-election.md) · lessons: [`reference/automation-gotchas.md`](reference/automation-gotchas.md)

### Flat scores → abstention — why the fix is contested (ANALYSIS, no ticket of its own)

Why Equal Vote hesitate to fix [#1407](https://github.com/Equal-Vote/bettervoting/issues/1407) / [#1053](https://github.com/Equal-Vote/bettervoting/issues/1053), and whether they're right to. Answer: partly. Two of the three stated objections are real, one is false, and the biggest risk is one nobody is discussing (retroactive change to every past election's published numbers).

Key findings, verified by running BetterVoting's own tabulator and captured against production in [BV2263–BV2267](test_cases/BV2263-2267-index.md):

- **Single-winner and Bloc STAR outcomes do not change** — the winner is invariant under the fix, including in the all-flat random-tiebreak case. Only STAR-PR can change a result, via the quota.
- **It is two changes, not one**, and they affect disjoint ballot sets. The half that produces the ugly reporting is the larger, higher-blast-radius half (it also moves Approval, Plurality, IRV and STV).
- **[#1035](https://github.com/Equal-Vote/bettervoting/issues/1035) is a prerequisite**, not a low-priority sibling: it is a live zero-denominator bug whose trigger set today's abstention rule merely *narrows*, and which any fix would widen. It surfaces as `NaN%` in the runoff **table**; the pie chart renders blank instead — both confirmed in a browser by [BV2264](test_cases/BV2264-nan-in-runoff-table.md).

→ [`analysis/flat-scores-abstention/`](analysis/flat-scores-abstention/README.md) · baselines: [`test_cases/BV2263-2267-index.md`](test_cases/BV2263-2267-index.md) · upstream reference cases: [Flat scores, ties & tie-breaking](https://masiarek.github.io/star-voting-library/01_STAR/03_Criteria/Flat_scores_ties/index.html)

Filed upstream from this work: [#1470](https://github.com/Equal-Vote/bettervoting/issues/1470) (write-in discards ballots, live repro), [#1471](https://github.com/Equal-Vote/bettervoting/issues/1471) (chart split denominator), plus root-cause comments on [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035#issuecomment-5166192037) and [#1053](https://github.com/Equal-Vote/bettervoting/issues/1053#issuecomment-5166296842).

### #1350 — Add a disclaimer related to preliminary results (OPEN, assigned to Adam)

The active piece. Four independently landable deliverables:

| | Deliverable | Status |
|---|---|---|
| i | `en.yaml` copy rewrite + `learn_link` to the help article | ready — no sign-off needed |
| ii | On-ballot notice, visible before the voter casts | needs Q1 |
| iii | Extra warning layer for closed-list elections | **blocked on Q2** (wording approval) |
| iv | Qualify the help article's L26 claim | doc review |

Key finding: the article is **already written** (`docs/help/preliminary_results.md`, on `main`) and linked from nowhere in `packages/`. This is a linking + copy task, not a writing task.

- Analysis: [`analysis/preliminary-results-integration-map.md`](analysis/preliminary-results-integration-map.md)
- Test cases: [`test_cases/BV240-index.md`](test_cases/BV240-index.md) — BV240a–p, 2 of 16 written up in full
- Posted upstream: [`issues/1350-disclaimer-comment-posted.md`](issues/1350-disclaimer-comment-posted.md) → [comment](https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5125205974)

### #1166 — Ranked Robin multiwinner highlights one winner (OPEN, `good first issue` — ANALYSED, patch written)

Reproduces on production 2026-08-04 and on upstream `main` @ `15289d30`; open since Dec 2025 with no PR. Root cause is two hard-coded literals in `RankedRobinResultsViewer` — `stars={1}` and a `ResultsTable` that never gets `winningRows`, so both default to one winner regardless of `num_winners`.

- **The reporter's guess is half right.** STAR does take a different path, but **Approval** is a bloc method using these same two components and already passes `race.num_winners`. This is an omission with its corrected sibling 140 lines below it in the same file — not a design mismatch to work around.
- **Plurality has the identical bug**, unreported. Multi-winner Choose One is offered by the race form and tabulates through `runBlocTabulator`.
- **The positional/identity mismatch the patch won't fix:** highlighting picks the first *N* rows, but `elected` is built round by round, and Ranked Robin's head-to-head tiebreak rung ignores the sort's `tieBreakOrder`. Demonstrated rather than asserted — round 1 of the reporter's own poll was decided on exactly that rung. Recommended as a separate issue, since it affects Approval too.

→ [`issues/1166-ranked-robin-multiwinner-highlighting.md`](issues/1166-ranked-robin-multiwinner-highlighting.md) · fix: [PR #1479](https://github.com/Equal-Vote/bettervoting/pull/1479)

### #1480 — the star can land on a candidate that didn't win (CLOSED as by-design — backend reframe drafted, fix parked)

Split out of #1166 because it is a different defect and #1479 does not touch it. Highlighting keys on **row position** in `summaryData.candidates`; the winners are `results.elected`. Ranked Robin's head-to-head tiebreak rung ignores the `tieBreakOrder` the summary array is sorted by, so the two orderings disagree about half the time whenever a Copeland tie straddles the winner cutoff.

**Closed 2026-08-20** as by-design: the frontend trusts the backend's order by convention. Which relocates the defect rather than resolving it — the convention is *implemented* (STAR and Approval pass `runBlocTabulator`'s `evaluate` re-sort, IRV re-sorts with `sortCandidates(…, roundResults)`, Allocated Score got its own elected-first sort in maintainer commit `cd1c01d9`), and Ranked Robin is the only tabulator that neither re-sorts nor is order-safe by construction. The issue's own Scope section over-reached (Approval/Plurality highlight positionally but *cannot* mismatch), which is conceded in the reply. Backend fix written, tested and parked as the sixth §7 row; see the [closure section of the page](issues/rr-winner-highlight-positional-vs-elected.md).

Confirmed on production with **BV2270** (`8h4bvh`), minted for it: the heading reads *"Alder wins!"* while the star and the gold row sit on **Birch**, and both show 2 wins / 67% so the page offers no way to tell which is right. `tieBreakType: none` — the winner is fully determined by the ballots; only the row order came from the shuffle.

Technique worth remembering: the shuffle re-seeds on every ballot cast, so **mirror-pair ballots** (a ranking plus its exact reverse) re-roll the display order while leaving every pairwise result and every Copeland score untouched. That turns a 50/50 draw into something you can just keep re-rolling until it shows what you need.

→ [`issues/rr-winner-highlight-positional-vs-elected.md`](issues/rr-winner-highlight-positional-vs-elected.md)

### #1497 — description fields no longer say they support links (FILED, ours — docs PR open)

Election and race descriptions render markdown, so `[text](url)` becomes a real link — but `formatMarkdown()` has no bare-URL autolinker, and almost nothing in the UI says so. Confirmed on production with **BV2261** (`y2fbpc`): its description ends in a pasted address, and the page carries **zero** anchors to that host among 38 links.

- **One of the two missing hints looks like a rebase artifact.** `a8efc073` shipped the feature with a `Supports **bold** and [link text](url) formatting` helper in three files; `main` has it in two. `RaceForm.tsx` lost it to `89f6e1a6`, **authored 2025-09-05 and committed 2025-12-14** — written before the markdown feature existed, landed on top of it, so it deleted a hint its author had never seen. A `git log` date that predates the thing it removes is the tell.
- **The new wizard's Description field never had one**, and it's now the default path into election creation.
- **Neither description appears on the results page** — election description is on the election home page, the Browse Polls card and email invites; race description is on the ballot. So a link in a description never reaches anyone who lands on `/results`.
- **Titles are plain text** on every surface; markdown in a title displays literally.
- **Cost to us:** 65 of the star-voting-library's 217 frozen exports carry their lesson backlink as a bare URL, permanently unclickable. House form changed to the bracketed one and `--dry-run` now warns ([`6460834`](https://github.com/masiarek/star-voting-library/commit/6460834)).

→ [`issues/1497-description-link-affordance.md`](issues/1497-description-link-affordance.md) · filed: [#1497](https://github.com/Equal-Vote/bettervoting/issues/1497) · docs: [PR #1498](https://github.com/Equal-Vote/bettervoting/pull/1498) adds a **Tips and Tricks** page

### #827 — Where to position a link to "Help" (OPEN since Feb 2025, Adam's — FIX WRITTEN, unreviewed)

Reads like an unresolved product debate; isn't one. It was spec'd as [#1450](https://github.com/Equal-Vote/bettervoting/issues/1450) and implemented in [PR #1451](https://github.com/Equal-Vote/bettervoting/pull/1451), open since 2026-07-23 with no review but the author's own. Documentation moves out of the login-gated account dropdown into **About Us ▾**, renamed from "Help", visible logged out on desktop and at 320px.

- **The issue's premise is out of date.** Help *is* reachable before login today — **Paper Ballots ▾ → "Paper Ballots"** points at `docs.bettervoting.com/help/paper_ballots.html`, and that page ships the full docs sidebar. So this is signage, not a walled garden. Verified live 2026-08-08.
- **The entry point Adam asked for in Oct 2025 already exists** — `docs.bettervoting.com/` returns 200 and says "Welcome to our documentation!". The remaining ask was only the link's position.
- **One thing to settle before #1451 merges, now [raised on the PR](https://github.com/Equal-Vote/bettervoting/pull/1451#issuecomment-5225775841):** it nests Documentation under **About Us** — where a reader looks for *who we are*, not *how do I use this* — and as the *sixth of six* items in that dropdown. The link goes from login-gated to menu-gated. Four options offered, cheapest a one-line reorder to the top of the dropdown; the footer (four social accounts, no documentation at all) is the one placement independent of the nav redesign still in progress.
- **The other 2 of the issue's 3 asks are now split out** — [#1494](https://github.com/Equal-Vote/bettervoting/issues/1494) (demo videos in the help docs) and [#1495](https://github.com/Equal-Vote/bettervoting/issues/1495) (try-before-registering), both ours, filed 2026-08-08. **#827 now rests entirely on #1451.**
- **#1495's finding: `/sandbox` already is the guest demo, and nothing links to it.** `App.tsx:71` registers it; signed out it tabulates a full STAR election and renders the whole results view, with no account and nothing stored — and the route appears nowhere else in the codebase. Which makes "hand out shared test logins on a live voting platform" the expensive answer to a question already solved. Caveat carried into the ticket: its Race Details panel expands to a permanent `Loading...`.

→ [`issues/827-help-link-placement.md`](issues/827-help-link-placement.md) · posted upstream: [`issues/827-comment-posted.md`](issues/827-comment-posted.md) → [#827 comment](https://github.com/Equal-Vote/bettervoting/issues/827#issuecomment-5225702899); two PR-level loose ends (Merch URL vs. its own ticked QA step, dead `nav.better_voting` key) in [`issues/1451-loose-ends-comment-posted.md`](issues/1451-loose-ends-comment-posted.md) → [#1451 comment](https://github.com/Equal-Vote/bettervoting/pull/1451#issuecomment-5225709418)

### #1043 / BV230 — Show Preliminary Results after finalize (RESOLVED, awaiting close)

Not reproducible on current production. Retested 2026-07-29 as BV230-r1 (`yyvwrj`). All three fixes proposed in the 2025 thread shipped independently — see [`issues/1043-show-preliminary-results.md`](issues/1043-show-preliminary-results.md).

### #1353 — Public audits vs. immutability (OPEN)

The change history is already in the database (`electionDB` has been append-only since Jan 2024), but actor and reason are discarded. PR #1365 (`JacksonLoper/publicaudit`) already implements the read endpoint and page with no migration — **this is a review, not a build.**

### #1420 — JSON export leaks internal object shape (OPEN, Adam's)

v2 export format. In flight on the local `feature/clean-json-export` branch. Note: once v2 ships, `fetch_bv_export.py`'s "byte-equivalent to the UI export" property in the `bettervoting` skill becomes false — the script reads the API, the button emits v2.

### #904 — "Bloc STAR Voting" for Basic Multi-Winner (OPEN since Apr 2025, Adam's — SIZED, part in flight)

Sized on request. **2–3 hours for what's left, low risk, scoped to display text** — and the reason it sat for over a year is probably that the ticket doesn't read that way.

- **One of the three render sites is already done** in draft PR [#1475](https://github.com/Equal-Vote/bettervoting/pull/1475) (results page), filed against #1086 rather than #904. It is a draft on purpose and **must not merge before [#1474](https://github.com/Equal-Vote/bettervoting/pull/1474)** — its `learn_link` targets the page #1474 adds. What's left of #904 is the ballot header and the edit-race summary/radio.
- The name resolves through **one** chokepoint (`methodValueToTextKey` → `methods.<key>.full_name`), and `num_winners` is already in scope at every site. The `Bloc` adjective already exists and is already wired — it's just attached to the winners ("STAR Voting with 3 **Bloc** winners") rather than to the method.
- **The trap:** editing `methods.star.full_name` is the obvious one-liner and it's wrong — that key is shared with the landing page and the STAR tooltip, where "STAR Voting" is correct. Needs a sibling key plus a resolver, which is what #1475 does.
- **The blocker is scoping, not code.** The issue says "simple wording change… no other changes required" but also asks that the JSON show the new name, over a comment reading `"voting_method": "STAR"`. That value is a DB column and a dispatch key, not a label — reading the ticket literally prices it as a migration over every historic race. Settle this before anyone writes more code.
- The string is **"Bloc STAR Voting"**, adjective first — [retracted upstream](https://github.com/Equal-Vote/bettervoting/issues/904#issuecomment-5178824529) after the issue's own Should-Be said otherwise. Generalises to all five bloc-capable methods; [#912](https://github.com/Equal-Vote/star-server/issues/912) is the Plurality twin. Widen the resolver to a lookup, not an `if`.

→ [`issues/904-star-bloc-naming.md`](issues/904-star-bloc-naming.md). Read from source at upstream `15289d3`; nothing run in a browser. The page's filename says `star-bloc` and stays that way — the issue thread links it by URL.

## Open questions waiting on upstream

From the #1350 comment, in priority order:

1. **Q2 — who approves the closed-list warning wording?** Blocks BV240c and BV240d. The issue's framing ("extra trivial for them to reveal what those votes are") overstates what the code allows.
2. **Q7 — should #1350 be split four ways?** Would let deliverable (i) land immediately.
3. **Q5 — the mid-election flip.** `setPublicResults` has no state guard, so a voter can be shown a ballot with results hidden and have that change under them. Copy can't fix it.
4. **Q4 — should `getAnonymizedBallots` be unauthenticated in any state?** One anonymous GET returns full ballots by stable id. The creation wizard turns the flag on by default and never shows the creator that choice.
