# #1451 — loose ends comment posted 2026-08-08

**Posted:** [Equal-Vote/bettervoting#1451 comment](https://github.com/Equal-Vote/bettervoting/pull/1451#issuecomment-5225709418)

Two one-liners found while reading #1451 for the [#827 analysis](827-help-link-placement.md), kept off the #827 thread because they concern the PR rather than the issue.

---

Two small things from reading the diff against #1450. Neither blocks the nav restructure — which I think should land, see my note on #827 — and both are one-liners.

**1. The Merch URL in the diff isn't the one in the QA steps.** The code has:

```js
{ text: 'Merch', href: 'https://bettervoting.myspreadshop.com', target: '_self' }
```

but this PR's checklist says *"Merch → `https://www.starvoting.org/store` (placeholder, expected)"* — ticked — and #1450's spec says the same, flagging it as a placeholder to swap later. Both URLs are live, so nothing is broken either way, but they're two different shops (a BetterVoting Spreadshop vs. `starvoting.org/store`, which redirects to the STAR Voting Etsy shop), and the ticked box was verified against a URL that isn't in the diff.

Which is intended? If it's the Spreadshop, then the placeholder follow-up in "Known follow-ups" is already resolved and only the description needs updating.

**2. While you're in `nav:` — `better_voting: Learn More` is dead too.** This PR removes `nav.help`; the key two lines below it has no consumer anywhere in `packages/`. It's the leftover of the "Learn More" top-level item the nav hasn't had for a while. Worth deleting in the same commit while that block is open.

I checked it for template-literal construction before calling it dead, since a plain grep for i18n keys in this repo can lie — `bloc_multi_winner_adj` looks dead to grep but is built as `` t(`edit_race.${methodFamily}_adj`) `` at its call site. `better_voting` has no such call site.
