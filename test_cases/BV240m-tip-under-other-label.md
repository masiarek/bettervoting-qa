BV240m - Same tip under the "Make Results Public" label

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240l](BV240l-rewritten-tip-text.md) — the same tip under the *other* label
- [BV240e](BV240e-no-notice-once-closed.md) — the voter-facing half of the same closed election

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented**

# Purpose

There is exactly **one** `tips.public_results` entry, and `ElectionSettings.tsx:108` swaps the switch **label** by election state — "Show Preliminary Results" while draft/open, "Make Results Public" once closed or archived. So one tip body has to read correctly under two different labels.

BV240l reads that tip under the first label. This case reads the *same* tip under the second one.

**This is one of the five cases in the set most likely to fail**, and the reason is structural rather than sloppy: copy written for a switch called "Show Preliminary Results" naturally talks about preliminary results and mid-election visibility — and that is precisely the wrong subject next to a label about publishing final results. The proposed text's middle sentence ("When enabled during an open election, voters will see preliminary results after submitting their ballot") describes a window that has already closed by the time the label reads "Make Results Public". An admin standing on a closed election, about to publish, reads a help text about something that can no longer happen.

Nobody writing the copy will see this, because the tip is authored and reviewed on a draft election.

# Prerequisites

1. **The copy change must be merged** — same build as BV240l, ideally the same session. This case cannot pass against the As-Is text either, but it is *worth running against the As-Is text as a baseline*: the current tip has the same one-tip-two-labels problem, so a "before" capture makes the finding concrete for reviewers.
2. **An election that has genuinely reached `closed` state.** Not "voting looks over" — actually `closed`. If the state didn't change, the label didn't swap, and the case tests nothing. Step 1 below is the guard.
3. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
4. **One browser context is enough.** Nothing here is voter-facing — stay signed in as the admin. No incognito window needed (contrast BV240a).
5. **A pointer device.** The ⓘ is hover-triggered, same as BV240l.
6. **`curl` and `jq`** for step 1.
7. **The BV240l screenshot in hand.** The finding in this case is a *comparison*: same tip body, two labels. Without the other half you have half the evidence.

## How to get an election to `closed`

*Mechanism read from the source, not yet exercised for this case — treat as a prediction:* `updateElectionStateIfNeeded` (`elections.controllers.ts:120-172`) runs on **every** `/Election/:id` request and performs the state transition itself. So give the election an `end_time` a few minutes out, wait for it to lapse, then load any admin page for that election to trigger the transition, then confirm with step 1.

If you cannot get it to `closed`, an **archived** election takes the same label — the swap at `ElectionSettings.tsx:108` covers closed *and* archived. Second best, and say which one you used.

# Master data

Election configuration **E5** — identical to E1 except the state. Shared with BV240e; one closed election serves both cases (BV240e is the voter side, this is the admin side).

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Irrelevant — the tip is static copy |
| Races | 1 | |
| Candidates | 3 | The **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> — saves setup, then set an `end_time` |
| Winners / seats | 1 | |
| Who can vote | Unrestricted / open link | |
| **Public results flag** | **ON** | Under this label the switch reads "Make Results Public"; ON means the final tally is published |
| Allow Voters To Edit Vote | OFF | |
| **State** | **Closed** | ← the variable under test. Draft/open is BV240l |
| Ballots cast | 2–3 | Enough that the results page has something in it; the tip doesn't depend on this |

**Do not touch the switch during this case.** It is read-only here. BV230-r1 (2026-07-29) established the toggle is fully bidirectional with **no state guard**, so it *is* clickable on a closed election — resist. Flipping it changes what BV240e sees on the same election, and the mid-flight flip is BV240p's subject.

# Test steps

1. **First, prove the state.** Run the export check below *before* opening the UI. If `election.state` is not `closed` (or `archived`), stop — fix the state and start over. Everything after this depends on it.
2. Sign in as admin and open **Settings** (`/{election_id}/admin/settings`).
3. **Read the switch label.** It must say **"Make Results Public"**, not "Show Preliminary Results". Screenshot the row with the label, the switch position, and the ⓘ all visible.
4. Hover the **ⓘ**. Screenshot the open tooltip with the whole body readable *and the label in the same frame* — the label and the tip together are the artifact.
5. **Read the tip one sentence at a time, and for each one ask: "is this sentence true and useful under THIS label?"** Not "is this good copy" — sentence by sentence, against the label six inches above it.
6. Put this screenshot beside the BV240l capture. Confirm the **body text is identical** in both (it should be — one entry, one string).
7. Note the tooltip **header**. It reads "Public Results" in both states — a third name for the same setting. Record it; see Notes.
8. Confirm the **Learn More** link is still present here. Same tip, so it should be — its absence would mean two tips now exist.

# The export check

```
curl -s https://bettervoting.com/API/Election/ELECTION_ID | jq '.election.settings'
```

And, because the state is what this case turns on:

```
curl -s https://bettervoting.com/API/Election/ELECTION_ID | jq '.election | {state, update_date, settings}'
```

The response's top level is `{election, precinctFilteredElection, voterAuth}`.

Expected:

```json
{
  "state": "closed",
  "settings": {
    "public_results": true,
    "voter_access": "open",
    ...
  }
}
```

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format; the `/API/Election/<id>` response is the raw backend object and is **not** changed by that work, so a check written against the API survives it.

**Why this belongs in a copy case at all.** BV240l deliberately has no export check — a static tooltip needs no server evidence. Here the state *is* the variable: the label only swaps because the state changed, so an unverified state means a silently vacuous test. You would hover the ⓘ, read a tip under the label "Show Preliminary Results", write "pass", and have tested BV240l a second time. One line of `curl` removes that failure mode. It also documents `public_results` for the run, and it needs no login.

# Expected results

1. **The label swapped.** The switch reads **"Make Results Public"**. This is the precondition for the rest, and it is itself an assertion — it exercises `ElectionSettings.tsx:108`.
2. **The tip body is the same string as under the other label.** One `tips.public_results` entry serves both, so identical text is correct-by-construction. A *difference* is a design change, not a bug — but flag it, because it means someone split the tip and the whole premise of this case changed.
3. **Every sentence is true under this label.** The test is per-sentence:
   - a sentence saying the setting controls whether voters can see results → reads fine under both labels;
   - a sentence about voters seeing **preliminary** results **during an open election** → acceptable only if it is clearly phrased as a *condition* that may or may not apply, not as a present-tense description of what this switch is doing right now. On a closed election it describes a window that has passed;
   - a sentence advising that high-profile elections keep results hidden **until the election closes** → inert here (the election *has* closed), which is tolerable, but it is advice for a decision the admin no longer has.
4. **Nothing in the tip contradicts what the switch does now.** Under this label the flag means "publish the final results". A tip that speaks *only* about live/preliminary visibility does not tell a closed-election admin what they are about to do — that is the substantive failure this case exists to catch.
5. **Both jobs of the flag are covered.** `public_results` does two things: while open, "live tally visible" (the privacy risk); once closed, "final results published" (no live-tally risk). The codebase already recognises the split — `ElectionSettings.tsx:108` for the label, `ViewElectionResults.tsx:38-41` for the PRELIMINARY vs OFFICIAL heading. The tip currently recognises neither. A passing text names both without contradicting either label.
6. **The Learn More link is present**, same as under the other label. Whether the URL resolves is **BV240h**.
7. **The server agrees** — `election.state` is `closed` and `election.settings.public_results` matches the switch.

**Assert on requirements 3–5, not on characters.** No wording is approved yet. For orientation only, the text under test in BV240l is the proposed body (**proposed implementation, not approved copy**):

> Controls whether voters can see election results. When enabled during an open election, voters will see preliminary results after submitting their ballot. High-profile elections typically keep results hidden until the election closes.

Read against the "Make Results Public" label, sentence 1 holds, sentence 2 is about a window that has closed, and sentence 3 is advice about a decision already made. **That reading is an inference from the string, not an observation** — the tip has not been read on a closed election. Step 4's screenshot is what settles it, and it is the deliverable of this case.

# Pass / fail

- **Pass** — label swapped (1), text shared with the other label (2), every sentence true and useful under this label (3), nothing contradicting the switch's current meaning (4), both jobs covered (5), Learn More present (6), server agrees (7).
- **Fail** — any sentence is false, misleading, or meaningless under this label. Quote the sentence and the label together in the finding; a reviewer who has only seen the draft-state screen will not otherwise see the problem.
- **Fail (the predicted one, and it is a copy-design defect, not a typo)** — the tip talks only about preliminary results and never about publishing final results, so the closed-election admin cannot tell what the switch does. Two ways out, and this is a product call, not a tester's: one body that covers both jobs, or a second tip key selected by state alongside the existing label swap. Record which you'd recommend; don't decide it in the case.
- **Fail (different problem, not a copy defect)** — the export says `closed` but the label still reads "Show Preliminary Results". Then the state-driven swap itself is broken. File separately against `ElectionSettings.tsx:108`; nothing about the tip text is implicated.
- **Vacuous — not a pass** — the export does not show `closed`/`archived`. The label never swapped, so you re-ran BV240l. Say so, fix the state, re-run.
- **Not a failure of this case** — record and move on:
  - the tooltip header saying "Public Results" while the label says something else → see Notes, out of scope for #1350;
  - the body rendering as three separate lines instead of one paragraph → **BV240n**;
  - "election" appearing on a Poll → **BV240n**;
  - a 404 at the article URL → **BV240h**.

# Actual results

*[screenshot — Settings page of the **closed** election: the switch row with the label reading "Make Results Public", the switch position visible, and the ⓘ visible]*

*[screenshot — the tooltip open on the closed election, full body text readable end to end, showing the "Public Results" header and the Learn More link, **with the "Make Results Public" label in the same frame**]*

*[screenshot pair, side by side — the BV240l capture (label "Show Preliminary Results", draft/open) next to the capture above (label "Make Results Public", closed). Same tip body, two labels. This pair is the finding; neither image alone shows it]*

*[export excerpt — `election.state: "closed"` plus `election.settings` showing `public_results`, captured before the UI steps]*

*[optional screenshot — the same hover on an **archived** election, if one is to hand: same label per `ElectionSettings.tsx:108`, and it confirms the swap covers both states rather than just `closed`]*

# Notes

**Three labels for one flag — worth recording, out of scope for #1350.** The same boolean is called:

| Where | Name | Source |
|---|---|---|
| Tooltip header | **Public Results** | `tips.public_results` → `title` |
| Switch label, draft/open | **Show Preliminary Results** | i18n key `preliminary_results` |
| Switch label, closed/archived | **Make Results Public** | i18n key `public_results` |

The i18n naming makes it worse than the UI does: the key *named* `public_results` is the **closed** label, the key named `preliminary_results` is the **open** label, and the tip shared by both is `tips.public_results`. So "public_results" means three different things depending on which file you are reading. Nothing in #1350 asks for this to be fixed and this case must not fail on it — but it is exactly the kind of thing that makes the copy hard to get right, and it belongs in the issue thread as an observation.

**One flag, two jobs.** While the election is open the flag means "the live tally is visible", which is the privacy risk the whole of #1350 is about. Once closed it means "the final results are published", which carries none of that risk. That is why BV240e expects *no preliminary notice* on the voter side of this same election, and it is why the tip cannot simply be preliminary-results copy.

**Do not expect "(Administrators can make results public at any time.)"** That sentence appears in the BPML material but is **not in the shipped tip** — it was removed from all locale files and survives only on branches dating to early 2025. A tester hunting for it on a closed election will conclude the build is wrong. It isn't.

**Where the change lives.** `packages/frontend/src/i18n/en.yaml`, key `tips.public_results`; the two labels are the `preliminary_results` and `public_results` keys in the `election_settings:` block. Line numbers in the analysis were taken against a June checkout and have shifted on `main` — re-anchor before editing, don't trust the number.

**i18n scope.** `tips:` is PRIORITY 4 and `election_settings:` is PRIORITY 99, and `es` / `pl` / `pt-BR` carry no `tips:` block at all — so both the tip and both labels are en-only, and with `fallbackLng: en` a non-English admin sees this English prose rather than a raw key. No translator obligation from this case. The voter-facing strings that *do* land in PRIORITY 0 are **BV240o**'s problem.

**Avoid `**bold**` in any revised copy.** `components/util.tsx:244` renders double-asterisk markup as `<i>`, i.e. italic, not bold.

**Not automatable.** Hover-triggered tooltip, no frontend test suite in CI (backend jest plus the Playwright E2E job, both on `main` only), and `full-runthrough.spec.ts` only ever toggles a setting while the election is still **draft** — so no existing spec has ever seen this label. Manual/visual; the sheet's Automation column is `n` deliberately.

# Related

- **BV240l** — the same tip under "Show Preliminary Results". Run l → m back to back on the same build; separately, each is half a test.
- **BV240n** — one paragraph vs three lines, and the poll/election interpolation. Everything this case deliberately refuses to assert.
- **BV240e** — the voter side of this same closed election: no *preliminary* notice once closed. One E5 election serves both.
- **BV240h** — whether the article URL behind Learn More resolves.
- **BV240p** — flipping the flag mid-election, and the absent state guard that makes it clickable here.
- **BV230-r1** — the retest that established the toggle is bidirectional with no state guard.
- **BV240-index** — Tier 4 is BV240l, this case, and BV240n; l→m→n is the intended run order.
