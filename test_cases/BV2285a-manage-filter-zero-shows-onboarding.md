# BV2285a — an admin with elections filters to zero and is told they have none

> **Baseline capture, and a PREDICTION.** Unlike its sibling [BV2285b](BV2285b-browse-filter-zero-claims-none-exist.md),
> the *Actual result* below was **read from source, not executed** — the local run could not reach a
> logged-in `/manage` with elections in it. The shared code path is proven by BV2285b; what is
> predicted here is only which copy that path renders. See the provenance table. **Run this before
> quoting it.**

## Purpose

The `/manage` face of [#1525](https://github.com/Equal-Vote/bettervoting/issues/1525). Same defect as BV2285b, worse consequence: the false claim comes with a button that acts on it.

This is the screen the whole family started from — an admin pasted an election ID into the search box and was told their account was empty.

## Prerequisites

- A logged-in account that **owns or administers at least two elections**. An empty account cannot show this defect (that is [BV2285c](BV2285c-empty-account-keeps-onboarding.md)).
- Test-account logins: the sheet's testing-credentials tab, not this page.

## Master data

Any elections the account can see on `/manage`. The query in step 3 must match none of their titles.

## Steps

1. Open `/manage`. Confirm the pager shows a non-zero count — e.g. `1–12 of 12`.
2. Note the row count.
3. Type a string matching no title into the **Election Title** filter. An **election ID** is the realistic case, because that is what an admin has in hand and because the box does not match IDs today ([BV2285d](BV2285d-title-filter-matches-election-id.md)) — but any non-matching string reproduces it.

## Expected result

The page indicates the filter matched nothing, while continuing to be true about the account: the admin still has 12 elections.

## Actual result — today (predicted from source)

The table body renders `ElectionsYouManage`'s `emptyContent`:

> **You don't have any elections yet**
>
> [ **CREATE ELECTION** ]

`ElectionsYouManage.tsx:82` supplies that message and button; `EnhancedTable.tsx:625` renders it whenever the *filtered* row set is empty, with no way to tell "no data" from "no matches".

### What is wrong

Two things, and the second is the reason this case is separate from BV2285b:

1. **The claim is false.** The account has elections; they are filtered out, not absent.
2. **The offered action is the wrong one.** The user was searching for an existing election. They are handed a button that creates a new one — an action that, taken by mistake, leaves a stray draft election behind.

## Expected after the fix

Same three assertions as [BV2285b](BV2285b-browse-filter-zero-claims-none-exist.md#expected-after-the-fix), plus: **no create action is offered while a filter is active.**

## Provenance

| Claim | How established |
|---|---|
| `emptyContent` renders on a filtered-to-zero table | **executed**, but on `/browse` — [BV2285b](BV2285b-browse-filter-zero-claims-none-exist.md). Same component, same branch |
| `/manage`'s `emptyContent` is the onboarding copy + CREATE ELECTION | **read** from `ElectionsYouManage.tsx:82` — *not executed* |
| An admin sees this while searching by ID | inferred from the reporter's screenshot plus [#1059](https://github.com/Equal-Vote/bettervoting/issues/1059); the screenshot alone does not prove the account was non-empty |

That last row is worth keeping honest: the screenshot that prompted this family shows the message on an account whose election count is unknown. The defect is real — BV2285b proves the mechanism — but that particular screenshot is not proof of it.

## Related

[#1525](https://github.com/Equal-Vote/bettervoting/issues/1525) · [BV2285 index](BV2285-index.md) · [BV2285b](BV2285b-browse-filter-zero-claims-none-exist.md) · [BV2285c](BV2285c-empty-account-keeps-onboarding.md) · [BV2285d](BV2285d-title-filter-matches-election-id.md)
