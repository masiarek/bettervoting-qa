BV240l - Rewritten Public Results tip text

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240m](BV240m-tip-under-other-label.md) — the same tip under the other label
- [BV240n](BV240n-tip-one-paragraph-and-poll-wording.md) — paragraph rendering and poll terminology

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented** (no sign-off blocker, though — see Purpose)

# Purpose

The admin-facing half of #1350: the "Public Results" tooltip text is rewritten, and gains a **Learn More** link to the help article.

**This is the one BV240 case whose deliverable can land immediately.** It is a single-file change to `packages/frontend/src/i18n/en.yaml` — no TypeScript, no new component, no closed-list wording waiting on approval, no translator obligation. Everything the other fifteen cases wait on (the notice component, the insertion point, the approved privacy language) is irrelevant here. If #1350 splits into separate PRs, this is the first to merge and this is the case that gates it.

It also gets the article linked from *somewhere* for the first time: `docs/help/preliminary_results.md` has been on `origin/main` (nav_order 8) with **zero** links to it from `packages/`. One `learn_link:` line changes that.

Three things to verify: the new text is there, the old text is gone, the link exists and works. One thing to explicitly **not** verify: word-for-word identity with the issue's Should-be string — see the deviation note under Expected results.

# Prerequisites

1. **The copy change must be merged.** As of 2026-07-29 production still shows the As-Is text (confirmed live, screenshot on file — see Actual results). Run this against a local `docker compose` stack while the PR is in review, then re-run on production after deploy.
2. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
3. **One browser context is enough.** Unlike BV240a–k, nothing here is voter-facing — no incognito window, no second profile. Stay signed in as the admin throughout.
4. **A pointer device.** The ⓘ is hover-triggered. Whether the tip is also reachable by keyboard focus or tap is not established — if it isn't, record that as a finding, not as a blocker for this case.

# Master data

Election configuration **E1**, admin side only — the same election BV240a, f, g, h, i, k, o use.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Irrelevant here — the tip is static copy, not election data |
| Races | 1 | |
| Candidates | 3 | Suggest the existing **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> — to skip setup |
| Type | **Election**, not a Poll | Poll wording is BV240n's assertion; this case reads the Election rendering |
| Who can vote | Unrestricted / open link | |
| **Show Preliminary Results** | ON | The tip should render the same either way — it is one static string, so the toggle's *value* doesn't feed it (prediction from source; the flip-and-hover in step 7 confirms it) |
| State | Draft **or** open | ← the one thing that matters. The switch label reads "Show Preliminary Results" only while draft/open; once closed it becomes "Make Results Public", which is **BV240m** |
| Ballots cast | 0 | Nothing here depends on ballots |

**No export check in this case.** The tooltip is rendered from a static i18n file; no election row, no setting value, no server state feeds it. `curl`-ing `election.settings` would confirm something this case doesn't assert. The export check belongs in BV240a/b/e/p, where the settings state is load-bearing.

# Test steps

1. Sign in as admin, open the election, go to **Settings**.
2. Find the **Show Preliminary Results** switch. Screenshot the row with the ⓘ visible. (If the label reads "Make Results Public", the election is closed — you're running BV240m, not this.)
3. Hover the **ⓘ** next to it. Screenshot the open tooltip with the whole text readable.
4. Read the tooltip. Check it against the three propositions in Expected results — **read for meaning, do not diff against the issue's literal words** (see the deviation note below).
5. Confirm the old text is gone.
6. Click **Learn More** in the tooltip.
7. Confirm where it opened and that the Settings tab is still there. Then flip the toggle and hover again — same text expected (see Master data).

**On step 6 — watch whether the tooltip survives the pointer.** *Prediction from reading source, not observed:* the link renders inside the tip body via `styles.tsx` L33, and hover-tooltips can dismiss on mouse-leave before the pointer reaches the link. If the tip closes as you move toward it, **Learn More is unclickable in practice** — a genuine failure of requirement 3, not a copy problem, and it should be filed as its own defect. Try keyboard focus and a click on the ⓘ before concluding it's unreachable.

# Expected results

## 1. The new meaning is present

Three propositions, all three present:

- **(a)** the setting controls whether voters can see results at all;
- **(b)** with it enabled during an **open** election, voters see **preliminary** results **after submitting** their ballot;
- **(c)** high-profile elections typically keep results hidden until the election closes.

The issue's Should-be text (**the rendered target, not the string to diff against**):

> Controls whether voters can see election results. When enabled during an open election, voters will see preliminary results after submitting their ballot. High-profile elections typically keep results hidden until the election closes.

## 2. The old text is gone

The As-Is, confirmed live on production **2026-07-29** — an observation, not an inference:

> **Public Results**
> Allows voters to see the results of the election. If enabled while voting is open then voters will be shown to the preliminary results after completing their ballot. High profile elections will usually keep the results hidden, and then reveal them after the election is closed.

The cheapest single-phrase absence check is the ungrammatical **"shown to the preliminary results"**. If that phrase is still on screen, the change didn't land — stop and confirm you're on the right build before investigating anything else.

## 3. A Learn More link is present and works

- The link is visible in the tooltip.
- It points at the preliminary-results help article, `https://docs.bettervoting.com/help/preliminary_results.html`. **Whether that URL 200s is BV240h's assertion** — here it's enough that the link exists and targets the article, not the docs index.
- It opens in a **new tab**, leaving the Settings tab intact.

## The deviation the tester must not flag as a bug

**Do not diff the shipped text against the issue's Should-be word for word.** The implementation is expected to keep the `{{election}}` / `{{elections}}` interpolation rather than paste the issue's literal sentence — the issue quotes the *rendered* string, and hard-coding "election" would regress poll terminology on every Poll in the product. The proposed source (**proposed implementation, not yet approved**):

```yaml
  public_results:
    title: Public Results
    description: >
      Controls whether voters can see {{election}} results.
      When enabled during an open {{election}}, voters will see preliminary results after submitting their {{ballot}}.
      High-profile {{elections}} typically keep results hidden until the {{election}} closes.
    learn_link: https://docs.bettervoting.com/help/preliminary_results.html
```

So: **assert on meaning, not on characters.** A tester who diffs literally will report false failures — the interpolated words, the `|` → `>` block-style change, the `{{ballot}}` insertion — all of which are the design. That the interpolation actually *works* (an Election says "election", a Poll says "poll") is **BV240n**, and the one-paragraph rendering is **BV240n** too.

# Pass / fail

- **Pass** — requirements 1, 2 and 3 all met.
- **Fail** — the old text is still present in whole or in part (requirement 2), or any of the three propositions is missing or altered in substance (requirement 1), or there is no Learn More link (requirement 3).
- **Fail (separate defect)** — the link is present but unclickable because the tooltip dismisses first, or it opens in the **same** tab. Same-tab here is a different mechanism from BV240g's: a `learn_link` anchor is generated by `styles.tsx` L33 with `target='_blank'` baked in, so a same-tab open means the link was implemented some other way — most likely a markdown link inside the description, which defaults same-tab and must never be copied to the on-ballot notice. Record which pattern shipped either way; **a pass here proves nothing about BV240g**, whose link is on the ballot and goes through the markdown renderer.
- **Not a failure of this case** — record and move on:
  - The tooltip **header** says "Public Results" while the switch **label** says "Show Preliminary Results". Pre-existing mismatch (one tip serves two labels, swapped by state at `ElectionSettings.tsx` L108); it is **BV240m**'s subject. Note it, don't fail on it.
  - Three separate lines instead of one paragraph → **BV240n**.
  - "election" appearing on a Poll → **BV240n**.
  - A 404 at the article URL → **BV240h**.

# Actual results

*[screenshot — the As-Is tooltip on production, 2026-07-29, before the change. Already captured; attach as the "before" half of the pair]*

*[screenshot — Settings page after the change: the "Show Preliminary Results" row with the ⓘ visible and the switch state readable]*

*[screenshot — the tooltip open, full text readable end to end: "Public Results" header, the body, and the Learn More link]*

*[screenshot — the tab opened by Learn More: URL bar showing the help-article address, with the Settings tab still present in the tab strip]*

# Notes

**Where the change lives.** `packages/frontend/src/i18n/en.yaml`, key `tips.public_results` — at `:737-742` in the checkout the integration map was built against; line numbers drift, so re-anchor on the key, not the number.

**Why `learn_link` is free.** `styles.tsx` L33 turns a `learn_link` value into a hardcoded-English "Learn More" anchor with `target='_blank'`. Zero TypeScript, and precedent already ships (`en.yaml:793` carries `learn_link: https://equal.vote/pr`). The "Learn More" label itself is **not** translatable — worth knowing, not worth blocking on, and out of scope for #1350.

**Avoid `**bold**` in the new copy.** `util.tsx` L244 renders double-asterisk markup as italic. If the merged text shows italics where bold was intended, that's the cause.

**Stale-reference trap.** The sentence "(Administrators can make results public at any time.)" is **not** in the current product — it was removed from all locale files. If an older reference screenshot shows it, that screenshot predates the removal; expect the new copy neither to contain nor to "remove" it.

**i18n scope: en-only by construction.** `tips:` sits in PRIORITY 4 (`election_settings:` is PRIORITY 99 — en-only, no translator obligation), and `es` / `pl` / `pt-BR` carry no `tips:` block at all. With `fallbackLng: en`, a non-English admin sees this English prose rather than a raw key. So this change creates no translator work and needs no locale sweep here. The voter-facing strings that land in PRIORITY 0 are **BV240o**'s problem.

**Dead keys the same copy pass should sweep** — `results.admin_results_toggle` (a third `!tip(public_results)` call site with no consumer), `disabled_msgs.ballot_updates_when_open`, `tips.is_public`, `election_settings.is_public`. If the PR removes them, re-walk the Settings page and confirm no switch lost its help text or started rendering a raw key — a deletion pass is exactly where that breaks.

**Not automatable.** There is no frontend test suite in CI; this is a manual/visual case, and the sheet's Automation column is `n` deliberately.

# Related

- **BV240m** — the same single tip under the "Make Results Public" label on a closed election. Run it in the same session as this one, against the same build; the two together are the whole test of "one tip, two labels".
- **BV240n** — one paragraph, and the poll-vs-election interpolation: everything this case deliberately refuses to assert.
- **BV240h** — whether the article URL actually resolves.
- **BV240a** — the voter-facing half of #1350, which this case does not touch and cannot substitute for.
- **[BV240 index](BV240-index.md)** — Tier 4 is this case plus BV240m and BV240n; l→m→n is the intended run order.
