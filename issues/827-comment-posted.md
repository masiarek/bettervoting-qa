# #827 — status comment posted 2026-08-08

**Posted:** [Equal-Vote/bettervoting#827 comment](https://github.com/Equal-Vote/bettervoting/issues/827#issuecomment-5225702899)

Corrects two claims in the issue body (Adam's own), points the thread at the fix that already exists in #1451, and asks for the two unspec'd asks to be split out. Full analysis: [`827-help-link-placement.md`](827-help-link-placement.md).

---

Status update, since this thread still reads as an open design question and I don't think it is one any more.

**The fix is already written.** @ArendPeter spec'd this as #1450 and implemented it in #1451 — open since 2026-07-23, not a draft, no review yet beyond his own comment. It moves Documentation out of the login-gated account dropdown into a top-level **About Us ▾**, renames "Help" → "Documentation", and makes it visible logged out on both desktop and mobile. So what's left on this issue is a code review, not a decision.

**Two corrections to my own issue body**, both checked against production on 2026-08-08:

1. **The docs are already reachable before login** — just through a door nobody would think to open. **Paper Ballots ▾ → "Paper Ballots"** points at `https://docs.bettervoting.com/help/paper_ballots.html` (`Header.tsx:100`, inside `navItems`, so it renders logged out), and because the docs are a just-the-docs site, that page carries the full sidebar: all seven `/help/` pages, other tools, contributions, and the docs home. So this is a **signage and labelling problem, not an access one** — lower severity than my original wording implied.
2. **The entry point I asked for on 2025-10-27 already exists.** `https://docs.bettervoting.com/` returns 200, titled "BetterVoting Documentation", with the body text "Welcome to our documentation!" — essentially the placeholder I described. The only thing ever missing was the link's position.

**@waugh's two points are both addressed**, which is worth saying since they were the substantive objections here:

- The link reads literally **"Documentation"** in #1451 — one of the two words you said a reader would seek.
- The 320px requirement is handled by construction: `navItems` is mapped by both the desktop nav and the mobile hamburger, so anything added there appears in both (confirmed at a 320px viewport). #1450 goes further and rejects a "flat append" hierarchy specifically because it would grow the top level from 6 to 8 and crowd narrow screens.

**One thing I'd like settled before #1451 merges.** It nests Documentation one level inside **About Us**, alongside About BetterVoting, About The Equal Vote Coalition, Why We Need Better Voting, Stories and Feature List. That's a coherent grouping, but "About Us" conventionally means *who we are*, not *how do I use this* — so the link goes from login-gated to menu-gated rather than all the way to discoverable. Not a blocker, and the PR should ship either way. Cheapest options if we want to close that gap: rename the parent ("About & Help"), or add a footer link — the footer today carries starvoting.org, equal.vote, four social accounts and the GitHub org, and no documentation at all, and it's independent of the nav hierarchy still being worked through.

**Two of the three asks in this issue aren't covered by #1451**, which is why I don't think it should auto-close this one:

- **Demo videos linked from the help files** — a `docs/help/` content task, no code, unblocked today.
- **Test/demo user IDs**, so a first-time visitor can see full functionality before registering. @waugh suggested splitting this out in March 2025 and was right: shared demo credentials on a live voting platform needs its own behavioural spec, and it has nothing to do with link placement. Happy to file it separately so this issue can close on the nav change.

Full working notes, including what was run live vs. read from source: https://github.com/masiarek/bettervoting-qa/blob/master/issues/827-help-link-placement.md
