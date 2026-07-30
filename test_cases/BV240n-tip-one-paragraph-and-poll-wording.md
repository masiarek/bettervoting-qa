BV240n - Tip is one paragraph; poll vs election wording

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240l](BV240l-rewritten-tip-text.md) — the same tip's *meaning*; this case is its *rendering*
- [BV240m](BV240m-tip-under-other-label.md) — the same tip under the "Make Results Public" label

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented** (same one-file `en.yaml` edit as BV240l — no sign-off blocker)

# Purpose

Two checks on the same YAML scalar. BV240l asks whether `tips.public_results.description` **says** the right thing; this case asks whether it **renders** right:

- **(a) One paragraph.** The value is a YAML pipe (`|`) block today, and `applyLineBreaks` (`components/util.tsx:258-262`) turns its newlines into `<br/>`s — so the tooltip shows **three separate lines**. Confirmed visually on production **2026-07-29**. The Should-be text is one paragraph, so the block style has to change from pipe to fold (`>`). Paste the new sentences under the existing `|` and the tooltip renders as three lines again — and looks essentially unchanged from the As-Is.
- **(b) Poll vs election.** The issue quotes the **rendered** string with "election" baked in. Pasting it literally hard-codes the word and regresses poll terminology across the product. The interpolation has to survive, and the proposal adds one more (`{{ballot}}`).

Both failures come from the same careless paste, which is why they are one case: a tester who checks meaning only (BV240l) passes a change that renders as three lines and calls every poll an election.

**This is the one Tier 4 case with a meaningful pre-change run.** The As-Is text already carries `{{election}}` / `{{elections}}`, so the poll half is testable **today** and gives a real baseline: if a Poll says "poll" before the change and "election" after, the rewrite broke it. Run this case twice — once against the current build, once against the merged copy — and keep both screenshot sets.

**One finding already visible in the As-Is text on disk** (`packages/frontend/src/i18n/en.yaml`, key `tips.public_results`): it interpolates the election noun three times but hard-codes **"their ballot"**. *Prediction from reading the file, not yet observed:* today a Poll's tooltip reads "…after completing their **ballot**" where it should say "response" (`keyword.poll.ballot: response`). The proposed `{{ballot}}` fixes a small pre-existing regression, and step 4 is where you confirm it exists.

# Prerequisites

1. **For the post-change run, the copy edit must be merged.** As of 2026-07-29 production still shows the As-Is text. Run against a local `docker compose` stack during PR review, then re-run on production after deploy. **The pre-change run needs nothing** — do it now.
2. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
3. **One browser context.** Nothing here is voter-facing — no incognito, no second profile.
4. **A pointer device**, and the ability to **resize the window or change zoom**. Requirement 1 cannot be decided from a single fixed-width screenshot (see step 6).
5. **Optional but decisive:** browser DevTools, for the `<br>` count in step 7.

# Master data

Election configuration **E1**, admin side — plus a **Poll twin of E1**. Not a seventh row in the BV240 matrix: same settings, one radio different.

| | E1 (Election) | E1-poll (Poll) |
|---|---|---|
| Method | STAR | STAR |
| Races / candidates | 1 / 3 | 1 / 3 |
| Who can vote | Unrestricted / open link | Unrestricted / open link |
| **Show Preliminary Results** | ON | ON |
| **Term** | **Election** | **Poll** |
| State | Draft or open | **Draft** |
| Ballots cast | 0 | 0 |

The switch's *value* does not change the help text, and neither does the method — the tip is static copy. Two things do matter:

- **State.** Keep both in draft/open so the label reads "Show Preliminary Results" in both screenshots. Once closed it becomes "Make Results Public", which is **BV240m**.
- **The pair must differ in exactly one field.** Two unrelated elections give you two screenshots; a matched pair gives you evidence. Cheapest route: start from the **"STAR Voting - Fruits"** template (Apple, Banana, Orange) — <https://bettervoting.com/bbyqh7/admin> — **duplicate** it, and flip the term radio on the copy while it is still draft. Duplicating resets only title / URL / owner / state, so every setting carries over.

**Flip the radio while the election is in draft.** *Prediction from reading source, not observed:* the Poll/Election radio pair sits inside the settings `FormControl disabled={election.state !== 'draft'}` and passes no explicit `disabled` of its own, so unlike the public-results switch beside it (which does, and stays live in all five states) the radio should go dead once the election leaves draft. If you finalize first you may find the term unchangeable.

**No export check in this case.** The tooltip is rendered from a static i18n file — no election row, no setting value, no server state feeds it. The export check belongs in BV240a/b/e/p, where the settings state is load-bearing. One exception, and only on failure: if the Poll's tooltip says "election", confirm `settings.term_type` actually persisted as `poll` before filing a copy bug — a radio that silently reverted looks identical to a hard-coded word.

# Test steps

Run steps 1-8 **twice**: once on the current build (baseline), once after the copy change.

1. Sign in as admin. Open **E1** → **Settings** (`/{election_id}/admin/settings`).
2. Confirm the term radio shows **Election** selected, and screenshot that row. *(See Notes — a fresh election can have no radio selected and still render election wording. Select Election explicitly so the screenshot proves which half of the pair you captured.)*
3. **Click** the ⓘ next to **Show Preliminary Results** — don't just hover. *Prediction from source:* the tooltip is open while `clicked || hovered`, with a click-away listener, so clicking the icon **pins it open** and you can move the pointer away, resize, or open DevTools without losing it.
4. Screenshot the open tooltip, full text edge to edge. Read it against requirements 1-4.
5. Open **E1-poll** → Settings. Confirm **Poll** is selected. Click the same ⓘ. Screenshot. Read it against requirements 5-7.
6. **The step that actually decides (a).** With the tooltip pinned on either election, change the window width materially (or set zoom to 125%) and screenshot again. **Soft wrap moves with width; `<br/>`s do not.** A break that stays pinned to the same sentence boundary at two different widths is a `<br/>`.
7. **Optional confirming check.** With the tooltip open, in the DevTools console: count `<br>` elements inside the tooltip body. See the derived counts in Notes.
8. Put the Election and Poll screenshots **side by side** and diff them by eye. The only differences should be the term words.

**Do not diff either tooltip against the issue's literal Should-be text.** That is BV240l's warning and it applies double here: the interpolated words and the `{{ballot}}` insertion are the design, not defects.

# Expected results

Copy is not approved, so assert on these seven, not on characters.

## (a) Rendering

1. **The description is one continuous paragraph.** Sentence boundaries do not force line breaks — at least one sentence must begin mid-line, immediately after the previous sentence's period.
2. **Break positions move with the viewport.** Re-measured at a second width or zoom level, the line breaks land in different places.
3. **No blank line between sentences**, and no more than one break separating the description from the **Learn More** link.
4. **The title still sits on its own line.** The `<strong>` title followed by one structural `<br/>` is existing behaviour, not a defect — do not count it against requirement 1.

## (b) Terminology

5. **On the Election:** "election" / "elections", and the ballot noun reads "ballot".
6. **On the Poll:** every place the Election said election/elections says **"poll" / "polls"**, and — if `{{ballot}}` was used — the ballot noun becomes the poll term. `keyword.poll` in `en.yaml` maps `ballot: response`, so the expected word is **"response"**, not "ballot".
7. **No raw `{{...}}` visible** in either tooltip, and no term word left hard-coded — the two rendered sentences differ **only** in the term words.

Rendered targets for the pair (**reference only, not yet approved** — the proposed YAML is in BV240l):

> **Election:** Controls whether voters can see election results. When enabled during an open election, voters will see preliminary results after submitting their ballot. High-profile elections typically keep results hidden until the election closes.

> **Poll:** Controls whether voters can see poll results. When enabled during an open poll, voters will see preliminary results after submitting their response. High-profile polls typically keep results hidden until the poll closes.

## Baseline (pre-change run)

Expected on the current build, so you can tell a real regression from a pre-existing one:

| | Current build | After the change |
|---|---|---|
| Election tooltip | three lines | one paragraph |
| Poll tooltip | three lines | one paragraph |
| Election noun on a Poll | "poll" / "polls" — *predicted, confirm it* | "poll" / "polls" |
| Ballot noun on a Poll | "ballot" — wrong, pre-existing | "response" |
| Learn More link | absent | present (BV240l's requirement 3) |

# Pass / fail

- **Pass** — requirements 1-7 met on both members of the pair.
- **Fail (a)** — the description still breaks at sentence boundaries, and those breaks survive a width change. Cause is almost certainly the block style: the new sentences went in under `|`. Cheapest tell for the reviewer: whether the YAML value contains a newline at all.
- **Fail (a), subtler** — one paragraph, but a **blank line** or a **stray extra indent** inside the block. `>` folds single newlines to spaces but preserves a blank line, and preserves the newline before a more-indented line. Changing `|` to `>` is necessary and **not sufficient**.
- **Fail (b)** — the Poll tooltip says "election" or "elections". Confirm `term_type` persisted (see Master data) before filing; if it did, the interpolation was pasted away, and the same paste almost certainly hit other keys in the copy pass. Re-walk the Settings page on the Poll and check the *other* tips too.
- **Fail (b), partial** — "poll"/"polls" correct but "ballot" still literal. That is the As-Is behaviour surviving the rewrite: the `{{ballot}}` deviation was dropped. **Low severity, and it is a proposed deviation from the issue text, not a requirement of it** — record it as a copy nit against the PR, not a case failure, unless the PR claimed to include it.
- **Not a failure of this case** — record and move on:
  - Tooltip header "Public Results" vs switch label "Show Preliminary Results" → **BV240m**.
  - Any wording objection to the sentences themselves → **BV240l**.
  - A 404 at the Learn More target → **BV240h**.
  - Italics where bold was intended → see Notes; it is a copy nit for the PR.

# Actual results

*[screenshot — pre-change, Election tooltip on production 2026-07-29, showing three distinct lines with each sentence starting a new line. Already captured; attach as the "before" half]*

*[screenshot — pre-change, the same tooltip on the Poll twin: does it say "poll"/"polls", and does it still say "ballot"? This is the baseline that makes a post-change regression attributable]*

*[screenshot — post-change, E1 Settings: the term radio row with **Election** selected and the "Show Preliminary Results" switch visible, so the next screenshot is provably from the Election half]*

*[screenshot — post-change, Election tooltip pinned open, full text readable end to end, including the Learn More link]*

*[screenshot — post-change, E1-poll Settings: term radio with **Poll** selected]*

*[screenshot — post-change, Poll tooltip pinned open, full text readable end to end]*

*[screenshot — post-change, the Election tooltip re-captured at a materially different window width or 125% zoom. This is the requirement-2 evidence: the line breaks must land in different places than the previous shot]*

*[screenshot, optional — DevTools showing the tooltip's inner markup, or the console `<br>` count]*

# Notes

**Why both checks live in one case.** They are two properties of one YAML scalar, they are broken by the same paste, and they share a setup. Splitting them would double the election pair and hide the correlation.

**A fresh election may have *no* term radio selected.** The creation wizard initialises `term_type` as undefined, and the substitution helper defaults to `'election'` when it is — so an election with neither radio checked still renders election wording. *Prediction from source.* Practical consequence: an "Election" screenshot with nothing selected proves the default, not the Election branch. Select Election explicitly (step 2).

**Where the tooltip's term actually comes from** — worth knowing, because "a tooltip can't be term-aware" is a plausible-sounding wrong answer. `Tip` (`components/styles.tsx`) resolves its translator as race context → election context → a fallback that hard-codes `'election'`. On the Settings page the election context wins, and that context builds its substitutions from `election.settings.term_type`. The creation wizard is inside the same provider (with a local, unsaved election), so it is term-aware too. The hard-coded fallback only bites a `Tip` rendered outside any election — none of which is on this page.

**Derived `<br>` counts** *(from reading `util.tsx`, not observed — treat as a diagnostic, not an assertion)*. `Tip` always emits one structural `<br/>` between title and description, so inside the tooltip expect:

- **4** — description still a `|` block (three sentence breaks plus a trailing one). This is today's build.
- **2** — description is a `>` fold. YAML's default chomping keeps one trailing newline, so one `<br/>` lands after the paragraph — which puts **Learn More** on its own line. Fine, arguably preferable.
- **1** — description is a `>-` fold (trailing newline stripped); the whole string short-circuits the line-break pass. Learn More then abuts the final sentence.

**1 or 2 both pass. 4 means the block style never changed.** `>` versus `>-` is the implementer's cosmetic choice about the Learn More line; either satisfies requirement 1.

**Avoid `**bold**` in the new copy.** `components/util.tsx:244` renders double-asterisk markup as `<i>` — italic, not bold. If the merged tooltip shows italics, that is the cause, and it is a copy nit for the PR rather than a failure here.

**i18n scope: en-only by construction.** `tips:` is PRIORITY 4 in `en.yaml` (`election_settings:` is PRIORITY 99), and `es` / `pl` / `pt-BR` carry no `tips:` block at all — with `fallbackLng: en` a non-English admin already sees this English prose. So neither half of this case creates translator work, and there is no locale sweep to do. Contrast **BV240o**: the voter-facing notice keys land in PRIORITY 0, which is real translator obligation.

**Manual / visual — the sheet's Automation column is `n` deliberately.** There is no frontend test suite in CI (backend jest plus the Playwright E2E job, both on `main` only), and requirement 2 needs a width change plus a human eye. If the PR wants a durable guard, the cheap one is not a UI test but a **static assertion on the YAML**: `tips.public_results.description` contains no `\n`, and contains `{{election}}`. That would catch both failures at the source, in one line, without a browser. Suggestion for the PR, not a step in this case.

# Related

- **BV240l** — the same tip's meaning and its Learn More link. Everything that case deliberately refuses to assert lands here. Run l → m → n in one session against one build.
- **BV240m** — the same single tip under the "Make Results Public" label on a closed election. Note the interaction: m needs a **closed** election and n needs a **draft** one (for the radio), so they cannot share a single election — plan four, not two.
- **BV240o** — the i18n case that does carry a translator obligation.
- **BV240h** — whether the Learn More target resolves.
- **BV240-index** — Tier 4 is l, m, n; this case and m are two of the five the index flags as most likely to fail.
