# 05 — The ticket web

Eleven upstream tickets are downstream of one rule. Several have been triaged independently and closed or relabelled without anyone noticing they are the same defect wearing different clothes. That, more than any technical difficulty, is why this has not moved.

## The root

| Ticket | State | What it is |
|---|---|---|
| [#884 — Update abstain behavior for STAR](https://github.com/Equal-Vote/bettervoting/issues/884) | **closed** | The policy decision. "Count as abstain if they're all equal as well (all threes, all zeros, mix of zeros and nulls)". Decided by Sara, Annie, Ruben & Arend; implemented in `Util.ts`. **Everything below is a consequence of this ticket.** |

Because #884 is *closed*, each consequence gets triaged as a fresh, isolated bug — and each one looks small enough to defer.

## The consequences

| Ticket | State | Symptom | Which half of the rule causes it |
|---|---|---|---|
| [#1053 — Wrong messages: (Abstained) and No preference](https://github.com/Equal-Vote/bettervoting/issues/1053) | open, relabelled **Discussion** | A `5,5` full-support ballot is told it abstained; election reports `nTallyVotes: 0` and still names a winner | `markAllEqualAsAbstention` — edit (a) |
| [#1407 — Reconciling pets election between LH and BV](https://github.com/Equal-Vote/bettervoting/issues/1407) | open | Flat ballots dropped, BV and the reference engine cannot be reconciled | edit (a) |
| [#1090 — 'Equal Opposition' (0-score) mislabeled as 'Abstained'](https://github.com/Equal-Vote/bettervoting/issues/1090) | open | An explicit `0,0` "I reject both" ballot is filed as an abstention; CSV export cannot distinguish `0` from blank | the `?? 0` coercion — edit (b) |
| [#754 — Ballots with mix of zeros and blanks should not count as abstention](https://github.com/Equal-Vote/bettervoting/issues/754) | **closed** | Closed on the frontend half only (`pageIsUnderVote`). The backend still drops `[0, null]`. See [`01-the-rule.md`](01-the-rule.md) § *the divergence nobody has written down* | edit (b) |
| [#1052 — "no ballots have been cast" (we have 3 ballots)](https://github.com/Equal-Vote/bettervoting/issues/1052) | open, **High Priority** | `nTallyVotes == 0` short-circuit in `Results.tsx` | edit (a) |
| [#1065 — Bloc STAR with perfect tie fails to process results](https://github.com/Equal-Vote/bettervoting/issues/1065) | open | Same short-circuit, Bloc STAR, three `5,5,5` ballots | edit (a) |
| [#1384 — BV tabulation engine incorrectly claims no ballots](https://github.com/Equal-Vote/bettervoting/issues/1384) | **closed** | Same short-circuit again, `5,5` / `4,4` ballots | edit (a) |
| [#1035 — BV200 — NaN on equal ties & equal preferences](https://github.com/Equal-Vote/bettervoting/issues/1035) | open, "low priority" | `NaN%` in the runoff display | **independent** — but see below |
| [#906 — Average Supporter Profile wrong](https://github.com/Equal-Vote/bettervoting/issues/906) | open | Stats-for-nerds averages don't reconcile against the reference engine | both edits change the denominator |
| [#894 — BV1570, plurality abstention + CSV](https://github.com/Equal-Vote/bettervoting/issues/894) | **closed** | "All three votes are abstentions, yet we claim victory"; wrong voter count | edit (b), Plurality |
| [#777 — Abstentions and Spoiled Ballots — conventions](https://github.com/Equal-Vote/bettervoting/issues/777) | open, Discussion | The umbrella: what should the reporting vocabulary even be | the whole question |

## #1035 is the blocker, not a sibling

Everything else on that list is *caused* by the rule. [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035) is the exception: it is an independent zero-denominator bug in the runoff pie chart, and today the abstention rule **hides it** by making the widget never render in the worst case.

That inverts the priority order. #1035 is currently marked *"low priority — not sure if this must be considered as an error"*. It is the **prerequisite** for shipping the fix everyone actually wants. Fixing it is a two-line guard; leaving it means the abstention fix ships `NaN%` onto live results pages. See [`03-reporting-anomalies.md`](03-reporting-anomalies.md) § Anomaly 3.

## Adjacent, frequently conflated, actually separate

These get pulled into the same conversation and should not be:

| Ticket | Why it's separate |
|---|---|
| [#1379 — BV555 scoring-round 3-way tie](https://github.com/Equal-Vote/bettervoting/issues/1379) | Tie-break *protocol* — BV deliberately skips head-to-head for 3+-way ties. Working as intended; the LH/BV divergence is lot-vs-random, not abstentions |
| [#1063 — deterministic tie-breaking using lot numbers](https://github.com/Equal-Vote/bettervoting/issues/1063) | Reproducibility of the *random* rung. Orthogonal — though flat-score elections are where it bites hardest, because they reach the random rung most often |
| [#1432 — surface tie-break explanations in results](https://github.com/Equal-Vote/bettervoting/issues/1432) | Display of `roundResults.logs`. Would make the flat-score cases legible either way |
| [#1420 — JSON export leaks internal object shape](https://github.com/Equal-Vote/bettervoting/issues/1420) | v2 export. Relevant only in that `nAbstentions`/`nTallyVotes` semantics should be documented in v2 whatever the rule ends up being |

## The one-paragraph pitch for reopening #884

> #884 decided a *labelling* question — "did this voter express a preference?" — and the implementation answered a *counting* question, by removing the ballot from the tally entirely. Nine tickets since then are consequences of that gap, four of which have been closed without the underlying rule changing. The label may well be right. The deletion is not: it is what produces "0 tallied votes" pages that still name a winner, and it is why BetterVoting results cannot be reconciled against any other STAR implementation. Reopening #884 to separate the two questions would let eight tickets close.
