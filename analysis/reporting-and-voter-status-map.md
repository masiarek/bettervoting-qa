# Reporting and voter status — what's already there, what's missing, what to test

Read of BV's reporting/export surface, written to answer a planning question: *what reports should we ask for?*

The short answer is that we should ask for **fewer** than we thought, because the wishlist is already filed — and one of the things on it is **half-built already**, which nobody has written down.

Source read at `bv-copy-fix` @ `88d840d2`.

---

## 1. The headline: bounce data already exists

BetterVoting **already captures per-voter email delivery events, including bounces.** This is not a feature request. It shipped.

| Piece | Where |
|---|---|
| Table `emailEventsDB` — `message_id`, `election_id`, `voter_id`, `event_type`, `event_timestamp`, `details` | `Migrations/2026_03_19_email_events.ts` |
| Writer: SendGrid event webhook, **signature-verified** (`x-twilio-email-event-webhook-signature`, SHA256, 403 on bad sig) | `Controllers/sendGridWebhookController.ts:54` |
| Events attached to **every** roll row on the **list** endpoint as `email_events[]` | `Controllers/Roll/getElectionRollController.ts:125-152` |
| Rendered per voter | `Admin/EmailEventsList.tsx` |

The event vocabulary is already the one a status report needs — `EmailEventsList.tsx:11-23` colours:

`delivered` · `open` · `bounce` · `dropped` · `spamreport` · `deferred` · `sent` · `processed`

**But it is drill-down only.** `EmailEventsList` renders *inside* `EditElectionRoll` (`EditElectionRoll.tsx:272`), i.e. the admin must open **one voter at a time** to learn whether that voter's invite bounced. With a 200-voter roll, "how many invitations bounced?" costs 200 clicks and is answerable no other way.

There is:

- **no aggregate** — no count of delivered / bounced / not-voted anywhere;
- **no export** — `ViewElectionRolls.tsx` (231 lines) has no CSV or download path of any kind;
- **no quorum or turnout** — `grep -rniE "quorum|turnout"` across all of `packages/` returns **zero hits**.

So the gap is **surfacing, not collection**. That distinction matters for what we ask for, and for how big the ask looks.

---

## 2. The wishlist is already filed — mostly by us

**88 open issues** upstream match `report|export|csv|download|statistics|quorum`. Reporting is BV's most over-specified area, not an under-specified one. The ideas that came up in planning were, without exception, already there:

| Idea | Already filed as | Note |
|---|---|---|
| Voted / not voted / undeliverable / bounced, per voter | **#789 "Voter Status" Report** | Ours. Specifies 18 fields incl. bounce history, unsubscribe, spoil dates, IP, submission method |
| Quorum, eligible voters, tallied ballots | **#763** | Ours. Links #759, #760 |
| LH-style text report | **#1071** (STARVOTE format), **#1154** (+ CSV quick entry) | |
| ABIF export | **#767** | |
| Raw vs processed ballot export | **#1160** | `good first issue` |
| CSV header usability / meta columns | **#1085**, **#1039** | |
| Multi-race CSV | **#883** | |
| Tie-break explanation in export | **#1432** | |
| Abstention/spoiled conventions in reporting | **#777**, **#1090**, **#1485** | |
| YAML standard | **#778** | see §5 |

**#789 is the one that matters** and it has sat since March 2026 labelled `Role: Missing, Complexity: Missing` — nobody has scoped it. It reads as a greenfield build of an 18-column report. Given §1, that framing is wrong in a way that is probably *why* it stalled: roughly a third of it is already in the database and on the API response, waiting for a table and a download button.

**Adding issue #89 would not help.** What #789 needs is not another idea; it is evidence that shrinks it.

---

## 3. Genuinely unfiled

One real gap, found by searching upstream for it and getting nothing back:

> **The voter roll cannot be exported at all.** Not as CSV, not as anything. An admin can page through `ViewElectionRolls` in the browser and that is the whole story. Every downstream question — reconciliation against a membership list, a bounce follow-up, an audit trail of who was invited — requires re-typing the screen.

This is a smaller and much more concrete ask than #789, it is a plausible `good first issue`, and it is the natural first slice *of* #789. Worth filing on its own once §4 has produced a screenshot.

---

## 4. Testing this requires a manual election — the scripts cannot do it

Our `create_bv_test_election.py` path **cannot** attach a voter roll. Two independent blocks:

1. **The endpoint is permission-gated.** `POST /Election/:id/rolls` runs
   `expectPermission(req.user_auth.roles, permissions.canAddToElectionRoll)`
   (`Controllers/Roll/addElectionRollController.ts:24`).
2. **Our synthetic identity never gets that role.** From the script's own tested note (`create_bv_test_election.py:257-264`): BV's admin surface authorises off a server-side role binding that only the authenticated Keycloak create flow writes — *not* off `owner_id`/`admin_ids`. Setting `admin_ids` was tried and **ignored** (`xb8r6v` had `admin_ids=[owner]` and was still denied).

> API-created elections are public, listable, and exportable, **but not UI-administrable from your real login.**

So: **create it manually, signed in, through the UI.** That is not a workaround to be engineered away — it is the only path, and it is a one-off.

### Test plan

Small roll, one election, chosen so every reportable state is represented at once. Set **invitation = email** (`election.settings.invitation === 'email'` is what gates the events UI at `EditElectionRoll.tsx:272`).

| Voter | Address | Intended state | Why |
|---|---|---|---|
| 1 | own address `+bv1` | delivered → **voted** | the happy path |
| 2 | own address `+bv2` | delivered → **not voted** | the turnout denominator |
| 3 | own address `+bv3` | delivered, opened, not voted | does `open` distinguish from #2? |
| 4 | `…@example.com` | **hard bounce** | reserved domain, safe to bounce |
| 5 | bad mailbox at own domain | **bounce**, different reason string | does `details.reason` differ? |
| 6 | own address `+bv6` | delivered → voted, then **spoil/edit** | crosses into #746 |

**Sending is real outbound email.** Use plus-addressing on your own address and a domain you control; `example.com` is IANA-reserved and safe. Do not put a stranger's address on a test roll.

**Prerequisite:** the election must be **restricted**. `getRollsByElectionID` throws `Unauthorized("Can't view voter roll for open elections")` when `voter_access === 'open'` (`getElectionRollController.ts:108`).

**What to capture** — this is the point of the exercise:

1. Screenshot of `ViewElectionRolls` with all six voters — *what the admin actually sees today*.
2. Screenshot of `EmailEventsList` for voter 4 — *proof the bounce is already captured*.
3. The count of clicks to answer **"how many bounced?"** — this is the number that reframes #789.
4. Confirmation that voter 4's bounce carries a usable `details.reason`, and that voter 5's differs. This is the one thing source can't tell us: the `details` column is free-form SendGrid JSON, and `EmailEventsList.tsx:69-71` renders only `reason`, `response`, `status`. Whether a *human-readable* bounce cause survives is an empirical question.

### Already settled from source — (4) does not need testing

The original version of this plan listed "confirm `email_events[]` is on the wire" as the key artefact. **It is, and no election is needed to know it.**

`getRollsByElectionID` (`getElectionRollController.ts:106-163`) fetches *all* events for the election in one query (`EmailEventsModel.getByElectionId`, :125), buckets them by `voter_id` (:126-135), and attaches each voter's array to their roll row as `email_events` (:152). The fetch is best-effort — wrapped in try/catch (:124-138) so a missing table degrades to empty rather than 500-ing.

So **every voter's delivery events arrive in the single call the admin roll page already makes.** A roll export with delivery status is a **frontend-only change** over data the client is already holding. That is the sentence to put in front of #789.

### Two constraints that change #789's spec

Reading the same function turned up two things that the issue as written does not account for:

**1. `voter_id` is deleted from the response in exactly the case that matters.** When `invitation === 'email'`, `redactVoterIds` is true and `delete base.voter_id` fires (:141, :154-156) — a deliberate scrub so voters can't be linked to ballots. `ballot_id` and `ip_hash` are nulled for everyone (:148-149).

That is correct behaviour and should not change. But it means a voter-status report **keys on `email`, not `voter_id`** — `email` is not scrubbed, so the report is still buildable. Anyone speccing it needs to know the obvious join key isn't there.

**2. #789 asks for a field that cannot be delivered.** The spec lists **IP Address**. It is unavailable twice over: BV never stores a raw IP (the domain model holds `ip_hash?: string; // sha256(req.ip)` — `ElectionRoll.ts:12`), and the hash itself is stripped from this response at :149.

Worth conceding in the issue rather than leaving for an implementer to discover. A hash can confirm *two ballots shared an origin*; it can never populate an "IP Address" column. If the underlying want is duplicate-origin detection, that is a different and much narrower feature.

---

## 5. YAML export — argue against

`#778 YAML File standard` exists, but BV should not build YAML export, and we should not push for it:

- It is **our** interchange format, serving our tabulation library. It is not a BetterVoting user need.
- **We already have the bridge**, on our side, tested: `YAML_library/1_positive/01_convert_json_yaml.py` converts a BV JSON export to a runnable YAML, guarded by `tests/test_json_to_yaml_conversion.py`.
- BV's volunteer capacity is the scarce resource. Spending it on a format only we consume, while the roll cannot be exported at all (§3), is the wrong trade.

If anything is worth asking of BV here it is that the **JSON export stay stable** — which is the live complaint in **#1420** (the export leaks the tabulator's internal object shape), and is a better place to put the same energy.

---

## 6. Recommendation

1. **Comment on #789 now.** It no longer waits on the election. The load-bearing claim — every voter's delivery events already arrive on the roll list call, so aggregation and export are frontend-only — is settled from source (§4), and the two spec corrections (no `voter_id` under email invitation; **IP Address is undeliverable**) are worth more to an implementer than any screenshot. Reframe from *build a report* to *aggregate and export what you already capture*, and concede the IP field.
2. **File the roll-export gap (§3)** separately: small, self-contained, plausible `good first issue`, and the natural first slice of #789.
3. **Run the §4 manual election** for what source cannot answer — whether a human-readable bounce cause actually survives into `details.reason`, and the click-count that shows why drill-down doesn't scale. Screenshots strengthen (1); they no longer gate it.
4. **Do not** file a general "reporting features" issue. It becomes #89 of 88.

Per the repo's ground rules, anything here that looks sharper than a UI gap goes to Slack first. Nothing in this page qualifies — the webhook is signature-verified and the events endpoint is permission-gated, both correct.

---

## Related

- [`issues/1471-chart-split-denominator.md`](../issues/1471-chart-split-denominator.md) — denominator questions in results
- [`analysis/preliminary-results-integration-map.md`](preliminary-results-integration-map.md) — the other subsystem map
- Upstream: [#789](https://github.com/Equal-Vote/bettervoting/issues/789) · [#763](https://github.com/Equal-Vote/bettervoting/issues/763) · [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420)
