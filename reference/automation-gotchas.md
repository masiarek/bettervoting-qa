# Driving bettervoting.com with browser automation

What cost time on 2026-08-03, and the verification discipline that came out of it. Applies to any scripted browser session against the app — Playwright specs included, though the specific failures below were hit through an MCP browser tool.

The short version: **the screen is not evidence.** Every claim about what the product stored must come from the API, not from what the form looked like.

## 1. Setting a field's value programmatically does not reach React state

This is the one that nearly produced a false bug report, twice.

Assigning `input.value` and dispatching an `input` event fills the DOM — the field looks correct, screenshots look correct, reading `.value` back returns your text — while React's own state never updates. The value then either fails validation or arrives at the server as `null`.

It is **inconsistent**, which is what makes it dangerous. In one run the title and five candidate names all persisted through exactly this mechanism and only the description was dropped, which read convincingly as a product bug. In the next run the *title* written the same way left React state empty: `Title required` fired on a visibly populated field.

**Symptoms**

- A required-field error on a field that plainly has text in it.
- A field that round-trips fine in the DOM and comes back `null` from `/API/Election/<id>`.

**Fix.** Use real keystrokes: triple-click the field to select its contents, then type. Confirm the validation message clears — that's the signal state actually updated, and it is cheaper than discovering the problem after publish.

**Rule.** Before reporting that the product discarded an input, either re-run it by hand or write a second field the same way as a control. A null from an automated run is a claim about your harness until proven otherwise.

## 2. A MUI dialog swallows clicks with no error

The wizard's **Publish?** step is a `MuiDialog` overlaying the page. Clicks aimed at anything underneath report success and do nothing — no exception, no console message. A run that appears to freeze mid-form is usually this.

Diagnose by hit-testing the point you think you're clicking:

```js
const el = document.elementFromPoint(x, y);
el.tagName + ' ' + el.className   // → DIV MuiDialog-container … means you're blocked
```

Enumerate what's actually open — most `.MuiDialog-root` nodes in the tree are inert:

```js
[...document.querySelectorAll('.MuiDialog-root')]
  .filter(d => getComputedStyle(d).visibility !== 'hidden')
  .map(d => d.innerText.slice(0, 120))
```

## 3. Element handles churn on every re-render

Candidate rows auto-append as you fill the last one, and each re-render invalidates handles for the whole list — including rows you already filled. Re-read the tree between steps rather than caching a batch of references up front, and expect `ref not found or stale` as normal traffic rather than a failure.

## 4. Verify server-side, always

The pattern that worked, and the one to keep:

```js
// after any state-changing UI action
await (await fetch('/API/Election/<id>', {credentials: 'include'})).json()
```

`voterAuth.roles` and `voterAuth.permissions` answer "did that actually grant me anything?" far more reliably than whether an admin page rendered. The wizard-orphan finding was only provable because the **negative** was executed too — an owner-only call returning `401` — rather than inferred from an empty roles array.

**Run the control.** Two paths that differ in one step, both executed in the same session, is worth more than either result alone: it rules out the session, the cookies, and the harness in one move. See [`creating-an-election.md`](creating-an-election.md#the-control-run).

## 5. Read the source before filing

Both candidate findings from that session were resolved by reading upstream, in opposite directions — one confirmed with a root cause and a one-line fix, one retracted. Neither outcome was reachable from the browser alone.

```bash
gh api "search/code?q=repo:Equal-Vote/bettervoting+<symbol>" --jq '.items[].path'
gh api "repos/Equal-Vote/bettervoting/contents/<path>" -H "Accept: application/vnd.github.raw"
```

Cheaper than a second repro run, and it is what turns "observed once" into something worth a maintainer's time.
