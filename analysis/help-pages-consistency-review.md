# BetterVoting Help Pages — Consistency Review

Reviewed 2026-08-17. Corpus: 7 pages on `origin/main` plus ~24 pages in flight across 25 `fork/docs/*` branches (55 file-copies flattened into this directory). Every disputed fact below was checked against `origin/main` source in `/Volumes/T7/Voting/BetterVoting/bv-copy-fix`; the file:line citations are to that tree.

Naming convention in this report: `branch__file.md` refers to the copies extracted here (e.g. `glossary__glossary.md` = `docs/help/glossary.md` on `fork/docs/glossary`).

---

## 1. Contradictions (most serious first)

### C1. Whether BetterVoting sends invitation emails automatically — three pages vs two, and the two are right

The single worst contradiction in the set, because acting on the wrong version means **an election opens and no voter is ever told**.

**Wrong** — `glossary__glossary.md` (two entries):
> "**Finalized** … deletes all test votes, and (for email-list elections) **queues the voter invitations**."
> "**Email list** … **when the election opens, BetterVoting emails each voter** a unique private voting link."

**Wrong** — `voter-troubleshooting__voter_troubleshooting.md`:
> "For elections that use an email list, **invitations are sent once the election starts** — not when you're added to the list."

**Right** — `voter-emails__emails_to_voters.md`:
> "**You send the invitations — BetterVoting does not send them for you.** Finalizing your election does not email anyone. Nothing is sent automatically when the election starts, either."

**Right** — `managing-voters__managing_your_voters.md`:
> "**Nothing is sent until you send it.** Finalizing your election does not automatically email your voters."

**Source:** `packages/backend/src/Controllers/Election/finalizeElectionController.ts` sets state and deletes ballots — no email call. Invitations exist only in `sendInvitesController.ts` / `sendEmailController.ts`, both admin-invoked routes; there is no cron or state-transition hook in the backend. `voter-emails` and `managing-voters` match the code.

**Root cause worth flagging upstream:** the app's own wizard copy plants the error — `packages/frontend/src/i18n/en.yaml` (`wizard.email_list_description`): *"BetterVoting will create private voting links and send them by email once the election starts."* The two wrong doc pages faithfully transcribed misleading UI text. The doc fix should probably be accompanied by an issue against that string.

### C2. Where the voter sees their Ballot ID — two pages vs one, and the one is right

**Wrong** — `glossary__glossary.md`: "**Ballot ID** — The identifier **shown on your confirmation page** (and in your email receipt…)"
**Wrong** — `exporting-data__exporting_your_data.md`: "each voter is **shown their own ballot ID on the confirmation screen** after voting"
**Right** — `voter-troubleshooting__voter_troubleshooting.md`: "Your ballot ID appears **only in this receipt** — it is deliberately not shown in your browser after voting, which protects voters from being pressured to prove how they voted."

**Source:** `Thanks.tsx` (the post-submit confirmation page) renders no ballot ID; `castVoteController.ts:275` has the comment *"Scrub ballot_id to prevent voters from creating receipts (vote buying/coercion)"*. The ID appears only on `VerifyBallot.tsx`, reached via the receipt link. `voter-troubleshooting` matches the code — and it also explains *why*, which the other two would silently break. `exporting-data`'s "Voters can find their own ballot" section needs rewording: the receipt-check flow only works for voters who got a receipt email.

### C3. Who can archive an election — the glossary contradicts itself

`glossary__glossary.md`, **Admin** entry (right): "Admins **cannot** delete the election, change who has which role, or **finalize/open/close** the election — those belong to the owner."
`glossary__glossary.md`, **Archived** entry (wrong): "**An admin can archive an election** from any state."

**Source:** `archiveElectionController.ts` requires `permissions.canEditElectionState`, which is `[system_admin, owner]` only (`packages/shared/src/domain_model/permissions.ts`). Archiving is owner-only; the Archived entry should say "the owner".

### C4. Whether hidden preliminary results are visible to admins — glossary vs preliminary_results

`glossary__glossary.md`, **Admin** and **Auditor** entries: admins/auditors "can … **view preliminary results**".
`MAIN__preliminary_results.md` (right): "When the setting is off, the tally is **hidden from everyone (both admins and voters)** until the election is closed."

**Source:** `getElectionResultsController.ts:25-30` — when `public_results` is off and state is `open`, the request is `Forbidden` for *everyone*, before any permission check. `canViewPreliminaryResults` only takes effect on a **closed** election whose results aren't yet public. The glossary entries read as "admins can watch the live tally", which is exactly the assurance `preliminary_results.md` and `is_my_vote_secret.md` ("An organiser cannot quietly watch the votes arrive during a live election") were written to give. Reword both glossary entries to "view results of a closed election before they're published".

### C5. Whether a shared-link voter can get a receipt — after_you_vote vs two pages

**Wrong** — `voter-pages__after_you_vote.md`: "If you voted through a shared link without email, **there's no receipt to send** — the confirmation screen … is your confirmation."
**Right** — `voter-troubleshooting__voter_troubleshooting.md`: "In the submit dialog you can have a receipt sent (*'Send Ballot Receipt Email?'*) … otherwise **you can type an address into the optional field**."
**Right** — `voter-emails__emails_to_voters.md`: receipts go out "from your email list, from their signed-in account, **or from the optional receipt-email box on the ballot submission screen**."

**Source:** `castVoteController.ts:252` — `event.userEmail = event.roll?.email ?? …user email… ?? req.body.receiptEmail`. The optional box exists in any election. `after_you_vote` is wrong, and its error matters: it tells exactly the voters who *most* need the optional box that no receipt exists.

### C6. What a "poll" calls a candidate — election_or_poll vs polls_and_multiple_races

`election-or-poll__election_or_poll.md` (right): candidate → **choice**.
`polls-multirace__polls_and_multiple_races.md` (wrong): "a poll says 'question', '**option**', and 'response'".

**Source:** `en.yaml` `keyword.poll.candidate: choice`. Small, but these are the two pages a reader will compare directly, and one of them prints the substitution table.

### C7. When test ballots are deleted — how_to_vote vs everyone else

**Wrong** — `voter-pages__how_to_vote.md`: "Your ballot will not count, and it will be **deleted when the real election opens**."
**Right** — `election-states__election_states.md`, `voter-emails__emails_to_voters.md`, `glossary__glossary.md`, `admin-pages__before_you_open.md`: deleted **when the admin finalizes**.

**Source:** `finalizeElectionController.ts` calls `innerDeleteAllBallotsForElectionID`. With a scheduled start time, finalize and open can be days apart; the app's own banner says "reset prior to the final election". Small fix in `how_to_vote`.

### C8. What the organiser can see about your ballot — after_you_vote hedges what is_my_vote_secret states as invariant

`voter-pages__after_you_vote.md`: "Your ballot is not shown publicly alongside your name. **What the organiser can see depends on how they set the election up** … If ballot secrecy matters for your situation, **ask the organiser directly what they configured**."
`ballot-secrecy__is_my_vote_secret.md`: "**nobody — including the person running your election — can see how *you* voted**" — unconditional, and correct.

**Source:** `getBallotsByElectionIDController.ts` strips `user_id`, `ip_hash`, timestamps, and history from every ballot handed to *any* role, always — it is not a setting. `after_you_vote` isn't flatly false (who-has-voted visibility does depend on there being a voter list), but its "depends on configuration, ask the organiser" framing directly undercuts the sibling page's central, code-backed promise. Rewrite the paragraph to state the invariant and link `is_my_vote_secret.md` for the limits.

### C9. Whether randomized candidate order is exceptional or the default

`voter-pages__how_to_vote.md`: "**Some organisers turn on** randomised order…" (frames it as opt-in).
`ballot-options__ballot_options.md` (right): "This option is **on by default**."

**Source:** `Wizard.tsx` default settings: `random_candidate_order: true`.

### Minor factual slips (no opposing page, but wrong against source)

- `help-tree__for_voters.md`: "you may be asked for your email or a **verification code**" — nothing in the product asks for a verification code; it's a voter ID or account sign-in. (Also its step 2 example is STAR-specific for a method-agnostic page.)
- `glossary__glossary.md` **Ballot ID**: "in your email receipt, **for email-list elections**" — receipts (and their ballot link) exist in any election where an email is known (C5's source).
- `ballot-options__ballot_options.md` opening note: "**Once voting opens**, the ballot is locked" — the lock is at finalize (`ElectionSettings.tsx`: `disabled={election.state !== 'draft'}`), which precedes opening.

---

## 2. Duplicated coverage

Ordered by how much text is duplicated.

1. **Email blasts: `managing-voters__managing_your_voters.md` §"Emailing your voters" vs the whole of `voter-emails__emails_to_voters.md`.** Both walk template choice, formatting/placeholders (`__VOTE_BUTTON__`, `__ELECTION_HOME_BUTTON__`), audience targeting, test sends, timing warnings, delivery events, and the audit-logged "Obtain Unique Voting URL" escape hatch — near-paragraph-level duplication of an 8-step workflow. **`voter-emails` should own everything email**; `managing-voters` keeps a 3-4 line summary + link. (These two also agree with each other everywhere, to their authors' credit.)

2. **Vote editing: `ballot-options__ballot_options.md` §"Allow Voters To Edit Vote" vs `editable-ballots__letting_voters_change_their_vote.md`.** Two admin-facing explanations of the same setting: both give the email-list-only restriction, the replace-not-add semantics, and the three verification-page messages verbatim. **`letting_voters_change_their_vote` should own it** (it adds the trade-off analysis and the three cautions); `ballot-options` keeps its quick-reference table row plus two sentences + link. (`after_you_vote`'s voter-side table is the third copy of the three messages — acceptable, different audience, but it should link the owning page.)

3. **Basic vs Proportional: `admin-pages__electing_more_than_one.md` vs `method-chooser__choosing_a_voting_method.md` §"How many winners?" vs `bloc-star-help-page__bloc_star.md` §"Is Bloc STAR right for your election?".** Three full explanations of the majority-takes-all-seats phenomenon, two of them sharing a near-verbatim sentence ("If you're filling seats … meant to represent people and you pick Basic, you may be surprised by the result"). **`electing_more_than_one` should own the concept**; `method-chooser` keeps its two-row table + one sentence + link; `bloc_star` keeps its Bloc-STAR-specific VRA/at-large material (that part is unique and good) but defers the generic bloc-vs-proportional framing.

4. **Tie-break verification: `ties-rewrite__ties.md` §"Random Tie-breakers" vs `tie-verification__verifying_a_tie_break.md`.** The determinism rationale, the two seed inputs, the published-full-order point, and the raw-vs-tally-count warning each appear in full on both pages (the warning nearly verbatim: "The shuffle uses the **raw** ballot count … The results page shows a **tally** count"). **`verifying_a_tie_break` should own verification**; `ties` keeps "how a tie is broken" and a two-line pointer.

5. **"Decide your tie rule in advance": `ties-rewrite__ties.md` vs `tie-policy__choosing_a_tie_breaking_rule.md`.** Both argue the advance-commitment point at length. **`choosing_a_tie_breaking_rule` should own the governance argument**; `ties` states it in one sentence + link.

6. **Election vs poll: `election-or-poll__election_or_poll.md` vs `polls-multirace__polls_and_multiple_races.md` §"Polls versus elections".** The latter's section is a compressed (and per C6, slightly wrong) copy. **`election_or_poll` owns it**; `polls_and_multiple_races` cuts to one sentence + link.

7. **What a draft test doesn't prove: `election-states__election_states.md` §"What a test vote does and doesn't tell you" vs `admin-pages__before_you_open.md` §"Your test run" vs `editable-ballots` third caution.** Same three skipped checks (voter auth, one-person-one-vote, ballot updates) explained three times. **`election_states` should own it**; the other two keep one line + link.

8. **Error-message table: `voter-access__how_voters_get_access.md` §"Why can't I vote?" vs `voter-troubleshooting__voter_troubleshooting.md` §"Quick reference".** Two overlapping message-by-message tables. **`voter_troubleshooting` owns the error catalogue**; `voter-access` trims to the three access-specific rows or just links.

9. **Duplicate-race-to-compare-methods trick: `polls-multirace` §"Same question, two voting methods" vs `method-chooser` §"Try them side by side".** Same trick, both at length. `polls_and_multiple_races` owns the mechanics; `method-chooser` keeps two sentences.

---

## 3. Terminology

| Term | Variants found | Recommended form (source-grounded) |
|---|---|---|
| The person running the election | "organiser" (`how_to_vote`, `after_you_vote`, `is_my_vote_secret`, `voter_troubleshooting` — 48 uses); "administrator" (`how_voters_get_access` — 11, `verifying_a_tie_break` — 3); "admin"/"election admin" (everything else, incl. all of main) | **"election admin"** on first use, "admin" after (matches main pages and the UI). If a voter-facing softer word is wanted, pick ONE and use it in all five voter pages — currently a reader meets all three words. Note "Admin" is also a specific role (glossary) distinct from Owner — the generic use blurs C3/C4-type facts, so voter pages saying "organiser/admin" should not imply the role. |
| Multi-winner, non-proportional | "Basic Multi-Winner" (`electing_more_than_one`, `method-chooser`, `bloc_star`, `glossary`); "bloc multi-winner" (`polls_and_multiple_races`); "Bloc" (`paper_ballots` on main) | **"Basic Multi-Winner"** for the UI control, with "(also called bloc)" once per page where useful — exactly as `glossary` already does. Fix `polls_and_multiple_races`. |
| Proportional STAR | "Proportional STAR Voting", "Proportional STAR", "STAR PR", "STAR-PR" (`exporting-data` CSV table) | Official (`en.yaml`): full name **"Proportional STAR Voting"**, short **"STAR PR"**. `method-chooser` uses "Proportional STAR" and "STAR PR" in the same page; `exporting-data`'s "STAR-PR" (hyphen) matches nothing. |
| Ranked Choice Voting | "Ranked Choice Voting", "RCV", "Ranked Choice (RCV)" (`exporting-data`) | Official: full **"Ranked Choice Voting"**, short **"RCV"** — pages are mostly fine; standardize `exporting-data`'s table headers. |
| Choose One | "Choose One" (most), "Choose One Plurality" (`glossary`, `polls_and_multiple_races`) | Official full name is **"Choose One Plurality"**, short "Choose One". Glossary's treatment (full name once, short after) is the model. |
| Poll vocabulary | candidate → "choice" vs "option" (C6) | **choice** (`en.yaml keyword.poll.candidate`) |
| The tie protocol's name | "Official Tie-breaker Protocol" (main `ties`, `tie-policy` link text), "Official Tiebreaker Protocol" (main `ties` prose, `glossary`), "The tie-breaking protocol" (`ties-rewrite` heading) | Pick one spelling — suggest **"Official Tiebreaker Protocol"** — and note that `tie-policy` links to a heading `ties-rewrite` renames, so if both branches land, that anchor breaks. |
| Voter list / voter roll | "voter list" and "voter roll" interchangeably (`managing-voters`, `glossary`) | Fine — glossary declares the synonym. Keep "voter list" as lead term (UI uses it). |
| Runoff no-preference bucket | "Equal Support" (`results-page`, `top_score_vs_winner`, `glossary`, `bloc_star` eventually); "no preference" as lead term (`bloc_star` §"How the count works", main `hand_count`'s piles) | **"Equal Support"** — it's the chart label (`en.yaml results.equal_preferences: Equal Support`). `bloc_star` should lead with it rather than arriving at it late; `hand_count` (main) predates the label and could mention it. |
| Election states | Five states, named identically everywhere checked | ✓ Clean — matches `validElectionStates` exactly. Genuinely good cross-author consistency. |

---

## 4. Voice and person

- **British vs American English splits the corpus by author.** British (favourite/randomised/organiser/customise): `how_to_vote`, `after_you_vote`, `voter_troubleshooting`, `is_my_vote_secret`, `method-chooser`, `ties-rewrite`. American: everything else including all of main. Pick American (the app, main pages, and Equal Vote are American) and sweep the six.
- **Second person holds well overall** — nearly every page is "you", plain and definite. The main drift:
  - `bloc_star.md` shifts into spec-citation register ("§3.d prescribes", "§3.e permits paraphrase") mid-page — useful content, but it reads as written for implementers, not admins. Consider moving the spec-wording comparison into a collapsed note or the Paper Ballots page.
  - `choosing_a_tie_breaking_rule.md` is essay-register (Robert's Rules history, Virginia 1705, legal-advice disclaimers). Defensible for its audience (bylaw writers), but it is the only page of its kind; be aware it sits apart.
  - `glossary.md` is reference-neutral third person — correct for a glossary.
- **Hedging where a sibling is definite:** `after_you_vote` §"Who can see how I voted?" (C8) is the serious case. Also `after_you_vote` "Some elections don't publish results publicly at all. … If you were expecting results and there's no link, ask them" — vaguer than `exporting-data`'s precise visibility table; a link would fix it.
- `voter_troubleshooting`'s error-code note (quote the code in parentheses) is a genuinely good convention no other page mentions — promote it, don't dilute it.

---

## 5. The wiring list (links to add once everything merges)

~52 insertions. Format: page → add link to (where).

**voter-pages__how_to_vote.md** → `how_voters_get_access.md` (§Getting to your ballot); `voter_troubleshooting.md` (§If something goes wrong — replace the generic "contact the organiser" advice); `election_states.md` (§test mode); `glossary.md` (first use of method names).
**voter-pages__after_you_vote.md** → `letting_voters_change_their_vote.md` (§Can I change my vote); `is_my_vote_secret.md` (§Who can see how I voted — per C8); `reading_your_results.md` (§"how the count actually worked, round by round"); `voter_troubleshooting.md` (§Did my vote actually count).
**voter-access__how_voters_get_access.md** → `voter_troubleshooting.md` (§Why can't I vote table → defer); `managing_your_voters.md` (§Notes for administrators); `emails_to_voters.md` (§Email list); `letting_voters_change_their_vote.md` (§One ballot per voter); `election_states.md` (test-mode note).
**voter-troubleshooting__voter_troubleshooting.md** → `how_voters_get_access.md` (§Voter ID problems); `emails_to_voters.md` (§I never received my invitation); `election_states.md` (§Test Mode warning, §Election is not open); `after_you_vote.md` (§Did my vote count); `reading_your_results.md` (§Did my vote count, results sentence).
**ballot-secrecy__is_my_vote_secret.md** → `exporting_your_data.md` (§Why the order is shuffled — the download is where the shuffle is visible); `managing_your_voters.md` (§What the organiser can see); `glossary.md` (roles table → role entries).
**editable-ballots__letting_voters_change_their_vote.md** → `after_you_vote.md` (voter-side view of the three messages); `election_states.md` (draft caution); `emails_to_voters.md` (receipt-link-as-credential warning).
**admin-pages__before_you_open.md** → `choosing_a_voting_method.md` (§Your method — the text "see the guide to choosing a voting method" is currently an unlinked promise); `electing_more_than_one.md` (§Basic or Proportional bullet); `election_states.md` (§Then finalize); `managing_your_voters.md` (§Your voters); `emails_to_voters.md` (§After you open — "retrieve their unique voting URL"); `letting_voters_change_their_vote.md` (change-vote checklist item); `reading_your_results.md` (§preliminary results bullet).
**admin-pages__electing_more_than_one.md** → `bloc_star.md` (§Which methods support which — Basic STAR row); `choosing_a_voting_method.md` (intro); `glossary.md` (quota).
**election-states__election_states.md** → `before_you_open.md` (§Finalized); `emails_to_voters.md` (§Draft — "emails carry a warning"); `letting_voters_change_their_vote.md` (§What a test vote can't tell you, third bullet).
**election-or-poll__election_or_poll.md** → `polls_and_multiple_races.md` (§Which should I pick — "one question on one screen" quick path); `election_states.md` (the draft-only note).
**polls-multirace__polls_and_multiple_races.md** → `election_or_poll.md` (§Polls versus elections — replace the duplicated section); `choosing_a_voting_method.md` (§Multiple races, method-per-race list); `election_states.md` (draft/finalize notes); `ballot_options.md` (write-ins mention).
**method-chooser__choosing_a_voting_method.md** → `electing_more_than_one.md` (§How many winners — defer); `bloc_star.md` (Basic STAR); `polls_and_multiple_races.md` (§Try them side by side — the duplicate-race mechanics); `top_score_vs_winner.md` or `reading_your_results.md` (STAR paragraph); `glossary.md` (Condorcet, from the Ranked Robin row).
**bloc-star-help-page__bloc_star.md** → `electing_more_than_one.md` (§Is Bloc STAR right — generic framing); `reading_your_results.md` (§worked example — "runoff percentage is a share of everyone who voted"); also convert its `.html` links to `.md`.
**results-page__reading_your_results.md** → `top_score_vs_winner.md` (§the two round charts — "the candidate with the most stars is not always the winner"); `exporting_your_data.md` (§Stats for Nerds — "read the anonymized ballots directly"); `verifying_a_tie_break.md` (§Tabulation Steps — tiebreaker sentence); `glossary.md` (Equal Support first use).
**1159-top-scorer-explainer__top_score_vs_winner.md** → `reading_your_results.md` (§The two rounds — where those charts live).
**ties-rewrite__ties.md** → `verifying_a_tie_break.md` (§How to check what happened — defer the whole procedure); `choosing_a_tie_breaking_rule.md` (§Decide your rule in advance and §Breaking a tie yourself); `exporting_your_data.md` (§downloadable election data); `election_states.md` (§Ties in small and test elections — test ballots deleted at finalize).
**tie-policy__choosing_a_tie_breaking_rule.md** → `verifying_a_tie_break.md` (§option 1, "published, deterministic shuffle"); `exporting_your_data.md` (if your rule needs the ballots).
**tie-verification__verifying_a_tie_break.md** → `exporting_your_data.md` (§How to check it, step 1); `reading_your_results.md` (§What gets published — "the results page").
**exporting-data__exporting_your_data.md** → `reading_your_results.md` (its own intro says "see the results documentation" with no link); `is_my_vote_secret.md` (§What is deliberately NOT in the file); `verifying_a_tie_break.md` (§Results section of the JSON).
**managing-voters__managing_your_voters.md** → `emails_to_voters.md` (§Emailing your voters — defer); `is_my_vote_secret.md` (the whether-not-how note); `how_voters_get_access.md` (§The two kinds of voter list — the voter's-eye view); `election_states.md` (§What you can still do after finalizing).
**voter-emails__emails_to_voters.md** → `managing_your_voters.md` (delivery-events detail); `election_states.md` (§What finalizing does); `voter_troubleshooting.md` (§When a voter never receives an email — the voter-side version).
**ballot-options__ballot_options.md** → `letting_voters_change_their_vote.md` (§Allow Voters To Edit Vote — defer); `voter_troubleshooting.md` (§warnings while filling out the ballot — the same two RCV warnings); `election_states.md` (draft note).
**glossary__glossary.md** → `election_states.md` (the five state entries); `reading_your_results.md` (Stats for Nerds, Equal Support); `exporting_your_data.md` (Cast vote record); `letting_voters_change_their_vote.md` (Ballot ID / updates); `how_voters_get_access.md` (Email list / ID list / Restricted election).
**tips-and-tricks__tips_and_tricks.md** → `before_you_open.md` (§Test with a draft first); `choosing_a_tie_breaking_rule.md` (§Say what happens in a tie); fix `ties.html` → `ties.md`.
**is_my_vote_secret / after_you_vote / how_voters_get_access** already link `security_options.md` and `preliminary_results.md` correctly (those were on main) — no change.

---

## 6. Structural nits

1. **Two competing navigation restructures.** `fork/docs/help-tree` and `fork/docs/nav-structure` both re-parent the existing main pages, incompatibly: `help-tree` builds a two-tier tree (For Voters / Running an Election → Setting Up / Counting and Results / Reference) with three landing pages that have real content; `nav-structure` builds a flat three-section tree (Setting Up / Counting and Results / Reference directly under root) with stub landing pages. Only one can land; every other branch's `nav_order`/`parent` assumes the flat pre-restructure tree, so whichever wins forces a front-matter sweep across all ~24 new pages. Decide this first.
2. **`nav_order` collisions among pages that assume the flat tree:** 4 (`how_to_vote`, `top_score_vs_winner`), 5 (`after_you_vote`, main `paper_ballots`), 6 (`before_you_open`, `ties`, main `hand_count`), 7 (`electing_more_than_one`, main `security_options`), 8 (`is_my_vote_secret`, main `preliminary_results`), 9 (`bloc_star`, `reading_your_results`, `tips_and_tricks`), 1/2/3 (`election_states`, `election_or_poll`, `choosing_a_voting_method` vs help-tree's section pages). Just-the-docs breaks ties alphabetically, so nothing errors — the order is simply arbitrary.
3. **Three link styles:** relative `.md` (most new pages — correct per the docs conventions), relative `.html` (`bloc_star`, `tips_and_tricks`), absolute `https://docs.bettervoting.com/...` (main's `preliminary_results`, `security_options`). Standardize on relative `.md`.
4. **Closing-section naming:** "Related" / "Related pages" / "See also" / "More reading" / nothing (`managing_your_voters`, `exporting_your_data`, `glossary` end without one). Pick "Related".
5. **Callout usage:** new pages use just-the-docs callouts (`{: .note }`, `{: .warning }`, `{: .important }`); main pages use plain `>` blockquotes. Fine to leave main alone, but `ties-rewrite` (which replaces a main page) should stay consistent with whichever direction is chosen.
6. **`{:toc}` appears on some pages** (`ties` main, `ties-rewrite`? no, `tie-policy`, `results-page`, `bloc_star`, `top_score_vs_winner`, `tips_and_tricks`) **and not others**, and where present it sits bare above the H1 without the usual `1. TOC {:toc}` list construct, so it likely renders nothing. Verify in the Jekyll preview; either wire it properly everywhere or drop it.
7. **Title casing:** most titles are Title Case; `top_score_vs_winner` ("Why the highest score doesn't always win") and main's `how_to_enable_beta_features` are sentence case.
8. **`voter_troubleshooting`'s page title is "Voting Problems"** while its filename and every likely cross-reference say "troubleshooting" — fine, but pick deliberately.

---

## 7. Gaps between pages

1. **"I closed my election by mistake — can I reopen it?"** `election_states.md` covers archived-can't-reopen and no-return-to-draft but never says whether closed → open is possible. The code says it is, for manually-controlled elections (`setOpenStateController.ts` allows `open` on a `closed` election without scheduled times, and refuses for scheduled ones). No page answers this; `election_states` §Closed is the natural home.
2. **How helper roles are granted at all.** `is_my_vote_secret`, `managing_your_voters`, and `glossary` all *use* the Owner/Admin/Auditor/Credentialer roles (two of them print permission tables), but no page says where you add a person to a role (the Edit Roles screen) or that only the owner can (`canEditElectionRoles`). Falls between `managing_your_voters` and the glossary; deserves a short section in `managing_your_voters` or its own page.
3. **The close → review → publish-results flow.** `preliminary_results` covers visibility before close; `exporting_your_data`'s table implies the flow ("close the election, review, then make the results public"); `after_you_vote` tells voters "ask the organiser". No admin page actually walks publishing results after close — the single most common end-of-election admin task. Natural home: `reading_your_results.md` or a short section in `before_you_open`'s successor.
4. **Reading non-STAR results.** `reading_your_results` is explicitly STAR-only ("other methods share the same layout") and `glossary` defines *exhausted* ballots, but no page explains the RCV rounds table, transfers, or exhausted-ballot rows a reader will actually see — the methods most likely to confuse. At minimum, a paragraph per method family in `reading_your_results`.
5. **Precincts.** `exporting_your_data` documents a `precinct` CSV column and `is_my_vote_secret` mentions precinct in the anonymized data; nothing says what a precinct is or how a voter gets one. One glossary entry would close it.
6. **Deleting an election.** `glossary` (Owner: "delete the election") is the only mention; `election_states` presents archiving as the only shelving mechanism and never mentions deletion. Either `election_states` should mention delete-vs-archive or the glossary claim should be checked against what the UI actually exposes.
7. **The 100-voter free-tier limit** appears only in `managing_your_voters`. `before_you_open`'s checklist and `how_voters_get_access`'s admin notes — where a large-election admin actually is — don't mention it.

---

## Overall

The corpus is in better shape than 11 independent authors had any right to produce: the five election states, the tie-break mechanics, the ballot-anonymization story, and the Basic/Proportional distinction are told consistently almost everywhere, and the two pages most likely to collide (`managing_your_voters` / `emails_to_voters`) agree on every fact while duplicating half their text. The real work is: fix the invitation-auto-send cluster (C1) and the five smaller factual contradictions; merge or trim the nine duplications; pick one navigation restructure; and do one ~52-link wiring PR plus an organiser→admin / British→American sweep.
