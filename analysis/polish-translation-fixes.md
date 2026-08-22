# Polish translation — the fix queue

**Status: open queue, nothing submitted.** The [PR freeze](../docs_proposals/PARKED_ready_for_bv.md) applies; this page is the list to work from when it lifts.

The Polish locale went in as [#1565](https://github.com/Equal-Vote/bettervoting/pull/1565) ("complete the Polish Priority 0 translation", merged as `bee44de9`, 2026-08-20). It is complete and token-faithful. It also reads, in several places, like a database form rather than like Polish — and in a few places it is outright ungrammatical the moment an admin picks the **poll** vocabulary instead of the **election** one.

This page separates those two problems, because they have different fixes and only one of them is waiting on a maintainer.

## The trigger

Live, public, reproducible: <https://bettervoting.com/vx89hj/results?lng=pl>

```
Wybory — nazwa:
BV2285 — Three candidates, three possible winners — a STAR tie no rung can break
```

*"Wybory — nazwa:"* is not a sentence. It is a field label with the noun stranded in front of it in the nominative. Natural Polish is **"Nazwa wyborów:"** — genitive — and the whole reason it wasn't written that way is the next section.

The same screen also shows **"UDOSTĘPNIJ: WYBORY"** (share button) and **"Szczegóły rywalizacji"**. Both are discussed below.

## Why the stiffness is there

`useSubstitutedTranslation` ([`util.tsx:176`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/util.tsx)) spreads the whole `keyword.<election|poll>` block into i18next's interpolation values, and then gives every string value of 3+ characters a capitalised twin:

```js
values[`capital_${key}`] = capitalize(value)
```

So `{{election}}` is *wybory* or *ankieta*, `{{candidate}}` is *kandydat* or *opcja*, `{{race}}` is *rywalizacja* or *pytanie* — **one form each, always nominative**. A Polish sentence that puts the noun anywhere but the subject slot needs a case the block cannot supply, and a sentence whose verb or participle agrees with the noun cannot agree with both vocabularies at once (*wybory* is plural, *ankieta* is feminine singular).

The translation's own header comment records the workaround:

```yaml
  # Election vs Poll Terms
  # NOTE: these are interpolated in the NOMINATIVE case; the surrounding strings
  # are phrased so the nominative reads correctly.
```

"Phrased so the nominative reads correctly" is what produced `— nazwa:`, `— zakończenie:`, `Udostępnij:` and `Ładowanie:`. Every one of them is a dodge around a missing case form.

## What is already on record upstream — do not re-file

[**#1574**](https://github.com/Equal-Vote/bettervoting/issues/1574) — *"Interpolated nouns can't be grammatical in gendered languages"* — already documents the mechanism, names Polish as the worst-hit language, and offers three directions (per-vocabulary `_election`/`_poll` string variants · i18next `context` · accept the stiffness and document it). It is **OPEN and awaiting maintainer direction**, and it is [PARKED §4](../docs_proposals/PARKED_ready_for_bv.md).

This page is not a second report of that. It is the observation that **most of what makes Polish read badly does not actually need that decision** — see the tiers below. Only the last tier is blocked.

## The mechanism nobody used yet

Because the vocabulary block is spread wholesale, **any key added under `keyword.election:` / `keyword.poll:` becomes an interpolation variable, with a `capital_` twin, with no frontend change at all** — and because each locale file supplies its own `keyword` block, keys added to `pl.yaml` exist only for Polish. No other locale, and no English string, sees them.

That makes a fourth option available that #1574 does not list: give Polish its own **agreement kit** in its own file.

```yaml
  election:
    election: wybory            # nominative — unchanged, still what {{election}} means
    election_gen: wyborów       # → "Nazwa wyborów:"
    election_acc: wybory        # → "Udostępnij wybory"
    election_starts: zaczynają się
    election_ends: kończą się
    candidate_only: jedyny      # the agreeing adjective, not a noun

  poll:
    election: ankieta
    election_gen: ankiety       # → "Nazwa ankiety:"
    election_acc: ankietę       # → "Udostępnij ankietę"
    election_starts: zaczyna się
    election_ends: kończy się
    candidate_only: jedyna
```

Name every added key after the noun it belongs to (`election_gen`, `candidate_only`), never as a bare word: the block is merged *under* the call-site values, so a generic name like `only` or `starts` could one day be shadowed by a `v` passed from a component.

## Tier 1 — pl.yaml only, no upstream decision needed

Six strings whose only problem is the dodge. Fixing them is a Polish-file diff; nothing else in the app changes.

| Key | Ships today | Renders (election / poll) | Proposed | Renders |
|---|---|---|---|---|
| `results.election_title` | `{{capital_election}} — nazwa:` | **Wybory — nazwa:** / Ankieta — nazwa: | `Nazwa {{election_gen}}:` | Nazwa wyborów: / Nazwa ankiety: |
| `ballot_submitted.end_time` | `{{capital_election}} — zakończenie: {{date}} o {{time}}` | Wybory — zakończenie: … | `Koniec {{election_gen}}: {{date}} o {{time}}` | Koniec wyborów: … / Koniec ankiety: … |
| `results.admin_results_toggle` | `{{capital_election}} - wyniki są publiczne` | Wybory - wyniki są publiczne | `Wyniki {{election_gen}} są publiczne` | Wyniki wyborów są publiczne / Wyniki ankiety są publiczne |
| `results.loading_election` | `Ładowanie: {{capital_election}}...` | Ładowanie: Wybory... | `Ładowanie {{election_gen}}…` | Ładowanie wyborów… / Ładowanie ankiety… |
| `share.button` | `Udostępnij: {{capital_election}}` | **UDOSTĘPNIJ: WYBORY** | `Udostępnij {{election_acc}}` | Udostępnij wybory / Udostępnij ankietę |
| `share.button_results` | `Udostępnij wyniki: {{capital_election}}` | Udostępnij wyniki: Wybory | `Udostępnij wyniki {{election_gen}}` | Udostępnij wyniki wyborów / … ankiety |

Two of these carry a second, unrelated defect worth folding into the same diff: `admin_results_toggle` uses an ASCII hyphen where every sibling string uses an em dash, and `loading_election` uses `...` where `election_history.loading` uses `…`.

A **zero-key variant** exists for `election_title` if the agreement kit is judged too much: `{{capital_election}}:` alone renders *"Wybory:"* / *"Ankieta:"*, both grammatical, both ordinary. It is worse than *"Nazwa wyborów:"* and better than what ships.

`support_blurb` belongs here too, and is the clearest illustration of the cost of the dodge:

```yaml
# today  — the noun is parenthesised because it cannot decline
support_blurb: 'Aby uzyskać pomoc dotyczącą tego głosowania ({{election}}), napisz na adres …'
# proposed
support_blurb: 'Aby uzyskać pomoc dotyczącą {{election_gen}}, napisz na adres …'
```

## Tier 2 — actually ungrammatical under the poll vocabulary

These are not stiffness. Under `term_type: poll` they are wrong Polish, and two of them need no new keys at all — only a rephrasing that avoids the agreeing word.

| Key(s) | Ships today | election | poll | Fix |
|---|---|---|---|---|
| `ballot.methods.{rcv,stv,ranked_robin}.instruction_bullets[2]` | `{{capital_candidates}} pozostawieni bez pozycji trafiają na koniec` | Kandydaci pozostawieni ✓ | **Opcje pozostawieni** ✗ (needs *pozostawione*) | rephrase: `{{capital_candidates}} bez przyznanej pozycji trafiają na koniec` — no participle, agrees with both. **No new keys.** |
| `results.single_candidate_result` | `{{name}} to jedyny {{candidate}}, więc wygrywa automatycznie` | jedyny kandydat ✓ | **jedyny opcja** ✗ (needs *jedyna opcja*) | `{{name}} to {{candidate_only}} {{candidate}}, …` — agreement kit |
| `election_home.start_time` / `end_time` / `ended_time` | `{{capital_election}} zaczynają się {{datetime}}` | Wybory zaczynają się ✓ | **Ankieta zaczynają się** ✗ (needs *zaczyna się*) | `{{capital_election}} {{election_starts}} {{datetime, datetime}}` — agreement kit |

## Tier 3 — genuinely blocked on #1574

| Key | Why the kit isn't enough |
|---|---|
| `ballot.this_election_uses` | `Te {{election}} wykorzystują …` → *"Te ankieta wykorzystują"* — demonstrative **and** verb both disagree, and the sentence continues for two more clauses. Patching it word-by-word from the vocabulary block would leave a sentence assembled from four variables. This is the string #1574 exists for; it wants a whole-sentence `_election` / `_poll` variant. |
| `ballot.this_election_uses_draggable` | same sentence, longer |

Leave both on #1574. They are already quoted in that issue.

## Not a Polish problem — flagged so nobody "fixes" it here

`results.details` (*Szczegóły rywalizacji*, visible on the screen above) and `results.not_enough_candidates` hardcode the **race** and **candidate** vocabularies. So does English: `en.yaml` says `Race Details` and *"This race currently only has one candidate"* with no interpolation at all. Polish is faithfully mirroring an English-side gap — the same one Germany's [#1560](https://github.com/Equal-Vote/bettervoting/pull/1560) hit from the other direction. If it is worth fixing it is worth fixing in `en.yaml` first, for every locale at once.

## Housekeeping found on the way

- **`results.single_vote` is a dead key in three locales.** It exists in `es.yaml`, `pl.yaml` and `pt-BR.yaml` and **nowhere else in the repo** — not in `en.yaml`, not in any component (`git grep -l single_vote` on `main` returns exactly those three files). Three translators translated a string the app never asks for; it presumably survived in a copy of an older `en.yaml`. Proposal: delete from all three. This is the kind of thing the [#1575](https://github.com/Equal-Vote/bettervoting/issues/1575) locale check should also catch — a key present in a locale but absent from English is as reportable as an untranslated value.
- **`keyword.yes` / `keyword.no` are still `Yes` / `No` in `pl.yaml`** (lines 394–395) — but they are also **unused**: nothing in the frontend reads `{{yes}}`, `{{no}}` or `keyword.yes`. English has the same pair. The fix is deletion upstream, not translation; do not "translate" them into `Tak` / `Nie` and leave dead keys behind.
- **Coverage: 258 of 860 leaf keys** (~30%), which is the Priority 0 voter-facing scope by design — everything else falls back to English, as [BV240o](../test_cases/BV240o-non-english-fallback.md) expects. Stated so the number isn't rediscovered as a defect.
- **A footnote for whoever writes the #1575 checker:** PyYAML resolves `yes` / `no` / `on` / `off` as booleans (YAML 1.1), so a Python checker silently drops those keys and compares `True` to `True`. The app's loader (`@rsbuild/plugin-yaml` → js-yaml 4, YAML 1.2 core) does not. Load with a 1.2-compatible loader or the check has a blind spot exactly where an untranslated value sits.

## What has and has not been observed

**Observed in production**, on the screen linked at the top: `election_title`, `share.button`, `results.details`, `preliminary_title`, `tie_title`, `random_tiebreak_subtitle`, `vote_count`, `method_context`, `learn_link_text`, and the STAR round titles and descriptions.

**Read from source, not observed:** every **poll-vocabulary** rendering in the tables above. That election uses the election vocabulary, so *"Ankieta zaczynają się"* and *"jedyny opcja"* are derived by substitution, not screenshotted. Per the repo's own rule, they are predictions until a poll-term election is opened in Polish and photographed — that is the first step when this queue is picked up, and it is cheap: one poll-vocabulary election, `?lng=pl`, one pass over the ballot and results screens.

## Related

- [#1574](https://github.com/Equal-Vote/bettervoting/issues/1574) — the gendered-noun issue this page sits under · [PARKED §4](../docs_proposals/PARKED_ready_for_bv.md)
- [#1575](https://github.com/Equal-Vote/bettervoting/issues/1575) — the locale CI check · [PARKED §5](../docs_proposals/PARKED_ready_for_bv.md)
- [#1556](https://github.com/Equal-Vote/bettervoting/issues/1556) — the docs/i18n program index
- [#1565](https://github.com/Equal-Vote/bettervoting/pull/1565) — the Polish completion PR that shipped the current wording
- [BV240o](../test_cases/BV240o-non-english-fallback.md) — the non-English fallback case
