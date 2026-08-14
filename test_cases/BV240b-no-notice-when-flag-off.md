# BV240b - No notice when public results is off

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [test cases - preliminary results](https://docs.google.com/document/d/1qlMsIM4r1GesOc-XmM_NKXnOysSRPQoPh6CuR-s1fPs/edit)
- [BV240a](https://docs.google.com/document/d/1BHIyutptKj7G_RmIsU8e3hiMOeUPEclFqurmepfhbns/edit) — the mirror positive

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented**

# Purpose

The mirror negative of BV240a. Proves the disclaimer is gated on the setting and does not leak onto elections whose results are hidden.

This matters more than a negative case usually does. A privacy warning that appears on an election where results are **not** public tells the voter something untrue about their own election — that's worse than showing no warning at all, and it would undermine the notice everywhere else. If a voter learns the banner appears regardless, they stop reading it.

**Read this before running it:** as written today the case is **vacuous** — there is no notice anywhere in the product, so of course none appears. Its value is entirely as a **regression guard after the feature ships**. Run it in the same session as BV240a, against the same build, or it proves nothing.

# Baseline already captured

The flag-OFF baseline was captured on **2026-07-29** during the [BV230-r1](https://bettervoting.com/yyvwrj) retest, before that election's flag was switched on. Those screenshots are this case's "before":

| Surface | Observed with flag OFF |
|---|---|
| Landing page, signed in as admin | `SHARE ELECTION` + title + `VOTE`. No results affordance |
| Landing page, incognito / not signed in | Same |
| Ballot (`/vote`) | Instructions, score grid, "Learn more about STAR Voting". No notice |
| Submit dialog | Receipt email + the three scores + Cancel/Submit. Nothing else |
| Thank-you (`/thanks`) | "Ballot Submitted" + `SHARE ELECTION` + Donate link. No results link |
| Results page, **as admin** | Heading "PRELIMINARY RESULTS" over a placeholder: *"The election admins have not released the results yet. Feel free to swing back later 😊"* — **no tally** |

Attach those to this doc. After the feature ships, this table is exactly what must still be true.

# Prerequisites

1. **The feature must be implemented**, and this must run against the **same build** as BV240a. A pass here against a build with no notice at all is meaningless.
2. **Fresh incognito window.** Not the one you used for BV240a, and not one that has already voted.
3. **Do not reuse `yyvwrj`.** Its flag is now ON, and flipping it back off leaves an election whose results were already exposed — a different scenario (see Notes). Use a clean election that has never had the flag on.
4. **`curl` and `jq`** for the export check in step 7 (or the repo's `fetch_bv_export.py`).

# Master data

Election configuration **E2** — identical to E1 except the one variable.

| Field | Value |
|---|---|
| Method | STAR |
| Races | 1 |
| Candidates | 3 |
| Winners / seats | 1 |
| Who can vote | Unrestricted / open link |
| **Show Preliminary Results** | **OFF — and never turned on** |
| Allow Voters To Edit Vote | OFF |
| State | Open (finalized, voting open) |
| Ballots cast | 1–3 |

# Test steps

Walk the entire voter journey. A partial gate is the realistic failure mode — the implementation touches the ballot page, the submit dialog, and possibly the landing page, and each is a separate condition someone can forget.

1. Incognito → open the election link. Check the landing page.
2. Click `VOTE`. Check the ballot page, top to bottom.
3. Fill the ballot, click Submit. Check the confirmation dialog.
4. Submit. Check the thank-you page.
5. **Then the step with teeth:** navigate directly to `/{election_id}/results` by typing the URL. Absence of a link is not absence of access.
6. As **admin**, click `LIVE RESULTS` in the sidebar.
7. **Verify the setting against the server** (see below).

## Step 7 — the export check

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
  "public_results": false,
  "ballot_updates": false,
  "voter_access": "open",
  ...
}
```

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format (`format_version: 2`, snake_case throughout, ISO timestamps, deduped pairwise matrix). The `/API/Election/<id>` response is the raw backend object and is **not** changed by that work, so a check written against the API survives the v2 landing. A check written against the downloaded file would break.

**Why this belongs in the case.** The toggle is a UI claim; `public_results` in the export is what the database holds. Those disagreed for three months until `7cbc6079` (2026-07-27). A negative case especially needs this — "I saw no notice" is a weak assertion if you can't also show the flag was genuinely off. And it needs no login.

# Expected results

1. **No preliminary-results notice** on the ballot.
2. **No warning sentence** in the submit dialog.
3. **No results link** on the landing page.
4. **No results link** on the thank-you page.
5. **The direct `/results` URL does not show a tally.** The backend refuses results while the flag is off and voting is open, so this is blocked server-side, not merely unlinked.
6. **The admin also sees no tally** — the placeholder message, not results. This is deliberate and correct: the results gate runs *before* any permission check, so the owner is refused along with everyone else. Worth asserting positively rather than treating as an absence.
7. **The server agrees** — `election.settings.public_results` is `false` in the export.

# Pass / fail

- **Pass** — all seven.
- **Fail** — any notice, warning, or results affordance appears. Record *which surface*, because that localizes the missing condition immediately.
- **Fail (more serious)** — step 5 or 6 shows a tally. That means the results gate itself is broken, which is a bigger problem than the disclaimer and belongs in its own issue, not this one.
- **Fail (different problem)** — requirement 7 disagrees with the UI. That's a toggle/persistence bug, not a disclaimer bug.

# Actual results

*[screenshots — landing / ballot / dialog / thanks, flag OFF]*

*[screenshot — direct /results URL with flag OFF]*

*[export excerpt — `election.settings` showing `public_results: false`]*

# Notes

**Step 6 was an open question and is now answered.** I had predicted the admin's `LIVE RESULTS` nav item might error or render nothing with the flag off — a possible UX bug. It doesn't: BV230-r1 showed a purpose-written placeholder (*"The election admins have not released the results yet…"*). Handled deliberately. **No separate issue needed.** One residual nit, not worth filing: that page still renders the heading "PRELIMINARY RESULTS" above a message saying there aren't any.

That placeholder is a hardcoded English string, not routed through i18n — so a Spanish-speaking admin sees English. Same class of gap as BV240o.

**Turning the flag back OFF is a different case, not this one.** With no state guard on the setting, an admin can switch results on, look, and switch them back off. A voter arriving afterwards sees exactly the flag-OFF state this case describes — but the tally was already exposed and cannot be un-seen. That belongs to BV240p and to the open question about whether the setting should be a one-way ratchet after draft. Don't fold it in here; a negative case needs to stay clean.

**Attaching the export.** Attach the `election.settings` excerpt plus `state` and `update_date` — that's the evidence. Before attaching a *full* BV export to a shared document, check `credential_ids` / `admin_ids`: on an **email-list** election those hold voter and admin email addresses. They're `null` on an open-access test election, but the habit matters.

# Related

- **BV240a** — the mirror positive. Run them together, same build.
- **BV240e** — flag ON but election closed: also expects no *preliminary* notice, for a different reason.
- **BV240p** — the mid-election flip, where the flag changes under a voter.
- **BV230-r1** — the retest that produced this baseline.
- **#1420** — the v2 JSON export work; see step 7 on why this case uses the API instead.
