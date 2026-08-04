# Wizard PUBLISH NOW creates an election nobody can own

**Not posted yet.** Slack first, per the README ground rule — an inverted ownership guard is sharper than a UI or copy defect, and `owner_id: null` was written *deliberately* at `Wizard.tsx:119`, so "is this deliberate?" is the honest framing rather than a pose. Rename this file to `<n>-wizard-publish-now-orphans-election.md` once it has a number.

Live repro: **[bettervoting.com/jd78xd](https://bettervoting.com/jd78xd/)** — created 2026-08-03 through the production wizard, signed out, one click on PUBLISH NOW. Frozen at [`reference/frozen/jd78xd-snapshot.json`](../reference/frozen/jd78xd-snapshot.json).

Detail page: [`reference/creating-an-election.md`](../reference/creating-an-election.md).

## Slack draft

> Question on the create wizard — is this deliberate? On `main`, `Wizard.tsx:119` (the PUBLISH NOW branch) passes `owner_id: null`, but `onAddElection` at `:83` only assigns the temp id `if (election.owner_id != null)`, while `claim_key_hash` is set unconditionally just below. Net effect on production: a signed-out PUBLISH NOW election gets a claim key but no owner, so `tempUserAuth` in `elections.controllers.ts` can't be satisfied — `owner_id == cookies.temp_id` compares `null` to a `v-…` id — and the election can never be claimed or closed. It stays `open` forever. Repro is `jd78xd` (mine, created today). The *See more options* path is fine, since `makeDefaultElection()` leaves `owner_id: '0'`. Happy to open an issue if it's not intended.

## Housekeeping

- **`jd78xd` is itself an orphan** — that's the finding, so it can't be cleaned up. It stays `state: open` with `voter_access: open`, meaning anyone reading the issue can cast a ballot in it. Snapshot frozen at 0 ballots, `2026-08-04T02:09:49Z`. If the issue cites tallies later, re-freeze.
- **Nothing to claim, so no claim key to withhold.** Unlike `43jp39` in [#1470](https://github.com/Equal-Vote/bettervoting/issues/1470), there is no ownership to protect here — the claim key in that browser session is worthless, which is the whole point.
- **One thing held back from the public page.** See the note at the bottom of this file; it goes to Arend, not into `reference/`.

## What to post

Everything below the line is the issue body as drafted.

---

## Title

**Wizard "Publish Now" creates an election with `owner_id: null` — it can never be claimed, administered, or closed**

## Body

### Summary

An election created through the wizard's **PUBLISH NOW** button while signed out is permanently unownable. It is written with a valid `claim_key_hash` but with `owner_id: null`, and the guest-ownership check requires `owner_id == cookies.temp_id`. `null` can never equal the browser's `v-…` temp id, so the `owner` role is never granted — which also means `canClaimElection` is never granted, so signing in later cannot rescue it.

The practical result is an election that is **`open` forever**: it accepts ballots indefinitely and no one — including its creator — can close, edit, finalize, or delete it. Only a `system_admin` can intervene.

The longer *See more options* path is unaffected.

### Reproduction

1. Open <https://bettervoting.com/new_election> signed out.
2. Fill in a title and two candidates, pick any method, click through to the **Publish?** dialog.
3. Click **PUBLISH NOW**.
4. In the same browser, with the `temp_id` and `<id>_claim_key` cookies that the wizard just set:

```js
await (await fetch('/API/Election/<id>', {credentials:'include'})).json()
// → voterAuth: { authorized_voter: true, has_voted: false, roles: [], permissions: [] }
```

No `owner` role, well inside the 10-hour window. The cause is visible anonymously:

```bash
curl -s https://bettervoting.com/API/Election/jd78xd \
  | jq '.election | {owner_id, has_claim_hash: (.claim_key_hash != null), state}'
# → { "owner_id": null, "has_claim_hash": true, "state": "open" }
```

Live example: `jd78xd`, created 2026-08-03 by exactly these steps.

### Root cause

`packages/frontend/src/components/ElectionForm/Wizard/Wizard.tsx`.

The PUBLISH NOW branch passes `owner_id: null` explicitly:

```js
// :119, in onNext()
onAddElection({...updatedElection, owner_id: null, state: 'finalized',
               settings: setVoterAuthenticationMode(updatedElection.settings, 'open_unique_cookie')}, '/')
```

and `onAddElection` assigns the temp id only when `owner_id` is **already** non-null:

```js
// :83-87
if (election.owner_id != null){
election.owner_id = authSession.isLoggedIn() ? authSession.getIdField('sub') : submitTempID;
}
const claimKey = crypto.randomUUID();
election.claim_key_hash = hashString(claimKey);
```

The guard is false, so the temp id is never assigned — while `claim_key_hash` is set unconditionally two lines below, outside the guard. That produces the exact shape seen in production: hash present, owner absent.

As written, the condition only assigns an owner when one already exists, which looks inverted. It is also what spares the other path: `makeDefaultElection()` sets `owner_id: '0'` (`:34`), so the *See more options* branch — which calls `setPage(1)` without the `owner_id: null` override — passes the guard and receives a real temp id.

Downstream, `elections.controllers.ts`:

```js
const ownerIsTempUser = !req.election.owner_id || req.election.owner_id.startsWith('v-');
const tempUserAuth =
    ownerIsTempUser &&
    req.election.owner_id == req.cookies.temp_id &&
    ...
```

`null` passes `ownerIsTempUser` via the `!owner_id` disjunct, then fails on `owner_id == cookies.temp_id`.

### Scope

- Affects every election created by **PUBLISH NOW while signed out**. Signed-in users are unaffected in practice, since the same `:119` null means they'd be orphaned too — but the app routes logged-in creators through the manage page, so this should be confirmed rather than assumed.
- Unaffected: the *See more options* path, and anything created through the API with an `owner_id` set.
- Severity is durability, not data loss. Ballots tally correctly; the election simply cannot be administered, and cannot be stopped from accepting more.

### Suggested fix

Either drop the `owner_id: null` override at `:119`, or invert the guard at `:83` so it assigns when unset:

```js
if (election.owner_id == null){
    election.owner_id = authSession.isLoggedIn() ? authSession.getIdField('sub') : submitTempID;
}
```

The second is the smaller change and makes `makeDefaultElection()`'s `owner_id: '0'` sentinel unnecessary. Either way, a regression test asserting `owner_id` is non-null after a quick-publish would catch it.

Existing orphans can't be repaired by this fix — `owner_id` is immutable without the owner role, so they need a `system_admin` sweep or a migration.

---

## Provenance

| Claim | How established |
|---|---|
| `owner_id: null`, `claim_key_hash` present, `state: open` on a wizard-created election | **executed** — anonymous `curl` against `jd78xd`, frozen snapshot |
| `roles: []` with both guest cookies present, inside the 10 h window | **executed** — same-origin `fetch` with `credentials: 'include'` from the creating browser session |
| Cookies were present and not HttpOnly | **executed** — read back from `document.cookie` |
| `Wizard.tsx:119` passes `owner_id: null` | read from source, `main` via GitHub API |
| `Wizard.tsx:83-87` guard, `claim_key_hash` set outside it | read from source |
| `makeDefaultElection()` sets `owner_id: '0'` (`:34`) | read from source |
| `tempUserAuth` fails on the equality, not the `v-` prefix | read from source, `elections.controllers.ts` |
| **The *See more options* path is unaffected** | **inferred from source only — NOT executed.** No election was created through the long path. Verify before the issue is filed |
| Signed-in creators are spared | **not established.** Reasoned only; flagged as an open question in the issue body |
| Description field discarded by the wizard | **retracted.** `Wizard.tsx:110-116` maps it through on the same object as the title, which persisted. Most likely an artifact of the automated fill. Do not include |

The run was browser-automated. That matters for input-binding claims (hence the retraction above) but not for the ownership finding, which is a property of the request the wizard constructs and is corroborated by source on both ends.

---

## One more item, verbally

There is a second observation about the same `tempUserAuth` expression that belongs in the Slack conversation and **not** in this repo — it concerns the comparison semantics, and a correct patch should address it alongside `:119`. It is in the session notes, not here, for the same reason claim keys aren't here: this repo is public and the item hasn't been raised yet.
