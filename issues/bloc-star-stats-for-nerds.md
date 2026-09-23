# Add "Stats for Nerds" to Bloc STAR (multi-winner STAR) results

> **Filed 2026-09-23 as [Equal-Vote/bettervoting#1674](https://github.com/Equal-Vote/bettervoting/issues/1674)** with labels Role: Front End, Complexity: Small, Track Via Parent (#1652). The text below is what was posted; screenshots embed from `bloc-star-stats-for-nerds/img/` in this repo.

<!-- Labels: Role: Front End · Complexity: Small · Track Via Parent (#1652) -->

## Overview

Single-winner STAR results have a **Stats for Nerds** dropdown under Race Details (Tabulation Steps, Distribution of Equal Support, Head-to-Head Matchups, Average Supporter Profile). Bloc STAR results (a STAR race with more than one winner) show only the Tabulation Steps widget, with no dropdown at all. A client has asked for these stats on a Bloc STAR election (stretch item "Add stats for nerds" on #1652; Arend on Slack, 2026-09-22), so bring Bloc STAR to parity, with the seat-dependent section drawn once per seat.

Bloc STAR fills N seats by running the single-winner STAR count N times on the same ballots, removing each winner before the next count. In the code, `results.roundResults[i]` is the count for seat i+1, and `roundResults[i].runner_up[0]` is the finalist who lost that seat's automatic runoff.

## As-is / Should-be

| | Single-winner STAR | Bloc STAR |
|---|---|---|
| **As-is** | Race Details → Stats for Nerds dropdown with 4 entries | Race Details → Tabulation Steps only, no dropdown (e.g. https://bettervoting.com/k7pfqt/results) |
| **Should-be** | unchanged | Race Details → the same 4-entry dropdown; Distribution of Equal Support drawn once per seat |

The library's headless screenshot script states the gap in one line each: on a Bloc election `bv_result_screenshot.py 2cdvm6 --list-panels` reports `no combobox`; on a single-winner election (`67x93r`) it reports `["Tabulation Steps","Distribution of Equal Support","Head-to-Head Matchups","Average Supporter Profile"]`. After the fix the Bloc line must match the single-winner one.

<!-- attach: as-is screenshot (Race Details on k7pfqt or 2cdvm6: Tabulation Steps, Winner 1 / Winner 2, no dropdown) -->
<!-- attach: should-be screenshot (single-winner dropdown; Arend's Slack image or 67x93r) -->

### What each section should show on a Bloc STAR race with N seats

1. **Tabulation Steps**: as today, one "Winner k" block per seat.
2. **Distribution of Equal Support**: N charts stacked, one per seat, each headed with the seat and its finalist pair (e.g. "Winner 2: Anika vs Bo", which also answers #903). Each bar is the share of that seat's equal-support ballots at that star level, exactly as the single-winner chart shows it today (on 67x93r: 5★ 50%, 3★ 50%). The ballots behind the bars must add up to that seat's Equal Support count in the Automatic Runoff chart and in the Tabulation Steps sentence. A seat with no runner-up (the last seat when one candidate is left) shows the existing "X is the only candidate, and wins by default" text instead of a chart.
3. **Head-to-Head Matchups**: unchanged. The candidate dropdown lists winners in seat order, then the rest by score.
4. **Average Supporter Profile**: unchanged; its "preferred frontrunner" panel is already hidden when `num_winners > 1`.
5. Single-winner STAR results are unchanged. The three `ALL_STATS`-flagged entries stay behind the flag.

## Where it lives

- `packages/frontend/src/components/Election/Results/Results.tsx`, `STARResultsViewer` (line 31). `rounds` is `race.num_winners` (line 35). Lines 46–59 are the single-winner branch: `STARDetailedResults` plus `<DetailExpander level={1}>` holding the four widgets and the three flagged ones. Lines 60–64 are the multi-winner branch: only `STARResultDetailedStepsWidget`. The change is to make lines 60–64 look like 46–59, minus `STARDetailedResults`.
- `packages/frontend/src/components/Election/Results/components/DetailExpander.tsx`: `level={1}` is the Stats for Nerds dropdown. **Constraint:** it builds the menu from `React.Children.toArray(children)` filtered by `selectorTitleKeys` (lines 29–38) but renders `children[selector]` from the raw children (line 92). So each widget must be exactly one direct child, in menu order, with any conditional children last. Do not `.map()` per-seat widgets as siblings in Results.tsx and do not wrap them in a Fragment; the per-seat loop goes inside the widget. A brand-new component must also be added to `selectorTitleKeys`.
- `packages/frontend/src/components/Election/Results/STAR/STAREqualPreferencesWidget.tsx`: takes one `frontRunners` pair; line 18 reads `frontRunners[1].id`, which throws when a seat has no runner-up.
- The backend already returns everything needed: `runBlocTabulator` (`packages/backend/src/Tabulators/Util.ts`) pushes one `roundResults` entry per seat with its own `winners[0]`, `runner_up[0]` and `tieBreakType`, and `votesPreferredOver` is filled for every candidate pair regardless of seats. No backend, API or database change.

## Action items

**Step A: drop-in, no logic change (about 10 lines in Results.tsx).** Add `<DetailExpander level={1}>` to the `rounds > 1` branch with `STARResultDetailedStepsWidget`, `STAREqualPreferencesWidget`, `HeadToHeadWidget`, `VoterProfileWidget topScore={5}` and the three flagged widgets, in that order. Step A alone gives three of the four sections and can ship on its own if the election date bites.

**Step B: per-seat Distribution of Equal Support (about 30–40 lines in STAREqualPreferencesWidget.tsx).**
1. Read `results.roundResults` inside the widget (via `useRace()`) instead of a single `frontRunners` prop, or pass a per-seat list built in Results.tsx. Keep it one child element.
2. Loop over seats inside the widget: one `Widget`/`ResultsBarChart` per seat, finalists `roundResults[i].winners[0]` and `.runner_up[0]`.
3. Head each chart with the seat and the pair. `STARResultDetailedStepsWidget.tsx:47` hardcodes `Winner ${r + 1}` in English with no i18n key; add one key (e.g. `results.star.seat_heading`, "Winner {{n}}") and use it in both widgets rather than adding a second hardcoded heading.
4. When `runner_up` is empty, render `t('results.single_candidate_result', {name})` (en.yaml, already used by `STARResultSummaryWidget.tsx:35`) instead of a chart.
5. Per-seat tie text must come from `roundResults[i].tieBreakType`, not the top-level `results.tieBreakType`, which only reflects the final seat (#1582).

**Step C: a backend unit test.** `Star.test.ts` has no test with more than one winner. Add one `Star(candidates, votes, 2)` case using the BV2266 ballots below, asserting each seat's winner and runner-up and that the pairwise matrix includes non-finalists (Anika > Bo 4–2, > Cora 5–2, > Dev 4–3; Dev > Bo 2–1).

**Out of scope, separate issues if wanted:** the level-0 Race Details tables (`STARDetailedResults`: Scores Table + Runoff Table) are single-winner only and read `summaryData.candidates[0..1]` as the finalists; a per-seat version is its own ticket. The Head-to-Head chart's grey-segment tooltip ("Distribution of Equal Support") has been empty for every cardinal method since 860e1d63 dropped the per-score computation; pre-existing and unrelated to seats.

## How to verify

The Sandbox cannot be used: it never mounts `AnonymizedBallotsContextProvider`, so Race Details stays on "Loading..." (#782). Use live elections with public results, on production or with the "Local Frontend + Production Backend" setup from `docs/contributions/developers/1_local_setup.md`. All of these are frozen in `masiarek/star-voting-library` (`02_STAR_Bloc`) with a `_bv_export.json` and an independent engine count, so the expected numbers below can be read off the library page.

| Election | Shape | Per-seat finalists and Equal Support count | Exercises |
|---|---|---|---|
| [k7pfqt](https://bettervoting.com/k7pfqt/results) (BV2266) | 4 cand / 2 seats / 7 ballots | S1 Dev vs Bo, 4 (2★1, 3★1, 5★2); S2 Anika vs Bo, 1 (1★1) | different pair per seat, multi-level histogram, same runner-up twice. Head-to-Head dropdown order: Dev, Anika, Bo, Cora |
| [8h3yrx](https://bettervoting.com/8h3yrx/results) (BV1835) | 5 / 4 / 100 | S1–S4 Bianca, Cedric, Deegan, Eli each vs Ava, 0 each (all-zero histograms) | 4 stacked charts, all-zero data, no NaN; dropdown order Bianca, Cedric, Deegan, Eli, Ava |
| [yhxy7q](https://bettervoting.com/yhxy7q/results) (BV130) | 6 / 3 / 9 | S1 Someone I Like vs Santa Claus, 6 (3★4, 5★2); S2 Santa Claus vs The Lesser Evil, 0; S3 The Lesser Evil vs Elvis Presley, 0 | happy path, 3 seats |
| [fk38pk](https://bettervoting.com/fk38pk/results) (BV1815, closed) | 3 / 2 / 3 | S1 A vs C, 0; S2 B vs C runoff 1–1 decided by score, 1 (0★1) | score tiebreak on seat 2 |
| [484mbm](https://bettervoting.com/484mbm/results) | 3 / 2 | S1 Blythe vs Arden, random after a 3-way score tie | random tiebreak on seat 1; `roundResults[0].tieBreakType` is `random` while the top-level field reads `none` (#1582) |
| [2cdvm6](https://bettervoting.com/2cdvm6/results) (BV2290) | 12 / 5 / 108 | Equal Support 96, 64, 96, 96, 14 | many candidates (11 Head-to-Head charts), large Equal Support |
| [rq2c3g](https://bettervoting.com/rq2c3g/results) (BV2292) | 14 / 6 / 175 | Equal Support 0, 161, 0, 123, 58, 58 | six stacked charts |
| [xpr4wk](https://bettervoting.com/xpr4wk/results) (BV2289) | 5 / 2 / 12 | S1 Uma vs Ugo, 7; S2 Ugo vs Maya, 0 | histogram present on one seat, empty on the next |

Checks:
- The dropdown has exactly four entries in this order: Tabulation Steps, Distribution of Equal Support, Head-to-Head Matchups, Average Supporter Profile; no duplicate entry; selecting each renders that widget and not its neighbour. With `flag_overrides` ALL_STATS on, three more entries appear.
- Distribution of Equal Support: one chart per seat with the pairs and totals above. If the seat-1 chart on 8h3yrx shows Bianca vs Cedric, the widget is reading `summaryData.candidates[0..1]` instead of `roundResults[0]`.
- A seat with zero equal-support ballots renders six 0% bars and no NaN (8h3yrx every seat).
- Tabulation Steps for Winner 1 on 484mbm still shows the random tiebreak.
- Single-winner STAR results (e.g. 67x93r) are unchanged.
- Print preview on 8h3yrx with Distribution of Equal Support selected: no chart split across a page. At 375px width no horizontal scroll.
- Known, not this issue: on w3vvff and r4dqvd the frontend keeps partial/flat ballots the tabulator files as abstentions (#1478), so histogram totals there will not match the runoff chart. Do not use those two for count matching.
- `bv_result_screenshot.py <id> --list-panels` on any Bloc election above must print the four-entry list; `--panel "Distribution of Equal Support"` captures the stacked charts for the PR.
- No Playwright spec opens Race Details and all four specs create `num_winners: 1` races; an e2e for this is a separate ticket.

### Test elections still needed (no live coverage today)

1. **2 candidates / 2 seats** (and 3 / 3): the last seat has `runner_up: []`. BetterVoting accepts this shape (the form only rejects more winners than candidates), but no public election or library case exists, and the library engine refuses seats == candidates, so it must be a BV-only election. Expected: Winner 2 page shows the single-candidate text, and the seat-2 Equal Support section shows that text instead of a chart.
2. **A seat decided at the five-star rung**: none exists anywhere. Engine-verified proposal in the library PR: 3 candidates / 2 seats, both seats resolved at five-star, no lot.
3. **3 seats with a non-trivial histogram at every seat**, same runner-up losing twice, then a score tiebreak: engine-verified proposal (4 candidates / 3 seats / 9 ballots).
4. **Same Equal Support total, different shape per seat, with two flat ballots**: engine-verified proposal (5 / 2 / 10).

## Effort

Small. Step A about 10 lines; Step B about 30–40 lines plus one i18n key; Step C one backend test. Half a day including manual QA on the elections above. No backend, API or database change.

## Open questions

1. How many seats and candidates does the client's Bloc STAR race have? Stacked per-seat charts are fine for 2–6 seats; beyond that a seat selector may be worth it.
2. Is Average Supporter Profile wanted, or only the three sections in the screenshot? (Default here: include it, it is a drop-in.)
3. Is Step A on its own acceptable for the election date if Step B slips?

## Related

- #1652 — parent; this is the "Add stats for nerds" stretch item
- #1582 — multi-winner export only carries the final seat's `tieBreakType`; per-seat text must read `roundResults[i]`
- #903 — "Distribution of Equal Support" title is unclear; the per-seat heading names the pair
- #1478 — partial/flat ballots dropped as abstentions; why histogram totals differ on w3vvff / r4dqvd
- #782 — Sandbox reporting is incomplete; why Stats for Nerds cannot be QA'd there
- #740 — abstentions and other high-level stats in Stats for Nerds
- #1086 / #904 / PR #1475 — Bloc STAR naming on the same results page
- PR #1541 — results help page; add a Bloc STAR paragraph once this lands
- masiarek/star-voting-library `02_STAR_Bloc/02_Examples/bloc_shapes/README.md` — the six live Bloc elections with 5+ seats, and the note that BV's own `Star.test.ts` never runs more than one seat
