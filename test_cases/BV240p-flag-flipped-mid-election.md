BV240p - Flag flipped mid-election; the voter is never disclosed to

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240b](BV240b-no-notice-when-flag-off.md) — the same election before anyone touches the flag
- [BV240a](BV240a-notice-appears-on-ballot.md) — the notice this case shows arriving too late

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
analysis: <https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5125205974>
status: **Not ready — feature not implemented; and the gap it records is by design today (open question Q5)**

# Purpose

**This case documents a gap. It is not a pass/fail on #1350.**

A voter loads a ballot on an election whose results are hidden. Correctly, no disclaimer appears. While that page sits open, the admin turns **Show Preliminary Results** on. The voter then submits — into an election that now publishes a live tally, having never been told.

**Copy cannot fix this.** The disclaimer was *correctly* absent when the page rendered. #1350 can make the notice accurate at render time; it cannot make it accurate afterwards. So the deliverable of this case is a reproduction plus a before/after export pair, attached to the issue thread as the concrete evidence behind open question **Q5**.

Two mechanisms combine:

- **`setPublicResults` has no election-state guard** and no re-notification path — `setPublicResultsController.ts:14-33` never references `election.state`. The flip is legal in every state, at any moment.
- **The frontend election context keys its fetch on the election id.** `ElectionContextProvider`'s fetch effect does not re-run on route changes within an election and has no polling, so an already-open ballot page never re-reads `settings`. The voter's tab holds the pre-flip election object until a hard reload.

# Prerequisites

1. **A real two-browser manual run.** Automation is **tbd**, not `y` — it needs two independent browser contexts and a *timed interleaving* (the flip must land between page load and submit, with no reload in between). Worth automating eventually; not with the existing single-context Playwright specs.
2. **Two contexts, and they must not share storage.** Browser A = **private / incognito** window, the voter. Browser B = your normal signed-in window, the admin. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
3. **A clean E2 election that has never had the flag on.** Do **not** reuse [`yyvwrj`](https://bettervoting.com/yyvwrj) (BV230-r1) — its flag is already ON, and flipping it back off to reach the start state is the *peek-then-hide* direction, which contaminates the run (see Notes).
4. **Run BV240b first, or mint a second election.** This case consumes its election: once the flag is on, that election is no longer an E2. BV240b needs an untouched E2.
5. **`curl` and `jq`** for the export captures in steps 1 and 5 (or the repo's `fetch_bv_export.py`).
6. **Parts of this case are vacuous today.** Steps 6–7 assert on a notice and a dialog sentence that do not exist yet; run them against a local `docker compose` stack once the #1350 PR is up. Steps 1–5 and 8–10 — the mechanism, the export pair, and the staleness symptom — **run today against production**, and are the half worth capturing now.

# Master data

Election configuration **E2**, then flipped. The variable under test is not the setting's value but the *moment it changes*.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Renderer is irrelevant here |
| Races | 1 | |
| Candidates | 3 | **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> |
| Winners / seats | 1 | |
| Who can vote | Unrestricted / open link | Closed list would escalate this, but that's BV240c/d |
| **Show Preliminary Results** | **OFF at load → ON mid-session** | ← the variable under test |
| Allow Voters To Edit Vote | OFF | Illegal on an open-access election anyway |
| State | Open (finalized, voting open) | |
| Ballots cast before the run | 0–2 | Keep it small; a 1-ballot tally is the sharpest illustration of *why* the disclosure matters |

# Test steps

The sequence is the test. Do not reload Browser A at any point between step 2 and step 9 — a reload refetches the election and destroys the scenario.

1. **Capture the export, T0** (before anything). See below.
2. **Browser A (incognito, voter)** — open the voter link, click `VOTE`. Confirm **no preliminary-results notice**. Screenshot.
3. **Browser A** — enter scores for all three candidates. **Do not submit.** Leave the tab open and untouched.
4. **Browser B (admin, normal window)** — election settings → toggle **Show Preliminary Results** ON. Screenshot the toggle. Confirm no error snackbar, then navigate away and back to confirm the value stuck (that round-trip is BV230's repro; `7cbc6079`, 2026-07-27, fixed the stale-render).
5. **Capture the export, T1.** This plus T0 is the artifact for the issue.
6. **Browser A, without reloading** — look at the ballot page again. Screenshot.
7. **Browser A** — click Submit. Screenshot the confirmation dialog **before** confirming.
8. **Browser A** — confirm the submit. Screenshot the thank-you page.
9. **Browser A** — reach `/{election_id}/results`, typing the URL if there is no link. The live tally is now public and includes the ballot just cast.
10. **Optional second leg — peek-then-hide.** Browser B flips the flag back **OFF**. Then a *fresh* incognito Browser C opens the ballot: it sees the flag-OFF state, no notice, nothing amiss. The tally was already seen. Screenshot Browser C's ballot and the final export.

## The export check — capture it twice

```
curl -s https://bettervoting.com/API/Election/ELECTION_ID | jq '.election.settings'
```

Or, from the repo:

```
uv run STARVote_LH_tabulation_engine/tools_adam/fetch_bv_export.py ELECTION_ID -o PATH.json
```

Also grab `.election.update_date` and `.election.state` alongside `settings` — `update_date` is what proves the write landed:

```
curl -s https://bettervoting.com/API/Election/ELECTION_ID | jq '{settings: .election.settings, state: .election.state, update_date: .election.update_date}'
```

Expected at **T0** → **T1**:

| Field | T0 (before flip) | T1 (after flip) |
|---|---|---|
| `public_results` | `false` | **`true`** |
| `ballot_updates` | `false` | `false` |
| `voter_access` | `"open"` | `"open"` |
| `state` | `"open"` | `"open"` |
| `update_date` | *(value X)* | **advanced past X** |

`update_date` moves because every election write appends a new head row rather than updating in place (`Models/Elections.ts:60-92`). That advance is the timestamp of the disclosure change, and **T0/T1 side by side is the whole case in two captures** — the setting changed, the state did not, and no voter-facing surface reflects it.

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format; the `/API/Election/<id>` response is the raw backend object and is unchanged by that work, so this check survives the v2 landing.

The check earns its place here more than anywhere else in BV240: the assertion is about a *transition*, and the toggle is only a UI claim. Those disagreed for three months until `7cbc6079`.

# Expected results

What follows is the deficiency, stated as the expected outcome. Where an item comes from reading source rather than from running the product, it is **marked as a prediction** and the run is what settles it.

1. **Before the flip — no notice.** Correct behaviour, identical to BV240b.
2. **After the flip, with no reload — still no notice on the ballot page.** *Prediction from source:* the election context does not refetch, so the open tab renders the pre-flip settings indefinitely.
3. **The submit dialog is also silent** — whatever sentence BV240i lands reads from the same stale context, so the one surface the voter must actively confirm is quiet too. *Prediction from source.*
4. **The submit succeeds.** No warning, no re-confirmation, no server-side complaint. The ballot lands in an election that now publishes a live tally.
5. **The thank-you page may also lag.** `Thanks.tsx:38` gates its results affordance on `public_results`; if the context is still stale, the voter is not offered the results link either — while a hard reload produces it. *Prediction from source, and the cheapest half of this case to confirm: it needs no #1350 code and can be run on production today.*
6. **The server tells a different story than the voter's tab** — `public_results` `false` → `true`, `update_date` advanced, `state` unchanged.
7. **Nothing, anywhere, tells the voter the rule changed after their page loaded.** No re-notification path exists in the product: not on the ballot, not in the dialog, not on the thank-you page, not by email.

There are **no copy assertions in this case.** It asserts an absence and a mechanism. Any proposed wording for #1350 is out of scope here — see Notes for the two candidate resolutions.

# Pass / fail

The polarity is inverted relative to every other BV240 case. **"Pass" means the known deficiency reproduced as described** — it does not mean the product is correct.

- **Pass** — items 1, 4, 6 and 7 hold, and (once the notice exists) 2 and 3 hold. The gap is confirmed and the T0/T1 pair is attached. **Pass here is a finding, not a clean bill of health.**
- **Better than expected** — if after the flip Browser A picks up the notice **without a reload**, the frontend re-reads the election more aggressively than the source suggests. Good news: the gap narrows to voters already inside the submit dialog. Re-run twice to rule out an incidental refetch, then rewrite this case around the narrower window.
- **Fail (different problem)** — the flip itself errors, or the export at T1 disagrees with the toggle. That is BV230 / `7edited-settings` territory, not #1350. Record it separately and re-run this case afterwards.
- **Fail (worse)** — the submit is rejected, or the just-cast ballot is missing from the step-9 tally. Either is a bug well outside this issue and belongs in its own report.
- **Not applicable** — items 2, 3 and (post-feature) the dialog half of the run, until the notice ships. Required build: the `PreliminaryResultsNotice` on `VotePage` plus the submit-dialog sentence. Note the N/A rather than recording a pass.

# Actual results

*[screenshot — export T0, `election.settings` + `state` + `update_date` with `public_results: false`]*

*[screenshot — Browser A, incognito ballot page, flag OFF, no notice, scores entered, not submitted]*

*[screenshot — Browser B, admin settings, Show Preliminary Results toggled ON, no error snackbar]*

*[screenshot — export T1, same three fields, `public_results: true` and `update_date` advanced past T0]*

*[screenshot — Browser A ballot page after the flip, no reload — showing the notice is still absent]*

*[screenshot — Browser A submit-confirm dialog, immediately before confirming]*

*[screenshot — Browser A thank-you page, noting whether a results link is offered]*

*[screenshot — the live results page showing the just-cast ballot in a now-public tally]*

*[screenshot — optional leg: Browser C, fresh incognito, after the flag was flipped back OFF]*

# Notes

**This is open question Q5. Record both candidate resolutions; do not pick one.**

1. **The audit log** — #1353 / PR [#1365](https://github.com/Equal-Vote/bettervoting/pull/1365), which emits a `preliminary_results_change` event. It does not warn the voter, but it makes the change publicly visible *after the fact*, so a flip can at least be discovered and dated by anyone. Cheapest option, and the branch already exists.
2. **Reword the notice** so it says the setting **can change during the election**. This is the honest fix from the voter's side, but it expands #1350 considerably: if that is what the notice says, then the **flag-OFF** state needs some disclosure too — a voter told nothing on a hidden-results election has been told, implicitly, that results are hidden. That turns a conditional banner into an unconditional one and re-opens the copy for both states.

Whoever decides Q5 should see the T0/T1 export pair, because it is what makes the gap concrete rather than theoretical.

**The related asymmetry — peek-then-hide.** Same mechanism, opposite direction, and it is the more serious of the two. An admin can flip results **ON**, look at the tally, and flip them back **OFF**. A voter arriving afterwards sees the flag-OFF state and has no way to know. The tally was already seen and cannot be un-seen. Flipping ON makes an election *more* transparent to everyone at once; flipping back OFF creates a **private** information asymmetry, which is why the two directions do not deserve the same treatment. That is the argument for making the setting a **one-way ratchet after draft** — permit `false → true`, forbid `true → false`. **BV230-r1 confirmed on 2026-07-29 that the toggle is currently fully bidirectional after finalize, with no state guard in either direction.** Capture the optional step-10 leg if you have time; it is the same run with one extra click.

**Today the flip leaves no trace a voter could find.** There is no history UI on `main` and `updateElection` discards its `reason` argument, so the only durable record of the change is the superseded election row in the append-only store — reachable by nobody through the product. That is precisely the hole PR #1365 fills, and it is why option 1 above is a live candidate rather than a consolation prize.

**Why this configuration is the default, not an edge case.** The creation wizard hardcodes `public_results: true` (`Wizard.tsx:54`) and exposes no control for it, so most elections *start* public and never need a flip. The mid-election flip therefore happens on the minority of elections whose owner deliberately turned results off — i.e. exactly the owners who were thinking about privacy. Worth saying in the issue thread.

**One boolean, two jobs.** Flipping the flag on an **open** election changes what the public can watch in real time. Flipping it on a **closed** election merely publishes final results and carries no live-tally risk. Only the open-state flip is this case. The codebase already splits the two at `ElectionSettings.tsx:108` and `ViewElectionResults.tsx:38-41`.

**Attaching the exports.** Attach the `settings` + `state` + `update_date` excerpts, not the full JSON. On an **email-list** election `credential_ids` / `admin_ids` hold voter and admin email addresses; they are `null` on an open-access test election like this one, but check before pasting into a shared document.

# Related

- **BV240b** — the flag-OFF baseline this case starts from, and the case that must run first
- **BV240a** — the notice that would have appeared, had the voter loaded the page one minute later
- **BV240i** — the submit dialog, which is stale here for the same reason as the banner
- **BV240e** — the other place one boolean does two jobs (flag ON, election closed)
- **BV230-r1** — established that the toggle works after finalize and is fully bidirectional
- **#1353 / PR #1365** — the audit log; resolution candidate 1
- **#1420** — the v2 JSON export work; see the export check on why this case uses the API
