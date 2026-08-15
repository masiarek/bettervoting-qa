# BV2285c — a genuinely empty account still gets the onboarding message

> **Regression guard, not a bug report.** This case **passes today** and must keep passing after
> [#1525](https://github.com/Equal-Vote/bettervoting/issues/1525) is fixed. It exists because the
> quickest-looking fix breaks it.

## Purpose

`/manage`'s empty state is currently *correct* for the case it was written for: a new user with no elections should be told so, and offered the button. The #1525 fix must not achieve "stop lying about filtered results" by removing the message that is true.

Pair this with [BV2285a](BV2285a-manage-filter-zero-shows-onboarding.md): the two cases reach the same code branch from opposite starting states, and a correct fix tells them apart.

## Prerequisites

- A logged-in account that **owns and administers no elections**. A freshly registered account is the cleanest way to get one.

## Steps

1. Open `/manage` with no filters typed.
2. Confirm the pager reads `0–0 of 0`.

## Expected result

> **You don't have any elections yet**
>
> [ **CREATE ELECTION** ]

The button works and opens the create flow.

## Actual result — today

As expected. No defect.

## Why it is written down

The obvious fix to #1525 is to change the message rendered when the table is empty. If that change is made unconditionally, this case regresses: a new user loses the only onboarding affordance on the page, and gets *"No rows match your filters"* with no filters typed — which is its own false statement, in the opposite direction.

The fix therefore has to branch on **filter state**, not on row count alone. Both #1525's suggested patch and any alternative should be checked against this case *first*, because it is the one that fails silently — nobody files a bug saying the new-user page is subtly wrong.

## Provenance

| Claim | How established |
|---|---|
| The message and button on an empty account | read from `ElectionsYouManage.tsx:82` — **not executed** (no empty test account was created) |
| That this branch is shared with the filtered case | **executed** via [BV2285b](BV2285b-browse-filter-zero-claims-none-exist.md) |

## Related

[#1525](https://github.com/Equal-Vote/bettervoting/issues/1525) · [BV2285 index](BV2285-index.md) · [BV2285a](BV2285a-manage-filter-zero-shows-onboarding.md)
