BV240c - Closed-list extra warning layer

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [BV240 index](BV240-index.md)
- [BV240a](BV240a-notice-appears-on-ballot.md) — the base notice this case adds a layer to
- [BV240d](BV240d-closed-list-plus-edit-vote.md) — the same layer escalated for edit-vote

video: tbd
issue: <https://github.com/Equal-Vote/bettervoting/issues/1350>
status: **Not ready — two blockers: (1) feature not implemented, (2) closed-list wording not approved (open question Q2)**

# Purpose

Requirement (iii) of #1350: an **additional** warning layer for closed-list elections, on top of the base notice BV240a covers. A closed list is where the privacy risk is real — the admin holds a named roster *and* a live tally, so the two can be correlated.

**This case is blocked twice over, and the two blockers are different in kind.**

- **Blocker 1 — the feature doesn't exist.** Same as every other BV240 case. Nothing to look at until the PR lands.
- **Blocker 2 — nobody has approved what the second layer may say.** That is open question **Q2** on the ticket. This is not a scheduling problem: the honest version of the claim is *narrower* than the issue's own framing, and the difference is the whole reason Q2 exists. **Do not finalize the "Expected results" wording in this document until Q2 is answered.**

**What you can still run before Q2 is settled:** the **structure**. Does a second layer appear at all? Is it gated on the right predicate? Is it distinct from the base notice rather than replacing it? Those are answerable against a build without anyone having signed off a sentence. Run the structural half, record it, and leave the content half open. See [Expected results](#expected-results), which is split along exactly that line.

# Prerequisites

1. **The feature must be implemented.** As of 2026-07-29 there is no notice of any kind in the voter flow, base or closed-list. Run against a local `docker compose` stack during PR review, then re-run on production after deploy.
2. **BV240a must pass first, on the same build.** This case asserts "base notice **plus** a second layer". If the base notice is broken or absent, a failure here is BV240a's failure, not this one's. Run them back to back.
3. **A real voter roll.** A closed list needs voter IDs entered before the election is finalized, and the voter reaches the ballot through a **per-voter** URL (`/{election_id}/id/{voter_id}`), not the open share link. Enter **3 voter IDs** — enough that "which voters have voted" is a meaningful statement rather than a set of one.
4. **Two browser contexts.** Admin in your normal window; the ballot in a **private / incognito window**, opened on a voter-specific URL. As in BV240a, an admin looking at their own ballot sees banners a voter never does.
5. Admin login: the **Admin1** test account — credentials live in the sheet’s testing-credentials tab, not here.
6. **`curl` and `jq`** for the export check in step 7.

# Master data

Election configuration **E3** — used only by this case. E4 (BV240d) is the other closed-list config and differs in two fields.

| Field | Value | Notes |
|---|---|---|
| Method | STAR | Irrelevant here; the renderer is BV240j's problem |
| Races | 1 | |
| Candidates | 3 | Fastest setup: **duplicate** the "STAR Voting - Fruits" template (<https://bettervoting.com/bbyqh7/admin>) and change the access mode. Duplicate resets title / URL / owner / state only, so `settings.public_results` carries over — confirm it in step 1 rather than assuming it |
| Winners / seats | 1 | |
| Who can vote | **Closed list — admin-managed IDs** | ← the variable under test. `settings.voter_access` becomes `closed` |
| Invitation | not email | Admin-managed IDs means you distribute the voter URLs yourself |
| **Show Preliminary Results** | **ON** | Required — the base notice is a precondition for the extra layer |
| Allow Voters To Edit Vote | **OFF** | Edit-vote is illegal in this access mode. See note |
| State | Open (finalized, voting open) | |
| Voter IDs on the roll | 3 | |
| Ballots already cast | 1 | So the roll shows a mix of voted / not-voted |

**Why edit-vote must be OFF here.** `ballot_updates` requires `voter_access != open` **and** `invitation == email`. Admin-managed IDs satisfies the first and not the second, so the switch will 400 and silently revert if you try. That combination is a legal configuration in exactly one access mode — BV-managed IDs + email — which is why it gets its own case, **BV240d**. Don't fight it here.

**Both closed modes are the same population for this warning.** The layer's predicate is `voter_access === "closed"`, which both closed modes satisfy. The redaction difference between them (`voter_id` is stripped from roll responses only when `invitation == email`) is about the ability to *act as* a voter, not to *read* their ballot — so it does not change what this layer may claim. BV240d escalates for **edit-vote**, not for being more closed.

# Test steps

1. As admin, confirm: access mode is a closed list, **Show Preliminary Results** is ON, edit-vote is OFF, election is open, 3 IDs on the roll, 1 ballot cast.
2. **Substantiate the premise while you're on the admin side** (see the note below): open the voter roll and screenshot the per-voter **Has Voted** column and any submit timestamp shown. This is what the copy is going to assert to voters; capture the evidence in the same run.
3. Copy a voter URL for an **unused** voter ID.
4. Open it in a **private / incognito window**. **Before scrolling and before entering any scores**, screenshot the ballot page.
5. Identify the layers. There should be **two distinct statements**: the base notice (results are public / inference is possible / link to the article) and a **second** closed-list statement. Record whether they are two visually separate blocks, one block with two paragraphs, or one merged sentence — the requirement is that the closed-list content is *present and additional*, not that it is a separate box.
6. Read the closed-list text word by word against the MAY / MUST NOT list below. **This is the step with teeth in this case** — a shipped layer that overclaims fails, and it fails for a reason nobody looks for.
7. **Verify the settings against the server** (see below).
8. **Then the control.** Open BV240a's E1 ballot (open access, flag ON) in the same session and confirm the closed-list layer is **not** there. A layer that renders on open-access elections is a wrong predicate, and this is the only cheap way to see it.

**Do not submit.** The submit dialog is BV240i, the link behaviour is BV240g.

## Step 7 — the export check

```
curl -s https://bettervoting.com/API/Election/<election_id> | jq '.election.settings'
```

Expected in `election.settings`:

```json
{
  "public_results": true,
  "ballot_updates": false,
  "voter_access": "closed",
  ...
}
```

**`voter_access` is the load-bearing field in this case.** The layer must be gated on `election.settings.voter_access === "closed"` — not on the derived voter-authentication mode, which throws on a non-canonical settings shape and would take a ballot render down with it on a legacy row. So the export is not a formality here: it is the assertion that the string the implementation reads actually holds the value the UI claims. If the layer is absent and `voter_access` is not `closed`, you configured the election wrong and the case did not run.

**Use the API, not the UI "Download JSON" button.** [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to a v2 format; the `/API/Election/<id>` response is the raw backend object and is unchanged by that work, so a check written against the API survives it.

**Why the check belongs here at all.** The toggle and the access-mode picker are UI claims; the export is what the database holds. Those disagreed for three months until `7cbc6079` (2026-07-27) fixed a stale-render bug. One anonymous GET records all three BV240 variables at once.

# Expected results

Split deliberately. **Part A is testable now** (once the feature ships) and is independent of Q2. **Part B is blocked on Q2** and the sentences below are placeholders, not an answer key.

## Part A — structural (assert these; not blocked on Q2)

1. **The base notice from BV240a is present and unchanged.** The closed-list layer *adds*; it does not replace.
2. **A second, additional statement about closed lists is present**, above the ballot, visible on first paint without scrolling.
3. **It appears before any interaction** — not on submit, not after filling the ballot.
4. **It is gated on `voter_access === "closed"`** — present here, absent on E1 (step 8).
5. **It appears once**, not once per race.
6. **The server agrees** — `voter_access: "closed"`, `public_results: true`, `ballot_updates: false`.
7. **It does not depend on how many ballots exist.** Re-check with 0 ballots cast: the first voter on a closed list is the one the timing argument most applies to.

## Part B — content (BLOCKED on Q2; do not finalize)

The layer's claim must land inside these bounds. The bounds themselves are settled from source; **who signs the sentence is not.**

**It MAY say — administrators can see which voters have cast a ballot, and when.** This is not a leak, it is a first-class feature: the roll UI renders a **Has Voted** state per *named* voter with timestamped submit history. True in **both** closed modes.

**It MAY say — combined with a live tally, that timing can make it possible to infer how a particular person voted.** This is the actual hazard, and it is the reason the extra layer exists at all.

**It MUST NOT say — that an administrator can look up a voter's ballot.** They cannot. `ballot_id` is scrubbed from **every** roll response unconditionally, and the voter→ballot join primitive is called from exactly one place — the edit-vote path in `castVoteController` — never from an admin endpoint.

**Proposed wording (reference only, not yet approved, and explicitly subject to Q2):**

> This election uses a voter list. Administrators can see which voters have voted and when. Combined with live results, that timing can narrow down how a particular voter voted.

**Assert on the three bounds above, not on this string.** It is written to be inside the bounds so that it can serve as a structural placeholder; it carries no approval.

**Why Q2 exists, in one line.** The issue's own framing — that it is *"extra trivial for them to reveal what those votes are"* — overstates what the code allows. "Trivial" describes a lookup; what the code supports is an **inference** from timing, which requires a quiet window and gives a probabilistic answer. Narrowing a strong claim on Equal Vote's own product, printed on the ballot page, is a messaging decision, not an engineering one. That is the whole of Q2.

# Pass / fail

**This case has an unusual failure mode: it can fail for saying too much.** Most disclaimer tests only fail on absence. Flag that when reporting, because a reviewer skimming a pass/fail column will not expect it.

- **Structural pass, content deferred** — the expected outcome of any run made **before Q2 is answered**. Part A all met; Part B recorded verbatim but not adjudicated. This is a legitimate result, not a skip. Record the shipped text in Actual results so that whoever answers Q2 is looking at real copy.
- **Pass** — Part A all met **and** Part B within bounds, adjudicated after Q2.
- **Fail — missing.** No second layer, or the closed-list content is absent from a merged notice. The base notice alone does not discharge requirement (iii); a closed-list voter is in a materially different position and the issue calls that out separately.
- **Fail — INACCURATE (overclaim).** The layer states or implies that an administrator can see, retrieve, or look up an individual's ballot. **Fail it, and file it as an accuracy defect, not as a copy nit.** A privacy notice that overstates the product's own exposure is a self-inflicted quotable, and it also teaches voters a false model of where the risk lives.
- **Fail — wrong predicate.** The layer renders on E1 (open access, step 8), or is missing here while `voter_access` reads `closed` in the export. Localize which: absent-with-correct-export is a gate bug; present-on-open is an inverted or over-broad condition.
- **Fail — different problem.** Part A6 disagrees with the UI (the export says `open` while the picker says closed, or `public_results` disagrees). That is a settings-persistence bug, not a disclaimer bug. Record separately.

# Actual results

*[screenshot — admin voter roll, mid-election, showing the per-voter Has Voted column and submit timestamps: the evidence for what the copy asserts]*

*[screenshot — closed-list ballot page, incognito, before any interaction, full viewport: shows whether both layers are above the fold]*

*[screenshot — close-up of the two layers together, base notice and closed-list layer in one frame]*

*[verbatim text — the closed-list layer's exact wording, copy-pasted as text (not only as an image) so it can be pasted into the Q2 thread]*

*[screenshot — E1 open-access ballot from step 8, same build, same session: closed-list layer absent]*

*[export excerpt — `election.settings` showing `voter_access: "closed"`, `public_results: true`, `ballot_updates: false`]*

# Notes

- **Verify the premise, don't inherit it.** The claim the copy rests on — admins see who voted and when — is documented in the roll UI (`EditElectionRoll.tsx:157`, "Has Voted", plus an Action/Actor/Timestamp table). The analysis also records a refuse-on-open path in `getElectionRollController.ts:108-110`. Which of those governs the **admin's** view of the roll during an **open** election was never executed against a running stack — it is read from source, **not observed**. Step 2 settles it. If the admin genuinely cannot see the roll mid-election, the timing argument weakens and Q2's answer changes with it, so this is worth five minutes.
- **Two predictions in this set were already refuted by screenshots.** Treat every "expected" here that came from reading code as a prediction until a screenshot says otherwise, and label it that way in Actual results.
- **BV240a's link and dialog behaviours apply to this layer too**, and are not retested here. If the closed-list layer carries its own link and that link is same-tab, that's **BV240g**'s finding — note it and move on.
- **The invite email is the chronologically first surface for a closed list** and is not covered by any BV240 case (open question **Q6**). If the layer's argument is that the voter should know before casting, the invitation arrives before the ballot does. Out of scope here; worth a line in the ticket.
- **Attach the settings excerpt, not the whole export.** On a closed list, `credential_ids` / `admin_ids` can hold voter and admin identifiers — on an **email**-invitation election, actual email addresses. This case's mode is admin-managed IDs, so those are IDs you invented, but check before attaching a full export to a shared document.
- **Don't fold BV240d in.** The edit-vote escalation is a stronger claim resting on a different mechanism (a stable ballot id persisting across edits, published as column 1 of the public export). Keeping them separate means a failure points at one sentence.

# Related

- **BV240a** — the base notice this layer sits on top of. Must pass first, same build.
- **BV240d** — closed list **+ edit-vote**: same layer, escalated. Also blocked on Q2.
- **BV240b** — the flag-OFF negative; with results hidden, neither layer should appear.
- **BV240k** — renders-once, on the multi-race variant. Part A5 here is a spot check of the same property.
- **BV240i** — the submit dialog. Whether the closed-list sentence also belongs there is part of Q1, not this case.
- **Q2** (ticket open question) — the blocker. This case cannot be finalized without it.
- **Q6** (ticket open question) — the invite-email surface.
