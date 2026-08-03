# Reproducing the numbers

`star-abstention-probe.ts` runs BetterVoting's **real** `Star()` tabulator over four ballot sets and prints the tally counts, scores, pairwise counts, winner, tie-break type, and the runoff/score percentages that the results page would derive from them.

Every number in [`03-reporting-anomalies.md`](../03-reporting-anomalies.md) and the invariance claim in [`02-blast-radius.md`](../02-blast-radius.md) comes from this, run against `Equal-Vote/bettervoting` at `8d2b3f9`.

## Setup

```bash
git clone --depth 1 https://github.com/Equal-Vote/bettervoting.git bv
mkdir probe && cd probe && npm init -y && npm install tsx fraction.js
mkdir -p node_modules/@equal-vote
ln -s ../../../bv/packages/shared/src node_modules/@equal-vote/star-vote-shared
ln -s ../probe/node_modules ../bv/node_modules
cp /path/to/star-abstention-probe.ts run.ts
```

The tabulators only need `fraction.js` at runtime — everything imported from `@equal-vote/star-vote-shared` is type-only and erased, so no build of the shared package is required.

## The three runs

```bash
# 1. Today's behaviour, unmodified
npx tsx run.ts
```

```bash
# 2. Edit (a) — all-equal is a cast vote. Patch Star.ts:13 makeAbstentionTest(true) -> makeAbstentionTest()
npx tsx run.ts
```

For run 3, replace the body of `makeAbstentionTest` in `packages/backend/src/Tabulators/Util.ts` with the "only truly blank abstains" rule:

```ts
const raw = Object.values(vote.marks);
return raw.every(m => m == null);
```

```bash
# 3. Edit (b) — only a truly blank ballot abstains
npx tsx run.ts
```

## Results

| Ballot set | | Today | Edit (a) | Edit (b) |
|---|---|---|---|---|
| **EX1** 3×`5,3` 2×`3,5` 4×`5,5` | tally / abst | 5 / 4 | **9 / 0** | 9 / 0 |
| | scores | A 21, B 19 | A 41, B 39 | A 41, B 39 |
| | runoff | A 60% B 40% Eq 0% | **A 33.3% B 22.2% Eq 44.4%** | same |
| | winner | A (no tiebreak) | A (no tiebreak) | A (no tiebreak) |
| **EX2** 3×`5,3` 2×`3,5` 4×`0,0` | tally / abst | 5 / 4 | **5 / 4 — unchanged** | 9 / 0 |
| | score % | A 84% B 76% | A 84% B 76% | **A 46.7% B 42.2%** |
| | winner | A | A | A |
| **EX3** all-flat `1,1,1`…`5,5,5` | tally / abst | 0 / 5 | **5 / 0** | 5 / 0 |
| | scores | all 0 | all 15 | all 15 |
| | runoff | — (page says no votes cast) | **0%, 0%, Equal 100%** | same |
| | winner | Anchovy (random) | Anchovy (random) | Anchovy (random) |
| **EX4** 3×`5,3` 2×`3,5` 2×`0,null` 2×`null,null` | tally / abst | 5 / 4 | 5 / 4 — unchanged | **7 / 2** |
| | score % | A 84% B 76% | A 84% B 76% | **A 60% B 54.3%** |
| | winner | A | A | A |

Two things fall straight out of the table:

1. **The winner never changes** — in any ballot set, under any of the three rules, including the all-flat election that resolves by random tiebreak.
2. **Edit (a) and edit (b) affect disjoint ballot sets.** EX1 and EX3 move under (a); EX2 and EX4 move only under (b). They are genuinely two changes.

## Caveat

This exercises the **backend tabulator only**. The runoff and score percentages in the table are computed by applying `ResultsBarChart`'s own formulas (`percentDenominator` = sum of all bars; majority marker = sum excluding the last bar, halved) to the tabulator's real output. The `NaN%` prediction for the EX3 pie chart is read from `ResultsPieChart.tsx` and has **not** been rendered in a browser here — that check still wants doing on a branch.
