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

---

## Not parked here, deliberately

- **Security-adjacent findings** (roll-state enforcement, single-ballot endpoint gating, voter-ID reveal permission). This repo is public; per its own ground rules these go to Arend first, one at a time, framed as "is this deliberate?". They live in the session notes with file:line evidence, ready for that conversation.
- **Tabulation cases** — they belong in star-voting-library, per the README.
