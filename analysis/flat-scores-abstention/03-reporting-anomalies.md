# 03 — "The reporting looks strange" — is that true?

This is the objection that has actually stalled the fix, and it deserves to be taken seriously rather than waved away. It is **substantially true**. Below are the three anomalies, with worked numbers, and what each one is really caused by.

**Methodology.** The tally counts, scores, pairwise counts, winners and tie-break types below were produced by **executing BetterVoting's actual `Star()` tabulator** (`packages/backend/src/Tabulators/Star.ts` at `8d2b3f9`) against each ballot set, once unmodified and once with the abstention flag flipped. The chart percentages and majority markers are then computed by applying `ResultsBarChart`'s own formulas to those outputs. So the backend numbers are **executed**, the chart numbers are **derived from executed inputs**. Neither is a screenshot — a browser check on a branch is still worth doing before any of this is quoted upstream.

The probe script is in [`probe/`](probe/).

---

## Anomaly 1 — the winner's percentage collapses while the majority marker stays put

### The election

Two candidates, nine ballots:

| Ballots | A | B |
|---|---|---|
| ×3 | 5 | 3 |
| ×2 | 3 | 5 |
| ×4 | 5 | 5 |

### Today (flat ballots dropped)

`nTallyVotes = 5`. A scores 21, B scores 19. Three voters prefer A, two prefer B, none are equal.

| Surface | Shows |
|---|---|
| Header | **5 voters** |
| Score chart (`percentDenominator = nTallyVotes × 5 = 25`) | A **84%**, B **76%** |
| Runoff chart (denominator = 3+2+0 = 5) | A **60%**, B **40%**, Equal Support **0%** |
| Majority marker (`(3+2)/2 = 2.5`) | A's bar crosses it |
| Pie footnote | "**0.0%** of voters expressed no preference between the two finalists" |

Headline reads: *A wins with 60%.*

### After the fix (flat ballots counted)

`nTallyVotes = 9`. A scores 41, B scores 39. The pairwise counts are **unchanged** — a flat ballot prefers nobody — but the denominator grew.

| Surface | Shows |
|---|---|
| Header | **9 voters** |
| Score chart (denominator = 45) | A **91.1%**, B **86.7%** |
| Runoff chart (denominator = 9) | A **33.3%**, B **22.2%**, Equal Support **44.4%** |
| Majority marker (still `(3+2)/2 = 2.5`) | A's bar still crosses it |
| Pie footnote | "**44.4%** of voters expressed no preference between the two finalists" |

Headline reads: *A wins with 33.3%* — and **the tallest bar on the runoff chart is "Equal Support", above the winner.**

A still wins, by the same route, with no tie-break invoked in either run (executed: `winner=A, tieBreakType=none` both before and after). Only the presentation moved.

### What is actually wrong here

The winner did not stop being majority-preferred. [`ResultsBarChart.tsx:82-90`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/components/ResultsBarChart.tsx#L82-L90) computes the majority threshold **excluding the last bar**:

```ts
    const sum = data.reduce((prev, d, i) => {
      if(i == data.length-1) return prev; // don't include exhausted or equal support votes in the denominator
      return prev + d[xKey];
    }, 0);
    const m = sum / 2;
```

and the i18n string is honest about it — `results.star.runoff_majority: majority threshold (½ of voters with preference)`.

But the **percentage labels** on the very same chart use a *different* denominator — line 51, `percentDenominator ??= data.reduce((sum, d) => sum + d[xKey], 0)`, which includes the Equal Support bar.

So the chart already computes its threshold on one denominator and its labels on another. Today that inconsistency is invisible because the Equal Support bar is usually small. The abstention fix makes it large, and then the chart shows a bar labelled **33.3%** sitting to the right of a marker labelled **majority threshold** — which looks broken even though it is arithmetically correct.

**This is a pre-existing chart bug that the abstention rule is currently hiding.** It is independently fixable, cheaply, and fixing it first removes most of the sting from the objection. See option **R1** in [`04-options.md`](04-options.md).

---

## Anomaly 2 — all-zero ballots deflate every candidate's average *(only under edit (b))*

Same election, but the four flat ballots are `0,0` instead of `5,5`.

**This anomaly does not occur under the recommended change.** Edit (a) alone — dropping `markAllEqualAsAbstention` — leaves `makeAbstentionTest()` testing *"all marks zero"*, so four `0,0` ballots still abstain and **nothing on the page moves**. Confirmed by execution: with the flag flipped, this election still reports `tally=5, abstentions=4, A=84%, B=76%` — identical to today.

It only appears under edit (b), where explicit zeros stop being treated as blanks:

| | Today, **and** under edit (a) | Under edit (b) |
|---|---|---|
| Voters | 5 | 9 |
| A score | 21 (**84%** of max) | 21 (**46.7%** of max) |
| B score | 19 (**76%**) | 19 (**42.2%**) |
| A's average score | 4.2 | **2.33** |

Nothing about A's support changed. Four people showed up and scored everyone zero, and A's headline number halved.

That this anomaly attaches to edit (b) and not edit (a) is a substantive argument for splitting them: **the scariest-looking distortion belongs entirely to the half of the change that is blocked on the data model anyway.**

Whether that is "strange" or "correct" is a genuine judgement call, not a bug:

- **For the maintainers:** the score chart is read as *"how much do voters like this candidate"*, and a protest ballot that likes nobody should not be able to halve that number without changing anyone's opinion of A.
- **Against:** it is exactly what a score average means. Hiding four voters to keep a number flattering is a reporting choice, and it is the reason [#906](https://github.com/Equal-Vote/bettervoting/issues/906) (Average Supporter Profile) does not reconcile against the reference engine.

Note that the *direction* of the distortion depends on the flat value, which is the tell that "all-equal" is not one coherent class:

| Flat ballots | Today | Under edit (a) | Under edit (b) |
|---|---|---|---|
| four `5,5` | dropped — A shows 84% | counted — A **rises** to 91.1% | counted — 91.1% |
| four `3,3` | dropped — 84% | counted — A **falls** to 73.3% | counted — 73.3% |
| four `0,0` | dropped — 84% | **still dropped** — 84% | counted — A **falls** to 46.7% |

Today all three are treated identically — dropped. That is the weakest part of the [#884](https://github.com/Equal-Vote/bettervoting/issues/884) rule: `5,5` and `0,0` are opposite statements about the same candidates, and the code cannot tell them apart.

### The one-star cliff

Take one of the `5,5` ballots and change a single mark to `5,4`. The ballot goes from *deleted* to *fully counted*: A +5 score, B +4 score, A's pairwise +1, A's five-star count +1, and the reported electorate grows from 5 voters to 6 — **a 20% swing in reported turnout from one star.** Any rule with a cliff that sharp will eventually produce a result nobody can explain to a losing candidate.

### The mixed zero-and-blank ballot

The rule's oddest case, and the one behind the closed-but-unfixed [#754](https://github.com/Equal-Vote/bettervoting/issues/754). Nine ballots: 3× `5,3`, 2× `3,5`, 2× `0,null`, 2× `null,null`.

| | Today, **and** under edit (a) | Under edit (b) |
|---|---|---|
| Voters | 5 | **7** |
| Abstentions | 4 | **2** — only the genuinely blank ones |
| A / B score % | 84% / 76% | 60% / 54.3% |
| Runoff | A 60%, B 40%, Equal 0% | A 42.9%, B 28.6%, Equal 28.6% |

The two `0,null` voters marked their ballot. Today they are counted as having stayed home — and the submit receipt does not tell them so, because the frontend uses a different rule (see [`01-the-rule.md`](01-the-rule.md)).

---

## Anomaly 3 — the fix un-hides a `NaN` (this is the real regression risk)

This is the one that would land on production the day the fix ships, and it is the strongest argument the maintainers have.

### The election

[`star-voting-library` case 08](https://masiarek.github.io/star-voting-library/01_STAR/03_Criteria/Flat_scores_ties/Flat_scores_ties_08_all_flat_zero_count.html) — five voters, three candidates, every ballot flat at a different level:

```
Anchovy, Basil, Caper
1, 1, 1
2, 2, 2
3, 3, 3
4, 4, 4
5, 5, 5
```

### Today

Executed: `tally=0, abstentions=5, all scores 0, winner=Anchovy, tieBreak=random`.

All five ballots abstain → `nTallyVotes = 0` → [`Results.tsx:485`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/Results.tsx#L485) short-circuits to `results.waiting_for_results` and the STAR widget is never rendered at all. The page says *"Still waiting for results. No votes have been cast."* — which is [#1052](https://github.com/Equal-Vote/bettervoting/issues/1052) and [#1065](https://github.com/Equal-Vote/bettervoting/issues/1065). Note it still elects Anchovy off zero tallied ballots.

### After the fix

Executed: `tally=5, abstentions=0, all scores 15, winner=Anchovy, tieBreak=random` — **the same winner**, now with the five ballots visible. Score chart: every candidate 60%. BV skips head-to-head for a 3+-way tie (deliberate — see [#1379](https://github.com/Equal-Vote/bettervoting/issues/1379), and [#1469](https://github.com/Equal-Vote/bettervoting/issues/1469) for the Ranked Robin analogue), the five-star tiebreak separates nobody, so two finalists are drawn at random. In the runoff **each finalist is preferred over the other zero times** and all five ballots are Equal Support.

The widget now renders, and:

- **Bar view:** `[0, 0, 5]` → `0%`, `0%`, `100%`; majority marker at `(0+0)/2 = 0`.
- **Pie view:** [`STARResultSummaryWidget.tsx:50-53`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/STAR/STARResultSummaryWidget.tsx#L50-L53) passes only the two finalists to `ResultsPieChart`, both with `votes: 0`. Recharts computes `percent = value / total` with `total = 0`, and [`ResultsPieChart.tsx:41`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/components/ResultsPieChart.tsx#L41) renders `${(percent * 100).toFixed(0)}%` → **`NaN%`**.

The `noPreferencePercentage` footnote *is* guarded (`nTallyVotes > 0 ? … : '0.0'`, lines 54-56). The pie's internal `percent` is not.

So the fix **converts [#1052](https://github.com/Equal-Vote/bettervoting/issues/1052)/[#1065](https://github.com/Equal-Vote/bettervoting/issues/1065) into [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035)** — one wrong message becomes a different wrong message, in *more* elections than today, because any race where the two finalists tie at zero head-to-head now reaches this code path with ballots in it.

`NaN%` on a live results page is a worse look than a wrong sentence, and it is the reasonable core of "the reporting looks strange". The mitigation is trivial and independently useful: **fix #1035 first**, then flip the rule. See option **R2** in [`04-options.md`](04-options.md).

> The `NaN` mechanism is read from source here, but it is corroborated: #1035 already reports `NaN` in production for an equal-ties race, which is the same zero-denominator path reached by a different route.

---

## What is *not* a problem

Two fears that come up and do not survive checking:

**The random tie-break order does not move.** [`shuffleCandidatesForRandomTiebreak.ts:31-40`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/shuffleCandidatesForRandomTiebreak.ts) seeds from `rawVoteCount`, and its own doc comment spells out why:

> *"Raw votes is not to be confused with Tally Votes. Raw votes refers to the number of ballots you would see when downloading the full data, however the results page shows tally votes."*

The abstention rule changes tally votes, not raw votes. Every existing election keeps the same shuffle and the same tie-break priority order.

**Turnout arithmetic stays consistent.** [`VoterErrorStatsWidget.tsx:60`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/components/VoterErrorStatsWidget.tsx#L60) uses `totalVotes = nAbstentions + nTallyVotes`, which is invariant — a ballot just moves from one bucket to the other. The "% of voters abstained" figure drops, which is the *point* of the fix, not a side effect.
