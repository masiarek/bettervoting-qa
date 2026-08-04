# Creating an election

How to get a test election onto production, what the wizard writes that you didn't choose, and the two defects the quick path hits.

Three routes, in order of how much you control:

| Route | Login | Use it when |
|---|---|---|
| Web wizard, **Publish Now** | none | You need a public ballot URL in under a minute and will never administer it |
| Web wizard, **See more options** | none | You need voter restrictions, a support email, or a draft to edit |
| API | cookies you mint | You need a reproducible fixture, or an owner role you can actually use — see [`bv-api-checks.md`](bv-api-checks.md#administering-a-guest-created-election-and-claiming-it) |

Everything below was run against production on 2026-08-03 and captured as `jd78xd`.

## The web wizard

`https://bettervoting.com/new_election` is a real route — the URL sticks. It renders the homepage layout with the wizard inlined roughly 750 px down and **does not scroll to it**, so a link to `/new_election` still lands the reader above the fold on marketing copy. Worth knowing before citing the URL as a call to action.

Steps, in the order the wizard presents them:

1. **Which term best describes your situation?** — `Election` / `Poll`. Writes `settings.term_type`; wording only.
2. **How many races?** — `Just one` / `More than one`.
3. **Elected Office Title**, plus an optional **Description** behind a `+ Description` disclosure. See the description defect below.
4. **Candidates** — rows auto-append as you fill the last one; trailing blanks are dropped on save.
5. **Voting method** — `Single-Winner` / `Basic Multi-Winner` / `Proportional Multi-Winner`, then the winner count → **Next**.
6. **Which Voting Method?** — STAR, Ranked Robin, Approval, then Plurality and IRV behind **More Options** → **Next**.
7. A **Publish?** modal: *"Would you like to publish your simple poll now or continue to customize further?"* — **SEE MORE OPTIONS** / **PUBLISH NOW**.

**PUBLISH NOW skips step 8** — the *Just a few more questions…* panel holding **Restricted?** (pre-defined voter list) and **Election Support Email**. Those fields take their defaults silently. The election goes straight to `state: open`; there is no draft to review.

> **Automation note.** The Publish? modal is a MUI dialog that covers the page. Clicks aimed at the form underneath land on `.MuiDialog-container` and are swallowed with no error. If a scripted run stops responding at step 7, that's why.

## What the wizard writes that you never chose

`curl -s https://bettervoting.com/API/Election/jd78xd | jq '.election.settings'`:

```json
{
  "voter_access": "open",
  "voter_authentication": { "voter_id": true },
  "ballot_updates": false,
  "public_results": true,
  "random_candidate_order": true,
  "require_instruction_confirmation": false,
  "draggable_ballot": false,
  "term_type": "election"
}
```

Three of these are decisions the creator was never shown:

- **`public_results: true`** — this is the flag that makes `/anonymizedBallots` readable by anyone, in any state. The wizard never surfaces the choice. This is the concrete basis for open question **Q4**; see the warning in [`bv-api-checks.md`](bv-api-checks.md#full-export-election--ballots--results).
- **`voter_authentication.voter_id: true`** — set even on a fully open election reached by a bare link.
- **`random_candidate_order: true`** — ballot order is shuffled per voter. `jd78xd` was authored Coffee, Tea, Water, Hot Chocolate, Sparkling Water and rendered Tea, Sparkling Water, Hot Chocolate, Coffee, Water. **Never assert on ballot row order** in a UI test unless you first assert this flag is false.

`contact_email` is absent from the object entirely when left blank, rather than present as `""` — so read it with `.contact_email // ""`, not by key presence.

## ⚠️ Publish Now produces an election nobody can administer

`jd78xd` was created through the wizard while signed out. Five minutes later, in the same browser, carrying both guest cookies (`temp_id` and `jd78xd_claim_key` were present in `document.cookie`, neither HttpOnly), a same-origin `fetch` with `credentials: 'include'` returns:

```json
{ "authorized_voter": true, "has_voted": false, "roles": [], "permissions": [] }
```

No owner role. Well inside the 10-hour `TEMPORARY_ACCESS_HOURS` window. The reason is visible on the election object: **`owner_id` is `null`.**

The guest-owner grant at `elections.controllers.ts:86-97` requires `owner_id` to start with `v-`. `null` fails that test, so the grant can never fire — and `canClaimElection` comes from the same role, so signing in can't rescue it either. The wizard *did* write a `claim_key_hash`; it's the `owner_id` half that's missing.

`owner_id` is not stripped from the anonymous view in general — it comes back populated on other elections read the same way. So `null` here reads as genuinely unset rather than filtered.

This contradicts [`bv-api-checks.md`](bv-api-checks.md#known-orphans--and-why-they-cant-be-rescued), which currently states that the web wizard always sets both and that "hand-rolled API calls are the only way to produce an orphan." On this run the normal UI produced one, and the practical consequence is the same as the `mj26yj` / `vgwvjr` rows in that table: **`state: open` forever, ballots accepted forever, no way to close it.**

> **Confirm by hand before filing upstream.** This run was browser-automated. The same input mechanism persisted the title and all five candidate names, so it reached React state for those fields — but a hand-typed wizard run should be recorded before this goes to a maintainer. If it reproduces, `bv-api-checks.md` line 123 needs correcting and the "avoid creating more" advice needs to cover the UI path too.

**Until it's confirmed: don't create throwaway elections with Publish Now.** Use **See more options**, or the API with an `owner_id` you control.

## ⚠️ The wizard's Description field is discarded

Roughly 350 characters were typed into the **+ Description** textarea at step 3 and accepted without complaint. After publish:

```
.election.description   → null
.election.races[0].description → null
```

The text is on neither object, and appears on neither the landing page nor the ballot. Same caveat as above — same input mechanism, and the title written through it *did* persist — but hand-confirm before filing.

## Verifying a new election

```bash
curl -s https://bettervoting.com/API/Election/<id> \
  | jq '.election | {state, title, description, owner_id,
                     claimable: (.claim_key_hash != null),
                     races: [.races[] | {voting_method, num_winners,
                                         candidates: [.candidates[].candidate_name]}]}'
```

Check `state` is what you expect (`open` straight away from Publish Now, `draft` from the longer path), that the candidate list survived, and that `owner_id` is non-null if you intend to administer it.

## Related

- [`bv-api-checks.md`](bv-api-checks.md) — reading settings, the claim mechanics, the orphan table, OCC tokens on state changes
- [`../README.md`](../README.md) — ground rules, including report-before-publishing
