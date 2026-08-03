# Flat scores → abstention: why the fix is contested

**Status: analysis only. No change is proposed for merge here.** These pages exist to answer one question honestly — *why do the Equal Vote maintainers hesitate to fix this, and are they right to?* — and to lay out the options so the decision can be made on evidence rather than on who repeats themselves loudest.

Short answer: **they are partly right.** The tabulation rule is wrong, but two of the three reasons people give for leaving it alone are real, and one of them is a genuine regression risk that would land the day the fix ships. There is a sequencing that gets the fix in without any of it. That's the recommendation in [`04-options.md`](04-options.md).

## The bug in one paragraph

BetterVoting classifies a STAR ballot as an **abstention** if every mark is equal after `null` is coerced to `0`. So `5,5,5`, `3,3,3`, `0,0,0` and `0,null,null` are all treated the same way: the ballot is **removed from the tally entirely** — it adds nothing to the score totals, nothing to the pairwise matrix, and does not count toward `nTallyVotes`. A voter who gave every candidate five stars is told they "Abstained — No preference." An election in which every ballot is flat reports *"Still waiting for results. No votes have been cast"* and, in some configurations, still names a winner. The reference implementation (Larry Hastings' `starvote`) counts any explicitly scored ballot as cast and abstains only a **truly blank** ballot; the flat ballot lands in the runoff's **Equal Support** bucket, where it belongs.

Source of the rule: [`Util.ts:96-103`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/Util.ts#L96-L103), enabled for STAR at [`Star.ts:13`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/Star.ts#L13) and for STAR-PR at [`AllocatedScore.ts:26`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/AllocatedScore.ts#L26). The policy was decided deliberately in [#884](https://github.com/Equal-Vote/bettervoting/issues/884) — this is not an accident anyone forgot to fix.

Upstream reference cases: [Flat scores, ties & tie-breaking](https://masiarek.github.io/star-voting-library/01_STAR/Flat_scores_ties/index.html) in `star-voting-library`, cases 07 and 08.

## The three hesitations, graded

| # | The hesitation | Verdict |
|---|---|---|
| 1 | *"The runoff chart looks wrong after the fix"* | **Real, and unavoidable.** The Equal Support bar grows by exactly the number of flat ballots and can become the tallest bar on the chart, above the winner. See [`03-reporting-anomalies.md`](03-reporting-anomalies.md). |
| 2 | *"It'll break something else"* | **Real, and worse than people think.** The fix un-hides a division-by-zero that is currently masked, and it changes the quota in proportional STAR — an outcome change, not a display change. See [`02-blast-radius.md`](02-blast-radius.md). |
| 3 | *"Ties and random tie-break order will shift"* | **False.** The random tie-break seed is derived from the **raw** ballot count, not the tally count, and is explicitly documented as such. Nothing about the shuffle moves. See [`02-blast-radius.md` §6](02-blast-radius.md). |

## What the pages contain

| Page | What's in it |
|---|---|
| [`01-the-rule.md`](01-the-rule.md) | Exactly what the code does today, line by line, including the frontend/backend divergence nobody has written down |
| [`02-blast-radius.md`](02-blast-radius.md) | Every surface that changes, cited to file:line, split into cosmetic vs outcome-changing |
| [`03-reporting-anomalies.md`](03-reporting-anomalies.md) | The "reporting looks strange" claim, with worked before/after numbers. This is the heart of it |
| [`04-options.md`](04-options.md) | Six options from "do nothing" to "full data-model fix", with cost, blast radius, and a recommended sequence |
| [`05-issue-map.md`](05-issue-map.md) | The eleven tickets this touches and how they relate |

## The one-line recommendation

**Split the change in two, and fix #1035 first.**

The change everyone argues about is actually two independent edits:

- **(a)** stop passing `markAllEqualAsAbstention = true` for STAR — makes `5,5,5` and `3,3,3` cast votes;
- **(b)** stop coercing `null → 0` — makes explicit `0,0,0` distinct from blank.

(a) is four characters, fixes most of the reported cases, and makes STAR consistent with every other method on the platform. (b) touches Approval, Plurality, IRV and the bulk-upload data model, and is a much larger conversation. **They have been argued as one change, and that is why the discussion has not moved in a year.**

Before either lands, [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035) (the `NaN%` in the runoff pie) must be fixed, because today the abstention rule is what hides it.
