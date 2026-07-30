BV240a - Preliminary results notice appears on ballot before submit

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [test cases - preliminary results](https://docs.google.com/document/d/1qlMsIM4r1GesOc-XmM_NKXnOysSRPQoPh6CuR-s1fPs/edit)
- [BV240b](https://docs.google.com/document/d/1Xna8RxWCmERQUuKF5FeH_HxxgRvVzMWt-Vny4nnvKl4/edit) — the mirror negative

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
analysis: <https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5125205974>
status: **Not ready — feature not implemented**

# Purpose

The base positive case for issue #1350. Proves that when preliminary results are public, the voter is told so **on the ballot, before casting** — not after submitting, and not only if they go looking.

This is the case the whole issue exists for. Every other BV240 case is a boundary, a surface, or a negative around it.

# Prerequisites

1. **The feature must be implemented.** As of 2026-07-29 it is not — there is no preliminary-results notice anywhere in the voter flow. The help article exists (`docs/help/preliminary_results.md`) but is linked from nowhere in the app. Until the PR lands this case cannot pass; run it against a local `docker compose` stack during review, then re-run on production after deploy.
2. **Two browser contexts.** Admin work in your normal window; the ballot check in a **private / incognito window**. This matters — a logged-in admin viewing their own ballot can see extra banners (draft warnings, preview labels) that a real voter never sees, and mistaking one of those for the disclaimer would give a false pass.
3. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
4. **`curl` and `jq`** for the export check in step 8 (or the repo's `fetch_bv_export.py`).

# Master data

Election configuration **E1** — reused by BV240f, g, h, i, k, o. Set it up once.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Not a tabulation test — method is irrelevant except in BV240j |
| Races | 1 | Multi-race is BV240k |
| Candidates | 3 | Suggest the existing **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> — to skip setup |
| Winners / seats | 1 | |
| Who can vote | Unrestricted / open link | Closed list is BV240c |
| **Show Preliminary Results** | **ON** | ← the variable under test |
| Allow Voters To Edit Vote | OFF | Edit-vote is BV240d |
| State | Open (finalized, voting open) | Draft is BV240f; closed is BV240e |
| Ballots already cast | 3 | See note below — the notice should not depend on this |

**Note on ballot count:** the notice is gated on the *setting*, not on whether any ballots exist. Worth confirming with **0 ballots cast** as well — if the notice only appears once results are non-empty, that's a bug, because the first voter is exactly the one who most needs the warning.

# Test steps

1. As admin, open the election and confirm **Show Preliminary Results** is ON and the election is open.
2. Copy the voter link.
3. Open the voter link in a **private / incognito window**.
4. **Before scrolling and before entering any scores**, look at the ballot page. Screenshot it.
5. Check the notice: where it sits, what it says, whether it carries a link.
6. Scroll through the whole ballot and enter scores for all three candidates — but **do not submit**.
7. Confirm the notice is still present / still reachable.
8. **Verify the setting against the server** (see below).

**Stop at step 7 for the UI. Do not submit.** The submit-confirm dialog is BV240i and the link behaviour is BV240g — keeping them separate means a failure points at one thing.

## Step 8 — the export check

Don't take the admin toggle's word for it. One anonymous GET returns the server's own answer:

```
curl -s https://bettervoting.com/API/Election/<election_id> | jq '.election.settings'
```

Or, from the repo:

```
uv run STARVote_LH_tabulation_engine/tools_adam/fetch_bv_export.py <election_id> -o <path>.json
```

Expected in `election.settings`:

```json
{
  "public_results": true,
  "ballot_updates": false,
  "voter_access": "open",
  ...
}
```

**Why this belongs in the case.** The toggle on the Settings page is a UI claim; `public_results` in the export is what the database actually holds. Those disagreed for three months — `7cbc6079` (2026-07-27) fixed a bug where the write succeeded but the page kept showing the old value. A test that only reads the switch cannot tell a working toggle from a stale render. This check can, it needs no login, and it automates in one line.

It also records the other two variables in the BV240 matrix — `ballot_updates` and `voter_access` — so a single capture documents the whole configuration this case ran under.

# Expected results

The notice must:

1. **Be visible on first paint** — above the race, without scrolling, on a normal laptop viewport.
2. **Appear before any interaction** — not triggered by filling the ballot or by pressing Submit.
3. **Say that results are public while voting is open.**
4. **Say that this can make it possible to infer how someone voted**, particularly in a small election.
5. **Carry a link to the help article.**
6. **Appear once.**
7. **Match the server** — `election.settings.public_results` is `true` in the export.

Proposed wording (from the #1350 comment — **reference only, not yet approved**):

> **Preliminary results are public in this election**
> Results update as ballots come in, and anyone with the election link can watch them. In a small election — or if only a few people vote in a given window — it can be possible to infer how someone voted.
> [What preliminary results reveal →]

**Assert on the seven requirements above, not on this exact string.** The wording will change in review; a test that pins the literal text will fail on every copy tweak and teach everyone to ignore it.

# Pass / fail

- **Pass** — all seven requirements met.
- **Fail** — notice absent, below the fold, appears only after interaction, has no link, or omits the inference point (requirement 4 is the substance of the issue; a notice that only says "results are public" doesn't discharge it).
- **Fail (different problem)** — requirement 7 fails while 1–6 pass. That means the UI and the database disagree, which is a toggle bug, not a disclaimer bug. Record it separately.
- **Partial** — record which failed. Requirements 1–2 are the issue's core ask ("transparent to the voter *before* they've cast their ballot"); 3–5 are content; 6 is cosmetic here and is properly BV240k's job.

# Actual results

*[screenshot — ballot page, before any interaction]*

*[screenshot — notice close-up]*

*[export excerpt — `election.settings` showing `public_results: true`]*

# Notes

- **Incognito is not optional.** See prerequisite 2.
- **0-ballot check** — see the master-data note.
- **Attach the settings excerpt, not the whole JSON.** Five lines of `election.settings` plus `state` and `update_date` is the evidence; the rest of the export is candidate ids and internal fields. And before attaching any full BV export to a shared document, check `credential_ids` / `admin_ids` — on an **email-list** election those hold voter and admin email addresses. They're `null` on an open-access test election like this one, but the habit matters.
- If the notice appears but the link is same-tab, that's **BV240g**, not a failure here. Record it and move on.
- If this passes on STAR but you're curious about ranked ballots, that's **BV240j** — and it's the one most likely to fail, because the drag-and-drop ranked ballot is rendered by a different component that bypasses the shared one.

# Related

- **BV240b** — the mirror negative: flag off ⇒ no notice anywhere
- **BV240f** — same election in draft
- **BV240e** — same election once closed
- **BV240g** / **BV240i** — the link, and the submit dialog
- **BV240j** / **BV240k** — ranked ballot, multi-race
- **BV230-r1** — the retest that established the toggle works after finalize
