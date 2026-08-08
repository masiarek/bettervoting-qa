# #789 "Voter Status" Report — comment posted

**Posted:** 2026-08-08 → [issuecomment-5226638146](https://github.com/Equal-Vote/bettervoting/issues/789#issuecomment-5226638146)

Backed by [`analysis/reporting-and-voter-status-map.md`](../analysis/reporting-and-voter-status-map.md).

## What it said

**The reframe.** The delivery data this issue asks for is already collected — `emailEventsDB` (2026-03-19 migration), written by a signature-verified SendGrid webhook, with `EmailEventsList.tsx` already colouring the exact vocabulary the report needs. More importantly it **already arrives on the roll list endpoint**: `getRollsByElectionID` pulls every event for the election in one query and hangs each voter's array off their roll row (`getElectionRollController.ts:125`, `:152`). So the first slice is a table and a download button over data the client already holds — no backend work, no schema change. The issue reads as an 18-column greenfield build; it isn't.

**Two spec corrections.**

1. `voter_id` is deleted from the response when `invitation === 'email'` (`:141`, `:154-156`) — deliberate, shouldn't change, but the report must key on `email`.
2. **IP Address cannot be delivered.** BV stores only `sha256(req.ip)` (`ElectionRoll.ts:12`) and strips even that at `:149`. Suggested removing the field or splitting duplicate-origin detection into its own issue.

**Availability.** Pinned which of the six `VoterAuthenticationMode` shapes can have this report at all: only `closed_bv_managed_ids` gets the full version, `closed_admin_managed_ids` gets voted/not-voted, and the four `open_*` modes get nothing (`:108` throws). Noted the knock-on for #763 — no electorate means no quorum denominator.

**Order proposed:** roll CSV export → aggregate counts → remaining columns.

## Honesty notes

Marked as source-read, not run. Flagged the one open empirical question: whether a human-readable bounce cause survives into `details.reason` — `details` is free-form SendGrid JSON, so only a real bounce settles it.

## Follow-ups

- **Roll CSV export issue** — offered in the comment, not yet filed. Unfiled upstream as of posting.
- **The manual roll election** is still unrun; it is what answers the `details.reason` question.
