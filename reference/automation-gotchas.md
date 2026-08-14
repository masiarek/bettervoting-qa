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

## 6. When the browser will not take input at all

Added 2026-08-14, reproducing [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513).

A different failure from §1 and §2: not "the click went to the wrong element", but **no input events
at all**. Every `computer` click timed out after 30 s with *"The Browser pane is currently hidden"*,
while `screenshot`, `read_page` and `javascript_exec` all kept working. A pane that renders but
cannot be clicked is not a stuck app and no amount of retrying fixes it.

**The escalation ladder, cheapest first.**

1. **Screenshot to confirm it is input, not the page.** If the screenshot returns a live frame, the
   renderer is fine and the problem is the input channel.
2. **Drive it from `javascript_exec` instead.** `el.click()` on a real element works, and for text
   you need the native setter plus an `input` event — but see §1 for why that is a trap on React
   fields, and why anything you fill this way is suspect until the server agrees. This gets you a few
   steps further; it does not get you a *user-path* proof, because a synthetic `.click()` is not what
   a user does.
3. **Stop, and take the logic out of the browser.** See below. Usually the right call sooner than
   feels comfortable — a multi-step wizard driven through injected clicks costs a dozen round trips
   and still proves less than the harness does.

**The harness: transcribe the functions and execute them.**

The bug in #1513 was three pure functions — the row-building loop out of `onSubmit`, plus
`duplicatesExist` and `removeDuplicates`. None of them touch the DOM, the network, or React state.
So copy them **verbatim** into a `.mjs` file, stub only the framework edges (`setSnack`, `confirm`,
`postRoll`), and run every input you care about in one go:

```
2 distinct IDs, answer YES     typed 2 -> posted 1  | prompted: YES | alpha
3 distinct IDs, answer NO      typed 3 -> posted 0  | prompted: YES | (nothing)
3 distinct emails, answer YES  typed 3 -> posted 3  | prompted: no  | a@x.com, b@x.com, c@x.com
```

Working example: [`../analysis/add-voters-probe/`](../analysis/add-voters-probe/README.md).

Four rules that keep this honest:

- **Transcribe, never paraphrase.** Copy the function bodies character for character and say which
  commit they came from. The moment you "clean up" a condition you are testing your own code.
- **Stub only the edges** — the things that talk to React or the network. Anything you reimplement is
  no longer evidence.
- **Run the mode that works as a control.** Here, the same three inputs in email mode behave
  correctly. That contrast is the diagnosis, and it is also the regression the fix has to keep
  passing.
- **Say what it cannot prove.** A harness proves the functions. It does not prove the component calls
  them the way the file reads — that wiring is still source-read until someone clicks through. State
  that in the issue rather than letting the executed output imply more than it covers.

**Where the UI evidence came from instead.** The reporter's own screen recording, read frame by
frame — which turned out to be *better* than a local repro, being production, a real user, and
timestamped. See [`reading-a-bug-report-video.md`](reading-a-bug-report-video.md). The harness
reproduced its voter-count arithmetic exactly, which is a stronger pairing than either alone: an
executed explanation that predicts an observed production outcome.

**Do not leave debris.** The abandoned attempt got four steps into the election wizard on production.
Check whether it created anything before walking away — here it had not (the URL never became
`/<id>/admin`, so no election was written), but a half-finished wizard run that *did* publish is
exactly how an orphaned election gets made.
