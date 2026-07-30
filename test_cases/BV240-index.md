# BV240 — Preliminary results disclaimer (issue #1350)

- GitHub issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
- My analysis comment: <https://github.com/Equal-Vote/bettervoting/issues/1350#issuecomment-5125205974>
- The help article being linked: <https://github.com/Equal-Vote/bettervoting/blob/main/docs/help/preliminary_results.md> → <https://docs.bettervoting.com/help/preliminary_results.html>
- Related: **BV230** (Show Preliminary Results — toggle change back and forth), issue **#1353** (public audit), PR **#1365** (audit log), commit **7cbc6079** (stale-settings fix, 2026-07-27)
- video: tbd

---

## Scope

#1350 is four independently testable deliverables, not one:

| | Deliverable | Cases |
|---|---|---|
| (i) | Admin tip copy rewrite + `learn_link` to the article | BV240l–n |
| (ii) | On-ballot notice, visible **before** the voter casts | BV240a–b, f–k |
| (iii) | Extra warning layer for **closed-list** elections | BV240c–d |
| (iv) | Qualify the article's own L26 claim (Matomo path-segment leak) | *not a UI test — doc review* |

**Status for all 16: Not ready — feature not implemented.** These are written to be executed against a local `docker compose` stack while the PR is in review, then re-run on production after deploy.

**Blocked:** BV240c and BV240d assert on closed-list wording that hasn't been approved yet (open question Q2 on the ticket). Written here, but don't finalize the expected text until that's settled.

---

## Test elections needed (6 configurations)

All 16 cases run off six small elections. Keep them minimal — 3 candidates, 2–3 ballots. Nothing here tests tabulation, so candidate count and method only matter where noted.

| Cfg | Method | Access | `public_results` | Edit vote | State | Used by |
|---|---|---|---|---|---|---|
| **E1** | STAR, 3 cand | open | **ON** | off | open | a, f, g, h, i, k, o |
| **E2** | STAR, 3 cand | open | **OFF** | off | open | b, p |
| **E3** | STAR, 3 cand | **closed list** (admin-managed IDs) | ON | off | open | c |
| **E4** | STAR, 3 cand | **closed list** (BV-managed IDs + email) | ON | **ON** | open | d |
| **E5** | STAR, 3 cand | open | ON | off | **closed** | e, m |
| **E6** | **RCV-IRV**, 3 cand | open | ON | off | open | j |

Notes on setup:
- E1 in **draft** state also serves BV240f — no separate election needed, just test before finalizing.
- E4 is the only legal edit-vote configuration. `ballot_updates` requires `voter_access != 'open'` **and** `invitation == 'email'`, so of the six canonical access modes only `closed_bv_managed_ids` permits it. Don't waste time trying edit-vote on an open election — it 400s and the switch silently reverts.
- BV240k needs a **multi-race** variant of E1 (2 races, so 2 ballot pages).
- Test users and templates: see the "User ID used for testing" and "Templates" tabs in the test-case sheet.

---

## Tier 1 — the visibility gate (6 cases)

The notice's condition is `public_results === true` AND state ∈ {`draft`, `open`}. Three variables; the boundaries are where it breaks.

### BV240a — notice appears on the ballot, before submit
**Cfg:** E1 · **Automate:** y
1. Open the voter link for E1.
2. Look at the ballot page before touching anything.

**Expected:** A notice appears above the races, stating that preliminary results are public and that it may be possible to infer how someone voted. It carries a link to the article. It is visible **without** submitting and **without** scrolling past the first race.

---

### BV240b — no notice when the flag is off
**Cfg:** E2 · **Automate:** y
1. Open the voter link for E2.
2. Check the ballot page, the submit-confirm dialog, and the thank-you page.

**Expected:** **No** preliminary-results notice on any of the three. This is the most important negative — a disclaimer that shows up on elections with results hidden is worse than no disclaimer.

---

### BV240c — closed-list extra layer  ⚠️ *wording not yet approved*
**Cfg:** E3 · **Automate:** y
1. Open the voter link for E3 as an invited voter.

**Expected:** The base notice from BV240a **plus** a second layer stating that administrators can see which voters have voted and when, and that combined with live results the timing can narrow down how a particular voter voted.

**Must NOT say** administrators can look up a voter's ballot. `ballot_id` is scrubbed from every roll response unconditionally, and the voter→ballot join is only called from the edit-vote path — never from an admin endpoint. If the notice claims otherwise, fail the case as inaccurate, not as missing.

---

### BV240d — closed list + edit vote (strongest variant)  ⚠️ *wording not yet approved*
**Cfg:** E4 · **Automate:** y
1. Open the voter link for E4.

**Expected:** Base + closed-list layer, escalated to reflect that votes can be changed while voting is open. This combination is the real hazard: a stable `ballot_id` persists across edits and is column 1 of the public CSV export, so an observer watches one row's scores change rather than diffing aggregates.

---

### BV240e — no preliminary notice once the election is closed
**Cfg:** E5 · **Automate:** y
1. Open E5 (voting closed, results public).
2. View the results page and, if reachable, the ballot page.

**Expected:** No *preliminary*-results warning. At this point the flag means "final results published" and carries none of the live-tally risk. One boolean is doing two different jobs — the copy must not treat them the same.

---

### BV240f — notice appears in draft (admin ballot preview)
**Cfg:** E1 in draft · **Automate:** y
1. As admin, before finalizing, open the ballot preview.

**Expected:** The notice renders. Matters because `public_results: true` is the creation-wizard default (and the wizard never shows the creator that choice), and the anonymized-ballot endpoint is already live in draft.

---

## Tier 2 — the article link (3 cases)

### BV240g — link opens a new tab and the in-progress ballot survives  ★ *most likely to fail*
**Cfg:** E1 · **Automate:** y
1. Open the ballot. Give candidate A a 5 and candidate B a 3. **Do not submit.**
2. Click the article link in the notice.
3. Return to the ballot tab.

**Expected:** The article opens in a **new tab**. The original ballot still shows A=5, B=3.

**Why this fails:** the markdown-link renderer defaults anchors to `target='_self'`, and the notice component can't pass the flag that changes it. `VotePage`'s races are React state with no draft persistence, so a same-tab navigation silently destroys everything the voter has entered. If this fails, the fix is an explicit `<Link target='_blank' rel='noreferrer'>` rather than a markdown link in an i18n value.

---

### BV240h — the article URL resolves
**Cfg:** E1 · **Automate:** y
1. Click the link (or check the `href`).

**Expected:** 200, the preliminary-results help page. Not a 404, not the docs index.

---

### BV240i — submit-confirm dialog carries the warning
**Cfg:** E1 · **Automate:** y
1. Fill the ballot, click Submit to open the confirmation dialog.

**Expected:** One sentence noting results are visible while voting is open, above the receipt-email field. Separate component from the banner, so a separate failure. The banner is scrollable-past; the dialog is the only surface the voter must actively confirm — which is what "transparent before they've cast their ballot" actually requires.

---

## Tier 3 — rendering and layout (2 cases)

### BV240j — ranked ballot gets the notice  ★ *most likely to fail*
**Cfg:** E6 (RCV-IRV) · **Automate:** y
1. Open the RCV-IRV ballot with the drag-and-drop ranking interface.

**Expected:** The notice renders, same as on the STAR ballot.

**Why this fails:** the draggable ranked view bypasses the generic ballot renderer entirely and re-implements its own instructions block with no footer. If the notice was placed in the ballot view or footer instead of on the page wrapper, ranked elections silently get no disclaimer — the worst possible failure, because it's invisible unless you specifically test RCV.

---

### BV240k — multi-race election renders it once
**Cfg:** E1 multi-race (2 races) · **Automate:** y
1. Open a 2-race ballot and page through both races.

**Expected:** One notice, on the page wrapper — not repeated per race, and not disappearing on race 2.

---

## Tier 4 — admin-side copy (3 cases)

### BV240l — rewritten tip text
**Cfg:** E1 admin · **Automate:** n (visual)
1. Go to the election settings, hover the ⓘ next to **Show Preliminary Results**.

**Expected — the new text:**
> **Public Results**
> Controls whether voters can see election results. When enabled during an open election, voters will see preliminary results after submitting their ballot. High-profile elections typically keep results hidden until the election closes.

Plus a **Learn More** link to the article. The old text ("Allows voters to see the results of the election. If enabled while voting is open then voters will be shown to the preliminary results…") should be gone.

---

### BV240m — the same tip under the other label  ★ *most likely to fail*
**Cfg:** E5 admin (closed election) · **Automate:** n (visual)
1. On a **closed** election, open settings and hover the ⓘ. The switch label now reads **Make Results Public**, not "Show Preliminary Results".

**Expected:** The tip still reads sensibly. One tip serves both labels — there is a single `public_results` tip and the label swaps by election state — so text written only for "Show Preliminary Results" will read wrong here.

---

### BV240n — tip renders as one paragraph, and poll terminology
**Cfg:** E1 admin + a **Poll** · **Automate:** n (visual)
1. Hover the ⓘ on an Election. Then create a **Poll** and hover the same ⓘ.

**Expected:** (a) The tip is **one paragraph**, not three separate lines — the old text is a YAML block whose newlines become `<br/>`s, and the new copy is a single paragraph, so the block style has to change. (b) On the Poll it says "poll", not "election".

**Why (b) matters:** the issue quotes the *rendered* string, which has "election" baked in. Pasting it literally would hard-code the word and regress poll terminology everywhere. The interpolation must be preserved.

---

## Tier 5 — i18n and the known gap (2 cases)

### BV240o — non-English voter
**Cfg:** E1, browser/UI language set to Spanish (then Polish, pt-BR) · **Automate:** n (visual)
1. Open the ballot in each locale.

**Expected:** The notice shows readable **English prose** as fallback — never a raw key like `preliminary_results_notice.description`. The new voter-facing strings land in the highest translation-priority band, so flag them for the translators.

---

### BV240p — flag flipped mid-election (documents a gap, not a pass/fail)
**Cfg:** E2 → flip to ON · **Automate:** tbd (two-browser manual)
1. Browser A: open the ballot for E2 (results hidden). Confirm no notice. **Leave it open, don't submit.**
2. Browser B: as admin, turn **Show Preliminary Results** on.
3. Browser A: submit the ballot.

**Expected / actual:** the voter sees **no** notice and submits without ever being disclosed to. There is no state guard on the setting, so this is by design today.

**Not a bug in #1350 — copy cannot fix it.** Record the outcome and reference open question Q5 on the ticket: either the audit log from #1353 / PR #1365 covers it, or the notice wording has to say the setting *can* change mid-election. Worth a screenshot pair for the ticket.

---

## Regression

Two existing Playwright specs create elections with `public_results: true`, so both will start rendering the new notice and the new dialog sentence once this lands:

- `testing/tests/election-with-rolls.spec.ts`
- `testing/tests/election-without-rolls.spec.ts`

Expect selector churn. Not new test cases — existing specs to update in the same PR.

---

## Rows for the test-case sheet

Tab-separated, in the sheet's column order. `Method` is `any` except where the renderer is the point; `Testing Area` follows the existing vocabulary (`ballots` / `casting` / `reports`).

```
Test ID	Scenario Name	BetterVoting Link	md file	YAML File	Method	Testing Area / Type	Ties ? Y/N	Status	Failure Reason	GitHub Issue	No of races	No of Winners	No of Cand	No of Ballots	YouTube video	Questions	Test Date	md file	comments / keywords		Automation Next Steps
BV240a	BV240a - Preliminary results notice appears on ballot before submit	tbd			any	ballots	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	3	tbd	na		 	disclaimer, privacy		y
BV240b	BV240b - No notice when public results is off	tbd			any	ballots	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	3	tbd	na		 	disclaimer, negative test		y
BV240c	BV240c - Closed-list extra warning layer	tbd			any	ballots	n	Not ready	wording not approved (Q2)	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	3	tbd	What may the warning claim?		 	disclaimer, closed list		y
BV240d	BV240d - Closed list + edit vote - strongest warning	tbd			any	ballots	n	Not ready	wording not approved (Q2)	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	3	tbd	na		 	disclaimer, closed list, edit vote		y
BV240e	BV240e - No preliminary notice once election is closed	tbd			any	ballots	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	3	tbd	Confirm intent - one flag, two jobs		 	disclaimer, state boundary		y
BV240f	BV240f - Notice appears in draft ballot preview	tbd			any	ballots	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	0	tbd	na		 	disclaimer, draft		y
BV240g	BV240g - Article link opens new tab, in-progress ballot survives	tbd			any	casting	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	1	tbd	na		 	disclaimer, link, data loss risk		y
BV240h	BV240h - Article URL resolves	tbd			any	help	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	na	na	na	na	tbd	na		 	disclaimer, link		y
BV240i	BV240i - Submit-confirm dialog carries the warning	tbd			any	casting	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	1	tbd	Banner only or banner + dialog? (Q1)		 	disclaimer, casting		y
BV240j	BV240j - Ranked (draggable IRV) ballot gets the notice	tbd			RCV IRV	ballots	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	3	tbd	na		 	disclaimer, RCV, renderer bypass		y
BV240k	BV240k - Multi-race ballot renders notice once	tbd			any	ballots	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	2	1	3	3	tbd	na		 	disclaimer, multi-race		y
BV240l	BV240l - Rewritten Public Results tip text	tbd			any	reports	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	0	tbd	na		 	copy, admin tip		n
BV240m	BV240m - Same tip under Make Results Public label	tbd			any	reports	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	3	tbd	na		 	copy, admin tip, label swap		n
BV240n	BV240n - Tip is one paragraph; poll vs election wording	tbd			any	reports	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	0	tbd	na		 	copy, i18n interpolation		n
BV240o	BV240o - Non-English voter sees English fallback not raw key	tbd			any	ballots	n	Not ready	feature not implemented	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	3	tbd	na		 	i18n, es pl pt-BR		n
BV240p	BV240p - Flag flipped mid-election - voter never disclosed to	tbd			any	ballots	n	Not ready	by design today - see Q5	https://github.com/Equal-Vote/bettervoting/issues/1350	1	1	3	1	tbd	Audit log or reworded notice? (Q5)		 	disclaimer, gap, mid-election change		tbd
```

---

## Which 5 actually catch bugs

BV240g (same-tab link destroying the ballot), BV240j (ranked renderer bypass), BV240m (one tip, two labels), BV240n (block style → three lines), BV240e (closed-state boundary). The other eleven are confirmation.

## Open questions carried from the ticket

- **Q1** → BV240i: banner only, or banner + submit dialog?
- **Q2** → BV240c/d: who approves the closed-list wording? *Blocks both cases.*
- **Q3** → BV240f: should the notice show in draft?
- **Q4** → BV240e: should it show once closed?
- **Q5** → BV240p: mid-election flip — audit log, or reworded notice?
- **Q6** → not covered by a case: should the invite email carry a line too? For closed lists it's chronologically the first voter surface, but backend templates have no i18n (English-only) and the flag can flip after invites go out.
