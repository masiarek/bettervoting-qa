# #1053 — analysis posted 2026-08-02

**Posted:** [Equal-Vote/bettervoting#1053 comment](https://github.com/Equal-Vote/bettervoting/issues/1053#issuecomment-5166296842)

The substantive abstention analysis, placed on #1053 rather than #884 because #884 is **closed** — comments there sit outside maintainers' default views. #1053 is open, is the ticket @ArendPeter relabelled "Discussion", and is where the disagreement actually lives.

## Framing choices, deliberate

- **Steelman first.** Opens by conceding the part of #884 that's right — the roll-off case where naive bucketing makes "Equal Support" the tallest bar is a real problem, and any change must keep it solved. Includes an explicit "I don't think I appreciated that when I pushed back in 2025." On a volunteer project, arriving with new evidence lands better than arriving with the same opinion louder.
- **Label vs count.** The central reframe: #884 answered a labelling question; the implementation answered a counting question by deleting the ballot. The label can be entirely right and the deletion still cause the six downstream tickets.
- **Their own materials, verified first-hand before quoting.** The hand-count protocol's three piles and `equal_preference`'s "counted exactly as the voter intended" were fetched and read directly, not taken from a summary — quoting an organisation's own published rules back at them inaccurately would be worse than not citing them. `starpy` cited as neutral cross-reference, not as a gotcha.
- **The ask is narrow.** Not "reverse #884". Keep the label, stop the deletion, fix the receipt.
- **Uncertainty stated.** Closes by flagging that the `NaN` rendering is traced through code, not observed in a browser.

## What it carries

1. The current rule changes winners today → #1470, filed separately so it can't be blocked by this discussion
2. Winner-invariance for single-winner and Bloc STAR, from a 55,127-election falsification attempt
3. The quorum hazard — invariance doesn't make it cosmetic
4. Two independent edits, not one — the structural reason the thread stalled
5. Sequencing behind #1035 and #1471, both filed standalone
6. Retroactivity, and the `create_date` gate the codebase already documents

## Full upstream set from this work

| Ticket | Type | State |
|---|---|---|
| [#1470](https://github.com/Equal-Vote/bettervoting/issues/1470) | new bug — write-in discards ballots, changes winners | open, live repro `43jp39` |
| [#1471](https://github.com/Equal-Vote/bettervoting/issues/1471) | new bug — chart split denominator | open |
| [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035#issuecomment-5166192037) | root cause + prerequisite framing | comment |
| [#1053](https://github.com/Equal-Vote/bettervoting/issues/1053#issuecomment-5166296842) | the analysis | comment |
| [#1407](https://github.com/Equal-Vote/bettervoting/issues/1407#issuecomment-5161778279) | link fix | comment |
| [#884](https://github.com/Equal-Vote/bettervoting/issues/884#issuecomment-5161778346) | link fix (closed issue, low visibility) | comment |

Deliberately **not** done: no request to reopen #884. That's the move that reads as relitigating, and nothing needs it — (a) is a code change, and the labelling decision can stand.
