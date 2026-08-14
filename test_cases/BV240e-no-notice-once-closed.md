# BV240e - No preliminary notice once the election is closed

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240a](BV240a-notice-appears-on-ballot.md) — the positive this inverts
- [BV240m](BV240m-tip-under-other-label.md) — the admin side of the same closed election

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented**; requirement 3 additionally blocked on open question **Q4**

# Purpose

The other half of the state gate. BV240a proves the notice appears while voting is open; this proves it **goes away once voting closes** — same flag, opposite expectation, because the flag means two different things on either side of the close.

While voting is open, `public_results` means *"live tally visible"* and the hazard is inference from a **running total**: a ballot cast in a quiet window is exposed by the delta. Once voting closes it means *"final results published"*. There is no running total, no further ballots, and nothing for a delta to be taken against. A notice that still warns about inferring how someone voted at that point is **factually wrong**, and a wrong warning on the wrong screen is exactly how a notice gets trained out of readers everywhere else.

**Why this is one of the five likely failures.** The natural implementation is one condition:

```
if (election.settings.public_results) { ...render notice... }
```

One boolean, one line, and it leaks onto every closed election permanently — because almost every finished election ends with the flag on. The correct gate is:

```
election.settings.public_results === true && (election.state === 'open' || election.state === 'draft')
```

**The codebase already recognises this split — twice.** `ElectionSettings.tsx:108` swaps the switch label from "Show Preliminary Results" to **"Make Results Public"** once the election is closed/archived. `ViewElectionResults.tsx:38-41` swaps the results heading between **PRELIMINARY** and **OFFICIAL**. State-awareness around this one boolean is established precedent, not a new invention. The notice has to follow it; this case is what catches it when it doesn't.

# Prerequisites

1. **The feature must be implemented.** As of 2026-07-29 it is not. Run against a local `docker compose` stack during PR review, then re-run on production after deploy.
2. **Same build as BV240a, run as a pair.** On its own this case is **vacuous** — nothing renders anywhere today, so "no notice on a closed election" passes trivially. Its evidence is the *contrast*: notice present while open, absent once closed, same build, ideally the same election id.
3. **A closed election that still has the flag ON.** Two ways to get one — see Master data.
4. **Incognito window** for the voter surfaces; your normal admin window for the admin check. Same reason as BV240a — an admin sees banners a voter never does.
5. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
6. **`curl` and `jq`** for the export check in step 2.

# Master data

Election configuration **E5** — shared with BV240m. Identical to E1 except the state.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Irrelevant here; the renderer is BV240j's problem |
| Races | 1 | |
| Candidates | 3 | **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> |
| Winners / seats | 1 | |
| Who can vote | Unrestricted / open link | |
| **Show Preliminary Results** | **ON** | Still on. The switch label now reads **"Make Results Public"** — that label swap is BV240m, not this case |
| Allow Voters To Edit Vote | OFF | Illegal on an open-access election anyway |
| **State** | **Closed (voting over)** | ← the variable under test |
| Ballots cast | 2–3, **cast before closing** | Results must be non-empty, or the results page is a placeholder and proves nothing |

**Two ways to reach the closed state:**

- **(a) Continue from BV240a.** Close that same election after finishing it. Cheapest path, and it gives you a before/after pair on one election id — the strongest possible evidence that the gate reads `state` at all.
- **(b) Set `end_time` in the past.** The transition is **lazy**: `updateElectionStateIfNeeded` (`elections.controllers.ts:120-172`, invoked at `:74`) runs on every `/:id` request, so the state flips when the election is next fetched — one page load or one API GET does it. *Prediction from source, not observed.* If the export still says `open` after `end_time` has passed, fetch once more before calling it a bug.

# Test steps

1. As admin, open the election. Confirm the results toggle is still **on** and the election is closed.
2. **Verify the state and the flag against the server** — do this **first** (see below). The entire case is that one combination; if the state isn't genuinely `closed` you have accidentally re-run BV240a.
3. Incognito → open the election link. Check the landing page. A results link here is **expected and correct** on a closed election with results public.
4. Open the results page. Check (a) the heading wording, (b) whether any preliminary / inference warning sits above, below or beside it.
5. Try the ballot: navigate directly to `/{election_id}/vote` in incognito. **Record exactly what happens** — read-only ballot, redirect, "voting has closed" banner, or 404. This behaviour is not recorded anywhere in the BV240 material, and it decides whether requirement 2 is testable or moot.
6. If any ballot page does render, read it top to bottom for the notice.
7. As **admin**, open the results page as well — confirms there is no admin-only preliminary banner hanging around after close.

## Step 2 — the export check

```
curl -s https://bettervoting.com/API/Election/<election_id> | jq '.election | {state, settings}'
```

Or, from the repo:

```
uv run STARVote_LH_tabulation_engine/tools_adam/fetch_bv_export.py <election_id> -o <path>.json
```

Expected:

```json
{
  "state": "closed",
  "settings": {
    "public_results": true,
    "ballot_updates": false,
    "voter_access": "open"
  }
}
```

**Note the jq path.** `state` is a top-level field on `election`, a **sibling** of `settings`, not a key inside it — so BV240a's `jq '.election.settings'` does not capture it. Here the state *is* half the fixture, so query both together.

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format; the `/API/Election/<id>` response is the raw backend object and is unchanged by that work, so a check written against the API survives the v2 landing.

**Why this belongs in the case.** The response top level is `{election, precinctFilteredElection, voterAuth}`; assert on `election.state` and `election.settings.public_results`. The toggle and the state chip are UI claims — and those disagreed with the database for three months until `7cbc6079` (2026-07-27) fixed a stale-render bug. A case whose whole subject is *closed + flag on* cannot rest on a rendered label to establish that it ran under that combination.

# Expected results

1. **No preliminary-results notice on any ballot surface that renders in the closed state.** If no ballot surface renders at all, say so — see the note below, this is not the same as passing.
2. **No inference warning on the results page**, and the word *preliminary* absent from the heading. Closed + flag on is the **OFFICIAL** branch of `ViewElectionResults.tsx:38-41`. *Prediction from source reading, not an observation* — BV240b's baseline saw a "PRELIMINARY RESULTS" heading in the flag-off/open case, so the branch does get exercised in ways that look wrong; confirm rather than assume.
3. **What the voter *should* see instead is open question Q4 — unresolved.** Most likely nothing; at most a neutral line to the effect that results for this election are public. **Do not score this requirement.** Fail only on text that (a) warns about inferring how someone voted, or (b) describes the results as preliminary / live / still updating. Record whatever the PR shipped and take it back to the ticket.
4. **A results link on the landing page is correct, not a failure.** `ElectionHome.tsx:86,101,126` gates those three links on `public_results` with no state condition, which is right — publishing final results is what the flag means now.
5. **The server agrees** — `election.state` is `"closed"` and `election.settings.public_results` is `true`.

# Pass / fail

- **Pass** — 1, 2 and 5 hold, and anything rendered under 3 is inference-free.
- **Fail** — a preliminary / inference notice appears anywhere on a closed election. Report it as *"notice gate is missing the state condition"* and name the likely cause: the gate reads `public_results` only. This is the defect the case exists for and the single most probable miss in the PR.
- **Fail (worse)** — the notice appears *and* asserts that results are still updating or that ballots can still be inferred. That is not merely misplaced copy, it is false copy on a public page.
- **Fail (different problem)** — the results heading says PRELIMINARY on a closed election with the flag on. That is a `ViewElectionResults` regression, not a #1350 disclaimer bug. File separately.
- **Fail (fixture, not feature)** — the export shows `state: "open"` or `public_results: false`. You did not run this case. Fix the election and rerun; do not record a pass.
- **Not scored** — requirement 3, until Q4 is answered.

# Actual results

*[export excerpt — `election.state` = "closed" and `election.settings.public_results` = true, captured before any UI check]*

*[screenshot — landing page, incognito, closed election with results public]*

*[screenshot — results page heading at full width, showing PRELIMINARY vs OFFICIAL and whether any warning sits above or below it]*

*[screenshot — `/{election_id}/vote` in incognito on the closed election: whatever it actually does — read-only ballot, redirect, or closed-voting banner]*

*[screenshot — ballot page top region, if a ballot renders at all, showing no preliminary notice]*

*[screenshot — results page as admin, same election]*

*[screenshot pair, if you took path (a) — the same election id open (notice present) and closed (notice gone)]*

# Notes

**Run it as a pair with BV240a, on one election id.** Close BV240a's election and re-shoot. Two screenshots of the same id in two states is the only evidence that distinguishes "the gate reads state" from "the notice happens not to be rendering today".

**Q4 is open — record, don't decide.** The two candidate answers are *nothing at all* (leanest, and my expectation) and *one neutral sentence that results are public, with no inference claim*. What must **not** ship is the open-state copy with the tense adjusted: "results are public and it may be possible to infer how someone voted" is simply untrue once no further ballots can arrive.

**"No notice" is not "no residual privacy surface."** With the flag on, `getAnonymizedBallotsByElectionIDController.ts:17-31` applies **no state check and no permission check**, so the full per-ballot CVR stays publicly downloadable after close, with `ballot_id` as column 1 of the export (`BallotDataExport.tsx:46`). That is a real residual — and it is deliberately **out of scope here**: it is not a live-tally inference risk, and an on-ballot notice cannot address it. Don't let it argue you into re-adding a warning on this screen.

**A surface that doesn't exist can't pass requirement 1.** If `/vote` 404s or redirects in the closed state, write that down rather than recording "pass, no notice". The next tester needs to know which of the two it was.

**Archived is not covered here, and it's a cheap extra.** If the gate ships as `state !== 'closed'` instead of `state === 'open' || state === 'draft'`, an **archived** election would still show the notice. If you have an archived election to hand, check it in the same session. Not worth a separate case.

**The label swap you'll notice on the settings page is BV240m**, not a finding here.

# Related

- **BV240a** — the positive this inverts; same election, one state later
- **BV240b** — also expects no notice, for the *other* reason (flag off rather than state closed)
- **BV240m** — the admin tip under the "Make Results Public" label, on this same E5 election
- **BV240p** — the mid-election flip; the other place the one-flag-two-jobs split bites
- **BV240 index** — open question **Q4**, and the "which 5 actually catch bugs" list this case is on
