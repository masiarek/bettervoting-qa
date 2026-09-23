# Bloc STAR — Stats for Nerds: supporting files

Companion to [`../bloc-star-stats-for-nerds.md`](../bloc-star-stats-for-nerds.md) (the issue text, ready to paste). Assembled 2026-09-23 from upstream `Equal-Vote/bettervoting` main `a005c42e` and `masiarek/star-voting-library` master `54ccaf83`.

- `img/as-is_k7pfqt_bloc_race_details.png` — Race Details on a live Bloc STAR election: Tabulation Steps only, no Stats for Nerds dropdown.
- `img/should-be_67x93r_single_equal_support.png` — the single-winner Distribution of Equal Support panel the Bloc page must get, once per seat.
- `new-cases/*.yaml` — four proposed star-voting-library cases (library YAML schema, engine-verified except the 2-candidates/2-seats one, which the LH engine refuses by design and only BetterVoting can run). Not yet in the library; promote after the Should-Be is confirmed with Arend.
  - `sfn_bloc_equal_support_per_seat_c5_b10` — same Equal Support total, different histogram shape per seat, two flat ballots. Verified seat-1 histogram is `[1,0,0,1,1,1]` (0★1, 3★1, 4★1, 5★1), seat 2 `[1,1,1,1,0,0]`.
  - `sfn_bloc_three_seats_score_tiebreak_c4_b9` — 3 seats, Gus is the runner-up twice then wins seat 3 on the score tiebreak; distinct histogram every seat.
  - `sfn_bloc_five_star_tiebreak_c3_b6` — both seats decided at the five-star rung, no lot. To make the "runner-up from roundResults, not from score order" angle bite, reorder the columns to Pia,Rosa,Quinn (ballots 5,1,5 / 5,4,0 / 4,2,5 / 3,4,1 / 5,3,3 / 2,4,4); every number is unchanged.
  - `sfn_bloc_two_candidates_two_seats_c2_b5` — candidates == seats; seat 2 has `runner_up: []`. BetterVoting accepts the shape; mint it as a BV election.
- `sketch.diff` — the minimal implementation sketch the effort estimate is based on (47 changed lines across Results.tsx and STAREqualPreferencesWidget.tsx). Not applied anywhere.

Both screenshots came from the library's `bv_result_screenshot.py` (`--clip ".detailedSteps" --prep "document.querySelector('.detailExpander').click()"` and `--panel "Distribution of Equal Support"`). Its `--list-panels` mode is the acceptance test: `no combobox` today on any Bloc election, the four-entry list after the fix.
