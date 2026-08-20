# Parked: ready for BetterVoting when the PR freeze lifts

**Status: 🚦 PR FREEZE — Adam was asked not to open new PRs on `Equal-Vote/bettervoting` until Arend catches up with the existing queue (~60 open, ~43 from the docs/i18n/fixes program indexed in [issue #1556](https://github.com/Equal-Vote/bettervoting/issues/1556)).**

Everything below is finished or fully specified work, parked here so it survives until publishing is welcome again. Each item carries a flag:

- **READY** — the change is written and verified; publishing is mechanical.
- **READY-AFTER-MERGE** — written, but its target only exists once the named PRs land.
- **AWAITING-DIRECTION** — offered upstream; needs a maintainer to pick an option first.

Do **not** open any of these as PRs while the freeze is on.

---

## 1. Re-parent the 31 help pages into the tree — READY-AFTER-MERGE (#1543 + the content PRs)

Every content PR carries `parent: BetterVoting Documentation` so it could merge independently. Once [#1543](https://github.com/Equal-Vote/bettervoting/pull/1543) and the content PRs land, one follow-up PR applies this map (verified against a full local Jekyll build of all branches merged — 31 pages re-parented, none lost from the nav):

Pattern per page: set `parent:` and `nav_order:` as below, and add `grand_parent:` (For Voters / Setting Up / Counting and Results / Reference pages get `grand_parent: BetterVoting Documentation` for the two top sections' children, `grand_parent: Running an Election` for the three subsection's children).

| Page (stem in `docs/help/`) | parent | nav_order |
|---|---|---|
| how_to_vote | For Voters | 1 |
| after_you_vote | For Voters | 2 |
| is_my_vote_secret | For Voters | 3 |
| voter_troubleshooting | For Voters | 4 |
| how_voters_get_access | For Voters | 5 |
| using_another_language | For Voters | 6 |
| election_or_poll | Setting Up Your Election | 1 |
| choosing_a_voting_method | Setting Up Your Election | 2 |
| electing_more_than_one | Setting Up Your Election | 3 |
| ballot_options | Setting Up Your Election | 4 |
| paper_ballots | Setting Up Your Election | 5 |
| before_you_open | Setting Up Your Election | 6 |
| election_states | Setting Up Your Election | 7 |
| managing_your_voters | Setting Up Your Election | 8 |
| emails_to_voters | Setting Up Your Election | 9 |
| letting_voters_change_their_vote | Setting Up Your Election | 10 |
| polls_and_multiple_races | Setting Up Your Election | 11 |
| security_options | Setting Up Your Election | 12 |
| choosing_a_tie_breaking_rule | Setting Up Your Election | 13 |
| reading_your_results | Counting and Results | 1 |
| top_score_vs_winner | Counting and Results | 2 |
| preliminary_results | Counting and Results | 3 |
| bloc_star | Counting and Results | 4 |
| ties | Counting and Results | 5 |
| hand_count | Counting and Results | 6 |
| verifying_a_tie_break | Counting and Results | 7 |
| exporting_your_data | Counting and Results | 8 |
| tips_and_tricks | Reference | 1 |
| faq | Reference | 2 |
| glossary | Reference | 3 |
| how_to_enable_beta_features | Reference | 4 |

Reminder that bites: `parent:` must match the target page's `title:` character-for-character or the page silently vanishes from the nav — verify with a local build, not by eye.

## 2. The cross-link wiring PR — READY-AFTER-MERGE (the content PRs)

Pages could only link targets already on `main` (`jekyll-relative-links` rewrites only links whose target exists), so cross-references are deliberately thin. The full wiring list — **~52 link insertions across 24 pages, itemized per page** — is section 5 of [the consistency review](../analysis/help-pages-consistency-review.md). One PR, after the batch lands.

Specific one-liners folded into the same PR:

- `election_or_poll.md`: restore the two links to `election_states.md` (removed because #1502 was unmerged).
- `is_my_vote_secret.md`: restore the After You Vote related-link.
- `verifying_a_tie_break.md` / `choosing_a_tie_breaking_rule.md`: link each other.
- `using_another_language.md`: delete the three *"in review"* markers as de/fr/it merge (three words each).
- `exporting_your_data.md`: after [#1576](https://github.com/Equal-Vote/bettervoting/pull/1576) merges, state that `overvote_rank`/`has_duplicate_rank` are per-race columns.

## 3. Duplication trims and terminology alignment — READY-AFTER-MERGE

From [the consistency review](../analysis/help-pages-consistency-review.md), sections 2–4: nine duplications (largest: `managing_your_voters` §"Emailing your voters" reproduces nearly all of `emails_to_voters` — the latter should own it) and the terminology table (lead item: "organiser" vs "administrator" vs "admin" splits three ways across the voter pages; pick one, sweep once). Best done as one editorial PR after the batch lands, so the diffs are against real files.

## 4. i18n per-vocabulary keys — AWAITING-DIRECTION ([#1574](https://github.com/Equal-Vote/bettervoting/issues/1574))

Offered upstream: fix the gendered-noun problem for the worst ~12 strings via `_election`/`_poll` variants or i18next `context`. Blocked on maintainers choosing a direction. Evidence and string list are in the issue.

## 5. CI check for untranslated locale values — AWAITING-DIRECTION ([#1575](https://github.com/Equal-Vote/bettervoting/issues/1575))

Offered upstream: ~20-line check (byte-identical-to-English count per locale, ratchet variant). The validation logic already exists — it is the script used to verify all seven locale PRs; porting it to the repo's CI is mechanical once a maintainer says which harness (plain node vs vitest).

## 6. Quick-poll ownership — AWAITING-DIRECTION ([#1556 comment](https://github.com/Equal-Vote/bettervoting/issues/1556))

Three options posted (own-on-signin / make claim-key work / document fire-and-forget as intended). Options 1 and 3 are small; do not start until answered.

## 7. Four code fixes — READY (branches committed locally, nothing pushed)

Tabulator and results-page defects, each with a root cause traced to a line, a failing-before test, and a QA page. All four sit on local branches cut from `origin/main` `454a38ae`; none is pushed, and no fork branch exists yet. `git worktree list` inside any BV clone shows the worktrees.

| Issue | What the fix does | Branch @ commit · worktree | Evidence | Page |
|---|---|---|---|---|
| [#1469](https://github.com/Equal-Vote/bettervoting/issues/1469) | Ranked Robin walks its own tiebreak ladder (1st Degree over the finalists, then 2nd Degree over the field) before the random rung. Today a 3+-way tie — i.e. **every** three-candidate Condorcet cycle — goes straight to the shuffle | `fix/1469-ranked-robin-margins-tiebreaker` @ `585b08f1` · `bv-rr-degrees` | jest 52 → **58** green; 4 of the 6 new tests fail on `main`, 2 regression tests pass both sides; `tsc` clean | [1469](../issues/1469-ranked-robin-degrees-of-ties.md) |
| [#1507](https://github.com/Equal-Vote/bettervoting/issues/1507) | Allocated Score stops reporting `tieBreakType: 'random'` when nothing tied — the check was tautological, so **every** STAR-PR election ever tabulated claimed a random tiebreak, and the results page announced "Tied!" | `fix/1507-star-pr-tiebreaktype` @ `9a2b8b2a` · `bv-1507` | jest 52 → **54** green; verified against live production `bvhchj` (7 seats, unique max in all 7 rounds, still reported `random`) | [1507](../issues/1507-star-pr-tiebreaktype-always-random.md) |
| [#1484](https://github.com/Equal-Vote/bettervoting/issues/1484) | One `NaN` in `runBlocTabulator`'s comparator (`-Infinity - -Infinity`) stopped its lexicographic sort one key early, so the Race Details tables showed the second-highest scorer instead of the tiebreak runner-up | `fix/1484-race-details-runner-up` @ `a892a0ff` · `bv-1484` | jest 53/56 → **56/56**; comparator replayed over the frozen `qhjyr2` payload reproduces production's order exactly | [1484](../issues/1484-race-details-runner-up.md) |
| [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035) | `NaN%` in the runoff table and the blank runoff pie, when every counted ballot rates both finalists equally. Display guard only — **no winner, tally or percentage changes** | `fix/1035-runoff-zero-denominator` @ `47d241a4` · `bv-1035` | jest 52 → **53** green; probe evaluates the shipped `formatPercent` rather than a transcription | [1035](../issues/1035-runoff-zero-denominator-fix.md) |

**Before any of these opens as a PR:**

1. Rebase on the then-current `origin/main` and re-run `npx jest src/Tabulators/` in `packages/backend` (setup recipe: `npm install`, then `npm run build` in `packages/shared`, then `npm run generate:openapi` — without the last two, every tabulator suite fails on a missing module and it looks like the fix broke them).
2. #1469 should first absorb two things from the duplicate branch `fix/1469-ranked-robin-margins-tiebreakers` @ `709d5c2e` (parked in `bv-copy-fix`): the 69-ballot five-way-cycle regression test, and printing the margin sums in the log lines. Credit that session in the PR body.
3. #1484 and #1035 touch the same results page from different sides — #1484 changes *which pair* the runoff table calls the finalists, which is what decides whether #1035's denominator is zero. Open them in either order, but say so in both bodies.
4. #1035 introduces two new `en.yaml` strings that are **not approved copy**. They need a wording decision, or the PR should propose them explicitly as such.
5. Each page's "could not verify" section is real: none of the three display fixes was rendered in a browser. If the local stack is up when the freeze lifts, run `BV2264` first.

---

---

## Not parked here, deliberately

- **Security-adjacent findings** (roll-state enforcement, single-ballot endpoint gating, voter-ID reveal permission). This repo is public; per its own ground rules these go to Arend first, one at a time, framed as "is this deliberate?". They live in the session notes with file:line evidence, ready for that conversation.
- **Tabulation cases** — they belong in star-voting-library, per the README.
