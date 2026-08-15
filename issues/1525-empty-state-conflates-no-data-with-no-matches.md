# #1525 — the empty state cannot tell "you have none" from "your filter matched none"

**Filed 2026-08-15**: [#1525](https://github.com/Equal-Vote/bettervoting/issues/1525). Test cases: [BV2285a–c](../test_cases/BV2285-index.md).

## The finding

`EnhancedTable` renders one caller-supplied `emptyContent` whenever the table has zero rows — and "zero rows" is computed **after** filtering:

```
packages/frontend/src/components/EnhancedTable.tsx:625
{visibleRows.length === 0 && ( … {props.emptyContent} … )}
```

`visibleRows` ← `filteredRows` ← `filterData(...)`. The branch has no access to *why* the set is empty, and every caller wrote its message for the no-data case:

| Caller | `emptyContent` | What it says on a filtered-to-zero result |
|---|---|---|
| `ElectionsYouManage.tsx:82` | "You don't have any elections yet" + **CREATE ELECTION** | false, and offers the wrong action |
| `OpenElections.tsx` | "No open elections at this time" | false |
| `PublicArchive.tsx`, `ElectionsYouVotedIn.tsx`, `ElectionInvitations.tsx` | equivalent | false |

Reproduced on `/browse`: three open elections loaded, `zzz` typed into the Title filter, table says *"No open elections at this time"*, pager says `0–0 of 0`. Clearing the box restores all three without a refetch, which is what proves the rows were there the whole time.

## Why it is worth more than its size suggests

It fires precisely when a user is **searching** — the moment the page most needs to be accurate — and it converts "your query didn't match" into "your account is empty". On `/manage` it also offers a create action to someone who was trying to find an existing record; taken by mistake, that leaves a stray draft behind.

It is also an **error-masking** bug, which is how it stayed unnoticed. The screen that prompted this was an admin searching by election ID. The Title box does not match IDs ([#1059](https://github.com/Equal-Vote/bettervoting/issues/1059)) — a real, separate shortcoming — but instead of "no matches", the page reported the account as empty. One defect was wearing the other's clothes. That is the general shape worth remembering: *a wrong empty state makes every search bug look like data loss.*

## The fix, and the trap in it

Branch on filter state, which is already in scope as `filters` — no new plumbing. Note it must compare against each column's **declared defaults**, not merely test whether a filter is set:

```jsx
const isFiltered = filters.some((f, i) => {
  const col = headCells[i]
  if (col?.filterType === 'search') return f !== ''
  if (col?.filterType === 'groups') return Object.keys(f ?? {})
    .some(k => f[k] !== col.filterGroups[k])
  return false
})
```

The trap: **do not make the swap unconditional.** The onboarding copy is *correct* for a new user, and it is the only affordance on that page for someone with nothing yet. A fix that always shows "no rows match your filters" hands a brand-new user a sentence about filters they never typed. That is [BV2285c](../test_cases/BV2285c-empty-account-keeps-onboarding.md), written as a regression guard for exactly this, and it is the one that fails silently.

Note the group filters invert: an unchecked box is an *active* restriction, which is why the predicate above tests `!v`. `election_state` ships with `archived: false`, so `/manage` has an active filter on first paint — a naive `filters.some(Boolean)` would classify a fresh empty account as "filtered" and regress BV2285c on load.

## Provenance

| Claim | How established |
|---|---|
| Three rows before, zero after, `0–0 of 0` | **executed** — local `main` at `7bc75a82`, three seeded open elections, Playwright drove the real filter box |
| Rows are filtered, not refetched | **executed** — clearing the box restores them with no network call |
| `/manage` renders onboarding copy + button on this branch | **read** from `ElectionsYouManage.tsx:82` — not executed; no logged-in account with elections was available |
| `archived: false` ships as a default group filter | read from `EnhancedTable.tsx` `election_state.filterGroups` |

## Related

[#1059](https://github.com/Equal-Vote/bettervoting/issues/1059) · [PR #1524](https://github.com/Equal-Vote/bettervoting/pull/1524) · [`1059-1524-search-elections-by-id.md`](1059-1524-search-elections-by-id.md) · [BV2285 index](../test_cases/BV2285-index.md)
