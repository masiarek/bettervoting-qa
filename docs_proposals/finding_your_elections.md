# Docs proposal — Finding Your Elections

A draft page for <https://docs.bettervoting.com>, written out of the search-by-election-ID work.

**The draft under [`help/finding_your_elections.md`](help/finding_your_elections.md) is written as finished user documentation and nothing else** — no ticket numbers, no test-case IDs, no QA framing. It is meant to be copied into `docs/help/` in the BetterVoting checkout as-is. Everything tying it back to this repo lives on *this* page, and this page does not travel with it.

| Draft | Proposed path | Front matter |
|---|---|---|
| [`help/finding_your_elections.md`](help/finding_your_elections.md) | `docs/help/finding_your_elections.md` → `/help/finding_your_elections.html` | `parent: BetterVoting Documentation`, `nav_order: 9` |

## The gap it fills

Nothing on the help site explains **My Elections & Polls** at all. Today the site documents how to set an election up ([Security Options](https://docs.bettervoting.com/help/security_options.html), [Preliminary Results](https://docs.bettervoting.com/help/preliminary_results.html), [Ties](https://docs.bettervoting.com/help/ties.html)) and how voters cast ballots — but not the screen an admin returns to every time afterwards.

Four things it states that are currently written down nowhere:

- **What an election ID is.** Six characters, in the address bar, never changes across renames and state changes, and identical in the invitation link, the results URL and the JSON export. Admins use this string constantly without being told what it is.
- **Archived elections are hidden by default.** The Archived tick box under **State** ships unticked (`EnhancedTable.tsx`, `election_state.filterGroups`). An admin who archives an election and later cannot find it has hit a filter, not a deletion — and there is no way to learn that from the product.
- **Which list holds what.** Elections you *run* (`/manage`), elections you *voted in* (`/vote_history`) and elections you were *invited* to run (`/invitations`) are three separate pages, and "it's not in my list" is usually the wrong list.
- **Admins are matched by email address.** Being added under a different address than the one you signed in with makes the election invisible to you, with no error.

The ID-character detail — no vowels, and none of `0`, `1`, `l`, `o` — comes from `makeID.ts`, where the comments say it exists so IDs cannot spell words and cannot be mistranscribed. Worth telling users, since they read these aloud.

## The one thing to decide before merging

The draft's **Searching the list** section describes the filter boxes as they behave today, and deliberately does **not** claim you can search by election ID — because on the current build you cannot ([#1059](https://github.com/Equal-Vote/bettervoting/issues/1059)).

If PR [#1524](https://github.com/Equal-Vote/bettervoting/pull/1524) merges first, add one sentence to that section:

> The first box matches both the title and the election ID, so you can paste an ID straight in.

and the column heading named in the page becomes **Election Title or ID**. Nothing else changes. If #1524 is rejected, the page is still correct as written — which is why it was drafted this way round.

Two related things the draft does **not** do, on purpose:

- It does not document the empty-state defect ([#1525](https://github.com/Equal-Vote/bettervoting/issues/1525)). The "If you cannot find an election" checklist opens with *"Is a filter still set?"*, which is good advice under either behaviour, and says nothing about what the screen currently claims. Documenting a defect as if it were a feature is how a page gets rewritten a week later.
- It does not mention roles beyond naming them. Who can do what per role is a page of its own, and pretending otherwise would make this one a stub of two topics.

## Where it came from

Grounded in `ElectionsYouManage.tsx`, `EnhancedTable.tsx`, `App.tsx` (the route list) and `makeID.ts`, read during the work that produced [#1524](https://github.com/Equal-Vote/bettervoting/pull/1524) and [#1525](https://github.com/Equal-Vote/bettervoting/issues/1525). The QA side of the same reading:

- [`test_cases/BV2285-index.md`](../test_cases/BV2285-index.md) — the four cases
- [`issues/1059-1524-search-elections-by-id.md`](../issues/1059-1524-search-elections-by-id.md) — the search-vs-visibility analysis and three ID-display prototypes
- [`issues/1525-empty-state-conflates-no-data-with-no-matches.md`](../issues/1525-empty-state-conflates-no-data-with-no-matches.md)

## Verification status

Every factual claim in the draft was read from source. The ones worth re-checking against a running build before merge, because they are the ones a reader will act on:

| Claim | Source | Executed? |
|---|---|---|
| Archived hidden by default | `EnhancedTable.tsx` `election_state.filterGroups` | no |
| ID is 6 chars, no vowels, no `0/1/l/o` | `makeID.ts` `ID_LENGTHS.ELECTION`, `generateRandomPart` | no |
| `election_id` appears in the JSON export | a frozen export in the library repo | **yes** |
| Default sort is Last Updated, newest first | `ElectionsYouManage.tsx` `defaultSortBy`, `EnhancedTable.tsx` initial `order` | **yes**, observed on `/browse` |
| Search is partial and case-insensitive | `filterData` | **yes** |
| Three separate lists at `/manage`, `/vote_history`, `/invitations` | `App.tsx` routes | no |
| Claiming an election created while signed out | `ElectionsYouManage.tsx` claim flow, `TemporaryAccessWarning.tsx` | no |
