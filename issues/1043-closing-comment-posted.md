Re-tested on production today (2026-07-29) with a fresh election — **not reproducible**. Recommending this be closed.

## Re-test: BV230-r1

<https://bettervoting.com/yyvwrj> — STAR, 3 candidates, unrestricted, no scheduled start/end.

1. Created with **Show Preliminary Results OFF**.
2. Confirmed the voter view: landing page offered only `VOTE`, no results link. Cast a ballot in an incognito window — no results link on the ballot, the submit dialog, or the thank-you page.
3. **Finalized.**
4. Settings → flipped **Show Preliminary Results ON**. It worked. No error.
5. Navigated away and back — the new value persisted.
6. Incognito, not signed in: the landing page now shows **`OR VIEW RESULTS`**.

So an admin *can* make results public after finalizing, and it reaches voters. Which is what the original report asked for.

## What actually changed

Both fixes proposed in this thread shipped — independently, and neither as ticket work, which is why the issue stayed open:

| Proposal | What landed |
|---|---|
| "Fix the bug so the setting can be changed at any time" | **`da5122f2`** (2026-04-20) — *"Use dedicated API hook for public_results toggle and remove open state UI"*. The toggle no longer saves through `POST /Election/:id/edit`; it has its own `setPublicResults` endpoint, which never reads `election.state`. That's why the 400 is gone — the guard that produced it isn't on the path anymore. |
| @JonBlauvelt's — "disable the settings modal once finalized so it's clear they can't be edited, instead of allowing it in the UI and surfacing a backend error" | Landed as `<FormControl disabled={election.state !== 'draft'}>` in `ElectionSettings.tsx`. On a finalized election every other control on that page is greyed out. |
| "Or change the UI text" | The sentence this issue was built on — *"(Administrators can make results public at any time.)"* — is no longer in any locale file. The live `public_results` tip doesn't make that claim. |

The screenshot worth looking at is the finalized Settings page: support email, the Poll/Election radio, Randomize Candidate Order, Allow Voters To Edit Vote, Confirm That Voter Read Instructions, Use Draggable Ballots for RCV and the rankings selector are **all greyed out** — and `Show Preliminary Results` is the one control still live. One setting editable by design, the rest locked by design. Exactly the outcome this thread converged on.

Also worth noting `7cbc6079` (2026-07-27) fixed a *later* bug on the new path: the write succeeded but the page kept the pre-write value, so the switch appeared to revert when you navigated away and came back. Production has that fix — step 5 above passed.

## The second issue in this thread

I also reported `Make Election Publicly Searchable` throwing the same error. That's **unreachable now rather than fixed** — `is_public` no longer has any UI control; it appears in the frontend only at `Wizard.tsx` where it's set to `false`. So there's no way to attempt the edit.

Its strings are now orphaned, if anyone wants a trivial cleanup: `tips.is_public` and `election_settings.is_public` in `en.yaml` have no consumer. (Same for `results.admin_results_toggle` and `disabled_msgs.ballot_updates_when_open`, which I hit while looking at the copy for #1350.)

## Suggested resolution

Close as fixed. Happy to leave it open if someone wants the `is_public` control restored as a separate piece of work, but that's a different issue from the one reported here.
