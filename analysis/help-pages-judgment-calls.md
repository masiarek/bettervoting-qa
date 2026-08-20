# BV docs program — judgment calls and open questions

Working notes behind [upstream issue #1556](https://github.com/Equal-Vote/bettervoting/issues/1556); the issue carries the curated version, this page keeps the fuller running list.


## Judgment calls we made, and the alternative we rejected

1. **Role-first tree** (For Voters / Running an Election), not lifecycle-only.
   Rejected: #1505's three lifecycle sections alone. Reason: voters arrive cold from an
   email link, and the app already links voters into these docs from the results page.
   Lifecycle survives as the second level inside Running an Election.

2. **Named the lean** on the method chooser — stated outright that BetterVoting is built
   by Equal Vote, which advocates STAR, and that this is why STAR is the default
   suggestion. Rejected: silent neutrality. Reason: readers detect a lean anyway;
   naming it keeps the page usable by someone who has already chosen another method.

3. **RCV introduced once as instant-runoff**, with Ranked Robin named as the other way
   to count the same ballot. Rejected: leaving "RCV" undefined. Reason: admins whose
   voters already rank should know they have two options, not one. No attack on IRV.

4. **Editable ballots framed as a genuine trade-off**, with Estonia's re-voting (a
   coercion COUNTERMEASURE) as the counterweight. Rejected: "bad practice, but we
   shipped it." Reason: more accurate, and doesn't require the project to disparage its
   own feature.

5. **No parallel doc trees** for editable vs non-editable ballots. One page owns the
   decision; everywhere else the setting is a variable. The voter page is built around
   the three messages the app itself shows, so a voter matches their screen without
   knowing the setting exists.

6. **The secrecy page states its limits** (your own receipt; a 3-voter race decided 3-0)
   rather than only reassuring. Rejected: a pure reassurance page. Reason: it wouldn't
   survive a sceptical reader, which is the only reader who searches for it.

7. **Every page links only to pages already on main.** Reason: jekyll-relative-links
   only rewrites targets that exist, so a link to an unmerged page ships a raw `.md`
   href. Cost: cross-links are thinner than they should be — a one-line follow-up each
   once the batch lands.

## Open questions for a human

1. **Deleting an election** — the controller has a permission check but no state gate, so
   an open election with cast ballots can be deleted. Intended, or an oversight? We did
   not document it either way.
2. **Roll states** — flag / invalidate are permissioned admin actions that appear to be
   bookkeeping only. Should they prevent voting? The page makes no enforcement claim.
3. **Wizard copy vs behaviour** — the creation wizard implies finalizing sends
   invitations; it doesn't. Should the copy change, or the behaviour?
4. **Reporting problems privately** — the help site has no "how to report a security
   issue" line. Normal for a voting product; currently missing.
5. **Editable ballots** — was the steering committee's need "fix a misclick" or "change
   my mind later"? Different problems; the first is solved by a confirmation step.
6. **Skipped-rank exhaustion** isn't in the settings UI and defaults to effectively
   never. Deliberate, or should it be exposed?
7. **Nav label** — "Running an Election" vs "For Administrators". We chose the task
   phrasing over the role noun; easy to change.

## Written deliberately as gaps, not filled

- Deleting an election (Q1 above)
- Abstain / None of the Above — sheet says missing functionality, issue #1421 open.
  Can't document an undecided feature.

## Added while writing the editable-ballots page (PR #1548)

- **Editable ballots only work on email-list elections.** Settings validation rejects the
  combination with open access or non-email invitations. Not obvious from the setting's
  own label, and it constrains who can use the feature at all.

- **Estonia checked against the primary source** (valimised.ee), not secondary summaries:
  unlimited re-voting, only the last i-vote counts, paper overrides electronic, and the
  freedom-of-voting justification is explicit. The published caveat is in the page too —
  a coercer who controls the voter at the deadline defeats it. Worth keeping: it stops
  the comparison being used as a blanket endorsement.
- **Trivial fix available for anyone nearby:** the plaintext receipt email reads
  "update you ballot".

## Added while writing the glossary (PR #1549, 41 terms)

- **"Exhausted" is broader in BetterVoting than the textbook definition.** It isn't only
  "ran out of rankings" — the tabulator also exhausts a ballot on an overvote, on
  repeated skipped ranks, and on duplicate ranks. The glossary entry therefore says
  "can no longer count for anyone" rather than the usual phrasing. Worth checking this
  against the star-voting-library's own exhausted-ballots page, which may be using the
  narrower definition.
- **The two proportional methods use different quotas** — STV uses Droop, Proportional
  STAR uses Hare. The glossary entry stays method-neutral as a result. Also worth a
  cross-check against the library's STV and allocated-score cases.

## Added while writing voter troubleshooting (PR #1550)

- **Every error a voter sees ends with an 8-character request id.** Nobody documents
  this. The page now teaches voters to quote it when they contact their organiser —
  a free support hook that already exists in the product.
- **User-visible UI bug (not security):** the voter-auth screen compares the required
  field against "Voter ID Required", but the backend returns "Voter ID Required for
  closed elections". The comparison never matches, so "Invalid Voter ID" is shown
  before the voter has typed anything. Affects every voter in an ID-list election.
- **Minor abuse vector:** the receipt-email field in the submit dialog is unvalidated,
  so a receipt can be sent to any address the submitter types — spam or harassment
  routed through BetterVoting's own sender reputation.

## Added while writing emails to voters (PR #1551)

- **CONFIRMED from source: finalizing sends nothing.** finalizeElectionController does a
  state change, a max_rankings default and draft-ballot deletion — no email, and no
  scheduler exists for start-time sends. The wizard string
  `wizard.email_list_description` says "…send them by email once the election starts",
  which is wrong. An admin who believes it runs an election nobody was invited to.
  The page states plainly that sending is a deliberate step; the PR flags the copy.
- **The roll's "Email invite status" column can lie.** It is only updated by legacy
  sendInvites / sendInvite endpoints that no longer have a UI consumer. Invitations sent
  via the email-blast tool leave it reading "Invite not sent", so an admin checking the
  roll sees failures that did not happen. Arguably worse than the wizard copy, because
  it misinforms during a live election.
- Break-glass voter-ID reveal is gated on canViewElectionRoll — weak for something that
  hands out a ballot-access URL. (Same finding two agents have now reached independently.)
- Single-target sends by email address silently pick the first match when duplicates
  exist; it logs a server-side warning the admin never sees.

## Added while writing polls & multiple races (PR #1552)

- **A "Publish Now" quick poll can never be managed.** It is created already `finalized`
  with a null owner, so it cannot be edited, closed, or claimed — not even by the signed-in
  person who made it. The wizard stores a claim-key cookie for it, but claiming requires
  the owner role, which a null-owner election can never grant, so the key is dead weight.
  The page carries this as a warning to users; the underlying design gap is a product
  question, not a doc one.
- **Anonymous quick-poll creators get a 10-hour edit window** before losing access.
  Undocumented anywhere until now.
- Not a security issue: the temp-auth path is properly guarded against cookie spoofing.
  Worth recording that someone checked.
