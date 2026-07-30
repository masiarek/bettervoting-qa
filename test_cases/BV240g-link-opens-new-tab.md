BV240g - Article link opens new tab, in-progress ballot survives

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240a](BV240a-notice-appears-on-ballot.md) — the notice this link lives in
- [BV240h](BV240h-article-url-resolves.md) — where that link points

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented** · also gated on BV240a: no notice ⇒ no link ⇒ nothing to click

# Purpose

The one case in BV240 where a failure loses voter data.

A voter part-way through a ballot clicks the disclosure link — the link the product put in front of them for their own protection — and it navigates **in the same tab**. `VotePage`'s races are React state with **no draft persistence**, so every score they entered is gone. There is no recovery path: no autosave, no draft on the server, no "restore my ballot". They re-enter everything or they abandon.

That makes this a **PR blocker, not a cosmetic nit**. Every other BV240 case fails by showing the wrong words, or none. This one fails by destroying work a real voter did, and it does so *selectively against the conscientious voter* — the one who stopped to read the privacy notice is the only one who can be hurt by it. A privacy disclosure that punishes people for reading it is worse than no disclosure.

**The step order below is deliberate and it is the whole test.** The notice renders above the race on first paint (BV240a requirement 1), so a tester's natural instinct is to click the link first, while the ballot is still empty — and that order passes even when the implementation is broken. The bug only shows if you fill the ballot *first* and then click. Do not improvise the order.

# Prerequisites

1. **The feature must be implemented, and the notice must carry a link.** As of 2026-07-29 neither exists. If the build under test shows no notice, or a notice with no link, this case is **blocked, not failed** — record it against BV240a and stop. Run against a local `docker compose` stack during PR review, then re-run on production after deploy.
2. **BV240a run first, same build.** This case presupposes its requirement 5 (the notice carries a link to the help article).
3. **Private / incognito window** for the ballot, as in BV240a — an admin viewing their own ballot gets extra banners a voter never sees.
4. **Devtools open on the ballot tab, before you click**, with the **Network** panel recording (filter: Doc) and the **Elements** panel available. Two of the assertions below are attribute- and request-level, not visual.
5. **Two browser engines.** Run the primary path in Chrome. If it fails, run the secondary path in **both** Chrome and Safari (or Firefox) — back-navigation restore behaviour differs by engine, and a pass in one is not a pass.
6. Admin login (only needed to confirm E1's configuration): the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.

# Master data

Election configuration **E1** — the same election as BV240a. No new setup.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Ranked is BV240j, and it has a different trap |
| Races | 1 | One ballot page, so a lost ballot is unambiguous |
| Candidates | 3 | **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> |
| Winners / seats | 1 | |
| Who can vote | Unrestricted / open link | |
| **Show Preliminary Results** | **ON** | The notice must render, or there is no link |
| Allow Voters To Edit Vote | OFF | |
| State | Open (finalized, voting open) | |
| Ballots cast by this case | 0 | The test never submits, so it doesn't pollute the shared E1 ballot count |

**The scores to enter, exactly:**

| Candidate | Score | Why this value |
|---|---|---|
| Apple | **5** | Maximum — distinct from any default |
| Banana | **3** | Mid — distinct from Apple, and from 0 |
| Orange | **left untouched** | A third distinct state, so a reset is visible even if it coerces to 0 |

Three different states on purpose. A ballot that reset shows all three the same; a ballot that partially survived shows one of them wrong. "The scores look right" is not an assertion — "Apple 5, Banana 3, Orange untouched" is.

# Test steps

## Path A — the primary path (plain left click)

1. Confirm E1: flag ON, election open, and the **notice with its link is present** on the ballot. If not, stop — blocked on BV240a.
2. Incognito → voter link → `VOTE` → ballot page. Leave devtools recording.
3. Enter **Apple 5**, **Banana 3**. Leave **Orange** untouched. **Do not submit.** Screenshot the filled ballot with the notice visible in the same frame.
4. Note the current tab count.
5. **Plain left click on the article link.** No modifier keys.
6. Record what happened, before touching anything else: did a **new tab** open, or did **this tab navigate away**?
7. Return to the ballot tab. Verify **Apple 5, Banana 3, Orange untouched** — read each one, don't glance. Screenshot.
8. In the ballot tab's **Network** panel (Doc filter), confirm **no new document request** was made after the click. This distinguishes "the tab looks fine" from "the tab never navigated" — a re-mount that happened to re-render an empty ballot would look similar at a glance and is a different bug.

## Path B — the failure branch (only if step 6 showed a same-tab navigation)

9. Press the browser **Back** button once.
10. Record exactly what the ballot shows: the three scores, or an empty ballot, or a re-fetched page.
11. Repeat steps 3–10 in a **second browser engine**. Back-navigation restore is engine-dependent (see Notes) — a restore in one engine does not make the implementation correct.

## Path C — is it a real anchor?

12. Right-click the link → **Inspect**. Confirm in the Elements panel that it is an `<a>` with:
    - an `href` to the help article (BV240h owns whether that URL resolves),
    - `target="_blank"`,
    - `rel` containing `noreferrer`.
13. **Cmd-click** (macOS) / **ctrl-click** (Windows/Linux) the link, and separately **middle-click** it. Expect a background tab each time; the ballot tab must stay exactly as it was. Then check the three scores again.
14. **Keyboard:** `Tab` to the link, press `Enter`. Expect the same behaviour as the plain click in step 5.

Steps 13–14 are not redundant with step 5 — see the trap in Notes. They test a different property: whether the link is a genuine anchor at all, or a click handler that navigates programmatically.

## Optional — one-line configuration receipt

Not the subject of this case, but one line puts the configuration on the record next to the screenshots:

```
curl -s https://bettervoting.com/API/Election/<election_id> | jq '.election.settings'
```

Expect `public_results: true` — the flag that makes the notice, and therefore the link, exist at all. Use the API, not the UI "Download JSON" button: [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format, while the `/API/Election/<id>` response is unchanged by that work.

# Expected results

1. **The plain left click opens the article in a NEW tab.** The article is a different origin (`docs.bettervoting.com`), so same-tab means a full document unload of the ballot.
2. **The ballot tab is still on `/vote`, un-navigated.** No new document request in Network (step 8).
3. **The scores are exactly what was entered:** Apple 5, Banana 3, Orange untouched.
4. **The link is a real anchor** with `href`, `target="_blank"`, and `rel` containing `noreferrer` (step 12).
5. **Cmd-click / middle-click opens a background tab** and leaves the ballot untouched.
6. **Keyboard `Enter` on the focused link behaves as the plain click does.**
7. **Path B, if reached — the Back button does *not* restore the scores.** **This is a prediction, from reading the source, not an observation.** `VotePage`'s races are React state with no draft persistence, so a fresh mount of the SPA has nothing to restore from. Two caveats make it a prediction rather than a fact: a browser may serve the ballot page from **back/forward cache**, which restores the live JS heap and would make the scores reappear — engine-dependent, which is why step 11 exists; and if the link turns out to be an in-app router navigation rather than a document load, Back re-mounts the component and the outcome may differ. **Record what you actually see** — two predictions in this set have already been refuted by screenshots. Either way, a bfcache restore does not upgrade requirement 1 to a pass — it is not a feature the product controls or can rely on across browsers, devices, and memory pressure.

Requirements 1–3 are the case. 4–6 are the implementation being the *right* shape rather than accidentally passing.

# Pass / fail

- **Pass** — requirements 1–6.
- **FAIL — blocking. This is data loss.** Requirement 1 or 3 fails: the click navigated the ballot tab and the voter's scores are gone. **This should block the PR**, and it is not a wording discussion — it is a voter who filled in a ballot, read the privacy notice as instructed, and lost the ballot for doing so. Attach the before/after screenshot pair; that pair is the whole argument and needs no explanation in review.
- **Fail — wrong shape, works by accident.** 1–3 pass but 5 or 6 fails. The link is not an anchor; it is something with a click handler. Mouse users are fine, keyboard users cannot activate it, and nobody can choose to open it in a background tab. Record as a real defect with a cheap fix (use an anchor), separate from the data-loss finding.
- **Fail — hygiene nit.** 1–3 and 5–6 pass, but `rel` is missing (requirement 4). One-line fix, non-blocking. See Notes for what it is and is not worth.
- **Blocked, not failed** — no notice, or a notice with no link. Belongs to BV240a. Do not record a pass here just because nothing bad happened; there was nothing to click.

# Actual results

*[screenshot — ballot page with Apple 5, Banana 3, Orange untouched, the notice and its link visible in the same frame, before any click]*

*[screenshot — the browser tab bar in the second immediately after the plain left click, showing whether a second tab opened or the ballot tab navigated]*

*[screenshot — the ballot tab after returning from the article: the three scores, read individually]*

*[screenshot — devtools Network panel on the ballot tab, Doc filter, showing no new document request after the click]*

*[screenshot — devtools Elements panel, the link's anchor markup: `href`, `target`, `rel`]*

*[screenshot pair — Path B only: the ballot tab after the same-tab navigation, then the ballot after pressing Back]*

*[note — browser and version for every run; Path B needs two engines]*

*[export excerpt — optional: `election.settings` showing `public_results: true`]*

# Notes

**The mechanism, and why this is predicted to fail.** `components/util.tsx:235` renders markdown links as `target={v['newWindow'] ? '_blank' : '_self'}` — **same-tab by default**, opt-in to the new tab. `ElectionStateWarning.tsx:17,19` calls `t(title)` / `t(description)` with **no values object**, so it has no way to pass `newWindow`. So if the ballot-side link is written the obvious way — a markdown link inside an i18n value, exactly as `en.yaml:703` already does for a tip — it renders `target='_self'` and there is no flag to flip from the calling component. The failure is the default behaviour of the path of least resistance. (Line numbers per the integration map's June checkout; they may drift a few lines on `main`.)

**Therefore: the ballot-side link must not be a markdown link in an i18n value.** It has to be an explicit `<Link target='_blank' rel='noreferrer'>` in `ElectionStateWarning`'s `children` slot, copying `GenericBallotView.tsx:130-134`.

**The safe pattern already exists two lines away.** The "Learn more about STAR Voting" link at the bottom of the STAR ballot is `<Link href={learnLink} target='_blank'>` in `GenericBallotView.tsx:130-134`, and it is **confirmed present on production as of 2026-07-29** (the BV230-r1 flag-OFF baseline records it on the `/vote` page). So the codebase already ships a correct in-ballot external link; this case exists because the notice sits in a *different* component that does not use it. If review pushes back on the explicit-`Link` recommendation, the answer is that the product already ships that exact pattern on the same screen. Note that the integration map records the precedent as `target='_blank'` and does not establish whether it also carries `rel` — treat `rel="noreferrer"` as a requirement of the **new** code and read it off the rendered attribute (step 12) rather than assuming it is inherited.

**The trap in steps 13–14 — read this before recording a pass.** Browsers honour Cmd-click and middle-click **regardless of `target`**. A link with `target="_self"` still opens a background tab when you Cmd-click it. So step 13 passing is **not** evidence that `target="_blank"` is set, and it is not a substitute for step 5. Its job is the opposite: if Cmd-click and middle-click do *nothing*, the element is not a real anchor with an `href` — it is a `div`/`Button` with an `onClick` that navigates programmatically, which also breaks step 14. Read step 5 for the target, steps 12–14 for the shape, and don't let one cover for the other.

**What `rel="noreferrer"` buys, honestly.** Two things, neither dramatic on a current browser. (a) It implies `noopener`, so the article page gets no `window.opener` handle back to the ballot tab — modern browsers already imply that for `target="_blank"` anchors, so this is defense-in-depth rather than a live hole. (b) It suppresses the `Referer` header to the docs host. That matters most on a **closed-list** election, where the voter's ballot URL carries a credential in a path segment — though the modern default referrer policy already strips the path cross-origin, so this is only a live leak if the app sets a looser policy. Assert the attribute because the prescribed pattern specifies it and it costs nothing; do not escalate its absence past a nit. It is the same family as the Matomo path-segment finding in the integration map, which is a separate and larger issue.

**Why there is no recovery to fall back on.** `VotePage` holds the races in React state and persists no draft anywhere — no localStorage, no server-side draft. The receipt/verify surface needs a *persisted* ballot and so is unreachable before submit. Nothing in the product can give the voter their scores back. Integrity is not at risk — a lost ballot is simply never cast — but that is the point: the cost lands as silent abandonment, which nobody measures and no error log records.

**Automation.** This case automates cleanly — assert on the new-page/popup event for the plain click, then re-read the score inputs on the original page. The two existing specs that will start rendering the notice once the feature lands (`testing/tests/election-with-rolls.spec.ts`, `election-without-rolls.spec.ts`) are where the selector churn hits; a dedicated assertion for this case belongs wherever the new notice's spec coverage goes.

**Scope discipline.** Whether the link *resolves* is BV240h. Whether the notice exists and where it sits is BV240a. Whether the ranked ballot gets a notice at all is BV240j. This case asserts only on what the click does to the tab and to the ballot state. One rider worth carrying to **BV240i**: if the submit-confirm dialog also ends up carrying a link, the identical test applies there with higher stakes — the ballot is complete, the voter is one click from casting, and a same-tab navigation from inside an open modal loses a finished ballot.

# Related

- **BV240a** — the notice this link lives in. Must pass first, same build.
- **BV240h** — whether the URL resolves. Separate failure, separate fix.
- **BV240i** — the submit dialog; carry the rider above if it gains a link.
- **BV240j** — the other ★ likely-failure, and the other case about *where* the notice is rendered.
- **BV240c / BV240d** — closed-list configurations, where the `Referer` note above has teeth.
- **BV230-r1** (2026-07-29) — the baseline that confirms "Learn more about STAR Voting" is live on the `/vote` page, i.e. that the correct pattern ships today.
