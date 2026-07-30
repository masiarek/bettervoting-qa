## Progress

Spent time mapping this against the codebase before writing any code. Three findings that change the shape of the work, then proposed wording and some open questions.

**1. The article already exists.** `docs/help/preliminary_results.md` is on `main` (`nav_order: 8`) and already covers everything this issue asks the article to cover — what a live tally exposes, that admins can always see who voted, delta-analysis de-anonymization (L26), the editable-ballot interaction, and that turning the setting back off doesn't un-reveal (L44-50). It is referenced from **nowhere** in `packages/` — the only `preliminary_results` hits are the i18n label key and its one consumer in `ElectionSettings.tsx`. So this issue is a **linking + copy** task, not a writing task. Nice — that's most of the work already done.

**2. Where the notice has to go, and one trap.** The right insertion point is `VotePage.tsx` (~L259-265), where `<DraftWarning/>` and `<ElectionStateWarning state="archived">` already stack above the ballot. That spot is the only one that renders once per ballot rather than once per race **and** covers `DraggableIRVBallotView`, which bypasses `GenericBallotView` entirely and re-implements its own instructions block with no footer. If the notice goes in the ballot footer instead, ranked elections silently don't get it.

**3. A second trap worth flagging before anyone writes the link.** `util.tsx` L235 renders markdown links as `target={v['newWindow'] ? '_blank' : '_self'}` — same-tab by default — and `ElectionStateWarning` calls `t(title)`/`t(description)` with no values object, so it can't pass `newWindow`. On the ballot a same-tab navigation destroys the in-progress ballot (`VotePage`'s races are React state with no draft persistence). So the ballot-side link should be an explicit `<Link target='_blank' rel='noreferrer'>` in `ElectionStateWarning`'s `children` slot, not a markdown link in an i18n value. The admin-side link can just use `learn_link:`, which already renders a `_blank` "Learn More" anchor via `styles.tsx` L33.

## Proposed wording

**(a) The admin tip rewrite.** Adopting the Should-be text with three deliberate deviations:

```yaml
  public_results:
    title: Public Results
    description: >
      Controls whether voters can see {{election}} results.
      When enabled during an open {{election}}, voters will see preliminary results after submitting their {{ballot}}.
      High-profile {{elections}} typically keep results hidden until the {{election}} closes.
    learn_link: https://docs.bettervoting.com/help/preliminary_results.html
```

- Kept the `{{election}}`/`{{elections}}` interpolation. The Should-be text quotes the *rendered* string; pasting it literally would hard-code "election" and regress poll terminology for every poll.
- `|` → `>`. The Should-be is one paragraph, but `applyLineBreaks` turns a `|` block's newlines into three `<br/>`-separated lines.
- Added `learn_link` — one line, no TypeScript, gets the admin-side article link for free.

Note this one tip serves **both** switch labels (`Show Preliminary Results` while draft/open, `Make Results Public` once closed), so the text has to read correctly under either.

**(b) The voter-facing notice** (shown when `public_results === true` and state is `draft` or `open`):

> **Preliminary results are public in this election**
> Results update as ballots come in, and anyone with the election link can watch them. In a small election — or if only a few people vote in a given window — it can be possible to infer how someone voted.
> [What preliminary results reveal →]

**(c) The closed-list extra layer** (additionally, when `voter_access === 'closed'`):

> **This election uses a voter list**
> Administrators can see which voters have voted and when. Combined with live results, that timing can narrow down how a particular voter voted.

**(d) One sentence in the submit-confirm dialog**, above the receipt-email field — the banner is scrollable-past, and the dialog is the only surface a voter must actively confirm, which is what "transparent before they've cast their ballot" actually requires:

> Results for this election are visible while voting is open.

(Avoiding `**bold**` in any of these — `util.tsx` L244 renders it as `<i>`, not bold.)

## One correction to the premise, for the record

The issue says admins "are able to see who has voted and it's extra trivial for them to reveal what those votes are." The first half is exactly right and is a first-class feature (`EditElectionRoll.tsx` renders `Has Voted` per named voter, with timestamped submit history). The second half is stronger than what the code allows: `ballot_id` is scrubbed from every roll response unconditionally in `getElectionRollController.ts`, and the voter→ballot join (`getBallotByVoterID`) is called from exactly one place — `castVoteController`'s edit-vote path — never from an admin endpoint.

So I'd keep the warning to what's demonstrably true: **admins see *who* voted and *when*, and combined with a live tally that timing can reveal *how***. That's the honest version, it's still a serious disclosure, and it doesn't hand anyone a quotable overstatement about BetterVoting. Happy to be corrected if there's an admin path I missed.

Related: the help article's own L26 says "BetterVoting hides the link between a voter and their specific ballot." True of the API, but Matomo loads on every route and both `voter_id` and `ballot_id` are **path** segments in emailed URLs (`/{eid}/id/{voter_id}`, `/{eid}/ballot/{ballot_id}`), so one analytics visitor profile joins them — `setExcludedQueryParams` only covers query strings. Worth qualifying that line in the same pass, since we'd be shipping a privacy notice that points at it.

## Open questions

1. **Banner only, or banner + submit dialog?** The issue says "on the ballot," which reads as the banner. The dialog is what actually satisfies "before they've cast." I'd do both with one sentence in the dialog, but the added friction is a product call.
2. **Who signs off on the closed-list wording?** Per above, it's a strong claim about Equal Vote's own product, printed on the ballot. I don't think engineering should be the one to approve that sentence.
3. **Should the notice appear in `draft` (admin ballot preview)?** I've assumed yes. Relevant because `public_results: true` is the wizard default and the anonymized-ballot endpoint is already live in draft.
4. **Should it appear once results are `closed`?** I've assumed no — at that point the flag means "final results published" and carries none of the live-tally risk. But `public_results` is doing two jobs with one boolean, so worth confirming that's the intent.
5. **The mid-election flip.** `setPublicResults` has no state guard, so a voter can load the ballot with results hidden, an admin can flip it on, and that voter is never disclosed to. Copy can't fix that. It argues for either the audit log in #1353 (PR #1365 looks like it already covers it) or wording that says the setting *can* change mid-election. Which do you prefer?
6. **Email invites?** For closed lists the invite email is chronologically the first voter surface, well before the ballot. Backend templates have no i18n so it'd be English-only, and the flag can flip after invites go out — so it's weaker than the ballot notice, not a substitute. Worth adding a line anyway?
7. **Should this be split?** It's four independently landable deliverables — (i) the copy rewrite + `learn_link`, (ii) the on-ballot notice, (iii) the closed-list layer, (iv) the article's L26 qualification. (i) is a one-file change that could merge today; (iii) is blocked on Q2. The issue is also still `Role: Missing` / `Complexity: Missing` if someone wants to triage it.

## Test plan

16 cases, grouped: 6 on the visibility gate (flag on/off × open/closed-list × draft/open/closed states, plus the closed-list-with-edit-vote combination — which is the only legal one, since `ballot_updates` requires `voter_access != 'open'` *and* `invitation == 'email'`); 3 on the link (new-tab behavior with a partially-filled ballot, URL resolves, dialog sentence present); 2 on rendering (draggable RCV gets the banner; multi-race renders it once); 3 on the admin copy (both labels, one-paragraph rendering, poll-vs-election terminology); 2 on i18n fallback and the mid-election gap in Q5.

Cases 1-11 automate in Playwright. Note `election-with-rolls.spec.ts` and `election-without-rolls.spec.ts` both create elections with `public_results: true`, so both will start rendering the new notice — expect selector churn in those two specs.

## Availability for this week

8 hours.

## ETA

~2 weeks, target **12 Aug 2026**. The copy-only piece (the `en.yaml` tip rewrite + `learn_link`) can land well before that — it's a one-file change. The closed-list layer is the part that depends on Q2 being answered.
