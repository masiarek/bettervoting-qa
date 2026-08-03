# BV-AB — abstention & runoff-reporting baselines

Five test cases capturing what BetterVoting does **today**, recorded 2026-08-02 against production, before
any of the related fixes land. Each page has a live election, the exact ballots, a screenshot of the
current behaviour, and the assertion to check after the fix.

The purpose is regression evidence: today's numbers are frozen and citable, so "did the fix work" becomes
a diff rather than an argument.

| Case | What it shows | Election | Upstream |
|---|---|---|---|
| [BV-AB1](BV-AB1-writein-discards-ballots.md) | Two functionally identical races disagree on both electorate and winner, because one has an approved write-in | [`43jp39`](https://bettervoting.com/43jp39/results) (closed) | [#1470](https://github.com/Equal-Vote/bettervoting/issues/1470) |
| [BV-AB2](BV-AB2-nan-in-runoff-table.md) | `NaN%` in the runoff table when no voter prefers either finalist — and the pie renders *empty*, not `NaN` | [`3d8qdr`](https://bettervoting.com/3d8qdr/results) | [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035) |
| [BV-AB3](BV-AB3-chart-split-denominator.md) | A 33% winner crossing a majority line drawn at 27.8%, with a 44% bar longer than both | [`3pfb7j`](https://bettervoting.com/3pfb7j/results) | [#1471](https://github.com/Equal-Vote/bettervoting/issues/1471) |
| [BV-AB4](BV-AB4-no-votes-have-been-cast.md) | Five voters, results page reports that no votes were cast | [`p2qrv6`](https://bettervoting.com/p2qrv6/results) | [#1052](https://github.com/Equal-Vote/bettervoting/issues/1052), [#1065](https://github.com/Equal-Vote/bettervoting/issues/1065) |
| [BV-AB5](BV-AB5-receipt-says-abstained.md) | A 5,5 ballot told at submit time that it abstained | [`p9pvc8`](https://bettervoting.com/p9pvc8/vote) (0 ballots, re-runnable) | [#1053](https://github.com/Equal-Vote/bettervoting/issues/1053) |

## Notes on how these were built

- **BV-AB1 is closed**; the rest are open so they can be re-read and, for BV-AB5, re-run. Reopening or
  re-voting in BV-AB2/3/4 would change the frozen numbers — treat them as read-only.
- **BV-AB5 deliberately has zero ballots.** The capture stops at the confirmation dialog without
  confirming, so anyone can reproduce the receipt from scratch.
- Screenshots were captured with Playwright at 2× scale, with the sticky header hidden so element shots
  aren't overlapped. Script: `analysis/flat-scores-abstention/probe/`.
- **Test IDs are provisional.** `BV-AB*` are local; they need rows in the test-case sheet.
  [`BV-AB-sheet-rows.tsv`](BV-AB-sheet-rows.tsv) is paste-ready.

## One prediction these captures refuted

The analysis pages predicted `NaN%` on **both** the runoff table and the runoff pie chart. Only the table
shows it. Recharts draws no sectors when every value is zero, so the pie's label callback never runs and
the chart is simply blank — a different defect with a different fix. The upstream #1035 comment was
corrected after this capture. Worth remembering as the reason this repo's convention says to mark
source-derived expectations as predictions until a screenshot exists.
