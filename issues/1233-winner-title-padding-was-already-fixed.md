# #1233 — the padding half was already fixed; the second half wasn't

**Addressed in [Equal-Vote/bettervoting#1514](https://github.com/Equal-Vote/bettervoting/pull/1514)** (2026-08-15). Issue: [#1233](https://github.com/Equal-Vote/bettervoting/issues/1233).

## The finding worth keeping

The issue's screenshot shows `⭐Vanilla wins! ⭐` — no space after the left star. **It no longer reproduces.** Commit `11a8facf` ("Add padding around emojis") added the space, and on a current build the two text nodes measure 31.0 px each. The rendered DOM is `"⭐ " + "Ann Ambitious wins!" + " ⭐"`.

Two lessons, both cheap:

1. **Measure before believing a screenshot.** I first read the low-resolution attachment as still-broken; the pixels at 800px wide are ambiguous. `getBoundingClientRect` over the two text nodes settled it in one call.
2. **A half-fixed issue stays open and looks whole.** Nothing on #1233 said the first action item had landed, so the next person to pick it up starts by re-fixing something that isn't broken.

## What was actually left

The second action item — move the format string, stars included, out of JSX and into `en.yaml`. That is what keeps the first one from regressing: the padding was invisible to anyone reading the locale file, because the stars were interleaved with a translated fragment in `Results.tsx`.

Two things fell out of doing it:

- `⭐ {name} wins uncontested ⭐` was **hardcoded English** in the component and had never been translatable at all.
- The `&nbsp;` insertion replaced only the *first* space in each candidate name and appended a stray one after the last name.

The other three locales got the new key built from wording they already had, so nothing changes on screen for them.

## Provenance

| Claim | How established |
|---|---|
| The padding is already correct on `main` | **executed** — `Range.getBoundingClientRect()` over the h5's child text nodes on a local build: `"⭐ "` and `" ⭐"` both 31.0 px |
| `11a8facf` is the commit that fixed it | `git log -L` on the line |
| The uncontested line was untranslatable | read from `Results.tsx`, and from the absence of any matching key in the four locale files |
| The new strings render correctly for count 1 and 2 in all four locales | **executed** — resolved through i18next directly |
