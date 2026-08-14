# BV240k - Multi-race ballot renders the notice once

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240a](BV240a-notice-appears-on-ballot.md) — the single-race positive this extends
- [BV240j](BV240j-ranked-ballot-gets-notice.md) — the sibling that fails for the same underlying reason

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented**

# Purpose

BV240a proves the notice exists on a one-race ballot. This case proves it is attached to the **ballot**, not to a **race** — exactly one notice for the whole voting session, present on every race page, still present at the moment the voter submits.

Two distinct failure modes, and they are opposites. **Test and record them separately** — they have different fixes and different severities:

- **(a) Duplication.** The notice renders once per race. A 4-race ballot shows four identical privacy warnings. Cosmetically it reads as a bug, and substantively it is worse than that: a warning repeated four times is a warning voters learn to scroll past, which degrades the notice on every other election too.
- **(b) Disappearance.** The notice renders only on the first race page. A voter who pages forward loses it and submits from race 2 having last seen the disclosure two screens ago. That defeats the issue's actual requirement — transparent *before* they cast — for every multi-race election.

Both are caused by the same mistake and cured by the same placement, which is why this case and BV240j belong together (see Notes).

# Prerequisites

1. **The feature must be implemented.** As of 2026-07-29 there is no preliminary-results notice anywhere in the voter flow, so this case has nothing to count. Run it against a local `docker compose` stack during PR review, then re-run on production after deploy.
2. **BV240a must pass first on the same build.** A zero-count here is meaningless if the notice is missing everywhere. This case only distinguishes cardinality once presence is established.
3. **Private / incognito window** for the ballot. An admin viewing their own multi-race ballot picks up draft and preview banners a real voter never sees, and mis-counting one of those as the notice gives a false result in either direction.
4. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
5. **Browser devtools.** Expected result 4 is a DOM-position assertion, not a visual one — see the note under Expected results on why the eye is not sufficient here.

# Master data

Election configuration **E1**, with the one change this case needs: **2 races**.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Renderer is not the variable here — that's BV240j |
| **Races** | **2** | ← the variable under test |
| Candidates | 3 per race | Keep both races small; nothing here tests tabulation |
| Winners / seats | 1 per race | |
| Who can vote | Unrestricted / open link | |
| **Show Preliminary Results** | **ON** | |
| Allow Voters To Edit Vote | OFF | |
| State | Open (finalized, voting open) | |
| Ballots already cast | 3 | Irrelevant to the count; keeps the election realistic |

**Setup note — this is the one E1 case that needs real setup.** The **"STAR Voting - Fruits"** template (<https://bettervoting.com/bbyqh7/admin>) is single-race, so it does not serve as-is. Add the second race in **Build Ballot** before finalizing — a duplicate of the first race with three different candidate names is enough, and different names make it obvious which race page you are looking at in a screenshot. Once open, the voter votes **every** race in one session; there is no per-race link and no partial submit.

**Optional 4-race variant.** If the 2-race result is ambiguous (see Notes), add two more races and re-run. Duplication is loud at four and easy to miss at two; disappearance shows equally at either count.

# Test steps

1. As admin, confirm the election has 2 races, **Show Preliminary Results** is ON, and the election is open.
2. Copy the voter link.
3. Incognito → open the voter link.
4. **Race 1, before any interaction.** Screenshot the full viewport. **Count the notices on screen.**
5. In devtools, locate the notice element and record **whether it sits inside or outside the race container**. This is the assertion that actually decides the case.
6. Score all three candidates in race 1, then advance to race 2 using the ballot's forward navigation.
7. **Race 2.** Screenshot the full viewport. **Count again.** Confirm it is present, and that it is one.
8. Score race 2 and bring the Submit control into view. Confirm the notice is on the same screen — or at least on the same page — as the button that casts the ballot. **Do not submit.**
9. **Confirm the flag server-side** (below).

**Stop at step 8.** The submit-confirm dialog is BV240i; the link's target is BV240g. Keeping them out means a failure here points only at placement.

## Step 9 — the flag check

The settings state is not what this case is testing, so one line is enough — just establish that the notice *should* have been rendering at all:

```
curl -s https://bettervoting.com/API/Election/ELECTION_ID | jq '.election.settings'
```

Assert `election.settings.public_results` is `true`. **Use the API, not the UI "Download JSON" button** — [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format, while the `/API/Election/<id>` response is the raw backend object and is unchanged by that work.

# Expected results

1. **Exactly one notice on race 1**, above the race, visible without scrolling.
2. **Exactly one notice on race 2**, in the same position. Not zero, not two.
3. **Still on screen at the point of submitting** — the voter's last view before casting includes the disclosure.
4. **The notice's DOM position is outside the race container** — a sibling of the ballot, not a child of it.
5. `election.settings.public_results` is `true`.

**Why requirement 4 is not redundant.** *This is a prediction from reading the source, not an observation — there is nothing to observe yet.* `VotePage` holds the races in a `pages` array and renders **one race at a time**. If the notice is placed inside the ballot view, each page still shows exactly one of them — so requirements 1–3 can all pass on a per-race placement, and the visible count alone cannot tell correct placement from an accidental near-miss. The DOM check can. So can BV240j, which is the same defect made visible.

**The correct placement** is `VotePage.tsx` ~L259–265, above the `BallotContext` provider, where `DraftWarning` and `ElectionStateWarning` already stack. That renders once for the whole ballot and survives paging, because paging swaps what is *below* it. Anywhere inside the ballot view gives one per race.

# Pass / fail

- **Pass** — all five. One notice, on both pages, in the same place, outside the race container, flag confirmed.
- **Fail (a) — duplication.** More than one notice on a single page. Severity: cosmetic-plus. Fix is placement, not copy. Note the count and the race count you saw it at.
- **Fail (b) — disappearance.** Notice on race 1, gone on race 2. Severity: **higher than (a)** — it silently voids the issue's core requirement on every multi-race election, and a single-race test suite will never catch it. This is the one to escalate.
- **Fail (c) — placement.** Requirements 1–3 pass but 4 fails: the notice is rendered inside the race container and only looks singular because one race renders at a time. Record it as a fail even though the screenshots look clean, and check BV240j immediately — it is the same defect on a surface where it is fatal.
- **Fail (different problem)** — requirement 5 disagrees with the admin toggle. That's a toggle/persistence bug, not a placement bug. Record separately and re-run.

# Actual results

*[screenshot — race 1, full viewport, incognito, before any interaction — notice above the race]*

*[screenshot — race 2, full viewport, after paging forward — notice still present and still singular]*

*[screenshot — devtools elements panel, showing the notice node and its position relative to the race container]*

*[screenshot — race 2 scrolled to the Submit control, notice and button in the same view]*

*[export excerpt — `election.settings` showing `public_results: true`]*

Fill in as you go:

| Surface | Notices visible | Notice inside race container? |
|---|---|---|
| Race 1, first paint | | |
| Race 2, after paging | | |
| At the Submit control | | n/a |
| 4-race variant, if run | | |

# Notes

- **BV240j and BV240k push in the same direction.** Both are solved by putting the notice on the page wrapper rather than in the ballot view; both fail if it goes in the ballot view or a ballot footer. **If this case fails by duplication (or by placement), assume BV240j is also failing and go check it before filing anything** — one ticket describing the placement is worth more than two describing symptoms. BV240j is the worse half: `DraggableIRVBallotView` bypasses `GenericBallotView` entirely and re-implements its own instructions block with no footer, so a ranked election gets **no** disclaimer at all, invisibly.
- **The reverse inference does not hold.** BV240k passing does not clear BV240j. Per requirement 4, a per-race placement can look correct on a paged STAR ballot while still missing the ranked renderer completely.
- **Count deliberately, don't glance.** Once the PR lands and the notice's text is known, browser find-in-page on a distinctive phrase from it gives a hard count per page. Don't invent a selector before the component exists.
- **Two races is the minimum, not the ideal.** At two, duplication is one extra banner and easy to rationalize. At four it is unmistakable and is also how it would actually reach a voter — real multi-race BetterVoting elections run well past two. Run the 4-race variant if anything about the 2-race result is unclear.
- **This case says nothing about the submit dialog.** If the notice is on the wrapper and the dialog sentence is missing, that's BV240i. Requirement 3 here is only about the banner still being on the page the voter submits from.

# Related

- **BV240a** — the single-race positive. Must pass on the same build before this case means anything.
- **BV240j** — ranked ballot. Same root cause, worse failure. Check it whenever this one fails.
- **BV240i** — the submit-confirm dialog, deliberately out of scope here.
- **BV240g** — the link target, also out of scope here.
- **BV240b** — the mirror negative: flag off ⇒ no notice on any race page either.
