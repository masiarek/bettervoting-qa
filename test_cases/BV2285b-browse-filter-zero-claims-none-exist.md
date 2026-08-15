# BV2285b — three elections are listed, the filter matches none, the page says there are none

> **Baseline capture — recorded before any fix.** *Actual result* is what BetterVoting does today
> (2026-08-15, local build of `main` at `7bc75a82`). When [#1525](https://github.com/Equal-Vote/bettervoting/issues/1525)
> is fixed, re-run these steps and *Expected after the fix* is the assertion.

## Purpose

Reproduce [#1525](https://github.com/Equal-Vote/bettervoting/issues/1525) on the one page that needs no login, so the defect can be checked by anyone in under a minute.

This is the **evidence** case for the family. Its sibling [BV2285a](BV2285a-manage-filter-zero-shows-onboarding.md) covers the same defect on `/manage`, where the copy is worse but a login is required.

## Prerequisites

- Any build where `/browse` lists at least two elections.
- No login needed.

## Master data

Three open, public elections — see [the family index](BV2285-index.md#test-data). The only property that matters: **no election ID appears anywhere in any title**, so a query that matches an ID cannot accidentally match title text.

## Steps

1. Open `/browse`.
2. Confirm the pager reads `1–3 of 3` and three rows are listed.
3. Type `zzz` into the **Election Title** filter. (Any string matching no title will do.)

## Expected result

The table reports that the *filter* matched nothing. The page does not make a claim about whether open elections exist, because it has three of them loaded.

## Actual result — today

<img src="screenshots/BV2285-browse-filtered-to-zero.png" width="640">

> **No open elections at this time**
>
> `0–0 of 0`

Three open elections are loaded in the page at that moment. Clearing the filter brings all three back without a refetch.

### What is wrong

The sentence is false, and it is false in the specific way that misleads: a user searching for something is told the *collection* is empty rather than that their *query* matched nothing. On `/manage` the same code path adds a CREATE ELECTION button to the false claim — see [BV2285a](BV2285a-manage-filter-zero-shows-onboarding.md).

## Expected after the fix

Filtered-to-zero and genuinely-empty are distinguishable on screen. The exact wording is not asserted here — it has not been approved — only that:

1. the filtered case does not assert the collection is empty;
2. the filtered case does not offer a create/new action;
3. the genuinely-empty case is unchanged ([BV2285c](BV2285c-empty-account-keeps-onboarding.md)).

## Provenance

| Claim | How established |
|---|---|
| Three rows before the filter, zero after, `0–0 of 0` | **executed** — local stack, three seeded open elections, Playwright drove the real filter box |
| The rows are filtered rather than refetched | **executed** — clearing the box restores all three with no network request |
| `emptyContent` renders on the filtered row set | read from `EnhancedTable.tsx:625`, and consistent with the above |

## Related

[#1525](https://github.com/Equal-Vote/bettervoting/issues/1525) · [BV2285 index](BV2285-index.md) · [BV2285a](BV2285a-manage-filter-zero-shows-onboarding.md) · [BV2285c](BV2285c-empty-account-keeps-onboarding.md) · [`issues/1525-…`](../issues/1525-empty-state-conflates-no-data-with-no-matches.md)
