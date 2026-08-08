# #1451 — About Us placement comment posted 2026-08-08

**Posted:** [Equal-Vote/bettervoting#1451 comment](https://github.com/Equal-Vote/bettervoting/pull/1451#issuecomment-5225775841)

The one substantive question from the [#827 analysis](827-help-link-placement.md), raised on the PR rather than the issue because it is about the diff. Explicitly non-blocking. Separate from the [two loose ends](1451-loose-ends-comment-posted.md) posted earlier the same day.

The concrete addition over the #827 version: Documentation is the **sixth of six** items in the new dropdown, so reordering it to the top is a one-line change that costs no top-level width at 320px — offered as the cheapest of four options.

---

One placement question, raised here rather than on #827 because it's about this diff. **Not a blocker** — this PR is the fix for #827 and should land either way.

**"About Us" isn't where someone looks for help.** The new dropdown reads: About BetterVoting, About The Equal Vote Coalition, Why We Need Better Voting, Stories, Feature List, **Documentation** — so Documentation is the *sixth of six* items, under a parent that conventionally means *who we are* rather than *how do I use this*. For the first-time visitor #827 is about, that moves the link from login-gated to menu-gated rather than all the way to discoverable. @waugh's point on #827 was that "Help" and "Documentation" are the words a reader would seek; this PR uses the word, but puts it where someone seeking it is least likely to open.

To be clear about what #1450 already settled, because I don't think this reopens it: the reasoning for *not* flat-appending was 320px crowding at 6 → 8 top-level items, and that reasoning is sound. But Support Us was added at **net-zero** top-level cost by folding Stories into About Us — so the count today is still 6, and one addition would be 6 → 7, not 6 → 8.

Four options, cheapest first:

1. **Reorder within the dropdown** — move Documentation to the top of About Us, above About BetterVoting. Costs nothing: no new top-level item, no extra width at 320px, no hierarchy decision. Just a line moved in `navItems`.
2. **Rename the parent** to "About & Help" (or "About & Docs"). Also no new top-level item — it just puts the word a reader is scanning for into the bar itself.
3. **Add Documentation as a 7th top-level item.** 6 → 7, which is the count this PR would have had if Stories hadn't been folded away.
4. **Add a footer link.** Worth noting on its own merits: the footer today carries starvoting.org, equal.vote, four social accounts and the GitHub org, and **no documentation at all**. It's also the one option fully independent of the nav hierarchy you and Sara are still working through, so it can land without waiting on that.

(1) alone would probably do it, and it's a one-line change to this PR. Happy to open a follow-up instead if you'd rather keep this diff scoped to #1450 as specified.

Full notes on #827, including what was verified on production vs. read from source: https://github.com/masiarek/bettervoting-qa/blob/master/issues/827-help-link-placement.md
