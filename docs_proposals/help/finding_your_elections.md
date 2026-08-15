---
layout: default
title: Finding Your Elections
nav_order: 9
parent: BetterVoting Documentation
---

# Finding Your Elections

Every election you create, or that someone has added you to, is listed under **My Elections & Polls** at [bettervoting.com/manage](https://bettervoting.com/manage). This page explains how that list works, what an election ID is, and what to check when an election you know exists does not appear.

## Where your elections are listed

You need to be signed in. The list shows every election where you are the **owner**, or where the owner has added you as an **admin**, **auditor** or **credentialer**.

Elections you *voted in* are somewhere else — [Vote History](https://bettervoting.com/vote_history) — and elections you have been *invited* to run are under [Invitations](https://bettervoting.com/invitations). If an election is missing from one list, check the other two before assuming it is gone.

Click any row to open that election.

## Your election ID

Every election has a short identifier of exactly six characters, made when the election is created. It is the part of the web address after the slash:

```
https://bettervoting.com/7mckyg
                         ^^^^^^
                         the election ID
```

You will see the same ID in several places, and they always agree:

| Where | Looks like |
|---|---|
| The address bar when the election is open | `bettervoting.com/7mckyg` |
| The link you send to voters | `bettervoting.com/7mckyg` |
| The results page | `bettervoting.com/7mckyg/results` |
| A downloaded JSON export of the results | recorded as `election_id` |

The ID never changes. Renaming your election, editing its candidates, opening and closing it — none of that affects the ID, which makes it the most reliable way to refer to one specific election. If you run several elections with similar names ("Board Election", "Board Election 2026", "Board Election — revote"), the ID is what tells them apart.

{: .note }
> **Reading an ID out loud, or copying one by hand.** IDs are built from a deliberately restricted set of characters: no vowels, so an ID can never spell a word, and none of `0`, `1`, `l` or `o` — the characters most often confused for one another. So if you think you are looking at a zero or a capital O, it is neither.

{: .note }
> The ID is not a secret, and it is not a password. Anyone with the link can reach the election's page; whether they can *vote* depends on your [Security Options](https://docs.bettervoting.com/help/security_options.html).

## Searching the list

Each column in the list has its own search box under its heading. Typing in one narrows the list to rows matching that column.

The boxes work together. Typing `board` under the title **and** picking **Open** under State shows only open elections with "board" in the title. Clearing a box removes that restriction.

Two things worth knowing:

- **Matching is partial and ignores capitals.** Typing `boa` finds "Board Election"; typing `BOARD` finds it too.
- **The State filter is a set of tick boxes**, not a search box. Untick a state to hide it.

## If you cannot find an election

Work down this list — the first two explain most cases.

1. **Is a filter still set?** A search box you typed in earlier stays set. If the list looks empty or much shorter than you expect, clear every box under the column headings and untick nothing under State.

2. **Is it archived?** **Archived elections are hidden by default.** They are not deleted, and they are not gone — the Archived tick box under **State** simply starts unticked. Tick it and archived elections reappear in the list.

3. **Are you signed in as the right person?** An election is listed for the account that owns it and for the accounts added to it. If you created an election while signed in with a different email, it is on that account.

4. **Were you added by email?** Admins are added by email address. If you were added under an address different from the one you signed in with, the election will not be listed for you. Ask the owner which address they used.

5. **Is it a poll you voted in rather than one you run?** Those are in [Vote History](https://bettervoting.com/vote_history).

6. **Was it created without an account?** An election made while signed out belongs to no account until it is claimed. If you have the link, open it while signed in and you will be offered the chance to claim it.

## Sorting

Click a column heading to sort by it; click again to reverse. The list opens sorted by **Last Updated**, newest first, so the election you touched most recently is at the top. That is usually the one you want, and it is the fastest way to find an election you were working on a minute ago.
