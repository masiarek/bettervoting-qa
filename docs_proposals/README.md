# Docs proposal — Voter Lists

> **Other proposals in this folder:** [`finding_your_elections.md`](finding_your_elections.md) — a
> draft **Finding Your Elections** page (the `/manage` list, what an election ID is, and why an
> archived election vanishes) · [`creating_elections_with_the_api.md`](creating_elections_with_the_api.md)
> — a draft **Creating Elections with the API** page (draft-first workflow, `owner_id` vs `admin_ids`,
> and the `auth_key` trap). Each proposal keeps its cross-references on its own note; the drafts
> under `help/` carry none, so they lift straight into `docs/`.

A draft page for <https://docs.bettervoting.com>, written out of the Manage Voters QA work.

**The draft under [`help/voter_list.md`](help/voter_list.md) is written as finished user documentation and nothing else** — no ticket numbers, no test-case IDs, no QA framing. It is meant to be copied into `docs/help/` in the BetterVoting checkout as-is. Everything that ties it back to this repo lives on *this* page, and this page does not travel with it.

| Draft | Proposed path | Front matter |
|---|---|---|
| [`help/voter_list.md`](help/voter_list.md) | `docs/help/voter_list.md` → `/help/voter_list.html` | `parent: BetterVoting Documentation`, `nav_order: 4` |

## The gap it fills

[Security Options](https://docs.bettervoting.com/help/security_options.html) explains *whether* to restrict an election and how to choose between an email list and an ID list. Its ID-list flow then opens with **"Add a list of voter ids to your voter roll"** — and stops. Nothing on the site says what that list has to look like.

Specifically, none of this is documented anywhere today:

- that typed input is one voter per row;
- that ticking more than one column means the values must be **comma-separated, in checkbox order** (voter ID, email, precinct) — the on-screen instruction says only *"1 voter per row, no spaces"*;
- that a CSV needs a header row using exactly `voter_id`, `email`, `precinct`, so a spreadsheet exported with friendly column titles is refused;
- that adding the **first** voter locks both the voter-access and the identification setting, and that Clear Voter List — the only way to unlock them — disappears once the election is finalized.

The last one is a one-way door an admin can walk through without noticing. That is the strongest reason to publish the page.

## Where it came from

Everything in the draft is grounded in `AddElectionRoll.tsx` and `ViewElectionRolls.tsx`, read during the review that produced [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513). The QA side of the same reading:

- [`test_cases/BV250-index.md`](../test_cases/BV250-index.md) — the eleven cases and today's behaviour
- [`test_cases/BV250-post-fix-verification.md`](../test_cases/BV250-post-fix-verification.md) — the acceptance suite and the user stories
- [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md) — the subsystem map

Two test cases were written *because* the product's own copy could not answer the question, and they are the paragraphs the draft now answers directly: [BV250f](../test_cases/BV250f-two-columns-require-a-comma.md) (the comma) and [BV250g](../test_cases/BV250g-csv-import-takes-the-same-path.md) (the CSV header).

## One blocker, and it is real

**The "Duplicates" section describes behaviour BetterVoting does not have yet.** It says a list with no repeats is added without asking, and that **Yes** adds each voter once. Today, in admin-managed-voter-ID mode, any submission of two or more rows raises a *"duplicate emails"* prompt and **Yes** adds exactly one voter — [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513).

Two honest ways to ship, in order of preference:

1. **Publish after #1513 lands.** The section is then correct as written. Verify with [BV250a](../test_cases/BV250a-voter-id-list-flagged-as-duplicate-emails.md), [BV250b](../test_cases/BV250b-duplicate-removal-discards-rows.md) and [BV250d](../test_cases/BV250d-genuine-duplicate-is-caught.md) before merging.
2. **Publish now with the Duplicates section removed.** Everything else on the page is true of the current build. Add the section back with the fix.

What not to do: publish the section describing today's behaviour. It would document a defect as if it were a feature, and it would need rewriting a week later.

## Also worth changing, in the same PR

Two link insertions, so the new page is reachable from where admins already are:

1. **`help/security_options.md`** — under *Restricted Elections*, after the email-list and ID-list flows: `> Building the list itself — input format, CSV import, and what locks once you add the first voter — is covered in [Voter Lists](voter_list.md).`
2. **`help/faq.md`** — a "How do I add my voters?" entry pointing at the same page, if the FAQ is taking new entries.

Both use the `.md` link form, which `jekyll-relative-links` rewrites at build time, so they work on the published site *and* when reading the source on GitHub.

**One edit to make on the way in.** The draft links Security Options by its absolute published URL, so that it works for anyone reading it here. Once the page sits in `docs/help/` beside its target, make it relative — `[Security Options](security_options.md)` — matching the `.md` convention the rest of the docs use, which `jekyll-relative-links` rewrites at build time. It is the only line in the draft that is not already in its final form.

## Notes for whoever opens the PR

- `nav_order: 4` is free in `help/` today (paper_ballots 5, hand_count 6, ties 6, security_options 7, preliminary_results 8) and puts Voter Lists just above the security pages it belongs with.
- `parent:` must match `index.md`'s `title:` character for character — `BetterVoting Documentation`. A mismatch drops the page out of the sidebar silently, and that is not visible in GitHub's web editor. Preview locally, or check the built sidebar before merging.
- The draft contains no `{% raw %}{{ }}{% endraw %}` and no Mermaid, so it needs no config changes.
- Follow the house rule from the existing pages: answer the product question, and do not hedge where the code is definite. Every "must" in the draft is enforced by a check in the source, not a convention.

## Status

**Draft, not proposed upstream.** Nothing has been sent to the maintainers. The natural moment is alongside the #1513 fix, since the fix and the page describe the same behaviour and reviewing them together is cheaper than separately.
