# #904 — "Bloc STAR Voting" for Basic Multi-Winner: how hard, how risky

**Issue:** [Equal-Vote/bettervoting#904](https://github.com/Equal-Vote/bettervoting/issues/904) — filed 2025-04-11. Twin for Plurality: [#912](https://github.com/Equal-Vote/star-server/issues/912).

Assessment written 2026-08-04, read from source at upstream `15289d3` (2026-08-03).

> **Two corrections since first publication, same day.** Both are recorded rather than silently edited, because this page was already linked from the issue thread when they were found.
>
> 1. **The string is "Bloc STAR Voting", not "STAR Bloc Voting"** — adjective first, per five sources including the BPML doc the issue itself links. Retracted upstream in [this comment](https://github.com/Equal-Vote/bettervoting/issues/904#issuecomment-5178824529); sources in [`voting-notes/bloc-star-bpml-fixtures.md`](https://github.com/masiarek/set/blob/master/voting-notes/bloc-star-bpml-fixtures.md) in the `set` repo. Everything about the *difficulty* below is unchanged — only the string.
> 2. **One of the three render sites is already fixed** in draft PR [#1475](https://github.com/Equal-Vote/bettervoting/pull/1475). See [What's already in flight](#whats-already-in-flight). The original version of this page did not account for it and overstated the remaining work.
>
> **The filename still says `star-bloc`** and is deliberately not being corrected — the issue thread links this page by URL, and renaming would 404 a link on a public thread to fix a cosmetic mismatch. Same reasoning as the `xw23m9` description link in the `set` notes.

## Answer

**Low difficulty, low risk — if it is scoped to display text.** Under half a day for what's left. No tabulation, no database, no API change.

The whole risk of this ticket sits in one scoping question, not in the code. See [The one question to settle first](#the-one-question-to-settle-first).

## What the change actually is

Today the displayed method name is a function of `voting_method` alone. It has to become a function of `(voting_method, num_winners)` — STAR with more than one winner displays as **Bloc STAR Voting**.

Nothing else about the race changes. Basic Multi-Winner already *is* Bloc STAR behind the scenes (`runBlocTabulator`, `packages/backend/src/Tabulators/Star.ts:17`), so this is a naming correction, not a behaviour correction. The issue is right about that.

## What's already in flight

**[#1475](https://github.com/Equal-Vote/bettervoting/pull/1475)** (draft, branch `fix/results-bloc-star-name-and-link`) already does the **results-page** site, filed against [#1086](https://github.com/Equal-Vote/bettervoting/issues/1086) rather than #904:

```js
// Results.tsx:456
const isBlocStar = votingMethodBase === 'STAR' && race.num_winners > 1;
const methodKey = isBlocStar ? 'star_bloc' : methodValueToTextKey[votingMethodBase];
```

plus the i18n key it resolves to:

```yaml
# en.yaml, after methods.star
star_bloc:
  full_name: Bloc STAR Voting
  short_name: Bloc STAR
  learn_link: https://docs.bettervoting.com/help/bloc_star.html
```

Eight added lines across two files. **It is a draft on purpose and must not merge before [#1474](https://github.com/Equal-Vote/bettervoting/pull/1474)** — its `learn_link` points at the help page #1474 adds, so merging first ships a 404.

So **#904's remaining scope is the other two sites**, and the pattern to copy already exists on a branch.

> **Key-name mismatch worth settling before either lands.** The branch uses the i18n key **`star_bloc`** (with value "Bloc STAR Voting"); the retraction comment on #904 proposed the key **`bloc_star`**. Purely internal — no user sees it — but they should agree, and the branch is the one that exists. Recommend `star_bloc`, since it sorts next to `star` and `star_pr` in `en.yaml`.

## Why it's cheap

**One chokepoint.** Every method name in the product resolves through the same two steps:

```
methodValueToTextKey[race.voting_method]   →   t(`methods.<key>.full_name`)
```

`methodValueToTextKey` is declared once, at `packages/shared/src/domain_model/Race.ts:10`.

**Three render sites**, and the winner count is already in scope at every one of them — no prop-drilling, no context changes:

| Site | What it renders | Winner count already available | Status |
|---|---|---|---|
| `Results.tsx:458` | results page header | `race`, `:456` | **done in #1475** |
| `GenericBallotView.tsx:41` | ballot page header | `ballotContext.race.num_winners`, `:49` | open |
| `VotingMethodSelector.tsx:217` | edit-race summary button | `editedRace.num_winners`, `methodFamily` | open |
| `VotingMethodSelector.tsx:67` | method radio label | `methodFamily` state | open |

(`DraggableIRVBallotView.tsx:125` also reads a `full_name`, but hardcoded to `rcv` — not in scope here.)

**The Bloc adjective already exists and is already wired.** `en.yaml:1201` defines `bloc_multi_winner_adj: Bloc`, and `VotingMethodSelector.tsx:219` consumes it as ``t(`edit_race.${methodFamily}_adj`)``. The edit-race summary today reads:

> STAR Voting with 3 **Bloc** winners

The adjective is attached to the *winners* rather than to the *method*. Part of the fix is moving a word that's already there.

> Correction to a first pass of this analysis: a plain `grep` for `bloc_multi_winner_adj` finds only the YAML definition and reports the key as dead. It isn't — the call site builds the key by template literal. Worth remembering when auditing i18n usage in this repo generally.

## The trap

**Do not change the value of `methods.star.full_name`.** That is the obvious one-line fix and it is wrong. The key is shared with three places where "STAR Voting" is correct and must not change:

| `en.yaml` | Section | Should it vary? |
|---|---|---|
| `:443`, `:478` | `landing_page:` | **No** — marketing copy |
| `:833` | `tips:` | **No** — the STAR explainer tooltip |
| `:1206` | `edit_race:` | **Yes** — the method radio label |

So the shape of the fix is *a new sibling key plus a resolver* — which is exactly what #1475 does. Follow it.

## Do not touch `voting_method`

The string `'STAR'` is a persisted database value and a dispatch key, not a label. It is read as an identifier in at least:

- `Race.ts:7` `validVotingMethods`, and `:45` `raceValidation` — rejects anything not in the list
- `Star.ts:19` — tabulator result payload
- `BallotPageSelector.tsx:16` — which ballot component to render
- `getElectionsController.ts:125` — global stats aggregation

That last one carries its own warning from a previous incident: there are legacy rows with a `voting_method` of `"STAR VOting"`, and the aggregator silently skips them rather than throwing. Bad enum values in this column do not fail loudly.

## The one question to settle first

The issue body says **"simple wording change (change label) — no other changes required"**, which is the display-only reading and matches everything above.

But it also says *"verify that JSON file shows the name correctly"*, and a later comment on the issue is just:

```
"voting_method": "STAR"
```

If that means the API's `voting_method` field should come back as `Bloc STAR`, this is a different ticket entirely: a new enum member, a migration over every historic race, dispatch updates in tabulators and ballot routing, and a back-compat path for elections already tabulated. Weeks, not hours, and it rewrites stored data for elections that have already been published.

**Recommendation: display-only.** The stored value stays `STAR`; `num_winners` already distinguishes the two cases and is already stored alongside it, so nothing is lost. #1475 takes exactly this approach, and its inline comment states it plainly: *"Bloc STAR is stored as plain STAR with more than one seat."* The JSON expectation in the issue should be restated as an expectation about rendered labels — otherwise a reviewer reading the ticket literally will price it as the large change and it will keep sitting.

## Known breakage

One E2E selector, in the multi-winner flow:

- `testing/tests/create-election.spec.ts:92` — picks `Basic Multi-Winner`, then `getByRole('radio', { name: 'STAR Voting' })`. Once the radio reads "Bloc STAR Voting" the substring no longer matches. One-line update.

Note this belongs to the **radio-label** site, which #1475 does *not* touch — so #1475 alone doesn't break the suite, but finishing #904 will.

Unaffected, both single-winner: `create-election.spec.ts:20`, `full-runthrough.spec.ts:69`.

This is also a small argument for the repo convention of [asserting on requirements rather than literal strings](../README.md#conventions) — the copy here has been under discussion since April 2025.

## Scope creep — the likeliest reason this stalls

The argument generalises. Every bloc-capable method displays a single-winner name under Basic Multi-Winner: **STAR, Ranked Robin, Approval** (the three default bullets) and **Plurality, IRV** (under "More Options"). All five run through `runBlocTabulator`. [#912](https://github.com/Equal-Vote/star-server/issues/912) is the Plurality version of this same ticket.

A reviewer will reasonably ask why only STAR. That is fine as long as the resolver is written as a lookup table from the start rather than `if (voting_method === 'STAR')` — generalising then costs four more i18n keys and nothing else. **#1475 currently uses the `if` form**, which is right for a two-file draft but is the thing to widen if #904 and #912 are taken together.

The correct bloc names are not all formed the same way ("Bloc STAR Voting" vs "Bloc Approval"), so a lookup is required regardless; there is no reliable concatenation rule. The [BPML naming doc](https://docs.google.com/document/d/1XsfRVA6zdHFRAkRCMyxBTK18WIDq03vSRKpJLnrHxC4/edit) linked from the issue is the source for each.

## i18n cost

Four locales — `en`, `es`, `pl`, `pt-BR`. `i18n.ts:24` sets `fallbackLng: 'en'`, so adding the key to `en.yaml` only is safe: other locales fall back to readable English rather than rendering a raw key. Translations can follow. (#1475 adds `en` only, consistent with this.)

## Estimate

| Scope | Cost | Risk |
|---|---|---|
| Finish display-only for STAR — the 2 sites #1475 leaves | 1 resolver reuse, 2 call sites, 1 E2E selector — **2–3 hours** | **Low** — no tabulation, DB, or API surface |
| Display-only, all 5 bloc methods | Same shape, ~5 keys, resolver widened to a lookup — **about a day** | **Low** |
| Rename the persisted `voting_method` enum | Migration over historic races + dispatch + back-compat — **weeks** | **High** — rewrites published election data |

## Provenance

| Claim | How established |
|---|---|
| Single resolution chokepoint; the 4 render sites | read from source at `15289d3` — `grep` of all `full_name` / `methodValueToTextKey` consumers |
| Winner count in scope at each site | read from source, line-checked individually |
| `bloc_multi_winner_adj` already wired at `:219` | read from source — found only after the initial `grep` missed the template literal |
| `methods.star.full_name` shared with landing page and tips | read from source — all four `$t(methods.star.full_name)` references resolved to their parent sections |
| `voting_method` is a dispatch key and DB value | read from source — validation, tabulator, ballot routing, stats aggregator |
| Which E2E selector breaks | read from source — all three `'STAR Voting'` selectors checked for single- vs multi-winner context |
| #1475's contents, draft status, and key name | read from the PR diff via the API, 2026-08-04 |
| "Bloc STAR" is the correct order | five independent sources — see the retraction comment; **not** established by this page's own research |
| Rendered appearance after the change | **not verified** — nothing run in a browser |
| Correct BPML names for the other four bloc methods | **not established** — deferred to the linked naming doc |

## Related

- [#1474](https://github.com/Equal-Vote/bettervoting/pull/1474) — the Bloc STAR help page; **#1475 is blocked on it**
- [#1475](https://github.com/Equal-Vote/bettervoting/pull/1475) — the results-page half, draft
- [#1086](https://github.com/Equal-Vote/bettervoting/issues/1086) — the issue #1475 is filed against
- [#912](https://github.com/Equal-Vote/star-server/issues/912) — the same ticket for Multi-winner Plurality
