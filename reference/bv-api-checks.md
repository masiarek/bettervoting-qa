# BetterVoting API checks

Anonymous, read-only checks that need no login. Useful in test cases as a server-side assertion to sit beside a UI screenshot.

## Read an election's settings

```bash
curl -s https://bettervoting.com/API/Election/<election_id> | jq '.election.settings'
```

Response top level is `{election, precinctFilteredElection, voterAuth}`. Example output:

```json
{
  "voter_access": "open",
  "voter_authentication": {},
  "ballot_updates": false,
  "public_results": true,
  "random_candidate_order": true,
  "require_instruction_confirmation": false,
  "draggable_ballot": false,
  "term_type": "election",
  "contact_email": "",
  "max_rankings": 6
}
```

**Why this is worth asserting.** The admin toggle is a UI claim; this is what the database holds. They disagreed for three months — `7cbc6079` (2026-07-27) fixed a bug where `setPublicResults` wrote successfully but the page kept rendering the pre-write value until the next GET. A test that only reads the switch cannot distinguish a working toggle from a stale render.

It also captures `ballot_updates` and `voter_access` in the same call — the other two variables in the preliminary-results hazard matrix — so one capture documents the whole configuration a test ran under.

## Useful top-level fields

```bash
curl -s https://bettervoting.com/API/Election/<election_id> \
  | jq '.election | {state, head, create_date, update_date, is_public}'
```

- **`state`** — `draft` / `finalized` / `open` / `closed` / `archived`. Note `finalized` is nearly a phantom state: an election with no `start_time` auto-promotes to `open` on the next request.
- **`head: true`** — the append-only versioning flag. `electionDB` keeps every prior version as a superseded row, but the API serves **only** the head. So the history exists and has no read path — that's the gap PR #1365 fills.
- **`update_date`** — millisecond epoch. This is the last write of **any** kind, not a per-setting timestamp. Don't cite it as "when the flag changed" unless the flag was demonstrably the last write.
- **`create_date`** — ISO-8601. Yes, two date formats in the same object; that's [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) item 3.

## Full export (Election + Ballots + Results)

```bash
uv run STARVote_LH_tabulation_engine/tools_adam/fetch_bv_export.py <election_id> -o out.json
```

Assembles from three anonymous GETs: `/API/Election/{id}`, `/API/Election/{id}/anonymizedBallots`, `/API/ElectionResult/{id}`. No login, no UI click.

**⚠️ `/anonymizedBallots` is unauthenticated whenever `public_results` is true**, in any state including `draft` — and the creation wizard sets the flag on by default without showing the creator the choice. It returns the complete cast-vote record: a stable `ballot_id` plus every score. "Anonymized" means no voter id attached; with a small electorate it is not anonymous in any useful sense. This is the substance behind #1350's disclaimer, and it's open question Q4.

**⚠️ Before attaching a full export anywhere shared**, check `credential_ids` and `admin_ids`. On an **email-list** election those hold voter and admin email addresses. They're `null` on open-access test elections. Prefer attaching the `election.settings` excerpt over the whole file.

**⚠️ Use the API, not the UI "Download JSON" button**, for anything you want to keep stable. [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) reshapes the UI export to v2 (`format_version: 2`, snake_case throughout, ISO timestamps, deduped pairwise matrix). The API response is unchanged by that work.

## Replay a random tiebreak

```bash
uv run STARVote_LH_tabulation_engine/tools_adam/bv_replay_tiebreak.py <frozen export>
```

BV's `tieBreakType: "random"` is a **seeded** shuffle — `seed = (rawVoteCount + hash(raceId)) >>> 0`, TinyRand, shuffled once — so it's deterministic and reproducible. The export publishes `perm`, per-candidate `tieBreakOrder`, and `tied[]`/`other[]` sorted by it.

The order is *recorded* but not *derivable* from the ballots: it depends on the ballot **count** and the race id, never on how anyone voted.

## Error strings worth recognizing

Frontend surfaces these verbatim in the snackbar as `Error making request: {status}: {detail}`, so a screenshot is enough to diagnose:

| Status | Detail | Means |
|---|---|---|
| 400 | `Election is not editable` | The write went through `POST /Election/:id/edit`, which refuses non-draft elections. This was BV230's original failure |
| 400 | `expected_update_date is required` | Missing optimistic-concurrency token |
| 409 | `Concurrent write detected, please try again` | Stale `expected_update_date`. Deterministic for scheduled elections whose state auto-transitioned since the last GET |
| 401 | permission denied | Role lacks `canEditElectionState`, which excludes the plain `admin` role — only `system_admin` and `owner` have it |
