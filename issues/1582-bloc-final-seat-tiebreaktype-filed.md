# #1582 — the bloc driver reports only the final seat's tiebreak, filed

**Filed 2026-08-20 (ours):** [Equal-Vote/bettervoting#1582](https://github.com/Equal-Vote/bettervoting/issues/1582). Issue only — no fix branch, per the PR freeze. The sibling the [#1507 page](1507-star-pr-tiebreaktype-always-random.md) flagged as "left for its own issue".

## The defect

`runBlocTabulator` (`Util.ts:312–316` at `main` @ `454a38ae`) copies `tied` and `tieBreakType` into the race-level result **from the final seat only** — by an explicit comment, *"only save the tie breaker info if we're in the final round"* — so a random draw that decided seat 1 of a Bloc STAR / Approval / Plurality / Ranked Robin race exports `tieBreakType: "none"`. The per-seat values are not lost: `results.roundResults.push(roundResults)` runs every seat and each entry keeps its own `tieBreakType`. Only the summary scalar is wrong — which is the one field `Results.tsx:444` reads for the "Tied!" heading and the one an auditor reads in the JSON. Single-winner races are unaffected (`w == 0 == nWinners-1`). Framed upstream as a reporting/design gap rather than an accident, with `Star.ts`'s own `setTieBreak` priority ladder as the suggested summary rule.

## Evidence, all executed

**Production `/API/Sandbox`, 2026-08-20** — `candidates ["Ann","Bob","Cal"]`, `num_winners 2`, seat 1 tied, seat 2 clean:

| method | `cvr` | per-seat `tieBreakType` | race-level |
|---|---|---|---|
| Approval | `[[1,1,0],[1,1,0],[0,0,1]]` | `random`, `none` | **`none`** (`tied: [Bob]`) |
| Plurality | `[[1,0,0],[1,0,0],[0,1,0],[0,1,0],[0,0,1]]` | `random`, `none` | **`none`** (`tied: [Bob]`) |
| STAR | `[[5,5,0],[5,5,0],[0,0,5]]` | `random`, `none` | **`none`** |
| RankedRobin | `[[1,2,3],[2,3,1],[3,1,2]]` | `random`, `none` | **`none`** |

A scratch jest file with the same four profiles against `main` @ `454a38ae` matched line for line (4 tests written to fail on the defect; 4 failed; file deleted).

**The draw can change who is elected.** A brute-force search over 3-ballot Bloc STAR profiles found `[[0,0,2],[0,0,2],[5,5,0]]`: Ann and Bob tie for seat 1 at every rung, and whichever of them loses the draw then loses the seat-2 runoff to Cal 2–1 — elected is {Ann, Cal} or {Bob, Cal} by `tieBreakOrder`, race-level `none` either way. The Ranked Robin 3-cycle gives {Ann, Bob} / {Bob, Cal} / {Cal, Ann} under its three rotations, `none` in all three. For Approval and Plurality a two-way seat-1 draw usually only swaps seat numbers.

**Live elections**, re-fetched from `GET /API/ElectionResult/<id>` on 2026-08-20 and identical to the frozen exports in star-voting-library:

| election | race | per-seat | race-level |
|---|---|---|---|
| [`9ff9jk`](https://bettervoting.com/9ff9jk/results) BV130-r2 | Bloc STAR 3 seats | `random, none, none` | `none` |
| [`dkj9dx`](https://bettervoting.com/dkj9dx/results) BV1525 — titled "Condorcet loser ties for seat 1" | Bloc STAR 4 seats | `random, none, none, none` | `none` |
| [`484mbm`](https://bettervoting.com/484mbm/results) BV2263 | Bloc STAR 2 seats | `random, none` | `none` |

A peer session's scan of all 393 frozen `*_bv_export.json` in star-voting-library finds seven bloc races in six production elections with an early-seat `random` under a race-level `none`, including an Approval bloc race (`4hfwqd`). No Ranked Robin bloc race in the corpus has an early-seat tie, so the RR row is by construction, not observed. BV750 (`3yr2qd`) is **not** a repro — both of its seats were random, so the race-level `random` there is right by coincidence.

## Dedupe

Read before filing: #348 (unbreakable bloc tie, 2023 — resolution/messaging), #1065 (perfect bloc tie → "No votes have been cast" — the abstention crash), #919 (bloc Plurality selection count — ballot UI), #843 (closed; scoring-round highlight colour). Searches for `runBlocTabulator`, `tieBreakType`, "bloc tie", "final seat", "multi-winner tiebreak" found nothing describing it; not in PARKED §7; no `bv-*` clone; nine yaml-* peer sessions confirmed no claim. Cross-referenced in the issue: #1507 (same field, opposite direction, different code path — `AllocatedScore.ts` never calls the driver), #1432 (the transparency umbrella), #1484 (parked fix in the same function, disjoint hunk).

## Note

Our own engine's machine-readable result has the mirror gap: `result_json.py:164` gates tiebreak collection on single-winner STAR, so `b484mbm_tie_every_rung --json` returns `tiebreaks: []` for a lot-decided Bloc STAR seat. Disclosed in the issue; raised as its own task in star-voting-library, not fixed in this session.
