BV240d - Closed list + edit vote, the strongest warning variant

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240c](BV240c-closed-list-warning-layer.md) — the same closed-list layer without edit-vote
- [BV240a](BV240a-notice-appears-on-ballot.md) — the base notice this builds on

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented, AND blocked on wording approval (Q2)**

# Purpose

The worst-case configuration in the whole set: preliminary results public **and** voters allowed to change their ballots, on a **closed list**. Expected surface is the base notice from BV240a, plus the closed-list layer from BV240c, **escalated** to say that votes can be changed while voting is open.

Why this combination and not just "closed list, more so." Three mechanisms compound, and each one strengthens the attack independently:

1. **Repeatability.** With one-shot ballots an observer gets a single delta per voter. With edit-vote each edit is a fresh confirming sample against the same person, so a guess can be tested rather than inferred once.
2. **Manufactured quiet windows.** The delta attack needs a window in which only the target votes. Closed-list + email invitation ships a built-in nudge-one-voter control (`sendEmailController.ts:33`, `target: 'single'`), so the observer **schedules** the quiet window instead of waiting for one.
3. **A stable published key.** `ballot_id` is **reused across edits** (`castVoteController.ts:86`) and is **column 1 of the public CSV export** (`BallotDataExport.tsx:46`). So the observer does not diff aggregates at all — they watch one row's scores change.

Point 3 is strictly stronger than the delta attack `docs/help/preliminary_results.md:26` describes, and the help article does not currently describe it. That is worth raising on the ticket independently of whether this case passes.

**This case is blocked twice over.** The feature does not exist (as of 2026-07-29), *and* the closed-list wording is unapproved — open question **Q2**, the same blocker as BV240c. Q2 is not a formality here: the escalated variant is the strongest privacy claim anyone would make about Equal Vote's own product, on the ballot page, and per §3 of the analysis the *honest* version differs from the issue's framing. **Do not finalize the expected text in this document until Q2 is answered.** Assert on the requirements below; treat every quoted string as a placeholder.

# Prerequisites

1. **The feature must be implemented.** Nothing in the voter flow mentions preliminary results today. Run against a local `docker compose` stack during PR review, then re-run on production.
2. **Q2 must be answered** before this case can produce a meaningful *pass*. Until then it can only produce a **fail** (nothing rendered) or a **provisional pass** against requirements, never against copy.
3. **Set the access mode BEFORE the edit-vote switch.** See the master-data warning below. This is the single most likely way to waste an hour on this case.
4. **A voter identity on the roll.** E4 uses BV-managed IDs with email invitation, so the ballot is reached through the emailed link (`/{eid}/id/{voter_id}`), not a shared election link. You need an inbox you can read.
5. **Incognito for the voter, normal window for admin** — as BV240a. A logged-in admin sees banners a real voter never does.
6. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
7. **`curl` and `jq`** for the export check in step 9.

# Master data

Election configuration **E4** — used only by this case. It cannot be shared with BV240c, because the access mode differs (`closed_admin_managed_ids` vs `closed_bv_managed_ids`).

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Irrelevant here; the renderer is BV240j's job |
| Races | 1 | |
| Candidates | 3 | The **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> — saves setup, but its access mode must be changed |
| Winners / seats | 1 | |
| Who can vote | **Closed list, BV-managed IDs + email invitation** | ← forced by edit-vote; see below |
| **Show Preliminary Results** | **ON** | |
| **Allow Voters To Edit Vote** | **ON** | ← the variable that makes this case different from BV240c |
| State | Open (finalized, voting open) | Edits are only accepted while `open` |
| Voters on the roll | 2–3 | One of them you |
| Ballots cast | 1 by you, then **edited** | The edit is the point |

**⚠ This is the only legal edit-vote configuration, and getting it wrong fails silently.** `settingsCompatiblityValidation` rejects `ballot_updates` unless `voter_access != 'open'` **and** `invitation == 'email'`. Of the six canonical access modes only **`closed_bv_managed_ids`** satisfies both — `closed_admin_managed_ids` is closed but does not invite by email, so it does **not** qualify. Consequences:

- Flipping **Allow Voters To Edit Vote** on an open-access election **400s**, and the optimistic toggle reverts the switch with no error text you will necessarily notice. It looks like the click didn't land.
- So: set **Who can vote** to closed / BV-managed IDs *first*, save, **navigate away and back to confirm it stuck**, and only then turn on edit-vote.
- Then confirm edit-vote survives a navigate-away-and-back too. A switch that reverts on remount is the `7cbc6079` (2026-07-27) stale-render class of bug, not a validation refusal — different problem, same symptom.

# Test steps

1. As admin, configure E4 in the order above: access mode → save → verify → edit-vote → save → verify → **Show Preliminary Results** ON → verify.
2. Add yourself (and 1–2 others) to the voter roll. Finalize. Send the invitations.
3. Open the invitation email. Note that it contains your voting URL — see Notes.
4. Incognito → open the emailed voting link.
5. **Before scrolling and before entering any scores**, screenshot the ballot page. This is the primary evidence.
6. Read the notice stack top to bottom. Identify **three distinct things**: the base disclosure, the closed-list layer, the edit-vote escalation. Record whether they are three blocks, one merged block, or fewer than three.
7. Enter scores and **submit**. (BV240a says don't submit; this case must, because the escalation is about editing. Keep the submit-dialog wording itself out of scope — that is BV240i.)
8. **Re-open the voting link and check the notice on the edit render.** The ballot should be editable and pre-filled. The notice must still be there. This step has teeth: a notice gated on anything that changes once a ballot exists would vanish on exactly the render where "you can change your vote, and the change is visible" matters most.
9. **Verify the settings against the server** (see below).

## Step 9 — the export check

```
curl -s https://bettervoting.com/API/Election/ELECTION_ID | jq '.election.settings'
```

Expected in `election.settings`:

```json
{
  "public_results": true,
  "ballot_updates": true,
  "voter_access": "closed",
  "invitation": "email",
  ...
}
```

**This check is load-bearing in this case, not decorative.** All three of those values had to be set through switches that can refuse silently. If `ballot_updates` came back `false`, the election you tested is really an E3 and **this case tested nothing** — the result is void, not a fail. Assert `public_results` **and** `ballot_updates` **and** `voter_access` before recording any outcome.

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export into a v2 format; the `/API/Election/<id>` response is the raw backend object and is unchanged by that work, so a check written against the API survives it.

Rationale for reading the server at all: the toggle is a UI claim, the export is what the database holds, and the two disagreed for three months until `7cbc6079` (2026-07-27).

**Unverified:** BV240a and BV240b run this GET anonymously on open-access elections. Whether the anonymous response carries `settings` for a **closed-list** election has not been checked. If it doesn't, re-run with the admin session and record that as an observation — don't assume either way.

# Expected results

Requirements, in priority order. **Every one is a requirement about substance, not about wording** (Q2).

1. **The base notice is present**, satisfying all of BV240a's requirements 1–6 (visible on first paint, before any interaction, states results are public while voting is open, states the inference risk, carries the article link, appears once).
2. **The closed-list layer is present**, distinguishable from the base notice, and says: administrators can see **which voters have cast a ballot and when**, and combined with live results that timing can narrow down how a particular voter voted.
3. **The edit-vote escalation is present**, and conveys that ballots can be **changed while voting is open** and that a change is visible in the running results. This is what separates this case from BV240c. If the E4 ballot shows exactly the same text as the E3 ballot, requirement 3 fails even though 1 and 2 pass — record it that way.
4. **It does NOT claim administrators can look up a voter's ballot.** `ballot_id` is scrubbed from every roll response unconditionally (`getElectionRollController.ts:141-156`), and the voter→ballot join `getBallotByVoterID` is called from exactly one place — the edit-vote path in `castVoteController.ts:78` — never from an admin endpoint. A notice that overclaims here **fails as inaccurate**, which is a worse failure than missing: it is a false statement about the product, in print, on the ballot.
5. **The notice survives into the edit render** (step 8).
6. **It renders once** per ballot page, not once per layer per race.
7. **The server agrees** — `public_results: true`, `ballot_updates: true`, `voter_access: "closed"`.

Proposed escalation wording — **reference only, not yet approved, and specifically pending Q2**:

> **Results are public, and your vote can be changed**
> This election shows results while voting is open, and you can come back and change your ballot until it closes. Administrators can see who has voted and when. In a small election, that timing — and each change you make — can make it possible to work out how you voted.
> [What preliminary results reveal →]

**Do not assert on that string.** Two BV240 predictions have already been refuted by screenshots; treat proposed copy the same way. Assert requirements 1–7.

**Marked as prediction:** requirement 3's *content* is derived from reading `ElectionSettings.ts:44-56`, `castVoteController.ts:86`, and `BallotDataExport.tsx:46` — not from observing any shipped notice, because none exists. The implementation may reasonably choose a different escalation. Judge it against the mechanism, not against my sentence.

# Pass / fail

- **Void (not fail)** — requirement 7 shows `ballot_updates: false` or `voter_access: "open"`. The configuration never took. Fix the setup order and re-run; record nothing else.
- **Blocked** — the default outcome today. Feature absent ⇒ requirements 1–6 all fail trivially. That is not information. Note the build and move on.
- **Provisional pass** — 1–7 met, wording still unapproved. This is the best result available until Q2 lands, and it is what this case should aim for during PR review. Say "provisional" in the sheet; do not write "Pass".
- **Pass** — 1–7 met *and* the rendered copy matches whatever Q2 approved.
- **Fail (missing)** — requirement 3 absent while 1–2 pass: the implementation treated both closed-list configurations identically and the strongest hazard got the middling warning.
- **Fail (inaccurate)** — requirement 4 breached. Escalate this one; it is a copy correctness bug with the project's name on it, not a missing-feature bug.
- **Fail (worse)** — requirement 5 fails: the notice appears on the first cast and disappears on the edit. The voter is warned when the warning is weakest and unwarned when it is strongest.

# Actual results

*[screenshot — E4 admin settings page, showing Who can vote = closed/BV-managed IDs, Allow Voters To Edit Vote = ON, Show Preliminary Results = ON, all three after a navigate-away-and-back]*

*[screenshot — ballot page as invited voter, first visit, before any interaction, full viewport including the fold line]*

*[screenshot — the notice stack close-up, with the three layers labelled: base / closed-list / edit-vote escalation]*

*[screenshot — ballot page on the SECOND visit (edit render), pre-filled scores visible, showing whether the notice is still present]*

*[export excerpt — `election.settings` showing `public_results: true`, `ballot_updates: true`, `voter_access: "closed"`, plus `state` and `update_date`]*

*[optional — the invitation email, with the voter id redacted]*

# Notes

**Redact before attaching. This one is different from BV240a/b.** E4 is an email-list election, so `credential_ids` / `admin_ids` in a full export hold **real voter and admin email addresses**. On the open-access E1/E2 those fields are `null` and the warning is habit; here it is live. Attach the `election.settings` excerpt only. Same for the emailed voting URL — it embeds `voter_id`, which is a working credential for that voter's ballot.

**The tension worth recording on the ticket.** `castVoteController.ts:275-279` scrubs `ballot_id` from the cast response *specifically* "to prevent voters from creating receipts (vote buying/coercion)" — while `EmailTemplates.ts:91` emails the voter a `/{eid}/ballot/{ballot_id}` link containing that same id, and `BallotDataExport.tsx:46` publishes it as column 1 of the public CSV. The receipt the controller refuses to hand over is available from the voter's own inbox and joinable against the public export. That is not a #1350 pass/fail, but it is directly relevant to what the closed-list copy may honestly promise, so it belongs in the Q2 discussion.

**`secureShuffle` is not a defence here, and someone will say it is.** `controllerUtils.ts:65-76` randomizes order *within* a single response. It does nothing about fetching twice and diffing, and nothing at all about a stable `ballot_id`.

**This case may be testing a theoretical population.** Whether any production election has `ballot_updates: true` is unknown: the wizard hardcodes it `false`, and the full-editor switch has no client-side compatibility gate, so most attempts to enable it 400 and revert. If the answer turns out to be "essentially none", requirement 3 is still correct but its priority drops — worth asking before the implementation spends effort on a third layer.

**Q6, adjacent and not covered by any case:** for a closed list the invitation **email** is chronologically the first voter surface, and arguably where "transparent before they cast" begins. It is English-only by construction (backend templates have no i18n) and defeatable anyway, since the flag can flip after invites go out. Note what the email did or didn't say; don't fail the case on it.

**Vacuity, stated plainly:** until the notice ships, every requirement here fails for the same uninformative reason. The required build is one that renders `PreliminaryResultsNotice` from `VotePage.tsx` with a `voter_access === 'closed'` branch **and** a `ballot_updates` branch. A build with only the first gives the BV240c text on an E4 ballot — which is requirement 3's failure, and the specific thing this case exists to catch.

# Related

- **BV240c** — closed list, edit-vote OFF. Run the two back to back against the same build: the *difference* between the two ballots is this case's real assertion.
- **BV240a** — the base notice, requirement 1
- **BV240i** — the submit dialog; step 7 deliberately submits but does not judge the dialog
- **BV240p** — mid-election flag flip, the hazard copy cannot fix
- **BV230-r1** — established the toggle is bidirectional with no state guard
- **#1353 / PR #1365** — the audit log; the only thing that would make an admin's peek observable
- **Q2** on the ticket — the blocker. Whoever signs the closed-list wording signs this case's expected text.
