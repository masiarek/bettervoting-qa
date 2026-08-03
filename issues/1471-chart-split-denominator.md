# #1471 — bar chart labels and majority marker use different denominators

**Filed 2026-08-02:** [Equal-Vote/bettervoting#1471](https://github.com/Equal-Vote/bettervoting/issues/1471)

This is **R1** from [`../analysis/flat-scores-abstention/04-options.md`](../analysis/flat-scores-abstention/04-options.md) — filed as an independent presentation bug, with no reference to the abstention argument at all.

## The finding

`ResultsBarChart` computes percentage labels over **all** bars (`:52`) and the majority marker over **all bars except the last** (`:83-90`). Both are individually defensible; together they aren't comparable, and the chart shows them side by side.

Worked from the executed nine-ballot case (3 prefer A, 2 prefer B, 4 equal):

| Bar | Value | Label |
|---|---|---|
| A | 3 | 33.3% |
| B | 2 | 22.2% |
| Equal Support | 4 | 44.4% |

Marker at `(3+2)/2 = 2.5` = **27.8%** of the label axis, legended "majority threshold". Winner at 33%, threshold at 28%, biggest bar belongs to neither candidate. Every number individually correct.

## Scope — corrected during filing

Initially scoped as "the STAR runoff chart". It is actually **both** charts that pass `majorityLegend`, behaving identically:

- STAR runoff (`STARResultSummaryWidget.tsx:87`) — last bar is Equal Support
- IRV final round (`IRV/winner.tsx:49`) — last bar is exhausted ballots

And the two `majorityOffset`-only call sites (`STARResultSummaryWidget.tsx:73`, `IRV/winner.tsx:44`) draw **no marker at all**: the line renders via `<Line dataKey={majorityLegend}>` (`:175-176`), so an undefined `majorityLegend` means no line. Those calls run the block purely for its colour-offset side effect — noted in the issue as worth a comment, since `majorityOffset` reads like "show the majority" and doesn't.

## Why it's filed separately

The abstention fix would make the last bar much larger and so make this obvious — but the inconsistency exists today independently, and it's fixable today. Filing it on its own means it can't be blocked by, or entangled with, #884. The issue text never mentions abstentions.

Three fix options offered without picking one; PR offered.

## Provenance

| Claim | How established |
|---|---|
| The two denominators | read from source at `8d2b3f9` |
| The 3 / 2 / 4 worked numbers | **executed** — the tabulator output behind `probe/` |
| Percentages and marker position | arithmetic applied to the component's own formulas |
| Affected call sites, and that `majorityOffset` alone draws no line | read from source — `grep` of all four call sites plus the `<Line>` render |
| Rendered appearance | **not verified in a browser** |
