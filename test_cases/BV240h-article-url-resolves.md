BV240h - Article URL resolves

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240a](BV240a-notice-appears-on-ballot.md) — the notice this link lives in
- [BV240g](BV240g-link-opens-new-tab.md) — *how* the link opens; this case is *where* it goes

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented** (step 1 is runnable today, and should be)

# Purpose

The link target returns 200 and lands on the preliminary-results help article. Not a 404, not the docs index, not a redirect chain.

**This is the smallest case in the set** — one URL, one status code. It is a link check with a case number. Worth having anyway, for three reasons:

1. **It is the first privacy disclaimer BetterVoting has ever shipped on a ballot.** A dead link there doesn't read as a broken link; it reads as a disclaimer with nothing behind it. That is a worse outcome than the notice not existing, and it's the kind of thing that gets screenshotted.
2. **The docs site and the frontend deploy independently.** `docs/` ships to docs.bettervoting.com from `main` on its own schedule; the app that links to it is a separate deploy. Nothing in either pipeline knows about the other, so the two can drift — a docs reorganization renames a path and the ballot link rots with no build failing anywhere. CI runs `npm run build -ws && npm test` (backend jest) plus Playwright, on `main` only. There is no link checker.
3. **There is prior art for exactly this failure.** In the star-voting-library, a permanent BetterVoting election description was minted quoting a docs URL that 404s — a `/README.html` path where the published site serves `/index.html`. BetterVoting election titles and descriptions cannot be edited after creation, so that link is wrong forever. Same class of mistake: a plausible-looking URL, published to somewhere unfixable, never fetched first.

**The half of this case that is runnable today.** Step 1 needs no election, no login, no build, and no feature — just `curl`. Run it now. If the URL shape is wrong, the person implementing the notice needs that before they write the `href`, not after review. Steps 2–4 are vacuous until the feature ships.

# Prerequisites

1. **Step 1: nothing.** A shell.
2. **Steps 2–4: the feature must be implemented.** As of 2026-07-29 there is no on-ballot notice and no `learn_link` on the admin tip, so there is no `href` to inspect on either surface. Run against a local `docker compose` stack during PR review, then re-run on production after deploy.
3. Admin login for the step-4 tooltip: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
4. Browser devtools (to read the rendered `href` rather than trusting where a click lands).

# Master data

**Step 1 uses no election at all.**

Steps 2–4 use configuration **E1**, already set up for BV240a — reuse it rather than creating anything.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Irrelevant here; the ranked-ballot surface is BV240j |
| Races / candidates | 1 / 3 | "STAR Voting - Fruits" template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> |
| **Show Preliminary Results** | **ON** | Only so the notice renders at all |
| State | Open | |

**No export check in this case.** `election.settings` has nothing to do with where a URL points. The setting only needs to be ON far enough for the notice to render; BV240a already proves the setting itself.

# Test steps

## Step 1 — status, redirects, final URL (runnable today)

```
curl -s -o /dev/null -w '%{http_code}  redirects=%{num_redirects}  final=%{url_effective}\n' -L https://docs.bettervoting.com/help/preliminary_results.html
```

Want the headers too: `curl -sI https://docs.bettervoting.com/help/preliminary_results.html | head -1`.

Record the exact output. `-L` follows redirects deliberately — a 200 reached after two hops is a different result from a direct 200, and both are different from a 301 to the docs index (which also returns 200 and looks fine if you only check the status code).

## Step 2 — the ballot-side `href`

Open the E1 voter link in a private window. Inspect the anchor in the notice and read its `href` attribute. Compare it character-for-character against the URL from step 1. Don't infer it from the link text.

## Step 3 — click it, and check *which* page you got

Click through. Confirm the page is the preliminary-results article — its own heading and its own content about what a live tally exposes — and **not** the docs help index with the article merely listed in a sidebar. Both render, both are 200, and only one discharges the disclaimer.

## Step 4 — the admin-side link, separately

As admin on E1, open Settings and hover the ⓘ beside **Show Preliminary Results**. Read the `href` on the **Learn More** anchor.

**This is a different code path and has to be checked on its own.** The ballot link is an explicit `<Link>` written in a component; the tooltip link comes from a `learn_link` value in the i18n tip, rendered by `styles.tsx` L33. Two authors, two places, one URL — nothing makes them agree, and a typo in either is invisible from the other. Assert both, and assert they match each other.

# Expected results

1. **HTTP 200.**
2. **No redirect chain** — `num_redirects=0`, or at most one hop with a documented reason (e.g. a canonical http→https upgrade). A chain is not a failure by itself; it is a finding, because it usually means the URL in the code is not the URL the docs site actually publishes.
3. **The landing page is the preliminary-results article**, not the docs index and not a "page not found" that the docs theme serves with a 200.
4. **The ballot-side `href` equals the URL under test**, exactly.
5. **The admin tooltip's Learn More `href` equals the same URL.**
6. Nothing on the article page is itself broken in a way that defeats the point (the article is already written and reviewed — this is a glance, not a doc review; the substantive doc-review item is deliverable (iv) on the [index](BV240-index.md)).

## The URL shape is a PREDICTION

Target under test:

```
https://docs.bettervoting.com/help/preliminary_results.html
```

**Confirmed:** `docs/help/preliminary_results.md` exists in-tree on `origin/main`, with front matter `nav_order: 8`, and `docs/CNAME` is present.

**Inferred, never fetched:** that the published URL is `/help/preliminary_results.html`. That shape comes from reading how the docs site maps source paths, not from a request. It has not been verified. Plausible alternatives if it's wrong: a directory-style URL without the `.html`, or a different path prefix. `nav_order` controls sidebar position only — it has no bearing on the URL.

**This case exists to settle that.** If step 1 returns anything other than a clean 200 on this URL, the case does not simply fail — it produces the correct URL, and that URL is what the implementation must use. Record the working one here and in the [index](BV240-index.md).

# Pass / fail

- **Pass** — all six.
- **Fail (blocking, and cheap to fix)** — non-200, or a 200 that isn't the article. The link must not ship this way. If found before implementation, it's a one-line correction; if found after, it's a frontend deploy.
- **Fail (drift)** — one surface points at the working URL and the other doesn't. Note *which*, because the fix location differs: the component versus the `learn_link` value in `en.yaml`.
- **Finding, not a fail** — a redirect chain that still lands correctly. Log it and change the code to the final URL anyway; a redirect that works today is a docs reorganization away from being a 404.

# Actual results

*[curl output — the full `-w` line: status, redirect count, final URL]*

*[screenshot — devtools element inspector on the ballot notice's anchor, `href` visible]*

*[screenshot — the article page as reached from the ballot link, top of page showing it is the preliminary-results article and not the docs index]*

*[screenshot — admin Settings tooltip with the Learn More link, and its `href` in devtools]*

# Notes

- **Run step 1 before the PR is written, not during review.** It costs one command and it is the only part of this case that can change what gets built.
- **A 200 is not proof you got the right page.** Static docs sites commonly serve a themed "not found" page with a 200. Requirement 3 is why step 3 says to look at the content, not the status bar.
- **Copy the final URL into the code, not the pretty one.** If step 1 shows a redirect, the code should carry the destination.
- **Worth one line of automation, in the docs pipeline rather than the app's.** The link is a constant; a single fetch-and-assert-200 in CI would catch the drift described in Purpose (2) the day it happens instead of the day a voter reports it. Not a test case — a suggestion for the PR.
- **This case does not check the link's *behaviour*.** New tab, `rel="noreferrer"`, and whether an in-progress ballot survives the click are all **BV240g**, and that's the one likely to actually fail. Keep them separate.

# Related

- **BV240a** — the notice that carries this link
- **BV240g** — new-tab behaviour and ballot survival; the behavioural half of the same anchor
- **BV240l** — the admin tip rewrite that introduces the `learn_link` checked in step 4
- **BV240 index** — deliverable (iv), the article's own content review, which this case deliberately does not do
