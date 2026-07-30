BV240f - Notice appears in the draft ballot preview

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240a](BV240a-notice-appears-on-ballot.md) — the same election once finalized
- [BV240e](BV240e-no-notice-once-closed.md) — the other end of the state range

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented** · and the expected result depends on open question **Q3** (see Notes)

# Purpose

Checks the notice in the **draft ballot preview**, before the election is finalized. Same election as BV240a (**E1**), one state earlier.

This is arguably the single most valuable placement in the whole feature, and the reason is not about voters:

- `public_results: true` is the **creation-wizard default** (`Wizard.tsx:54`), and the wizard exposes **no control for it** — a grep across the whole `ElectionForm/` tree yields that one line. So the creator is never shown the choice, never accepts it, and never sees a screen that names it.
- The draft preview is therefore the **first place an election creator could possibly learn** that their election will publish a live tally. Every other surface in #1350 informs a voter, who cannot change the setting. This one informs the only person who can — and while it is still free to change (the switch is on the settings page from draft onward).

Second reason it is not hypothetical: the **anonymous cast-vote-record endpoint is already live in draft**. `getAnonymizedBallotsByElectionIDController.ts:17-31` applies no permission check and no state check — with the flag on it serves `{ballot_id, election_id, precinct, votes}` per ballot to anonymous callers **in any state, including draft**. Test ballots cast while drafting are published. The exposure in draft is real, not a preview of a future exposure.

# Prerequisites

1. **The feature must be implemented.** As of 2026-07-29 there is no preliminary-results notice anywhere in the voter flow. **This case is vacuous until the build carries it** — specifically, until the notice component is mounted on `VotePage.tsx` (~L259-265, where `DraftWarning` and `ElectionStateWarning` already stack) **and** its visibility gate includes `state === 'draft'`. A pass against a build with no notice at all proves nothing. Run against a local `docker compose` stack during PR review, then re-run on production after deploy.
2. **Check this one as ADMIN, signed in, in your normal window. That is correct here, not a mistake.** See the caveat below — it is the direct opposite of BV240a's prerequisite 2 and a tester who carries that habit over will mark this page wrong.
3. **Do not finalize.** The election must still be in `draft` for the whole run. Once you click through Publish & Share you are running BV240a instead, and you cannot go back.
4. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
5. **`curl` and `jq`** for the export check in step 7.

## Caveat — why admin-only is right for this case and wrong for every other one

BV240a insists on a **private / incognito window** because it is testing what a *voter* sees, and a signed-in admin viewing their own ballot gets extra banners (draft warning, preview labels) that no voter ever sees. Mistaking one of those for the disclaimer would be a false pass.

Here the audience **is** the admin. A draft election has no voter audience at all — it is not finalized, the voter link is not live, and nobody but the owner can reach the ballot. There is nothing to check in incognito. Testing this case as a voter is not stricter, it is impossible.

The trap inverts accordingly: because the draft preview **does** carry the pre-existing `DraftWarning` banner, the notice will not be the only banner on the page. Requirement 4 below exists for exactly that reason — you must be able to point at the preliminary-results notice as a *distinct* element, not read the draft warning and call it done.

# Master data

Election configuration **E1**, held in **draft**. No separate election needed — this is BV240a's election, tested before finalizing, so run BV240f first and BV240a second off the same setup.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Renderer is irrelevant here; ranked is BV240j |
| Races | 1 | Multi-race is BV240k |
| Candidates | 3 | The **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> — skips setup |
| Winners / seats | 1 | |
| Who can vote | Unrestricted / open link | |
| **Show Preliminary Results** | **ON** | The wizard default — leave it alone rather than setting it, so the case runs the real default path |
| Allow Voters To Edit Vote | OFF | Illegal on an open-access election anyway |
| **State** | **Draft — not finalized** | ← the variable under test |
| Ballots cast | 0 | The notice is gated on the setting, not on ballots existing |

**Leave the flag at its default.** Don't toggle it on for this run even if it looks off. Half the point of the case is that a creator who touches nothing gets `public_results: true`, and confirming that by *not* intervening is stronger evidence than confirming it by setting the value yourself.

# Test steps

1. Create the election through the normal wizard (or duplicate the Fruits template). **Stop at the end of the wizard — do not go through Publish & Share.**
2. In the admin sidebar, confirm the nav reads **PREVIEW BALLOT** / **PREVIEW RESULTS** (draft labels — observed 2026-07-29; they become **LIVE BALLOT** / **LIVE RESULTS** after finalizing). Their presence is your proof the election is still draft.
3. Open **PREVIEW BALLOT**.
4. **Before scrolling and before entering any scores**, screenshot the page. Capture the whole banner stack, not a crop of one banner.
5. Identify every banner on the page and say which is which — the draft warning, the preliminary-results notice, anything else. If you cannot tell them apart, that is a finding (requirement 4).
6. Check the notice's content and link, same as BV240a: does it name the live tally, does it name the inference risk, does it carry the article link.
7. **Verify the state and the setting against the server** (see below).
8. Optionally, open **PREVIEW RESULTS**. In draft the tally is served, so this is where a creator would actually see the consequence the notice is warning about. Not a pass/fail condition — a useful screenshot for the ticket.

**Do not submit a test ballot, and do not finalize.** Submitting is BV240i's surface; finalizing ends this case.

## Step 7 — the export check

```
curl -s https://bettervoting.com/API/Election/ELECTION_ID | jq '.election.settings'
```

Then the state, which is a sibling of `settings` on the same object:

```
curl -s https://bettervoting.com/API/Election/ELECTION_ID | jq '.election.state'
```

Expected: `"draft"`, and in `election.settings`:

```json
{
  "public_results": true,
  "ballot_updates": false,
  "voter_access": "open",
  ...
}
```

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format; the `/API/Election/<id>` response is the raw backend object and is **not** changed by that work, so a check written against the API survives the v2 landing.

**Why this belongs in the case.** Both variables under test are UI claims otherwise. The sidebar labels are the only visible evidence of `draft`, and the toggle is the only visible evidence of `public_results` — and the toggle and the database disagreed for three months until `7cbc6079` (2026-07-27) fixed a stale-render bug. A case whose whole point is "the default is true and nobody was shown it" should be able to show the *database* holding `true`.

**One prediction, flagged as such:** I have not confirmed that the anonymous `/API/Election/<id>` GET serves a **draft** election. It serves open ones, and the SSR meta path calls `getElectionByID` unauthenticated for every election page URL, so it very likely does — but this is read from source, not run. If the anonymous GET 401s or 404s on a draft row, capture the same fields from your authenticated admin session and note the difference; that difference is itself worth reporting, since the anonymized-ballot endpoint next door is unauthenticated in draft.

# Expected results

1. **The notice renders in the draft ballot preview** — the visibility gate includes `draft`, not only `open`.
2. **Visible on first paint**, above the race, without scrolling.
3. **Same content requirements as BV240a** — results are public while voting is open; it can be possible to infer how someone voted, particularly in a small election; a link to the help article.
4. **Visually distinct from the existing draft warning.** Two banners, two messages, separately identifiable. Not merged, not stacked so as to read as one paragraph, not so similar in styling that a reader takes them for a repeat.
5. **Appears once.**
6. **The server agrees** — `election.state` is `"draft"` and `election.settings.public_results` is `true`.

**Requirement 1 is a prediction, not an observation.** It comes from reading the proposed implementation, whose gate is `public_results === true` **and** `state === 'open' || state === 'draft'` — the draft half of that condition is a design proposal, not shipped behaviour, and it is exactly what open question **Q3** asks about. Nothing has been run.

For the notice's wording, assert on requirement 3 as a requirement. Any proposed string is **reference only, not yet approved** — see BV240a for the draft wording and for why pinning the literal text is a mistake.

# Pass / fail

- **Pass** — all six.
- **Fail** — no notice in the draft preview while the notice does appear on the same election once finalized (i.e. BV240a passes and this doesn't). That is the substantive failure: it means the gate is `state === 'open'` only, and the creator is never told.
- **Fail (requirement 4)** — the notice appears but is indistinguishable from the draft warning. Cosmetic in isolation, but this is the one surface where two banners always coexist, so it is this case's job to catch it.
- **Fail (different problem)** — requirement 6 disagrees with the UI. That's a state or toggle bug, not a disclaimer bug. Record it separately.
- **Not a fail — inverted by Q3.** If Q3 is answered "the notice should **not** show in draft", then the absence of the notice here is correct and this page becomes a **negative** case: assert no notice in the preview, and assert the notice does appear on the same election after finalizing (BV240a). Don't rewrite the page speculatively; record the Q3 answer at the top and flip the assertions when it lands.

# Actual results

*[screenshot — admin sidebar in draft, showing PREVIEW BALLOT / PREVIEW RESULTS]*

*[screenshot — draft ballot preview on first paint, full banner stack visible, no scrolling, no scores entered]*

*[screenshot — the two banners annotated: which one is the draft warning, which one is the preliminary-results notice]*

*[screenshot — notice close-up, showing the article link]*

*[export excerpt — `election.state` = `"draft"` and `election.settings` showing `public_results: true`]*

*[optional screenshot — PREVIEW RESULTS in draft, i.e. what the notice is warning about]*

# Notes

- **Q3 decides this page's polarity.** The open question on the ticket — should the notice show in draft at all? — is unanswered. This page **assumes yes** (the Purpose section is the argument for yes: the draft preview informs the one person who can still change the setting, and the draft exposure is already real). If the answer lands as no, the case inverts into a negative — see the last Pass / fail bullet. Either way the evidence to collect is identical; only the verdict flips.
- **Admin, not incognito. Deliberate.** See the caveat under Prerequisites. If you find yourself opening a private window for this case, stop — you're running BV240a.
- **Run this before BV240a, same election.** Draft is upstream of open and the transition is one-way. Doing them in the other order costs you a second election.
- **The wizard is the finding, not the ballot.** Whatever this case's outcome, the underlying problem is that `public_results: true` is set at `Wizard.tsx:54` with no control anywhere in the creation flow. A notice in the draft preview mitigates that; it does not fix it. If the reviewers want it fixed rather than mitigated, that's a separate issue against the wizard, and worth raising in the #1350 thread rather than folding into this case.
- **Two other inheritance paths carry the same default**, so the population is larger than "elections made in the wizard": duplicating an election `structuredClone`s the settings and resets only title / URL / owner / state (`AdminHome.tsx:49-53`), so `public_results` carries into the new draft; and CVR upload spreads `makeDefaultElection().settings` (`UploadElections.tsx:73,81-82`), i.e. inherits `true`. Both land the admin in a draft with the flag on and no screen that said so. Not separate test cases — but if you want a second data point, duplicate the Fruits template and check the notice renders on the copy's preview too.
- **0 ballots is the right ballot count here** and the notice must not depend on it. If the notice only appears once a tally is non-empty, that's a bug in exactly the same way it is on BV240a: the first ballot is the one most exposed by a delta.
- **The draft exposure is real.** Any test ballots you cast while drafting are served to anonymous callers by the anonymized-CVR endpoint while the flag is on. Finalizing deletes draft ballots, so the exposure window closes — but it was open, and this is why "it's only a preview" is not a reason to skip the notice in draft.
- **Local stack:** during PR review the host is your `docker compose` frontend, not `bettervoting.com`. Swap the host in the export command; the path and the assertions are unchanged.
- **Attach the settings excerpt, not the whole JSON** — `election.settings` plus `state` and `update_date` is the evidence. Before attaching a full BV export to a shared document, check `credential_ids` / `admin_ids`; they're `null` on an open-access test election like this one, but the habit matters.

# Related

- **BV240a** — the same election, finalized and open. Run this page first, then that one.
- **BV240e** — the far end of the state range: flag ON, election closed, no *preliminary* notice expected.
- **BV240b** — flag OFF, no notice anywhere.
- **BV240l** — the admin-side tip. The other half of informing the creator, and the surface where they can act on it.
- **Q3** on the ticket — should the notice show in draft at all? This page assumes yes.
- **Q6** on the ticket — the invite email as a voter surface. Same "earliest possible disclosure" question, one audience over.
