---
layout: default
title: Voter Lists
nav_order: 4
parent: BetterVoting Documentation
---

# Voter Lists

When you restrict an election to a pre-defined list of voters, **Manage Voters** is where you build that list. This page covers how to add voters, what format the input takes, and which settings lock once you start.

Deciding *whether* to restrict your election, and choosing between an email list and an ID list, is covered in [Security Options](https://docs.bettervoting.com/help/security_options.html).

## Before you start

Two settings on Manage Voters control everything else:

1. **Is this election restricted to a pre-defined voter list?** — Yes or No.
2. **How are voters identified?** — **BetterVoting-managed voter IDs** (you supply email addresses; BetterVoting emails each voter a unique link) or **admin-managed voter IDs** (you supply IDs and distribute them yourself).

{: .warning }
> **Both settings lock as soon as your list has its first voter.** While the election is still a draft you can unlock them with **Clear Voter List**. Once the election is finalized, the lock is permanent — Clear Voter List is no longer offered. Decide how voters are identified before you add anyone.

## Adding voters by typing them in

Click **Add Voters**. The dialog has a checkbox per column and one large text box.

- **One voter per row.** Press Enter between voters.
- **Tick the columns you are supplying.** Voter ID, Email and Precinct are each optional.
- **If you tick more than one column, separate the values with a comma** — in the order the checkboxes appear: voter ID, then email, then precinct.

Every row must contain exactly as many values as you have ticked boxes. A row with the wrong number is rejected and the message names the row.

**One column ticked (Voter ID only):**

```
alpha
bravo
charlie
```

**Two columns ticked (Voter ID and Email):**

```
alpha,ada@example.org
bravo,ben@example.org
charlie,cara@example.org
```

Click **Submit**. The voters appear in the table below.

## Importing a CSV

**Add Voters → Import CSV** takes a comma-separated file with a header row.

The header must use these exact names, and no others:

| Column | Header name |
|---|---|
| Voter ID | `voter_id` |
| Email | `email` |
| Precinct | `precinct` |

You can supply any subset, in any order — the header row decides which column is which. A file with a header BetterVoting does not recognise is refused rather than guessed at, so a spreadsheet exported with friendly column titles like *"Voter ID"* needs its header row renamed first.

```csv
voter_id,email
alpha,ada@example.org
bravo,ben@example.org
charlie,cara@example.org
```

Completely empty rows are ignored, so a trailing newline at the end of the file is fine.

## Duplicates

If your list contains the same voter twice, BetterVoting asks whether to remove the repeats before adding anyone.

- **Yes** adds each voter once and skips the repeats.
- **No** leaves your list untouched so you can correct it and submit again.

A list with no repeats is added without asking.

{: .note }
> Check the voter count in the table after every submission. It is the quickest confirmation that the roll matches the list you were given.

## Reading the voter table

Below the buttons, every voter on the roll is listed with the columns you supplied and a **Has Voted** column, which reads `Not Voted` until their ballot is in. The footer shows how many voters are on the roll — `1–20 of 57`.

Use it to:

- confirm the roll is complete before you finalize;
- track turnout while the election is open;
- find a voter whose ID or email needs correcting.

## Clearing the list

**Clear Voter List** removes every voter and unlocks the two settings above. It confirms first, and tells you how many voters will be removed.

It is only available while the election is a **draft**. After you finalize, the roll can be added to but not emptied.

## What happens when you finalize

Finalizing is one-way. For a restricted election it means:

- the voter list and the identification method are fixed;
- with **BetterVoting-managed voter IDs**, you can send voters their unique voting links from **Draft Email Blast**;
- with **admin-managed voter IDs**, you distribute the IDs and the shared voting link yourself, and voters enter their ID on the voting page;
- any test ballots cast while the election was a draft are deleted.

You can still add voters to a finalized election — useful when someone is missed — but you cannot remove them or change how they are identified.
