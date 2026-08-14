# BV240i - Submit-confirm dialog carries the warning

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240a](BV240a-notice-appears-on-ballot.md) — the banner on the same election
- [BV240g](BV240g-link-opens-new-tab.md) — the link-target hazard, if the dialog also carries a link

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented; scope also blocked on open question Q1**

# Purpose

Proves the second disclosure surface: one sentence in the **Submit Ballot** dialog, so the voter is told before the POST and not merely offered the chance to have read it.

The banner from BV240a can be scrolled past. The dialog cannot — it is the only surface the voter must **actively confirm**, and its Submit button is the only control that casts the ballot. #1350 asks for disclosure *"transparent to the voter before they have cast their ballot"*; the dialog is the screen that literally satisfies that, being the last thing between the voter and the cast.

**This is a separate component from the banner, and therefore a separate failure.** A build can ship the banner without the dialog line, or the dialog line without the banner — the two are gated by the same setting but rendered in different places. That is why this is its own case rather than a step appended to BV240a.

**Open question Q1 is unresolved:** whether the dialog line is wanted at all, or whether the banner alone discharges the requirement. The issue text says "on the ballot", which reads as the banner. This case assumes **both**. If Q1 comes back banner-only, this case is **DROPPED, not failed** — do not record a failure against a build that deliberately has no dialog line.

# Prerequisites

1. **The feature must be implemented.** As of 2026-07-29 there is no sentence in the submit dialog and no notice anywhere in the voter flow. Until the PR lands this case cannot pass; run it against a local `docker compose` stack during review, then re-run on production after deploy.
2. **Q1 answered.** If the answer is banner-only, stop — see Purpose.
3. **Run it on the same build as BV240a**, but score it independently. "The banner was there" is not evidence about the dialog.
4. **Private / incognito window** for the voter side. An admin previewing their own ballot picks up extra banners a real voter never sees.
5. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
6. **`curl` and `jq`** for the export check in step 9.

# Master data

Election configuration **E1** — the same one BV240a, f, g, h, k and o use. No new election needed.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | The dialog is rendered by the page, not the ballot view — see Notes on why that matters for BV240j |
| Races | 1 | The dialog lists every race; multi-race is BV240k |
| Candidates | 3 | **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> |
| Winners / seats | 1 | |
| Who can vote | Unrestricted / open link | |
| **Show Preliminary Results** | **ON** | ← the variable the sentence is gated on |
| Allow Voters To Edit Vote | OFF | |
| State | Open (finalized, voting open) | |
| Ballots cast by you | **0 — cancel, never submit** | Step 8 keeps the election reusable for the sibling cases |

**Score all three candidates differently** (e.g. Apple 5, Banana 3, Orange 0). The dialog echoes each score back, and distinct values make it obvious at a glance whether the new sentence pushed any of them out of frame.

# Test steps

1. As admin, confirm **Show Preliminary Results** is ON and the election is open.
2. Copy the voter link; open it in a **private / incognito window**.
3. Fill the ballot — all three candidates, distinct scores.
4. Click **Submit** to open the confirmation dialog. **Do not confirm.**
5. Screenshot the dialog **unscrolled**, in one frame: the sentence, the Receipt Email field, the race title, and all three scores.
6. Read the sentence. Note where it sits relative to the **Receipt Email (Optional)** field.
7. **Repeat at a phone viewport** (375 px wide, or a real phone). Check what is still visible in the dialog without scrolling.
8. Click **CANCEL**. Confirm you are back on the ballot with the scores intact, and that no ballot was cast.
9. **Verify the setting against the server** (see below).

## Step 9 — the export check

The sentence is conditional on `public_results`, so the flag's real value is load-bearing evidence here, exactly as it is for BV240a.

```
curl -s https://bettervoting.com/API/Election/<election_id> | jq '.election.settings'
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

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format; the `/API/Election/<id>` response is the raw backend object and is unchanged by that work, so a check written against the API survives it.

**Why this belongs in the case.** The toggle is a UI claim; `public_results` in the export is what the database holds. Those disagreed for three months until `7cbc6079` (2026-07-27) fixed a stale-render bug. Without this line, "the dialog showed the sentence" cannot be tied to a known flag state — and needing no login, it is one command.

# Expected results

1. **A warning sentence is present in the dialog**, visible on open.
2. **It is one sentence.** Not a paragraph, not a bulleted block. See the rationale in Notes.
3. **It says results are visible while voting is open.**
4. **It sits above the Receipt Email field** — inside the dialog body, ahead of the first thing the voter is asked to fill in, not tucked under the buttons.
5. **Nothing is pushed out of view.** At a 375 px-wide viewport, with the dialog unscrolled, the race title and **all three candidate scores** are still visible. This is the real constraint the one-sentence limit exists to satisfy.
6. **It appears once**, not once per race (relevant for BV240k, where the dialog enumerates both races).
7. **CANCEL still cancels** — no ballot cast, scores intact on return.
8. **The server agrees** — `election.settings.public_results` is `true` in the export.

Proposed wording — **reference only, not yet approved**:

> Results for this election are visible while voting is open.

**Assert on requirements 1–8, not on that string.** The wording will change in review, and a test pinned to the literal text fails on every copy tweak.

**Requirement 4 is a prediction, not an observation.** "Above the Receipt Email field" comes from the integration analysis' proposed insertion point in `VotePage.tsx`'s dialog body, ahead of the receipt-email `TextField` — read from source, never seen rendered. If the shipped build places it elsewhere *inside the dialog* and requirements 1–3 and 5 hold, treat that as a **note for review**, not a fail.

# Pass / fail

- **Pass** — requirements 1–8.
- **Fail** — no sentence in the dialog. This is the case's whole point, and it fails independently of whether the banner is present.
- **Fail** — the sentence is there but requirement 5 breaks: a score or the race title is below the fold on a phone. A voter who cannot see what they are confirming has been given a worse dialog in exchange for a disclosure, which is a net loss.
- **Fail (different problem)** — requirement 7 breaks (CANCEL casts a ballot, or loses the scores). That is a dialog bug, not a disclaimer bug; file it separately and note that it also invalidates the "cancel keeps the election reusable" assumption in every sibling case.
- **Fail (different problem)** — requirement 8 disagrees with the admin toggle. Toggle/persistence bug, not a disclaimer bug.
- **DROPPED, not failed** — if Q1 resolves to banner-only. Record the decision and retire the case.

# Actual results

*[screenshot — submit dialog, desktop, unscrolled: warning sentence + Receipt Email (Optional) + race title + all three candidate scores in one frame]*

*[screenshot — same dialog at 375 px wide, unscrolled, showing exactly how far down the three scores now sit]*

*[screenshot — close-up of the warning sentence and the Receipt Email field, showing their order]*

*[screenshot — ballot page after CANCEL, all three scores still entered]*

*[export excerpt — `election.settings` showing `public_results: true`]*

# Notes

**Correction (2026-07-30): the two existing Playwright specs should pass unchanged.** This page said to expect selector churn. A read of the specs says otherwise — every selector is role-plus-accessible-name based, the notice adds no button/radio/link whose name collides, and the two substring text matchers that run on the ballot page target warning strings the new copy does not contain. The one loose matcher, `getByText('open')`, runs on Admin Home where the notice does not render. Static read, not a test run.

**One sentence, and why the limit is a requirement rather than a style preference.** The dialog's job is to show the voter every race and every score for confirmation. On a phone that content already fills the dialog; a paragraph of privacy copy inserted above it pushes the scores below the fold, and the voter confirms a ballot they can no longer see. Requirement 5 is the assertion that carries this — requirement 2 is just its cause.

**The placement is feasible — this is observed, not assumed.** Captured on production 2026-07-29 during the BV230-r1 retest (and recorded in BV240b's baseline table), the dialog holds only: Receipt Email (Optional), the race title, the three candidate scores, and CANCEL / SUBMIT. It is sparse. There is room for one sentence without crowding it, so "no space in the dialog" is not a valid objection to this case.

**Should the dialog also carry the article link?** Not required by this case, and arguably it should not. The ballot is fully filled by the time the dialog is open, so a same-tab navigation out of it destroys strictly more work than the same mistake on the banner — the exact hazard BV240g exists for. If the shipped dialog does carry a link, run BV240g's assertion against it too (explicit `target='_blank' rel='noreferrer'`, not a markdown link in an i18n value).

**The dialog does not have the ranked-ballot problem.** It is rendered by the vote page, not by the ballot view, so it is unaffected by `DraggableIRVBallotView` bypassing the generic ballot renderer. If BV240j fails on the banner but the dialog sentence is present on an RCV-IRV election, that is consistent, not contradictory — and worth stating in the BV240j write-up so nobody chases a phantom.

**i18n:** a voter-facing dialog string lands in the PRIORITY 0 band, i.e. real translator work for es / pl / pt-BR, unlike the admin tip in BV240l–n. `fallbackLng` is `en`, so an untranslated key renders English prose rather than a raw key — see BV240o. Avoid `**bold**` in the copy: the renderer turns it into italic.

**Playwright:** `election-with-rolls.spec.ts` and `election-without-rolls.spec.ts` both create elections with `public_results: true` and both walk the submit dialog, so both will start seeing this sentence. Expect selector churn in the same PR.

# Related

- **BV240a** — the banner on the same election (E1). Same build, scored separately.
- **BV240b** — flag OFF: its baseline table is this case's "before" for the dialog.
- **BV240g** — the link target, if the dialog carries a link.
- **BV240j** — ranked ballot; see the note above on why the dialog is not exposed to that bypass.
- **BV240k** — multi-race; the dialog enumerates every race, so requirement 6 is checked properly there.
- **Q1** — banner only, or banner + dialog? Governs whether this case exists.
