# #1497 — description fields no longer say they support links (FILED 2026-08-08, ours)

- **Issue:** [#1497](https://github.com/Equal-Vote/bettervoting/issues/1497)
- **Docs PR:** [#1498](https://github.com/Equal-Vote/bettervoting/pull/1498) — adds `docs/help/tips_and_tricks.md`
- Read from source at upstream `7bc75a82` (`origin/main`, 2026-08-07). The **negative** case was then confirmed in a browser on production; the positive case was not — see *Evidence* below.

## Finding

Election and race descriptions render through `formatMarkdown()` (`packages/shared/src/utils/formatMarkdown.ts`), which supports `**bold**`, `[text](url)` and blank-line paragraph breaks. Its only link rule is

```js
const rLink = /\[([^\]]*?)\]\(([^)]*?)\)/;
```

so there is **no bare-URL autolinker**. That looks deliberate, and it's defensible — but it makes the affordance load-bearing, and the affordance has been quietly disappearing.

`a8efc073` ("feat: markdown for race description and election description", 2025-10-23) shipped the feature with a helper line in **three** places. On `main` today it survives in **two**:

| File | Helper | On `main`? |
|---|---|:--:|
| `ElectionDetailsForm.tsx:94` | `Supports **bold** and [link text](url) formatting` | ✓ |
| `SendEmailDialog.tsx:159` | `Supports **bold**, [link text](url), __VOTE_BUTTON__, and __ELECTION_HOME_BUTTON__` | ✓ |
| `RaceForm.tsx` | `Supports **bold** and [link text](url) formatting` | ✗ |

**The RaceForm loss looks like a rebase artifact, not a decision.** `89f6e1a6` ("Update race form & add to quick poll") rewrote the component and deleted the helper — pure deletion, nothing replaced it. Its dates are the tell: **authored 2025-09-05, committed 2025-12-14**. It was written before the markdown feature existed and landed on top of it, so it removed a hint its author had never seen. Worth remembering as a class of bug — `git log` reads as "removed in September", which is before the thing it removed was added.

Separately, the **new wizard's** Description field (`Wizard.tsx`, `MultiRaceTitleSection`, from the #1405/#1436 rewrite) has no `helperText` at all and never did. That's now the default path into election creation, so the most-travelled route is the one with no hint.

Net: the feature is fully alive and effectively undiscoverable unless you open **Details** in the editor.

## Two adjacent facts worth having

Both read from source, neither in the issue body:

- **Neither description appears on the results page.** Election description renders on `ElectionHome`, the `ElectionCard` (Browse Polls) and email invites; race description renders on the ballot only. Nothing under `components/Election/Results/` touches either. So a link in a description never reaches anyone who arrives at `/results` — which is exactly the audience for "here's how this was counted".
- **Titles are plain text.** `election.title` and `race.title` go straight through `<Typography>` on every surface. Markdown in a title displays literally, brackets and all.

## Evidence

**Negative case — observed on production 2026-08-08.** BV2261 (`y2fbpc`), whose description ends with a bare `Full lesson & tabulation: https://masiarek.github.io/...`:

```js
[...document.querySelectorAll('a')].filter(a => a.href.includes('masiarek.github.io'))
// => []   (38 anchors on the page, none of them ours)
```

The text is present in `document.body.innerText`; no anchor wraps it. So a bare URL in a description is definitively not linkified in the live product.

**Positive case — source only.** That `[text](url)` produces `<a href target="_blank" rel="noopener noreferrer">` is read off `formatMarkdown.ts` and its call sites, not observed — none of our elections has a markdown link in its description to look at. Cheap to confirm on the next mint.

## Why we noticed

The star-voting-library mints BetterVoting elections whose descriptions end with a backlink to the matching lesson page. **65 of its 217 frozen exports carry that link as a bare URL**, so every one of them is unclickable — and BV descriptions can't be edited after creation, so they stay that way.

Fixed forward on our side ([`6460834`](https://github.com/masiarek/star-voting-library/commit/6460834)): the house form is now `[Full lesson & tabulation](<url>)`, and `create_bv_test_election.py --dry-run` warns when a backlink won't linkify. The already-minted spec descriptions were deliberately left on the bare form — they're the record of what was actually sent.

## Suggested fix (in the issue)

1. Restore `helperText` on the race description field in `RaceForm.tsx`.
2. Add the same helper to the Description field in `Wizard.tsx`.
3. Optionally move the string into `en.yaml` — it's currently duplicated literal text in three files, which is how one copy came to drift.

Offered to PR 1–3; held off on 2 unprompted since the wizard is actively being reworked.

## Related

- [#1494 / #1495](827-spinouts-1494-1495-filed.md) — the other two docs-reachability tickets filed the same day
- [`reference/creating-an-election.md`](../reference/creating-an-election.md)
