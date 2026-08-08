# #1494 / #1495 — the two #827 spin-outs, filed 2026-08-08

Split out of [#827](827-help-link-placement.md) so it can close on #1451 alone. Both filed under Adam, both ours.

- **[#1494](https://github.com/Equal-Vote/bettervoting/issues/1494)** — `Role: Writing`, `Complexity: Small`
- **[#1495](https://github.com/Equal-Vote/bettervoting/issues/1495)** — `Discussion`, `Role: Product Lead`

A [follow-up comment](https://github.com/Equal-Vote/bettervoting/issues/827#issuecomment-5225764496) on #827 links both and states that everything left there is #1451.

---

## #1494 — Help docs have no video of BetterVoting itself

### Overview

Split out of #827, which asked that the help files link to demo videos "showing BetterVoting functionality (building trust)". We already ship explainer videos — but they explain **voting methods**, not **the product**. No page under `docs/help/` shows BetterVoting itself being used.

### What already exists (so nobody rebuilds it)

| Where | What | Kind |
|---|---|---|
| `en.yaml:187`, `:191`, `:195` | `methods.approval` / `rcv` / `stv` → `learn_link` YouTube videos, wired into the product | method explainer |
| `en.yaml:179`, `:183`, `:199` | `methods.star` / `star_pr` / `ranked_robin` → starvoting.org and equal.vote pages, no video | — |
| `docs/other_tools/google_forms.md:20` | a YouTube `<iframe>` embedded directly in a docs page | product demo, but for Google Forms |
| `docs/help/hand_count.md:48` | links the Equal Vote pilot playlist | event footage |
| `docs/help/*` (the other six pages) | no video of any kind | — |

Two things follow. **The embed mechanism already works** — `google_forms.md` proves a docs page can carry an inline video with no new tooling. And **the gap is specifically product footage**: a visitor deciding whether to trust us with an election can watch an explanation of Approval Voting, but not a walkthrough of creating or voting in an election here.

### Action Items

- [ ] **Check whether the footage already exists** on the Equal Vote YouTube channel. If it does, this is a linking task, not a production one — and it can land immediately.
- [ ] Add a short walkthrough (create an election → vote → read results) to `docs/index.md` and/or a new getting-started page under `docs/help/`, using the `google_forms.md` embed pattern.
- [ ] Optional, separable: fill in video `learn_link`s for STAR, Proportional STAR and Ranked Robin, so the three that currently point at web pages match the three that point at videos.

### Resources/Instructions

- Parent issue: #827
- Embed pattern to copy: [`docs/other_tools/google_forms.md`](https://github.com/Equal-Vote/bettervoting/blob/main/docs/other_tools/google_forms.md) line 20
- Docs home: [`docs/index.md`](https://github.com/Equal-Vote/bettervoting/blob/main/docs/index.md) — renders at https://docs.bettervoting.com/
- Existing video links: [`packages/frontend/src/i18n/en.yaml`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/i18n/en.yaml) lines 178–200

### Note on ordering

This is worth doing **after or alongside #1451**, which is what makes the docs reachable before login in the first place. A trust-building video that only logged-in users can find doesn't build trust with the people it's for.

---

## #1495 — Discussion: let a first-time visitor try the product without registering

### Emergent Requirement - Problem

#827 asked for "some test user ids (allow first time visitor to see full functionality without forcing user to register — again building trust)". @waugh replied in March 2025 that this should be a separate issue because "it might need a lot of behavioral specification." He was right, it never got split out, and it's now the main reason #827 can't close once #1451 lands.

Splitting it out here — with one finding that may make it much cheaper than it looks.

**`/sandbox` already does most of this, and nothing links to it.**

`App.tsx:71` registers `<Route path='/sandbox' element={<Sandbox />} />`. Checked on production 2026-08-08, signed out: it loads, and with no input at all it renders a worked STAR election — method picker, winner count, candidate list, a ballots textarea, and then the full results view: scoring round, automatic runoff, majority threshold, Equal Support, the "How STAR Voting works" explainer. No account, no login prompt, and nothing is created or stored.

That is close to exactly what #827 asked for. The route appears **nowhere else in the codebase** — not in the nav, not in the docs, not on the landing page. The only occurrence is the route definition itself.

One visible defect if it's going to be shown to first-time visitors: **the Race Details panel expands to a permanent "Loading..."** on `/sandbox` (there's no election record behind a sandbox tally). Confirmed on production 2026-08-08.

### Issue you discovered this emergent requirement in
- #827

### Who was involved
@masiarek, @waugh, @ArendPeter

### What happens if this is not addressed

Two costs, one small and one larger.

The small one: #827 stays open after #1451 merges, holding a ticket that has nothing to do with where a link sits in the nav.

The larger one: we keep a working, unauthenticated demo of the product and show it to nobody, while the alternative on the table — handing out shared test logins on a live voting platform — is the option that actually needs a specification. Shared credentials raise questions the sandbox simply doesn't have: who may sign in, what they may create, what happens to elections created under a shared identity, who can delete them, and how it's rate-limited against abuse.

### Resources

- `packages/frontend/src/App.tsx:71` — the route
- https://bettervoting.com/sandbox — live, signed out
- #827 — parent
- #1451 — the nav change that covers the rest of #827

### Recommended Action Items
- [ ] Make a new issue
- [x] Discuss with team
- [ ] Let a Team Lead know

Three questions, roughly in order:

1. **Is surfacing `/sandbox` the answer instead of shared test credentials?** It costs a nav or docs link, and it carries no account, no stored election, no cleanup and no abuse surface.
2. **If yes — where does it get linked, and does the Race Details panel get fixed or hidden first?** A demo whose first expandable section says "Loading..." forever works against the trust it's meant to build.
3. **If shared test credentials are still wanted on top of that, what exactly are they allowed to do?** That's the behavioural spec @waugh asked for, and it should be written before any code.

I'm happy to take (1) and (2) once there's a direction; (3) needs a product decision I shouldn't make on my own.
