# #1315 — the updates bot pings issues that already have an open PR

**Fixed in [Equal-Vote/bettervoting#1519](https://github.com/Equal-Vote/bettervoting/pull/1519)** (2026-08-15). Issue: [#1315](https://github.com/Equal-Vote/bettervoting/issues/1315).

## The finding asked for

The bot's only activity signal is `issue.updated_at` (`StaleIssueChecker.ts:170`), and **a pull request that references an issue does not bump that issue's `updated_at`**. So an issue whose fix is already in review ages exactly as fast as an abandoned one: it collects the "🤖 Check-In Reminder" at 1 week and the `2 weeks inactive` label at 2. That is what happened on [#1296](https://github.com/Equal-Vote/bettervoting/issues/1296).

Nothing in `.github/scripts/src/issue-management/` looked at pull requests at all. The only occurrence of the phrase in the whole tree was inside the reminder's own text — *"even if you have a pull request"* — which tells the assignee that a PR does not count as activity.

## The bigger finding, unasked for

**The workflow has not run since 9 June.** Every scheduled run fails at its `npm ci` step:

```
npm error `npm ci` can only install packages when your package.json and package-lock.json ... are in sync.
npm error Invalid: lock file's @types/node@20.19.1 does not satisfy @types/node@24.13.3
npm error Invalid: lock file's typescript@5.8.3 does not satisfy typescript@5.9.3
npm error Invalid: lock file's undici-types@6.21.0 does not satisfy undici-types@7.18.2
```

`.github/scripts/package-lock.json` fell out of sync with its `package.json` in `bd269431` ("remove dead deps", 22 May). 66 consecutive failures; last success 2026-06-09.

Two consequences worth holding on to:

1. **No issue has been labelled inactive or pinged for two months.** Any reasoning about the current label state of the tracker that assumes the bot is running is wrong.
2. **A green tracker is not evidence the automation works.** Nothing surfaces a failing *scheduled* workflow — it does not touch a PR, so no check goes red anywhere a human looks.

## What the fix does

`getOpenLinkedPullRequests()` reads the issue timeline for `cross-referenced` events, keeps sources that are pull requests **in this repository**, and re-reads each PR's state via `pulls.get` rather than trusting the timeline's snapshot. If any is open, the issue is skipped for both the warning and the label. The lookup runs only for issues already past the warning threshold, so it costs nothing for the still-active majority. The job gained `pull-requests: read`.

Drafts count as open — a draft is still "the PR is out" — and that is flagged in the PR as a one-line change if the maintainers disagree.

## Verification

Read-only dry run (`DRY_RUN=true`) against the live repository, all 417 open issues, 49 assigned. Six would be spared today:

| Issue | Open PR |
|---|---|
| #1481 | #1491 |
| #1443 | #1445 |
| #1425 | #1464 |
| #1350 | #1466 |
| #1219 | #1463 |
| #762  | #1476 |

## Provenance

| Claim | How established |
|---|---|
| The bot never looks at PRs | grep over `.github/scripts/src` and all workflows for `pull`, `linked`, `timeline`, `cross-referenced`, `closingIssuesReferences` |
| `updated_at` is the only signal | read from `StaleIssueChecker.ts:20-34, 170` |
| 66 consecutive failures, last success 2026-06-09 | `gh run list --workflow "Issue Management" --limit 100`, conclusions tallied |
| The `npm ci` error text | **executed** — reproduced locally, and read from the [failing run log](https://github.com/Equal-Vote/bettervoting/actions/runs/31789952947) |
| The six spared issues | **executed** — dry run against the live repo |
| Lock resync builds | **executed** — `npm install`, then `npm ci` and `npm run build` both clean |
