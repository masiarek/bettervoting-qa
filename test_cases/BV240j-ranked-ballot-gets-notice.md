# BV240j - Ranked (draggable IRV) ballot gets the notice

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240a](BV240a-notice-appears-on-ballot.md) — the STAR baseline this case is measured against
- [BV240b](BV240b-no-notice-when-flag-off.md) — the flag-off negative

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
analysis: <https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5125205974>
status: **Not ready — feature not implemented** (the pre-check in steps 1–4 runs today, on any build)

# Purpose

The renderer-coverage case. It does not test what the notice *says* — BV240a owns that. It tests whether the notice exists **at all** on a ranked ballot.

BetterVoting has two ranked renderers. Every other ballot type funnels through `GenericBallotView`, but `RankedBallotView.tsx:15` short-circuits:

```
if (ballotContext.race.voting_method === 'IRV' && election.settings.draggable_ballot && !onlyGrid) {
  return <DraggableIRVBallotView />;
}
```

`DraggableIRVBallotView` re-implements its own title, description and instructions block and has **no footer element**. So a disclaimer placed in the ballot view, or in the ballot footer, reaches STAR, Approval, STAR-PR, Ranked Robin, STV and the non-draggable ranked grid — and silently misses draggable RCV.

**This is the worst failure mode in the BV240 set**, for three reasons. It is invisible: the STAR ballot looks perfect, so a tester who checks the notice once and moves on passes the feature. It is unbounded: nothing about a ranked ballot makes the privacy risk smaller, and a ranked ballot arguably reveals *more* per voter. And it fails silently in the direction of showing no privacy notice, which is the only direction that matters.

**The unusual part:** the bypass is observable **today**, before any of #1350 ships. On the STAR ballot the footer link *"Learn more about STAR Voting"* renders at the bottom (confirmed on production 2026-07-29). That link lives in `GenericBallotView` (`:130-134`), so the draggable ranked ballot has no equivalent — while the *non*-draggable ranked ballot does, because `methods.rcv.learn_link` is populated (`en.yaml:171`, a YouTube URL). Steps 1–4 exploit that pair as a pre-check. It is the same diff the feature test runs, one component earlier, and it can be captured now.

# Prerequisites

1. **The pre-check (steps 1–4) needs no feature.** Run it today and attach the pair; it is standalone evidence for the PR review.
2. **The feature must be implemented** for steps 5–9. As of 2026-07-29 it is not. Run against a local `docker compose` stack during review, then re-run on production after deploy.
3. **Run BV240a in the same session, same build.** This case's headline failure is *"absent on ranked, present on STAR"* — that is a comparison, and a BV240j run with no matching BV240a run cannot make it.
4. **Two browser contexts.** Admin work in your normal window; every ballot observation in a **private / incognito window**.
5. **A mouse or trackpad.** The draggable ballot is `@hello-pangea/dnd` (`DragDropContext` / `Droppable` / `Draggable`). Step 6 needs a real pointer drag.
6. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
7. **`curl` and `jq`** for the export check in step 9.

# Master data

Election configuration **E6** — used by this case only. It cannot reuse the *"STAR Voting - Fruits"* template (that election is STAR); mint a new one.

| Field | Value | Notes |
|---|---|---|
| Method | **RCV-IRV** | The race's `voting_method` is the string `IRV` |
| **Use Draggable Ballots for RCV** | **ON** | ← **the variable that decides which renderer you test.** See the warning below |
| Races | 1 | Multi-race is BV240k |
| Candidates | 3 | Enough to drag one into rank 1 and leave two unranked |
| Winners / seats | 1 | |
| Who can vote | Unrestricted / open link | |
| **Show Preliminary Results** | **ON** | Same as E1 — held constant, not under test here |
| Allow Voters To Edit Vote | OFF | |
| State | Open (finalized, voting open) | |
| Ballots already cast | 0–3 | Irrelevant to this case |

**The single easiest way to run this case and prove nothing:** create an RCV-IRV election, leave **Use Draggable Ballots for RCV** at its default, see the notice, and pass the case. `draggable_ballot` is `false` by default (`Wizard.tsx:57` sets it explicitly), so an RCV election created normally renders the **non-draggable rank grid** — which goes through `GenericBallotView`, the same component BV240a already covers. You would have re-run BV240a with different column headers and certified the exact bug this case exists to catch.

**Confirm the renderer before asserting on the notice.** Three tells, no dev tools needed:

| | Draggable renderer (what this case wants) | Non-draggable grid (the control) |
|---|---|---|
| Ballot body | Candidate cards you pick up and drop into ranked slots, two columns | A grid of numbered rank columns with radio-style cells |
| Instructions | **Centre**-aligned; *"…with draggable ballots…"* + a drag instruction line | **Left**-aligned; *"This election will use…"* |
| Bottom of ballot | **No footer, no "Learn more" link** | Footer text **plus** *"Learn more about Ranked Choice Voting"* |

The page is also visibly **wider** on the draggable ballot: `VotePage.tsx:257,260` swaps the wrapping `Container` from `maxWidth='sm'` to `'md'` when the current page is a draggable IRV ballot. See expected result **F6** — the notice inherits that width.

**Set `draggable_ballot` while the election is still in draft.** *(Prediction from source, not observed.)* `ElectionSettings.tsx:105` renders it as `<ElectionSwitchSetting settingKey="draggable_ballot" />` with no `availableDuringElection`, and that component computes `isDisabled = disabled ?? (election.state !== 'draft' && !availableDuringElection)` — so the switch should be greyed out once the election leaves draft, unlike **Show Preliminary Results** (which BV230-r1 confirmed is live in every state, and which is a separate endpoint entirely). Consequence for the recipe: **run the ON/OFF renderer diff in draft, via the admin ballot preview**, then finalize with draggable **ON**. If you need the control after finalizing, mint a second election **E6-control** (identical, draggable OFF) rather than fighting the toggle.

*Line numbers are from the June checkout referenced by the integration map, which is ~98 commits behind `main`. Re-anchor before quoting any of them in a PR review; the components and the routing logic are unchanged.*

# Test steps

## Pre-check — establish that the bypass is real on this build (steps 1–4)

Runs on today's build. No notice exists yet; this measures the *renderer boundary*, not the feature.

1. Create **E6** (RCV-IRV, 3 candidates) and leave it in **draft**. Turn **Use Draggable Ballots for RCV** **ON**.
2. Open the admin ballot preview. Confirm you got the draggable renderer (see the tells table), then **scroll to the very bottom of the ballot**. Screenshot the bottom.
3. Turn **Use Draggable Ballots for RCV** **OFF**. Reload the preview. Confirm you now have the rank grid, scroll to the bottom, and screenshot the bottom.
4. Turn it back **ON** and finalize the election.

That screenshot pair is the case in miniature: same election, same race, same candidates, one setting — and one of the two renderers has no footer to put anything in.

## Feature test (steps 5–9)

5. Open the voter link in a **private / incognito window**. **Before touching anything**, screenshot the top of the ballot. Is the notice there?
6. **Drag one candidate into rank 1.** Screenshot again. The notice must survive the interaction — `DraggableIRVBallotView` re-renders the whole ballot body on every drop, and a notice rendered inside that tree can vanish on the first drag while looking perfect on first paint.
7. Try to interact with the notice **as if it were part of the ballot**: attempt to pick it up, and drag a candidate card over it. It must be inert — not a drop target, not draggable, and dropping a card on it must not lose the card.
8. **Control:** open **E6-control** (draggable OFF) in a fresh incognito window and check the same thing. Do not skip this — it is what separates *"ranked ballots miss the notice"* from *"the draggable renderer misses the notice"*, and the two have different fixes.
9. **Verify the configuration against the server** (see below).

**Do not submit.** The submit dialog is BV240i; the link target is BV240g.

## Step 9 — the export check

The configuration is easy to get wrong in exactly the way that invalidates this case, so read it back off the server rather than off the switches:

```
curl -s https://bettervoting.com/API/Election/<election_id> | jq '.election.settings'
```

Expected in `election.settings`:

```json
{
  "draggable_ballot": true,
  "public_results": true,
  "ballot_updates": false,
  "voter_access": "open",
  ...
}
```

And confirm the method, because "I created an RCV election" is also a UI claim:

```
curl -s https://bettervoting.com/API/Election/<election_id> | jq '.election.races[].voting_method'
```

Expected: `"IRV"`.

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format; the `/API/Election/<id>` response is the raw backend object and is **not** changed by that work, so a check written against the API survives it. *(Against a local `docker compose` stack, substitute your local host for `bettervoting.com`.)*

**Why this belongs in the case.** `draggable_ballot: true` in the export is the only durable proof you tested the renderer this case is about — and it is the single assertion that stops a false pass. `public_results` earns its place for the reason BV240a gives: the toggle and the database disagreed for three months until `7cbc6079` (2026-07-27). One capture documents both.

# Expected results

## Pre-check

- **P1.** With draggable **ON**, there is **no footer and no "Learn more" link** anywhere on the ballot.
- **P2.** With draggable **OFF**, the same race shows a footer *and* a "Learn more about Ranked Choice Voting" link.

P1 alone proves nothing (the link could simply be unconfigured for RCV). **P1 together with P2 is the proof** — `methods.rcv.learn_link` is populated, so the link is available to the ranked ballot and only the draggable renderer drops it. That is the bypass, demonstrated without the feature existing.

*(P2's "Learn more" points at a YouTube explainer, not at the docs site. Do not mistake it for #1350's article link.)*

## Feature

1. **F1 — the notice renders on the draggable ballot**, visible on first paint, above the ballot, without scrolling.
2. **F2 — it satisfies BV240a's content requirements 3–5** (results are public while voting is open · inference is possible in a small election · carries the article link). Assert against BV240a's list; don't re-litigate the copy here.
3. **F3 — it survives a drag.** Present after step 6 exactly as it was at step 5.
4. **F4 — it appears once.** One notice, not one per rank column and not one per candidate card.
5. **F5 — it is inert.** Not a drop target, not draggable; dropping a candidate on it does not lose the candidate.
6. **F6 — it renders correctly at the wider container.** The draggable ballot widens `VotePage`'s `Container` from `sm` to `md`, and the notice sits inside it, so it renders wider here than on any STAR ballot. Assert it doesn't stretch into an unreadable single line or break its icon/text alignment. *(Layout prediction from source — this width swap has not been observed with a notice in place, because no notice exists yet.)*
7. **F7 — the control also shows it** (draggable OFF, step 8).
8. **F8 — the server agrees:** `draggable_ballot: true`, `public_results: true`, and `races[].voting_method == "IRV"`.

## The 2×2 that names the bug

F1 and F7 are only meaningful together. Read them off this table:

| draggable **ON** | draggable **OFF** | Reading |
|---|---|---|
| notice | notice | **Pass.** The notice is on the page wrapper, where it belongs |
| **no notice** | notice | **The predicted bypass.** The notice lives in the ballot view or its footer. Fix: move it to `VotePage`, above `<BallotContext.Provider>` |
| notice | no notice | Nonsense combination — almost certainly a misread renderer. Re-check the tells table and re-run |
| no notice | no notice | **Not a renderer bug.** Something gates the notice on method or on this election. Compare with BV240a on the same build: if STAR shows it, the visibility gate is method-conditioned; if STAR doesn't either, BV240a is failing and this case is blocked behind it |

# Pass / fail

- **Pass** — F1–F8, plus the pre-check pair captured for the record.
- **Fail (the predicted failure)** — F1 absent while BV240a passes on STAR and F7 passes. Row 2 of the table. Report it as a **placement** defect with the pre-check screenshots attached: those show the footer gap on today's build and make the diagnosis unarguable.
- **Fail (worse than it looks)** — F1 passes, F3 fails: the notice is there until the voter's first drag. This reads as a pass to anyone who only screenshots the initial page, so it must be called out loudly rather than logged as a nit.
- **Fail (its own bug)** — F5 fails. A privacy notice that swallows a candidate card is a data-loss bug, not a copy bug; file it separately from #1350.
- **Fail (cosmetic, still real)** — F6 only. Record it, don't block on it.
- **Fail (different problem)** — F8 disagrees with the switches. Either you tested the wrong renderer (`draggable_ballot: false`) or the wrong flag state, and the rest of the run is void. Re-run before recording anything else.
- **The pre-check cannot fail** — it is characterization, not assertion. But if **P2** shows no footer either, the corroboration is void: something changed in `GenericBallotView` or in `methods.rcv.learn_link`. Say that instead of concluding anything about the bypass.

# Actual results

*[screenshot — pre-check P1: E6 ballot, draggable ON, scrolled to the very bottom, showing no footer and no "Learn more" link]*

*[screenshot — pre-check P2: same race, draggable OFF, scrolled to the very bottom, showing the footer and "Learn more about Ranked Choice Voting"]*

*[screenshot — F1: E6 voter ballot, draggable ON, top of page, incognito, before any drag]*

*[screenshot — F3: same ballot after dragging one candidate into rank 1, notice still in place]*

*[screenshot — F7: E6-control ballot, draggable OFF, top of page, notice present]*

*[screenshot — the BV240a STAR ballot from this same build, for the side-by-side that makes the placement defect legible]*

*[export excerpt — `election.settings` showing `draggable_ballot: true` and `public_results: true`, plus `races[].voting_method`]*

# Notes

- **Where the notice has to go, and why nowhere else works.** `VotePage.tsx:259-265`, immediately after the existing `<DraftWarning/>` + `<ElectionStateWarning state="archived">` stack and before `<BallotContext.Provider>`. That slot is above the ballot on every race page, renders once per ballot rather than once per race (which is also BV240k's requirement), is unambiguously pre-submission, and is *outside* the renderer fork — so it covers `DraggableIRVBallotView` for free. The ballot footer is the rejected alternative for exactly this reason.
- **The `onlyGrid` inverse trap.** The draggable branch is gated on `!onlyGrid`, so a caller passing `onlyGrid={true}` gets the *grid* even on a draggable election — the landing-page carousel does this (`LandingPageCarousel.tsx:149`). A notice placed in `GenericBallotView` would therefore show up in a marketing carousel on the landing page while still missing the real ranked ballot: the same bug, inverted, and more embarrassing. Worth one glance at the landing page after the PR lands. *(Prediction from source; not observed.)*
- **The missing "Learn more" on the draggable ballot is arguably its own small defect**, independent of #1350: a ranked voter loses the method-explainer link that every other ballot type gets, and `methods.rcv.learn_link` is sitting right there configured. Confirm with the step 2/3 pair first, then consider a separate one-line issue. Do not attach it to #1350 — it would widen the scope of a copy-and-linking PR.
- **BV240g is strictly worse here.** If the article link ships as a markdown link inside an i18n value, `util.tsx:235` renders it `target='_self'` and the navigation destroys the in-progress ballot. On a STAR ballot the voter retypes three scores; on a drag-built ranking they rebuild the whole ordering, and there is no grid fallback to eyeball what they had. Same defect, higher cost — cite this case in BV240g's report if it fails.
- **Automation.** `@hello-pangea/dnd` drags are the flakiest thing in this set; a Playwright `dragTo` against it typically needs stepped `mouse.move` calls. If you automate, split it: assert F1/F4 on first paint (stable), and use the **draggable OFF control** for the post-interaction assertion, leaving F3 manual. That library documents keyboard-driven dragging as a first-class affordance — if it is wired up here it is the stable automation path, but verify that on the build before relying on it.
- **Neither existing Playwright spec covers this.** `election-with-rolls.spec.ts` and `election-without-rolls.spec.ts` both create elections with `public_results: true`, so both will start rendering the new notice — but neither sets `draggable_ballot`, so neither exercises this renderer. The regression net that catches the rest of BV240 has a hole exactly the shape of this case. One new spec, or one `draggable_ballot: true` fixture, closes it.
- **Attach the settings excerpt, not the whole JSON.** `election.settings` plus `state` and `update_date` is the evidence. `credential_ids` / `admin_ids` are `null` on an open-access election like E6, but check before attaching a full export anywhere shared.

# Related

- **BV240a** — the STAR baseline. Same build, same session; the side-by-side *is* the evidence
- **BV240k** — the other placement case (one notice across two races). Same insertion point, same fix, and a pass on both is what confirms the wrapper placement
- **BV240g** — the link target; the ballot-destroying failure is worse on a drag-built ranking
- **BV240f** — draft ballot preview, which is the surface this case's pre-check runs on
- **BV240b** — the flag-off negative; if it fails on a ranked ballot the gate is wrong in the other direction
