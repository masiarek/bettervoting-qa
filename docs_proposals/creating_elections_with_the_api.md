# Docs proposal — Creating Elections with the API

> **Other proposals in this folder:** [`README.md`](README.md) — a draft **Voter Lists** page ·
> [`finding_your_elections.md`](finding_your_elections.md) — a draft **Finding Your Elections** page.
> Each proposal keeps its cross-references on its own note; the drafts under `help/` carry none, so
> they lift straight into `docs/`.

A draft page for <https://docs.bettervoting.com>, written after six weeks of creating elections through the API the wrong way without noticing.

**The draft under [`help/api_elections.md`](help/api_elections.md) is written as finished user documentation and nothing else** — no ticket numbers, no QA framing. It is meant to be copied into `docs/help/` in the BetterVoting checkout as-is.

| Draft | Proposed path | Front matter |
|---|---|---|
| [`help/api_elections.md`](help/api_elections.md) | `docs/help/api_elections.md` → `/help/api_elections.html` | `parent: BetterVoting Documentation`, `nav_order: 10` |

## The gap it fills

The API reference at [bettervoting.com/API/swagger](https://bettervoting.com/API/swagger) documents each endpoint's shape. Nothing anywhere documents the *sequence*, or the consequences of the two or three fields that are not just data. In particular:

- that a **draft** is the rehearsal — editable, ballot-accepting, and cleared of those ballots when you finalize — and that everything else about an election is permanent the moment it stops being one;
- that **`owner_id`** is what grants the owner role and therefore the admin menu, not merely what files the election under your name;
- that **`admin_ids` is matched on email address**, so an account ID there matches nobody and fails silently;
- that **`auth_key` is about authenticating your voters, not you**, and that setting it takes your own admin access away irreversibly;
- that ballots are keyed to the caller's `temp_id` cookie, so N voters means N cookies;
- that descriptions take `**bold**` and `[text](url)` and nothing else — no bare-URL autolinking.

## Where it came from

Not from a code review — from doing it wrong. Between 2026-07-04 and 2026-08-15, a script in [star-voting-library](https://github.com/masiarek/star-voting-library) created roughly 120 elections with `auth_key` set on every one of them. All 120 are owned by an account that cannot administer any of them, and cannot be repaired: clearing `auth_key` requires a role, the role requires the key, and edits are refused on a non-draft election anyway.

The write-up, including the corrected role logic and the live probe that distinguishes an affected election from a healthy one, is [`bv_api_election_creation_notes.md`](https://github.com/masiarek/star-voting-library/blob/master/07_Concepts/tabulation_engines/BV/bv_api_election_creation_notes.md) in that repo.

## The published API reference contributes to this, and should be corrected too

The `ApiKeyAuth` description in [`swaggerSpec.ts`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/OpenApi/swaggerSpec.ts) reads:

> …the token can be sent both as a cookie named `id_token` or in the `auth_key` property of the election object.

That sentence is what sent us wrong, and it is wrong in two ways at once. `auth_key` does not hold a token — it holds an RS256 **public key**, and the token goes in a **different cookie**, `custom_id_token`. And describing the two as interchangeable ways to send "the token" invites exactly the reading we took: that `auth_key` is how an API client authenticates itself. It is how an election authenticates its *voters*, and setting it revokes the caller's own access.

It also links to a `docs/api.md` on the pre-rename `Equal-Vote/star-server` repo, pinned to a 2023 commit.

A one-paragraph correction there would be worth more than this whole page, and the two should probably ship together.

## Suggested follow-ups in the product itself

Neither is required for the page, and both are the kind of thing to ask about before assuming:

1. **`admin_ids` silently matching nothing.** An entry that is a UUID rather than an email can never match. Rejecting it at validation, or matching either form, would turn a silent no-op into an error.
2. **An election whose owner holds no role.** When `auth_key` is set, `electionSpecificAuth` replaces `req.user` outright, so a request with no `custom_id_token` arrives as nobody rather than falling back to the signed-in account. Computing admin roles from the account identity, while leaving voter authorization on the custom token, would keep both properties.

## Held back

One observation from the same reading is with the maintainers rather than on this page, per the repo's report-before-publishing rule. It is not needed to understand or use anything above.

## Also worth changing, in the same PR

One link insertion, so the page is reachable from where an integrator would already be: a line in [`help/faq.md`](https://docs.bettervoting.com/help/faq.html) — *"Can I create elections programmatically?"* — pointing at the new page. Use the `.md` link form, which `jekyll-relative-links` rewrites at build time, so it works on the published site and when reading the source on GitHub.

**One edit to make on the way in.** The draft links Security Options by its absolute published URL so that it works for anyone reading it here; once the page sits in `docs/help/` beside its target, make it relative — `[Security Options](security_options.md)`.
