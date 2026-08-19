# #1035 — the runoff zero denominator: fix, tests, before/after

**Fix written 2026-08-19.** Branch `fix/1035-runoff-zero-denominator` off `origin/main` @ [`454a38ae`](https://github.com/Equal-Vote/bettervoting/commit/454a38ae), commit **`47d241a4`**. **Local only — not pushed, no PR, nothing posted upstream.**

Root cause was established and [posted upstream](https://github.com/Equal-Vote/bettervoting/issues/1035#issuecomment-5166192037) on 2026-08-02 — see [`1035-nan-root-cause-comment-posted.md`](1035-nan-root-cause-comment-posted.md). This page is the fix that follows from it. The browser baseline it has to beat is [`BV2264`](../test_cases/BV2264-nan-in-runoff-table.md).

This is **R2** from [`../analysis/flat-scores-abstention/04-options.md`](../analysis/flat-scores-abstention/04-options.md) — the prerequisite that has to land before anyone touches the abstention rule, because that rule is currently the only thing keeping this bug's trigger set narrow.

## The defect

A STAR runoff's denominator is `finalistVotes` — the number of ballots that preferred *one* finalist over the other. It is **zero** whenever every counted ballot rates the two finalists equally, and that is not an exotic state: it needs no tie in the scoring round and no abstention. Three ballots of `Ann 5 / Ben 5 / Cal 0` do it, and so does a mixed set like `5,5,1` / `4,4,0` / `3,3,2`.

Crucially the ballots **are** counted — `nTallyVotes = 3` — so `Results.tsx:485`'s `nTallyVotes == 0` short-circuit does not fire and the runoff widgets render against a zero denominator.

Two surfaces, two different symptoms, which is why the first prediction about this bug was half wrong:

| Surface | Symptom before the fix |
|---|---|
| Runoff Table, "% Between Finalists" | **`NaN%`** on both finalist rows, and a total row asserting **`100%`** of nothing |
| Runoff pie chart | **Blank circle.** Recharts draws no sectors when every value is 0, so its label callback never runs and no `NaN` is ever printed — the chart is simply empty, with no explanation |

The bar view was already safe: `ResultsBarChart.tsx:53` does `percentDenominator = Math.max(1, percentDenominator)`. So the guard exists in the codebase already, on one of the three views. The neighbouring `noPreferencePercentage` footnote is guarded too (`STARResultSummaryWidget.tsx:54-56`). The table and the pie were the two that were missed.

## Every affected path, file:line

Line numbers **before** are on `origin/main` @ `454a38ae`; **after** are on `47d241a4`.

| # | Path | Before | After | What happens there |
|---|---|---|---|---|
| 1 | `packages/frontend/src/components/Election/Results/STAR/STARDetailedResults.tsx` | `:69` | `:74` | `i == 2 ? '' : formatPercent(c.runoffVotes / finalistVotes)` — the `0/0`. Unchanged; now yields `—` because `formatPercent` guards |
| 2 | `packages/frontend/src/components/util.tsx` | `:89-92` | `:92-101` | `formatPercent` had no guard for a non-finite argument, so `NaN` reached `Math.round` and printed `NaN%` |
| 3 | `packages/frontend/src/components/Election/Results/STAR/STARDetailedResults.tsx` | `:71` | `:76` | The total row's `'% Between Finalists'` cell is a **hard-coded** `'100%'`. `formatPercent` never sees it, so guarding `formatPercent` alone leaves the table claiming 100% of a zero denominator |
| 4 | `packages/frontend/src/components/Election/Results/components/ResultsPieChart.tsx` | `:40`, `:14` | `:23`, `:72-81` | Recharts' `percent = value / total`. With `total = 0` it renders **no** `<Cell>`s, so `:40` never executes — the blank chart. Guarded now by an `isEmpty` check before the chart is built |
| 5 | `packages/frontend/src/components/Election/Results/STAR/STARResultSummaryWidget.tsx` | `:48-51`, `:80` | `:80` | Builds `pieData` from the two finalists only, so the pie's total **is** `finalistVotes`. Now passes the STAR-specific `emptyMessage` |
| 6 | `packages/frontend/src/i18n/en.yaml` | — | `:241-243`, `:309-311` | Two new keys: `results.chart_no_data`, `results.star.runoff_no_preference_chart` |

**Backend: nothing to fix.** The tabulator emits counts, not percentages. `Star.ts` computes `votesPreferredOver` and never divides; the only `percent()` in `packages/backend/src/Tabulators/` is `AllocatedScore.ts:217`, and its one zero-denominator path (`weight_on_split == 0`) was already guarded at `:157` by the merged no-ballots fix. The zero denominator is created in the frontend, from two backend integers that are both correctly `0`.

**Paths deliberately *not* changed:**

- The **bar view's majority marker** still sits at `0` with the legend "majority threshold (½ of voters with preference)". That is arithmetically true (half of zero) and is not a `NaN`; whether it should be drawn at all when there are no voters with a preference belongs to [#1471](1471-chart-split-denominator.md), which is about that marker's denominator generally.
- The `'% Runoff Votes'` column (`STARDetailedResults.tsx:68`/`:73`) divides by `nTallyVotes`, which `Results.tsx:524` guarantees is `>= 1` before the STAR viewer mounts. It was never a `NaN` and is untouched.

## The fix

Five files, 84 insertions. The whole of it:

1. **`formatPercent` returns a placeholder for a non-finite input** rather than `NaN%`. This is the one that covers path 1, and as a side effect it nets the other `x/0` call sites nobody has reported yet — `VoterProfileWidget.tsx:155` (`numBullets/totalTopScored`) and `VoterErrorStatsWidget.tsx:83-93` (`/totalVotes`).
2. **The total row is guarded explicitly**, because it is a literal string that never passes through `formatPercent`.
3. **`ResultsPieChart` renders a message instead of an empty circle** when its slices sum to zero, in a box of the same 250px height so toggling bar↔pie does not shift the layout. New optional `emptyMessage` prop; the generic i18n fallback means the component's other caller (`VoterIntentWidget.tsx:130`) stops rendering a silent empty circle too.
4. **`STARResultSummaryWidget` passes the STAR-specific wording.**

### Copy — needs review, and the test does not assert on it

Two strings were added to `en.yaml`. Neither is approved copy:

| Key | Current text |
|---|---|
| `results.star.runoff_no_preference_chart` | *No votes to chart — every counted ballot rated the two finalists equally.* |
| `results.chart_no_data` | *No votes to chart.* |

The placeholder in the table is an em dash, `NO_DATA_PLACEHOLDER` in `util.tsx:92`.

Per this repo's convention — **assert on requirements, not on literal strings, when the copy is not approved** — the requirement is: *the runoff table must not print `NaN`, and the pie view must not render an empty circle with no explanation.* Anything satisfying that passes. Three specific things a reviewer should decide:

- **`—` vs `n/a` vs an empty cell.** A bare em dash reads fine sighted and says nothing to a screen reader. `aria-label` on the cell would fix that; `ResultsTable` has no such affordance today, so it was not added.
- **The pie message duplicates its own footnote.** In the degenerate case the footnote below already reads *"100.0% of voters expressed no preference between the two finalists."* Saying it twice may be worse than saying it once — but the footnote is below the chart area, and an unexplained empty circle above it is the actual complaint.
- **Only `en.yaml` gained the keys.** `i18n.ts:24` sets `fallbackLng: 'en'`, so `es`/`pl`/`pt-BR` fall back to English rather than showing the raw key.

## Before and after

Produced by [`../analysis/flat-scores-abstention/probe/nan-fix-verify.ts`](../analysis/flat-scores-abstention/probe/nan-fix-verify.ts), run inside the branch worktree. **`formatPercent` in the "after" column is the shipped function** — the probe reads `util.tsx` at run time, extracts the function's source and evaluates it, so it cannot drift from the file. The tally is the real `Star()`. The two remaining expressions (the total-row cell and the pie's `isEmpty`) are one line each, transcribed verbatim.

### A) Degenerate — three ballots `{A:5, B:5, C:0}` (the BV2264 election)

`nTallyVotes = 3`, `nAbstentions = 0`, finalists A and B, each preferred over the other **0** times, `finalistVotes = 0`.

**Runoff Table, "% Between Finalists"**

| Row | Value | Before | After |
|---|---|---|---|
| A | `0/0` | `NaN%` | `—` |
| B | `0/0` | `NaN%` | `—` |
| Total | — | `100%` | `—` |

**Runoff Table, "% Runoff Votes"** (denominator `nTallyVotes = 3`) — `0%`, `0%` before **and** after. Unchanged.

**Runoff pie chart** — total `0`. Before: recharts draws no sectors, blank circle, no label, no explanation. After: the explanatory message replaces the chart.

**Winner: `A` before and after. Scores `A:15 B:15 C:0` before and after.**

### B) Degenerate — mixed scores, preferences cancel

`{A:5,B:5,C:1}` / `{A:4,B:4,C:0}` / `{A:3,B:3,C:2}`. Identical outcome to (A): `NaN%` → `—`, `100%` total → `—`, blank pie → message. Winner `A`, scores `A:12 B:12 C:3`, unchanged. This is the set that shows the bug is not about a scoring-round tie.

### C) Control — ordinary runoff

Five ballots, `finalistVotes = 4`, finalists B and A.

| Row | Value | Before | After |
|---|---|---|---|
| B | `2/4` | `50%` | `50%` |
| A | `2/4` | `50%` | `50%` |
| Total | — | `100%` | `100%` |

Pie renders, unchanged. Winner `B`, unchanged.

### D) Control — lopsided runoff, exercises the `<1%` branch

201 ballots, `finalistVotes = 201`.

| Row | Value | Before | After |
|---|---|---|---|
| A | `200/201` | `100%` | `100%` |
| C | `1/201` | `<1%` | `<1%` |
| Total | — | `100%` | `100%` |

Pie renders, unchanged. Winner `A`, unchanged. This one matters because `formatPercent`'s existing `0 < f && f < .01` special case is the branch most likely to be broken by a careless guard.

## Test cases

### T1 — backend unit test, added to the existing suite

Added to `packages/backend/src/Tabulators/Star.test.ts:48`, *"Runoff with a zero denominator (#1035)"*.

- **Purpose** — pin the *condition*, not the display: prove the frontend really is handed `finalistVotes = 0` on a fully-counted ballot set, and lock the tally the fix must not move. It is also a tripwire for the abstention rule: if `markAllEqualAsAbstention` is ever changed, this ballot set moves in or out of the tally and the test says so.
- **Input** — candidates `Allison, Bill, Carmen`; ballots `[5,5,0] × 3`.
- **Expected** — `nTallyVotes == 3`; `nAbstentions == 0`; `winner.votesPreferredOver[runnerUp] == 0`; `runnerUp.votesPreferredOver[winner] == 0`; their sum (the denominator) `== 0`; both finalists score `15`, Carmen `0`; exactly one candidate elected.
- **Actual** — **PASS.** `npx jest src/Tabulators/` → 9 suites, **53 tests**, all green (baseline before the change: 9 suites, 52 tests, all green).

**What T1 does not do:** it does not exercise the display guards. Those are frontend-only, and `packages/frontend` has **no test harness at all** — no jest config, no vitest, zero `*.test.*` files. Adding one would be a larger change than the fix. T2 is the substitute.

### T2 — probe, the display expressions against real tabulator output

[`../analysis/flat-scores-abstention/probe/nan-fix-verify.ts`](../analysis/flat-scores-abstention/probe/nan-fix-verify.ts).

- **Purpose** — get a real before/after value for each render path without a React harness.
- **Input** — the four ballot sets above, through the backend's real `Star()`.
- **Expected** — degenerate sets: no `NaN` anywhere, and the pie reports itself empty. Controls: **every** string identical before and after.
- **Actual** — **as expected**; the tables above are its output. `formatPercent`'s post-fix source, as extracted from `util.tsx` and executed:

  ```js
  (f) => {
    if(!Number.isFinite(f)) return "—";
    if(0 < f && f < .01) return '<1%';
    return `${Math.round(100*f)}%`
  }
  ```

### T3 — typecheck and lint

- **Purpose** — the changed files still compile, and no new lint error is introduced.
- **Actual** — `npx tsc --noEmit` in `packages/frontend`: **clean, no output.** `npx eslint` on the four changed frontend files reports 13 errors, **all pre-existing** (`react/prop-types` and `ban-ts-comment` in `util.tsx`, the untouched `}: any)` label callback in `ResultsPieChart.tsx:33`, an unused `getEntry` import in `STARResultSummaryWidget.tsx:12`). None sits on a changed line.

### T4 — browser verification: NOT RUN

The BV2264 steps against a running build with this branch. **Not done** — see below.

## No winner, tally or percentage changes

Stated explicitly because the neighbouring abstention argument ([`../analysis/flat-scores-abstention/`](../analysis/flat-scores-abstention/README.md)) is contested precisely over outcome changes, and this fix must not be entangled with it.

- **Nothing in `packages/backend` changes except a test file.** No tabulator source is touched. Winners, scores, pairwise counts, tie-breaks, `nTallyVotes`, `nAbstentions` and the JSON export are byte-identical.
- **`formatPercent` is identical for every finite input.** The new line is `if(!Number.isFinite(f)) return NO_DATA_PLACEHOLDER;` ahead of the existing body — reachable only via `NaN`, `Infinity` or `-Infinity`, i.e. only from a zero denominator. Controls C and D confirm `50%`, `100%` and the `<1%` branch are untouched.
- **The total-row guard fires only on `finalistVotes === 0`.** Strict equality on an integer sum of two counts.
- **The pie guard fires only when the slices sum to `<= 0`.** Vote counts are non-negative, so that is exactly "all slices zero" — the case where recharts drew nothing anyway. No non-empty chart changes.
- **The bar chart is not touched at all.**
- **The abstention rule is not touched.** This fix neither widens nor narrows the trigger set; it makes the trigger set survivable, which is the whole point of doing it first.

## What could not be verified

Marked as this repo's convention requires — **these are gaps, not predictions dressed up as results.**

1. **Nothing was rendered in a browser.** The rendered `—` in the table cell, the vertical centring of the message in the 250px box, its behaviour at 320px, and the bar↔pie toggle not shifting the layout are all **read from source, not seen**. BV2264's *Expected after the fix* section is the assertion to run; it wants the local stack on this branch (see the `bv-dev` skill). The one prior lesson here is directly on point: the first version of the root-cause comment predicted `NaN%` in the pie chart and a screenshot refuted it.
2. **`useTranslation()` inside `ResultsPieChart`.** The component previously had no i18n coupling. Both call sites sit well inside the app's i18n provider, so the hook is safe by inspection, but it has not been *executed* in a React tree.
3. **The two new i18n keys have not been observed resolving.** They parse (checked with `js-yaml`) and `fallbackLng: 'en'` covers the other three locales, but no rendered string was seen.
4. **`VoterIntentWidget`'s empty case is untested.** The generic fallback now applies to it. Whether that widget can actually reach an all-zero state was not established — the change is a strict improvement over a blank circle either way, but it is a claim about a surface nobody has looked at.
5. **No E2E run.** `testing/` has Playwright specs; none covers a results page, and none was run.
6. **Not run against production data.** The two degenerate ballot sets are synthetic, matching the reporter's `tk476h` and our `3d8qdr`.

## Provenance

| Claim | How established |
|---|---|
| The condition is `finalistVotes == 0`, not a scoring-round tie | **executed** — `Star()` on both ballot sets, [2026-08-02 comment](https://github.com/Equal-Vote/bettervoting/issues/1035#issuecomment-5166192037), re-executed here |
| `NaN%` in the runoff table; blank pie chart | **verified in a browser** 2026-08-02 — [BV2264](../test_cases/BV2264-nan-in-runoff-table.md) |
| Every affected file:line, before and after | read from source at `454a38ae` and `47d241a4` |
| The before/after strings in the tables above | **executed** — probe, with the shipped `formatPercent` extracted from `util.tsx` and evaluated |
| Winner / tally invariance | **executed** — the probe prints winner and scores per case; plus T1, plus "no backend source changed" |
| Bar chart already guarded; backend has no unguarded division | read from source — `ResultsBarChart.tsx:53`, `AllocatedScore.ts:157` |
| Tests green | **executed** — `npx jest src/Tabulators/`, 53/53 |
| Anything about rendered appearance | **not verified** — see above |

## Related

[#1035](https://github.com/Equal-Vote/bettervoting/issues/1035) · [root-cause comment](1035-nan-root-cause-comment-posted.md) · [BV2264](../test_cases/BV2264-nan-in-runoff-table.md) · [#1471](1471-chart-split-denominator.md) (the majority marker's denominator) · [flat scores → abstention](../analysis/flat-scores-abstention/README.md) (why this is R2, and why it goes first) · [#1484](1484-race-details-runner-up.md) (the other defect in this same runoff table — a backend sort key, fixed in `runBlocTabulator`; no file overlaps this fix, though it changes WHICH pair the table calls the finalists, and so which elections have a zero denominator)
