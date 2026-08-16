---
layout: default
title: Creating Elections with the API
nav_order: 10
parent: BetterVoting Documentation
---

# Creating Elections with the API

Most people build an election in the **Create Election** wizard. If you are running many similar elections, generating them from data you already hold, or wiring BetterVoting into another system, you can create them through the REST API instead.

The endpoint-by-endpoint reference is published at [bettervoting.com/API/swagger](https://bettervoting.com/API/swagger). This page is the part the reference does not cover: the order to do things in, the two fields that decide whether you can administer the election afterwards, and the one setting that will lock you out of your own election permanently if you set it by mistake.

## Try it as a draft first

An election has three states — **draft**, **finalized**, then **open** once its start time arrives.

A draft is a rehearsal. It is not listed publicly, it accepts ballots so you can check that your ballot data is being read the way you expect, and — the part that matters most — **you can still change it**. Title, description, races, candidates, settings: all editable while the election is a draft, and none of them editable afterwards.

Finalizing discards every ballot the draft collected, so your test votes never contaminate the real count.

So the safe order is:

1. Create the election with `"state": "draft"`.
2. Cast a few ballots against it and read the results back.
3. Fix whatever looks wrong — while you still can.
4. Finalize and open it only when it is right.

If you skip straight to an open election and the title has a typo in it, the typo is permanent. There is no rename, and no delete.

## The three calls

**Create the election.** `POST /API/Elections`, with the election object wrapped in a capitalised `Election` key:

```json
{ "Election": { "title": "…", "state": "draft", "races": [ … ] } }
```

The response carries the new six-character election ID. Your election is at `bettervoting.com/<id>`.

**Cast a ballot.** `POST /API/Election/<id>/vote`. BetterVoting keys each ballot to the caller's **`temp_id` cookie**, which is how an open poll enforces one ballot per voter and how a voter changes their mind — re-submitting with the same `temp_id` *updates* that voter's ballot rather than adding a second one. To load ballots for several different voters, send a different `temp_id` with each.

**Read the count.** `GET /API/ElectionResult/<id>` tabulates on demand; the election does not have to be closed. `GET /API/Election/<id>/anonymizedBallots` returns the ballots themselves, without any voter identifier attached.

Ballot values depend on the method: **0–5** for STAR and Score, **0 or 1** for Approval and Choose-One, and for the ranked methods a **rank** in each candidate's slot — `1` for your top choice, `0` for a candidate you left unranked.

## The two fields that decide who can administer it

**`owner_id`** is your BetterVoting account ID. It is what puts the election in your [My Elections & Polls](https://bettervoting.com/manage) list, and it is what gives you the owner role — the admin menu down the left-hand side, and everything behind it. Set it to your own account.

**`admin_ids`** adds co-administrators. It is matched against each person's **email address**, so it takes emails, not account IDs. An account ID here matches nobody, silently.

If you create an election and find that it appears in your list but shows no admin menu, the cause is almost always the next section.

## `auth_key` — do not set this unless you mean it

`auth_key` exists for one specific arrangement: an election whose **voters** are authenticated by a system you run, rather than by BetterVoting. You put an RS256 **public key** here, your system signs each voter a token with the matching private key, and BetterVoting verifies that token — supplied as a `custom_id_token` cookie — to decide who is allowed to vote.

It is **not** a way to authenticate *yourself* as the election's creator, and setting it does not make your API calls more trusted. What it does is switch that election over to your key entirely: from then on, on every request for that election, BetterVoting works out who you are by checking the `custom_id_token` cookie against `auth_key` — and it stops consulting your ordinary BetterVoting login for that election.

The consequence catches people out:

- Your browser has no `custom_id_token`, so on that election BetterVoting does not recognise you as anybody.
- `owner_id` and `admin_ids` are then compared against nobody, so you hold no role.
- The admin menu disappears — not just from the admin pages, but from the ballot and results pages too, because the whole menu is hidden from anyone without a role.
- The election still shows in your **My Elections & Polls** list, which is what makes this so confusing. It looks like yours. You simply cannot do anything with it.

**And you cannot undo it.** Clearing `auth_key` is an edit, edits need a role, and the role is the thing you no longer have. Even if you could authenticate, edits are refused on any election that is not still a draft.

So: if you are not deliberately building voter authentication on top of your own identity system, leave `auth_key` out of the election object entirely. If you *are*, set it on a draft first and confirm you can still reach the admin pages before you finalize anything.

## What you cannot change after opening

Worth knowing before the first create, because none of these have a second chance once the election leaves draft:

| | |
|---|---|
| Election title | permanent — shown on the public results page |
| Race titles | permanent — the voting page leads with the race title |
| Description | permanent |
| Deleting the election | not available; **Archive** on Admin Home hides it from your list |

Descriptions are rendered with a deliberately small subset of Markdown: `**bold**` and `[link text](url)`. There is no automatic linking of bare URLs, so a web address written on its own arrives as plain grey text that a voter has to copy out by hand. Write links with the brackets.

## Related

- [Finding Your Elections](finding_your_elections.md) — the `/manage` list, election IDs, and why an archived election vanishes
- [Security Options](https://docs.bettervoting.com/help/security_options.html) — choosing between an open poll and a restricted election
