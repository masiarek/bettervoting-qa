# Upstream PRs — the 2026-08-15 batch

Ten issues taken off [Equal-Vote/bettervoting](https://github.com/Equal-Vote/bettervoting/issues) in one session, one PR each. All green on CI at the time of writing; none merged yet.

| PR | Issue | Change | Notes |
|---|---|---|---|
| [#1514](https://github.com/Equal-Vote/bettervoting/pull/1514) | [#1233](1233-winner-title-padding-was-already-fixed.md) | Winner title (both ⭐) moved into `en.yaml` | the padding half was **already fixed on `main`** |
| [#1515](https://github.com/Equal-Vote/bettervoting/pull/1515) | #1456 | Runoff pie footnote names **Equal Support** | pulls the term with `$t()`, so translated locales get their own word |
| [#1516](https://github.com/Equal-Vote/bettervoting/pull/1516) | [#1487](1487-range-of-scores-denominator.md) | Range of Scores prints its ballot count | denominator was invisible; chart counts ballots the tally dropped |
| [#1517](https://github.com/Equal-Vote/bettervoting/pull/1517) | #1186 | Five typos on the Range of Scores panel | one of them inverted the sentence's meaning |
| [#1518](https://github.com/Equal-Vote/bettervoting/pull/1518) | #1472 | Election creation date on the results page and the manage table | table half not clicked through — needs a logged-in session |
| [#1519](https://github.com/Equal-Vote/bettervoting/pull/1519) | [#1315](1315-stale-bot-open-prs.md) | Stale bot skips issues with an open PR | **also unbreaks the bot — dead since 9 June** |
| [#1520](https://github.com/Equal-Vote/bettervoting/pull/1520) | #1145 | `CONTRIBUTING.md` | points at /volunteer and the existing dev docs |
| [#1521](https://github.com/Equal-Vote/bettervoting/pull/1521) | #1510 | `CLAUDE.md` guidance for writing issues and PRs | ask the user for a sentence in their own words |
| [#1522](https://github.com/Equal-Vote/bettervoting/pull/1522) | [#1117](1117-sandbox-score-range.md) | Sandbox rejects a score outside the method's range | per-method, + the repo's first `/sandbox` Playwright spec |
| [#1523](https://github.com/Equal-Vote/bettervoting/pull/1523) | [#1389](1389-freeze-first-column.md) | Frozen first column on the detailed results tables | background inherited from Paper, so the dark theme survives |
| [#1526](https://github.com/Equal-Vote/bettervoting/pull/1526) | #1513 | Duplicate check keyed on identity, not email | **silent data loss**; its E2E test was passing vacuously |
| [#1527](https://github.com/Equal-Vote/bettervoting/pull/1527) | [#1471](1471-chart-split-denominator.md) | Majority marker names its own denominator | option 2, plus the truncated dashed line and the no-overall-majority note |
| [#1528](https://github.com/Equal-Vote/bettervoting/pull/1528) | #1159 | Help page: *Why the highest score doesn't always win*, linked from the panel | the "make it terser" half was already done; see the lesson below |
| [#1529](https://github.com/Equal-Vote/bettervoting/pull/1529) | #1059 | Table filter reads the whole text of a formatted cell | the `election_id` column's search box matched only its first character |

## What the batch taught, beyond the ten fixes

**Three of the ten issues were partly wrong about their own subject**, and saying so was worth more than the patch:

- **#1233** — the reported defect no longer reproduces; it was fixed by `11a8facf` and nobody updated the issue.
- **#1315** — the automation it asks to improve has not run since 9 June (66 consecutive `npm ci` failures). A fix to its logic would have shipped into a workflow that never executes.
- **#1487 / #1117** — both are the same shape as the flat-ballot family already tracked here: a number computed over a quietly reduced ballot set, with the reduction invisible on the page.

**Adversarial review of my own patches paid for itself.** A second pass over the #1117 and #1389 diffs, briefed to refute rather than approve, found four things worth fixing before either PR opened: validation running *after* `parseInt` (so `2.5` silently became `2` — a *different* ballot, which is worse than the bug being fixed), a trailing newline masking the very error the patch adds, an unguarded `Array(NaN)` crash one line away, and a hard-coded `#FFFFFF` that would have broken the dark theme. None of these is exotic; all four survived my own first reading.

**An example is an argument, and it can be false while every number in it is correct.** The first draft of the #1159 help page worked through a nine-voter election, verified the arithmetic, and then explained underneath it that a stars-only count "rewards whoever inspires the strongest feelings". Every figure checked out. The sentence was still false *for that example*: the profile chosen had the broadly-liked candidate leading the scoring round and the polarizing one winning the runoff, so stars alone would have elected the mildest candidate on the page. A hostile reader could have turned the paragraph against the page in one move.

The education library had already registered this distinction — it keeps a *convincing* reversal and a *jarring* one precisely so that the defence of the runoff has an example it fits. The fix was to change the election, not the prose: the leader now finishes one star ahead on four maximum scores while five of nine voters prefer the other finalist. Worth generalising: **when a page argues from a worked example, check the argument against that example, not just the arithmetic within it.**

**A test that asserts nothing is worse than no test.** Two of the fourteen were "covered" by a test that ran the buggy path and then stopped: the sandbox had none at all, and `election-with-rolls.spec.ts › add voters` fills five voter IDs, clicks Submit, and asserts nothing — so it stayed green while the roll silently received one voter. Both now assert an outcome, and both assertions fail against `main`. When a bug survives in a path that has a test, check what the test actually claims before assuming the path is exercised.

**Two conversions of the same text is the bug behind the bug.** The #1117 fix went through three rounds — validate after `parseInt` (wrong ballot submitted), then validate with `Number` while still submitting with `parseInt` (still a wrong ballot, one remove further out, caught by CodeRabbit on the open PR). The seam only closed when a single conversion was used for both. Worth remembering the next time a check and its consumer parse the same string separately.

**Verification gaps are worth writing down in the PR itself.** Two of the ten could not be fully exercised locally — the "My Elections" column (needs a logged-in session owning elections) and Firefox/Safari behaviour of `position: sticky` on a collapsed-border table. Both are stated in the PR bodies rather than left for the reviewer to discover.
