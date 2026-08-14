# Reading a bug report's screen recording

A screen recording attached to an issue is usually the best evidence in the whole report, and it is
usually the part nobody examines. It is also the part most likely to disagree with the reporter's own
written steps — they wrote those from memory afterwards.

Worked example: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (2026-08-14). The
video disagreed with the steps, contained an unreported data-loss bug the reporter never noticed, and
supplied the arithmetic that proved it. All three came out of frames, not out of the prose.

---

## The technique

Download the attachment, then take frames. Everything below is `ffmpeg`, no other tooling.

**1. Establish the shape of it.**

```bash
ffprobe -v error -show_entries format=duration -show_entries stream=width,height,nb_frames \
  -of default=noprint_wrappers=1 recording.mp4
```

40 s, 1080x2340, so a phone in portrait — which already tells you the reporter was on the mobile
layout, whatever the issue says.

**2. Contact sheet at 1 fps, with the second stamped on each frame.**

```bash
ffmpeg -v error -i recording.mp4 \
  -vf "fps=1,scale=300:-1,drawtext=text='%{eif\:n\:d}s':x=8:y=8:fontsize=28:fontcolor=red:box=1:boxcolor=white,tile=5x4" \
  -frames:v 2 sheet_%02d.png
```

Two 5x4 sheets cover 40 seconds. The `drawtext` stamp is what makes the sheet usable — without it you
can see something happened but not when, and every later command needs a timestamp.

**3. Go back at full resolution for the moments that matter, cropped to the region.**

```bash
ffmpeg -v error -ss 19.5 -i recording.mp4 -frames:v 1 \
  -vf "crop=1080:420:0:1120,scale=700:-1" table.png
```

`crop=W:H:X:Y` **before** `scale`. Scaling a whole 1080x2340 phone frame down to something readable
makes every number in it illegible; cropping to the 400-pixel band you care about and *then* scaling
keeps it sharp.

**4. When something changes fast, re-sample that window at 3–4 fps.**

```bash
ffmpeg -v error -ss 23.5 -t 7 -i recording.mp4 \
  -vf "fps=3,scale=240:-1,drawtext=...,tile=7x3" -frames:v 1 strip.png
```

This is the step that changes conclusions — see the second trap below.

## What it caught here

- **The video and the written steps were about different screens.** The steps said *add a race, add
  two candidates, click Save*; the recording never opens the race editor. Forty seconds of Manage
  Voters. Anyone implementing from the steps would have fixed the wrong component.
- **A counter in the corner was the whole proof.** The voter table's footer reads `1–2 of 2`, then
  `1–3 of 3`, `1–4 of 4`, `1–5 of 5` — against submissions of three, two and one row. Six IDs typed,
  three voters added. That is a silent data-loss bug (now
  [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513)), and it is invisible unless you
  read the pagination text in four separate frames and subtract.
- **The reporter had misidentified their own problem.** They filed about the scrollbar. The scrollbar
  was real, but what actually defeated them was the roll silently truncating — which is why they
  ended up entering voters one at a time, which is what the video shows them doing.

## Traps

**A counter beats an impression.** "The list looks the same" is not a finding; `1–3 of 3` is. Look
for pagination footers, badge counts, row counts, anything the product prints as a number — and read
the same number at two timestamps. Most of the value in a recording is in text the reporter never
mentioned.

**1 fps will lie to you about transitions.** A blank confirmation dialog showed up at 25 s, 27 s and
29 s and read as a real state — a dialog rendering with no content. Re-sampled at 3 fps it was a
*fade-out*: `ConfirmationDialogProvider` clears its title, message and both button labels
synchronously with `isOpen: false`, so the closing animation paints an empty box with default labels.
Still a defect, but a different one, and describing it as "the confirm dialog renders blank" would
have sent someone hunting in the wrong place. **Before asserting that a frame shows a steady state,
re-sample that second at 3–4 fps.**

**Read the mode, not just the message.** The dialog said *"You entered duplicate emails"*. The same
frame shows the Email checkbox unticked and Voter ID ticked. The contradiction between the message
and the form state — both visible in one crop — is the diagnosis.

**Say what the video proves and what you inferred.** It proved the prompt, the counts, and the
one-voter-per-submission arc. It did not prove *which* row survived; that came from executing the
function. Keep the two apart in the write-up — this repo has already had two source-read predictions
refuted by screenshots.

## Cost

Under five minutes of commands, and it produced a second issue plus the evidence for both. Frames
worth keeping go in `test_cases/screenshots/` and get cited by timestamp, so a reader can check the
claim without re-downloading the video.

## Related

[`automation-gotchas.md`](automation-gotchas.md) — driving the app yourself, and what to do when the
browser will not cooperate · [`../issues/1512-scroll-save-review.md`](../issues/1512-scroll-save-review.md) ·
[`../issues/add-voters-duplicate-check-keys-on-email.md`](../issues/add-voters-duplicate-check-keys-on-email.md)
