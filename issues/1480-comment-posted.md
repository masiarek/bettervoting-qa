# #1480 — the backend-convention reframe, posted 2026-08-20

**Posted:** [Equal-Vote/bettervoting#1480 comment](https://github.com/Equal-Vote/bettervoting/issues/1480#issuecomment-5363512155)

The reply to the same-day by-design closure ("the frontend trusts the order from the backend by convention"). It accepts the convention, withdraws the issue's own Scope over-reach, and shows the convention is implemented by every tabulator except Ranked Robin — relocating the defect to the backend as a one-line fix, already written and parked ([PARKED §7](../docs_proposals/PARKED_ready_for_bv.md)). Analysis behind every line: [the closure section](rr-winner-highlight-positional-vs-elected.md) of the issue page. Verified twice independently against `main` @ `b089323f` (a three-agent source pass in one session, a line-by-line review in a second).

The ask is deliberately the maintainer's choice — reopen, or a fresh backend-scoped ticket — and the PR stays held until the freeze lifts either way.

## The comment, verbatim

Agreed on the design — the frontend trusting the backend's order is the right convention, and the frontend fix I sketched in the issue was the wrong end of it. The issue's Scope section also over-reached, so withdrawing that too: Approval and Plurality can't actually produce this mismatch (their single-winner functions always elect `remainingCandidates[0]`, so their first rows can't be wrong).

But the repro isn't a frontend complaint — it's the backend not upholding that same convention. On [8h4bvh](https://bettervoting.com/8h4bvh/results) the payload's own two orderings disagree: the heading reads `results.elected` and announces **Alder**; the star and gold row read row order and sit on **Birch**. Same page, same payload, two different "winners".

The convention is already implemented server-side: `runBlocTabulator` takes an optional `evaluate` callback whose job is re-sorting `summaryData.candidates` winners-first (`Util.ts:321`). STAR passes one (`Star.ts:29`), Approval passes one (`Approval.ts:30`), IRV re-sorts with `sortCandidates(…, results.roundResults)` (`IRV.ts:164`), and Allocated Score got its own elected-first sort in cd1c01d9 — "sort candidates meaningfully on backend", added so that other consumers get the same ordering "for free". Ranked Robin is the only tabulator that neither re-sorts nor is order-safe by construction — and the only one whose ladder has a rung that can leave the sort order (the head-to-head at `RankedRobin.ts:57` elects `right` while `left` stays in row 0).

So under the convention exactly as you've stated it, this is a one-line backend fix, in the idiom IRV already uses:

```ts
sortCandidates(results.summaryData.candidates, 'copelandScore', results.roundResults);
```

Passing `roundResults` makes win-round the first sort key, and `sortCandidates` appends `tieBreakOrder` as the final key itself, so within-tier order is preserved exactly. Row order is the only thing that changes: `elected`, every `tieBreakOrder` value, and `perm` are untouched by construction — the shuffle stamps `tieBreakOrder` and the controller snapshots `perm` before the tabulator is called, so a re-sort inside the tabulator can't reach them.

One forward-looking note: #1479 (correctly) extends highlighting to the first `num_winners` rows, so once it lands, a multi-winner Ranked Robin race can mislabel up to N candidates instead of one.

The patch is written and tested — one line in `RankedRobin.ts` plus a regression test that fails on `main` at exactly this (`summaryData.candidates[0]` is the pairwise loser), with the full tabulator suite staying green. Happy for this to be a reopen or a fresh backend-scoped ticket, whichever you prefer — and I'll hold the PR until the queue clears.
