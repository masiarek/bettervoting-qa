# BV240o - Non-English voter sees English fallback, not a raw key

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240a](BV240a-notice-appears-on-ballot.md) — the English baseline this compares against
- [BV240l](BV240l-rewritten-tip-text.md) — the admin-side copy, which has the *opposite* i18n obligation

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — feature not implemented** (and doubly blocked: the keys this case reads don't exist yet)

# Purpose

Confirms the new voter-facing notice degrades gracefully for a voter whose UI is not English. The failure this guards against is not "it's in English" — that is the *expected* outcome — it is the two ways an i18n miss shows up as garbage:

1. a **raw key** on the ballot (`preliminary_results_notice.description`), or
2. an **empty banner** — the notice frame renders, the text resolves to nothing, and the voter gets a mystery box above their ballot.

Both are worse than English prose, and both are plausible for a brand-new key block that lands in a band the translators haven't touched yet.

This case also exists to put a **product question** on the record rather than to answer it. See Notes.

# Prerequisites

1. **The feature must be implemented.** As of 2026-07-29 there is no notice and no `preliminary_results_notice` key block, so there is nothing to render in any locale. Run against the local `docker compose` stack during PR review, then re-run on production.
2. **The case is vacuous before that.** Required build: one that ships the new voter-facing keys in `en.yaml` **and** does *not* yet ship `es` / `pl` / `pt-BR` translations for them. That build — English-only keys, three non-English locales — is exactly the state this case tests. If the PR happens to land all four locales at once, this case degrades to "check the Spanish reads correctly" and the fallback path goes untested; say so in the results rather than passing it silently.
3. **Incognito window**, same reason as BV240a — admin-only banners must not be mistaken for the notice.
4. Admin login for setting up E1: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
5. **Know how the locale is being set before you start.** Two candidate routes, and *which one the app honours is unverified* — check the running build first:
   - an in-app language selector, if one is exposed on the voter route;
   - the browser's preferred-language setting, if i18next language detection is wired to it.

   Whichever route works, note it in the results — the next tester needs it, and a locale that silently never changed would make this case pass for the wrong reason. Do **not** report a pass without evidence the UI actually switched (some other string on the page must be visibly non-English).

# Master data

Election configuration **E1** — the same election as BV240a, no changes. Nothing here depends on method, race count, or ballot count.

| Field | Value |
|---|---|
| Method | STAR |
| Races | 1 |
| Candidates | 3 — the **"STAR Voting - Fruits"** template (Apple, Banana, Orange), <https://bettervoting.com/bbyqh7/admin> |
| Winners / seats | 1 |
| Who can vote | Unrestricted / open link |
| **Show Preliminary Results** | **ON** |
| Allow Voters To Edit Vote | OFF |
| State | Open (finalized, voting open) |
| Ballots cast | 1–3 |
| **UI language** | **es, then pl, then pt-BR** ← the variable under test |

Locales to cover: **es**, **pl**, **pt-BR** — the three non-English locale files in the repo. English is the control, and BV240a already captured it.

# Test steps

1. Confirm the notice renders correctly in **English** first. If it doesn't, stop — that's BV240a, not this case.
2. **Verify the flag against the server** (below), so a missing notice can't be blamed on the setting.
3. Switch the UI language to **Spanish**. Confirm the switch took effect on some *other* visible string.
4. Open the voter link in incognito. Screenshot the notice.
5. Read the notice character by character: is it English prose, a raw dotted key, or empty?
6. Click nothing. Repeat steps 3–5 for **Polish**, then for **pt-BR**.
7. If the submit-confirm dialog also carries a warning sentence (BV240i), open the dialog in one non-English locale and check that sentence too — same three outcomes. **Do not submit.**

Manual / visual case — **Automate: n**. Asserting "this is readable prose and not a key" is a human judgement; a selector-based assertion would only be able to check the key name is absent, which is the weaker half.

## The export check

One line, and it earns its place here for one narrow reason: it removes the "maybe the notice was correctly hidden" explanation for an empty result.

```
curl -s https://bettervoting.com/API/Election/ELECTION_ID | jq '.election.settings'
```

Assert `election.settings.public_results` is `true`. That's all this case needs from the export — `ballot_updates` and `voter_access` are BV240c/d's business.

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format; the `/API/Election/<id>` response is the raw backend object and is unchanged by that work.

Rationale: the toggle is a UI claim, the export is what the database holds, and the two disagreed for three months until `7cbc6079` (2026-07-27). Here it does one job — if the notice is missing in Spanish, this proves it should have been showing at all.

# Expected results

For **each** of es, pl, pt-BR:

1. **The notice renders.** Same position, same frame, same link affordance as the English baseline.
2. **The body text is readable prose.** English is acceptable and is the predicted outcome.
3. **No raw key anywhere** — nothing resembling `preliminary_results_notice.title` / `.description` on screen.
4. **The banner is not empty.** No frame with no text, no notice consisting only of the link.
5. **The link still works** and still points at the help article. (The article itself is English-only; that is not a defect of this case.)
6. Any submit-dialog sentence behaves the same way.

**Predicted, from reading source — not observed.** `fallbackLng` is `en`, so an untranslated key resolves to the English string rather than to the key name. That makes requirement 2 a pass in English and makes 3 and 4 unlikely. **This is an inference from the i18n configuration, not a screenshot** — which is precisely why the case is worth running: an empty-string translation, a partially-added key block, or a namespace mismatch all defeat the fallback, and none of them are visible from the config.

There is direct precedent for English text shipping in this exact block: `pl.yaml` already carries untranslated **English** for the existing preliminary-results title. So English-in-Polish is the status quo here, not a new regression.

# Pass / fail

- **Pass** — all six requirements met in all three locales, with the copy in English. English prose *is* a pass.
- **Fail** — a raw dotted key appears (requirement 3). Unambiguous defect, file it against the PR.
- **Fail** — an empty or text-less banner appears (requirement 4). Same severity; a blank warning box above the ballot is worse than no box.
- **Fail (different problem)** — the notice is absent entirely while the export shows `public_results: true`. That's a visibility-gate bug, i.e. BV240a's territory, and it means the locale switch is a red herring. Record it there.
- **Not a fail, and don't record it as one** — the text being English. That's requirement 2 working as designed. Record it as the **observation** it is, and see Notes.
- **Inconclusive** — you could not confirm the UI language actually changed. Redo it; a pass on an unswitched locale is worth nothing.

# Actual results

*[screenshot — ballot page in **Spanish**, full page, showing both the notice and at least one other visibly Spanish string that proves the locale switched]*

*[screenshot — the notice close-up, **Spanish**]*

*[screenshot — the notice close-up, **Polish**]*

*[screenshot — the notice close-up, **pt-BR**]*

*[screenshot — submit-confirm dialog in one non-English locale, if BV240i's sentence shipped]*

*[export excerpt — `election.settings` showing `public_results: true`]*

*[note — which mechanism actually switched the locale (in-app selector / browser preference), for the next tester]*

# Notes

**Correction (2026-07-30): this creates no translator obligation after all.** I had recorded that the new voter-facing keys land in PRIORITY 0. They do not — `draft_warning` and `archived_warning`, the existing ballot-page banners, both sit in **PRIORITY 99: Everything Else**, and `preliminary_results_notice` was placed beside them for consistency. So the English-fallback question is lower stakes than this page originally claimed. Whether a privacy disclaimer *should* be promoted to a higher band is a fair question for the issue thread, but it is not the status quo for its siblings.

**The nuance this case exists to record: these keys are not like BV240l's.** The admin tip in BV240l / BV240n lives under `tips:`, which is **PRIORITY 4**, and `es` / `pl` / `pt-BR` carry no `tips:` block at all — so that copy edit is en-only by construction and creates **zero** translator obligation. The new voter-facing notice keys are the opposite: they land in **PRIORITY 0**, the core voting path, which *is* the translators' declared scope. So #1350 ships real translator work for the first time in this thread, and it should go into the PR description explicitly rather than being discovered by a translator later. `election_settings:` is PRIORITY 99, en-only, and is not affected either.

**The judgement call, stated and deliberately not resolved here.** English-first is precedented (`pl.yaml`, above), it is technically a pass, and blocking a privacy improvement on three translations would be a bad trade. *And* a privacy disclaimer displayed in English to a Spanish-speaking voter is a materially worse outcome than ordinary untranslated UI chrome: the whole point of the notice is informed consent before casting, and a voter who can't read it hasn't been informed. Chrome they can't read costs them a menu label; this costs them the disclosure. Whether that difference should hold the PR is a **product call, not a test outcome** — this case cannot and should not decide it. **Flag it on the issue thread** alongside the PRIORITY 0 note above and let messaging decide. Record the observed behaviour either way.

**A separate, smaller pre-existing gap found 2026-07-29** — worth its own issue, not this one, and not #1350's scope. With the flag OFF, the results page shows a deliberate placeholder: *"The election admins have not released the results yet. Feel free to swing back later"*. That string is **hardcoded English, not routed through i18n at all** — so it can't even fall back correctly; there is no key to translate. It is a different class of gap from the one this case tests (fallback working vs. no fallback path existing), and folding it into #1350 would muddy a copy-and-linking PR. File it separately.

**One rendering trap that is not locale-specific but shows up here.** If the new copy uses `**double asterisks**` for emphasis, the markdown renderer turns them into *italic*, not bold — in every locale equally. If you see unexpected italics while screenshotting, that's this, not a translation artefact.

**Don't chase the help article's language.** `docs/help/preliminary_results.md` is English-only and the docs site is not localized. Out of scope; the link resolving is BV240h.

# Related

- **BV240a** — the English baseline. Run this immediately after it, same build, same election.
- **BV240l** / **BV240n** — the admin tip: PRIORITY 4, en-only, no translator obligation. The contrast is the point.
- **BV240i** — the submit-dialog sentence, if it ships; step 7 covers it in one locale only.
- **BV240h** — the article URL. English-only docs site, deliberately out of scope here.
- **BV240b** — where the hardcoded flag-OFF placeholder was observed.
