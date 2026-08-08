# bettervoting-qa

QA test cases, bug analysis, and issue notes for [Equal-Vote/bettervoting](https://github.com/Equal-Vote/bettervoting).

**Start here if you are picking this up:** [HANDOFF.md](HANDOFF.md).

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
| **bettervoting-qa** | QA of the BetterVoting product itself | private |
| [Equal-Vote/bettervoting](https://github.com/Equal-Vote/bettervoting) | upstream | public |

Tabulation test cases do **not** belong here — they go in `star-voting-library` with a YAML and a frozen BV export, indexed by the auto-generated `BV_registry.md`. This repo is for the QA that has no YAML home: UI, settings, roles, archive, casting, copy.

## Current work

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

→ [`analysis/flat-scores-abstention/`](analysis/flat-scores-abstention/) · baselines: [`test_cases/BV2263-2267-index.md`](test_cases/BV2263-2267-index.md) · upstream reference cases: [Flat scores, ties & tie-breaking](https://masiarek.github.io/star-voting-library/01_STAR/03_Criteria/Flat_scores_ties/index.html)

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

### #1480 — the star can land on a candidate that didn't win (FILED, ours)

Split out of #1166 because it is a different defect and #1479 does not touch it. Highlighting keys on **row position** in `summaryData.candidates`; the winners are `results.elected`. Ranked Robin's head-to-head tiebreak rung ignores the `tieBreakOrder` the summary array is sorted by, so the two orderings disagree about half the time whenever a Copeland tie straddles the winner cutoff.

Confirmed on production with **BV2270** (`8h4bvh`), minted for it: the heading reads *"Alder wins!"* while the star and the gold row sit on **Birch**, and both show 2 wins / 67% so the page offers no way to tell which is right. `tieBreakType: none` — the winner is fully determined by the ballots; only the row order came from the shuffle.

Technique worth remembering: the shuffle re-seeds on every ballot cast, so **mirror-pair ballots** (a ranking plus its exact reverse) re-roll the display order while leaving every pairwise result and every Copeland score untouched. That turns a 50/50 draw into something you can just keep re-rolling until it shows what you need.

→ [`issues/rr-winner-highlight-positional-vs-elected.md`](issues/rr-winner-highlight-positional-vs-elected.md)

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
