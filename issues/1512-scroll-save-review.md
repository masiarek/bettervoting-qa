# #1512 — Odd scroll/save behavior (review)

- Issue: <https://github.com/Equal-Vote/bettervoting/issues/1512> (open, filed 2026-08-14 by Micah Lindstrom)
- Recording: <https://github.com/user-attachments/assets/effc8f69-9e02-4473-8e18-c547beb42136>
- Subsystem map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Test cases: [`test_cases/BV250-index.md`](../test_cases/BV250-index.md)

**Verdict: valid, and reproducible from source.** Not device-specific — the Galaxy S25 Ultra and
Vivaldi only supply the aggravating detail (an overlay scrollbar that had auto-hidden), which is why
the reporter had no cue that the dialog held more content.

---

## 1. The written steps and the attached video are about different screens

Read this before picking the issue up.

- The **steps** describe the race editor: *build a multi-race ballot, add a race, add two candidates,
  click Save*. That is `RaceForm` inside `RaceDialog`.
- The **video** is 40 seconds and never opens the race editor. It is entirely **Manage Voters, then
  the Adding Voters dialog** — checkbox, textarea, SUBMIT, a duplicate-emails prompt, CLOSE.

Both screens are real, and both have a scroll problem, but they are different code with different
fixes. Whoever takes this should decide which one the ticket is for and say so, or the fix will land
on the screen the reporter wasn't filming.

## 2. Root cause on the race dialog (what the steps describe)

`useEditRace.tsx:125` ends validation with:

```js
setErrors(errors => ({ ...errors, ...newErrors }))
scrollToElement(() => document.querySelectorAll('.Mui-error'))
```

`scrollToElement` (`components/util.tsx:324`) is a **page-level** scroller — it measures against
`document.documentElement.scrollTop` and `window.innerHeight` and ends in
`window.scrollTo({top: elemTop - navHeight})`. But the error field is inside
`<Dialog scroll='paper'>` (`RaceDialog.tsx:43`), whose scroll container is `.MuiDialogContent-root`
inside a `position: fixed` overlay. Two independent failures follow:

- **the coordinate is meaningless** — a document offset added to a viewport-relative rect, for an
  element that is not in document flow;
- **the target is the wrong scroller** — `window.scrollTo` cannot move the dialog's own scroll
  container whatever number it is given.

So the error state is set correctly, nothing brings it into view, and the page behind the modal moves
instead.

**Why it is inconsistent rather than always broken:** the same `validateRace()` serves both stylings
in `RaceForm.tsx` — the Wizard variant (`:59`) renders in the page, where `window.scrollTo` is
exactly right. One helper, two layout contexts, only one handled.

**Aggravating factor worth naming in the ticket:** `RaceForm.tsx:50` gives the dialog content
`minHeight: '500px'` and `width: '250px'` at the `xs` breakpoint. On a phone the dialog is
*guaranteed* to need internal scrolling, and *"Must have at least 2 candidates"* / *"Must select a
voting method"* sit above the region the user is looking at.

## 3. What the video actually shows

Also a scroll defect, but not this one. The Adding Voters dialog has **no scroll-to-error at all** —
its failures go to a snackbar (`AddElectionRoll.tsx:60`), which on a phone renders at the bottom of
the viewport, potentially over the dialog's own buttons. What the video shows instead is:

- the background page visibly moving under the modal while the modal is open (frames at 18–20 s);
- the same dialog re-opened three times because the *submission* kept failing, for reasons that have
  nothing to do with scrolling — see
  [`add-voters-duplicate-check-keys-on-email.md`](add-voters-duplicate-check-keys-on-email.md).

That second thing is the reason the recording exists and the reporter did not identify it. It is a
silent data-loss bug and is worth more than #1512 is.

## 4. On the reporter's three proposals

| Proposal | Assessment |
|---|---|
| *"When not ready to save, clicking Save should scroll foreground instead of background"* | Correct, and the actual fix. |
| *"Ensure scrollbar is always visible"* | Symptom-level, and mobile overlay scrollbars are not reliably forceable. The better version of the instinct is `fullScreen` on small breakpoints, which removes the two-scrollers ambiguity rather than annotating it. |
| *"Change the button text to Next when not ready to save"* | Push back. `validateRace()` is not a pure predicate (it calls `setErrors`), so live labelling means a second validity function to keep in sync — and the defect is not the word on the button, it is feedback the user cannot see. |

The proposal none of them made, and the one to lead with: **an error summary next to the button**
("2 problems above"), so the feedback needs no scrolling at all. Scroll-into-view is best-effort; on
a 250 px-wide dialog it will keep being fragile.

## 5. Suggested fix

Make the scroll container-aware. `Element.scrollIntoView({block: 'center'})` walks up and scrolls
*every* ancestor scroller, including `DialogContent` — most of the bespoke arithmetic in
`scrollToElement` exists only to hand-roll that for the page case.

Also **scope the query**. `document.querySelectorAll('.Mui-error')` is document-wide, and both
`RaceDialog` and the `CandidateForm` dialogs use `keepMounted`, so stale error nodes stay in the DOM.
The zero-height filter usually saves it, but a visible `.Mui-error` on the wizard page *behind* the
dialog would win the `[0]` pick. `dialogContentRef.current.querySelectorAll('.Mui-error')` is both
the fix and the correct scroll root.

Minor, while in there: `util.tsx:352` calls `document.querySelector("header").getBoundingClientRect()`
unguarded, and throws on any page without a header.

## 6. Triage

The issue carries **`Role: Missing`** despite the author ticking both label boxes. It needs
`Role: Frontend` and a complexity label before it is pickable. Complexity is low for the
`scrollIntoView` swap, medium if the error summary goes in too.
