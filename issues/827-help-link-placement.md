# #827 — Where to position a link to "Help"

**Verdict: the design question is settled and the fix is written. #827 is waiting on a code review, not on a product decision.** The pre-login half is implemented in PR [#1451](https://github.com/Equal-Vote/bettervoting/pull/1451) (open, unmerged as of 2026-08-08). What #1451 does *not* cover is the other two-thirds of the issue body — demo videos and guest/test accounts — which have never been spec'd by anyone.

Upstream: [Equal-Vote/bettervoting#827](https://github.com/Equal-Vote/bettervoting/issues/827) — open since 2025-02-28, Adam's. Labels `Discussion`, `Role: Front End`, `Role: Product Lead`, `Complexity: Small`; milestone `0-0 Time Sensitive`; assigned to @ArendPeter.

Written 2026-08-08. Nav behaviour run live on production; code read from upstream `main` @ `7bc75a82`.

## Where it actually stands

Three tickets, one chain, and #827 sits at the top of it:

| | | |
|---|---|---|
| [#827](https://github.com/Equal-Vote/bettervoting/issues/827) | the complaint — Help is invisible before login | open, this page |
| [#1450](https://github.com/Equal-Vote/bettervoting/issues/1450) | the spec — full nav restructure, written by @ArendPeter 2026-07-22 | open |
| [#1451](https://github.com/Equal-Vote/bettervoting/pull/1451) | the implementation — `Closes #1450` | **open, unmerged, unreviewed** |

#1450 cross-references #827 (so it shows in the thread's timeline) and states in *Out of Scope* that closing #827 is deliberately left to a maintainer, because #827's thread also raises hierarchy questions about how BetterVoting fits with equal.vote and starvoting.org.

That is the right call on the merits, but it has a cost worth naming: **#827 currently reads as an unresolved product debate**, and it is not one. Everything the thread was arguing about in 2025 has been decided and coded. The only thing between the fix and production is that #1451 has no review — its sole review event is @ArendPeter commenting on his own PR.

## The premise is out of date — the docs are already reachable before login

The issue says *"First time visitor is **NOT** able to see the Help files."* Verified against production on 2026-08-08, that is no longer true, though only by accident.

The logged-out nav is: **About Us · Voting Methods ▾ · Vote in a Poll · Paper Ballots ▾ · Stories · Create Election · SIGN IN**.

Open **Paper Ballots ▾** and the third item, labelled "Paper Ballots", is:

```
https://docs.bettervoting.com/help/paper_ballots.html
```

`Header.tsx:100`, inside `navItems` — so it renders for everyone, logged in or not. And because the docs are a just-the-docs Jekyll site, that leaf page ships the **full documentation sidebar**: all seven `/help/` pages, `/other_tools/`, the contribution guide, and a link to the docs home. A logged-out visitor who clicks it lands inside the entire help system.

So the defect is **discoverability and labelling, not access**. Nothing in the nav says "Help" or "Documentation" — which is exactly @waugh's point on the thread, that those are the words a reader would seek. The one door that exists is labelled "Paper Ballots", which nobody looking for help would open.

Worth correcting in the thread, because it changes the severity: this is a signage problem, not a walled garden.

## The entry point Adam asked for already exists

From the 2025-10-27 comment: *"I need help with the entry point (even if blank - or welcome to Better Voting Documentation) - but a working link and in a CORRECT position."*

The entry point is live. `docs/index.md` on `main` renders at `https://docs.bettervoting.com/` — HTTP 200, `<title>BetterVoting Documentation</title>`, body text "Welcome to our documentation!" — near-literally the fallback that comment asked for.

So that ask reduced to its second clause only: a working link, in a correct position. Which is what #1451 does.

## Why it was invisible: one block, one condition

`packages/frontend/src/components/Header.tsx` on `main`:

| Line | What | Who sees it |
|---|---|---|
| 219–225 | `MenuItem` → `t('nav.help')` → `https://docs.bettervoting.com`, `target='_blank'` | inside the `authSession.isLoggedIn() && …` block at `:198` |
| 251–255 | `PrimaryButton` → Sign In | the entire logged-out account area |

The Help item is not in `navItems` at all — it is hardcoded into the account dropdown, which does not render until login. Logged out, the whole right-hand box collapses to one Sign In button. There is no conditional to tweak; the link simply does not exist on the page.

**The 320px requirement falls out for free.** @waugh asked that any fix address 320px-wide screens. `navItems` is mapped twice — `:124` for the mobile hamburger, `:178` for desktop — so anything added to that array appears in both by construction. Confirmed live at a 320px viewport: the hamburger renders exactly `navItems` plus the mobile-only "Feedback?" item, and no Help.

#1450 goes further and treats 320px as a design constraint, rejecting a "flat append" hierarchy (Help + Store as two new top-level items, 6 → 8) specifically because it would crowd narrow screens. @waugh's requirement was met, in writing, by the spec.

## What #1451 changes

| | Before (`main`) | After (#1451) |
|---|---|---|
| Label | "Help" | **"Documentation"** |
| Location | account dropdown, login-gated | **About Us ▾ → Documentation**, in `navItems` |
| Visible logged out | no | **yes**, desktop and hamburger |
| Target | `_blank` | `_self` |
| Account dropdown | has Help | Help **removed** |
| `nav.help` i18n key | `Help ` (with a trailing space) | **deleted** |

Two thread items get quietly answered by that table:

- **@waugh's wording objection** — *"it does not say to include 'Help' or 'Documentation' as the appearance of a link, but I think those are the words a reader would seek."* #1451 uses the literal string "Documentation". #1450 records why over "Help" (avoids collision with the separate Feedback widget) and over "Docs" (too developer-flavoured for poll admins and first-time voters).
- **[star-server#920](https://github.com/Equal-Vote/star-server/issues/920)**, Jay's feedback — *"Link to Documentation should be on the main nav and be treated like an internal link even though it's a subdomain."* The `_blank` → `_self` switch is precisely that, and it is not mentioned in either #1450 or #1451 as being anyone's request. #920 is closed; the request survived it by coincidence.

## What #1451 does not resolve

The issue body has three asks. Only the first is addressed:

| # | Ask | Status |
|---|---|---|
| 1 | Discoverable help without login | **fixed** by #1451 |
| 2 | Help files link to demo videos, to build trust | **split out** as [#1494](https://github.com/Equal-Vote/bettervoting/issues/1494) on 2026-08-08 |
| 3 | Test user IDs so a visitor can see full functionality before registering | **split out** as [#1495](https://github.com/Equal-Vote/bettervoting/issues/1495) on 2026-08-08 |

Both were filed from this analysis, which leaves #827 resting entirely on #1451.

**#1494** is a docs-content task, not a frontend one. Two things found while filing it that make it cheap: the videos already wired into the product (`en.yaml:187/191/195`, for Approval / RCV / STV) are **method explainers, not product footage**, so the gap is specifically a walkthrough of BetterVoting itself; and `docs/other_tools/google_forms.md:20` already embeds a YouTube `<iframe>` in a docs page, so the embed mechanism exists and needs no tooling. If Equal Vote already has a walkthrough recorded, #1494 is a linking task.

**#1495** is the one @waugh flagged in March 2025 — *"maybe you should move that aspect to a separate issue. It might need a lot of behavioral specification."* He was right, and the reason it needed splitting is sharper than the thread realised: **`/sandbox` already answers most of the ask.** `App.tsx:71` registers the route; on production, signed out, it renders a worked STAR election end to end — method picker, ballots textarea, scoring round, automatic runoff, majority threshold, Equal Support, the explainer — with no account and nothing stored. And the route appears **nowhere else in the codebase**: not the nav, not the docs, not the landing page.

So the real question isn't "what should the test credentials be allowed to do" but "why are we proposing shared logins for a live voting platform when an unauthenticated demo already exists and is invisible". One caveat carried into #1495: on `/sandbox` the **Race Details panel expands to a permanent `Loading...`** (no election record behind a sandbox tally) — verified on production 2026-08-08, and it would need fixing or hiding before the page is shown to first-time visitors.

## The one thing worth raising before #1451 merges

**"About Us" is not where someone looks for help.** #1451 nests Documentation one level inside an About Us dropdown, alongside About BetterVoting, About The Equal Vote Coalition, Why We Need Better Voting, Stories, and Feature List. That is a coherent grouping — org and product identity — but "About Us" conventionally means *who we are*, not *how do I use this*. A confused first-time visitor is measurably more likely to open a menu labelled Help.

This is the same complaint as #827 itself, one notch weaker: the link goes from login-gated to menu-gated. It is a real improvement and it should ship. But if it ships and someone then closes #827 as done, the discoverability question the issue is actually about will have been answered by nobody.

Cheap ways to close the gap, none blocking:

1. **Rename the parent** to "About & Help" (or add Documentation as a second top-level item). #1450 rejected top-level growth at 6 → 8; one addition is 6 → 7, and Support Us was added at no net cost by folding Stories away.
2. **Add it to the footer**, which nobody in the thread has proposed and which is the conventional home for it. The footer today links starvoting.org, equal.vote, four social accounts and the GitHub org — and **no documentation at all** (`Footer.tsx`). A footer link is independent of the nav hierarchy that @ArendPeter and Sara are still working through, so it can land without waiting on that.
3. Do neither, and accept that About Us is good enough — a defensible answer, but it should be an answer, not a default.

## Loose ends found while reading

- **`nav.better_voting: Learn More` is a dead key.** `en.yaml:410` defines it; nothing consumes it. It is the remnant of the "Learn More" item visible in the issue's own 2025 screenshot, which the nav no longer has. Checked for template-literal construction too — the trap from the [#904](904-star-bloc-naming.md) analysis, where a plain grep wrongly reported `bloc_multi_winner_adj` as dead. This one is genuinely dead. #1451 removes `nav.help` and leaves `better_voting`.
- **`nav.help`'s value is `"Help "`, with a trailing space** (`en.yaml:400`). Harmless, and #1451 deletes the key, so this is only a note in case the key is revived.
- **#1451's Merch URL disagrees with its own QA steps** — the diff sets `https://bettervoting.myspreadshop.com`, while both the PR's ticked QA checklist and #1450's spec say `https://www.starvoting.org/store` (flagged there as a placeholder to be swapped). Not a breakage: **both resolve**, but they are two different shops — a BetterVoting Spreadshop in the code, versus `starvoting.org/store`, which redirects to the STAR Voting Etsy shop. The defect is that a ticked checkbox was verified against a URL the diff does not contain, and that the "placeholder to swap later" follow-up may already be resolved without anyone noticing.

Both of the above were [raised on #1451](https://github.com/Equal-Vote/bettervoting/pull/1451#issuecomment-5225709418) on 2026-08-08, where they belong — copy at [`1451-loose-ends-comment-posted.md`](1451-loose-ends-comment-posted.md). Neither went on #827.

## Recommendation

1. **Review and merge #1451.** It is the fix, it has been sitting since 2026-07-23, and its only review is the author's own. ← *the only thing #827 is still waiting on*
2. **Before merging, settle the About Us placement** — one comment on the PR, per the section above. Raised on the thread; unanswered.
3. ~~Split the test-user-IDs ask into its own issue~~ — **done**, [#1495](https://github.com/Equal-Vote/bettervoting/issues/1495).
4. ~~File the demo-videos ask as a docs task~~ — **done**, [#1494](https://github.com/Equal-Vote/bettervoting/issues/1494).
5. Then #827 closes on a nav change plus two spun-out tickets, rather than staying open as a general nav-hierarchy discussion. As of 2026-08-08 only step 1 remains.

All five points were [posted to the thread](https://github.com/Equal-Vote/bettervoting/issues/827#issuecomment-5225702899) on 2026-08-08 — copy at [`827-comment-posted.md`](827-comment-posted.md) — followed by a [second comment](https://github.com/Equal-Vote/bettervoting/issues/827#issuecomment-5225764496) linking the two spin-outs once they were filed. The two loose ends were kept off #827 and [raised on #1451](https://github.com/Equal-Vote/bettervoting/pull/1451#issuecomment-5225709418) instead, since that is the PR they concern.

## Provenance

| Claim | How established |
|---|---|
| Logged-out nav contents; no Help item | **run** — production 2026-08-08, DOM read of `.navbar` |
| Hamburger at 320px shows `navItems` + Feedback, no Help | **run** — production at a 320px viewport |
| Paper Ballots ▾ → `docs.bettervoting.com/help/paper_ballots.html` renders logged out | **run** — menu opened, href read from the live DOM |
| That deep page carries the full docs sidebar | **run** — fetched, `nav-list-link` anchors enumerated (all `/help/*`, `/other_tools/`, `/contributions/*`, and `/`) |
| `docs.bettervoting.com/` is live and says "Welcome to our documentation!" | **run** — HTTP 200, title and body checked |
| `/sandbox` renders a full STAR count signed out, with no account and nothing stored | **run** — production 2026-08-08, page text read after load |
| `/sandbox`'s Race Details expands to a permanent `Loading...` | **run** — panel expanded, text re-read after 1.5s |
| `/sandbox` is linked from nowhere | read from source — grep of `packages/` and `docs/`; only `App.tsx:71` matches |
| Both Merch URLs resolve, and to different shops | **run** — followed both, `starvoting.org/store` redirects to the STAR Voting Etsy shop |
| Help is login-gated at `Header.tsx:219`; `navItems` drives both renderers | read from source at `7bc75a82` |
| `nav.better_voting` unused, incl. template-literal check | read from source — grep of `t(` call sites and backtick keys |
| Footer has no docs link | read from source — `Footer.tsx` hrefs enumerated |
| #1451's diff, open/unreviewed state, Merch URL mismatch | read from the PR diff and API, 2026-08-08 |
| #1450's rationale, 320px reasoning, out-of-scope note on closing #827 | read from the issue body |
| Whether the About Us placement actually confuses users | **not established** — no user testing; the argument above is convention, not evidence |
| Rendered appearance of #1451's nav | **not verified** — branch not pulled or run |

## Related

- [#1450](https://github.com/Equal-Vote/bettervoting/issues/1450) — the spec; explicitly declines to close #827
- [#1451](https://github.com/Equal-Vote/bettervoting/pull/1451) — the implementation, open
- [#1494](https://github.com/Equal-Vote/bettervoting/issues/1494) — demo videos in the help docs, split out of #827 (ours)
- [#1495](https://github.com/Equal-Vote/bettervoting/issues/1495) — try-before-registering / `/sandbox`, split out of #827 (ours)
- [#845](https://github.com/Equal-Vote/bettervoting/issues/845) — Landing Page improvements, cross-referenced from #827 since 2025-03
- [star-server#920](https://github.com/Equal-Vote/star-server/issues/920) — Jay's "treat the docs link as internal" feedback; closed, request unmet until #1451
- Discussion docs on the thread: [Options — PROS and CONS](https://docs.google.com/document/d/1s6wCkcmKXQHnqzy_HsNZKPRzUZKNlHlDKVwsbGoFXBM/edit), [What links to use](https://docs.google.com/document/d/1rbHi_gtTI3ooU02rQb9EG_-eh-lwYVD4j7UqPQ-a1Uw/edit) — not read for this page
