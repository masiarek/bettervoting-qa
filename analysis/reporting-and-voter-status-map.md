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
| Events attached to the roll API response as `email_events[]` | `shared/domain_model/ElectionRoll.ts:34` (`ElectionRollResponse`) |
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

**What to capture** — this is the point of the exercise:

1. Screenshot of `ViewElectionRolls` with all six voters — *what the admin actually sees today*.
2. Screenshot of `EmailEventsList` for voter 4 — *proof the bounce is already captured*.
3. The count of clicks to answer **"how many bounced?"** — this is the number that reframes #789.
4. `GET /Election/:id/rolls` response — confirms `email_events[]` is on the wire, i.e. **a CSV export is a frontend-only change**.

(4) is the highest-value artefact. If the events are already on the response, then "export the roll with delivery status" is a download button over data the client already holds — and #789's first slice costs almost nothing.

---

## 5. YAML export — argue against

`#778 YAML File standard` exists, but BV should not build YAML export, and we should not push for it:

- It is **our** interchange format, serving our tabulation library. It is not a BetterVoting user need.
- **We already have the bridge**, on our side, tested: `YAML_library/1_positive/01_convert_json_yaml.py` converts a BV JSON export to a runnable YAML, guarded by `tests/test_json_to_yaml_conversion.py`.
- BV's volunteer capacity is the scarce resource. Spending it on a format only we consume, while the roll cannot be exported at all (§3), is the wrong trade.

If anything is worth asking of BV here it is that the **JSON export stay stable** — which is the live complaint in **#1420** (the export leaks the tabulator's internal object shape), and is a better place to put the same energy.

---

## 6. Recommendation

1. **Run the §4 manual election.** It is the only unblocked item, and it is prerequisite to everything else.
2. **Comment on #789** with the §1 finding + the artefacts from §4. Do not open a new issue — reframe the existing one from *build a report* to *aggregate and export what you already capture*.
3. **File the roll-export gap (§3)** separately, as a small, self-contained `good first issue`.
4. **Do not** file a general "reporting features" issue. It becomes #89 of 88.

Per the repo's ground rules, anything here that looks sharper than a UI gap goes to Slack first. Nothing in this page qualifies — the webhook is signature-verified and the events endpoint is permission-gated, both correct.

---

## Related

- [`issues/1471-chart-split-denominator.md`](../issues/1471-chart-split-denominator.md) — denominator questions in results
- [`analysis/preliminary-results-integration-map.md`](preliminary-results-integration-map.md) — the other subsystem map
- Upstream: [#789](https://github.com/Equal-Vote/bettervoting/issues/789) · [#763](https://github.com/Equal-Vote/bettervoting/issues/763) · [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420)
