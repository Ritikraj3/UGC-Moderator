# AI Moderator (Community) — Briefing Pack

Everything you need to explain this project, in the order you should read it.

---

## Read in this order

**Start with `07-glossary.md` if any term trips you up.** It defines every word — case,
queue, severity, confidence, calibration, all of it. It's written to be read first or
kept open beside the others.

| # | File | What it answers | Read time |
|---|---|---|---|
| 7 | `07-glossary.md` | **Every word explained.** Start here if anything is unclear | 9 min |
| 0 | `00-mental-model.md` | What is this feature, and who owns what | 12 min |
| 11 | `11-story-coverage.md` | **All 36 published stories, and where each one's design lives.** The check that runs before any planning meeting | 8 min |
| 1 | `01-image-moderation.md` | Images and files, not just text | 8 min |
| 2 | `02-rails-ask.md` | Exactly what you need from the Rails team | 12 min |
| 3 | `03-proximity-scope.md` | Exactly what you will build | 12 min |
| 4 | `04-admin-kpis.md` | The numbers on the admin screen, and which framework | 8 min |
| 5 | `05-admin-responsibilities.md` | What the school admin has to do | 8 min |
| 6 | `06-open-questions-answered.md` | Every open question, each with a recommendation | 15 min |
| 8 | `08-decisions.md` | **Which 3 questions to actually take to your seniors, and what to say** | 7 min |
| 9 | `09-audit-findings.md` | What two audits of these docs caught, and what I changed | 10 min |
| 10 | `10-user-story-additions.md` | The nine rows added to Confluence, and how the published version differs from the draft | 5 min |

**If you only have 20 minutes:** `07-glossary.md` → `11-story-coverage.md` → `08-decisions.md`.
That's enough to run the meeting.

UI is separate — it's the artifact, not a doc.

---

## ⚠️ Read this before you trust an old copy of this pack

Nine HIGH user stories were added to Confluence **after** docs 00–09 were written, while
`10-user-story-additions.md` still said *"NOT PUBLISHED."* Consequences, all now fixed:

- `02-rails-ask.md` §E1 — the section handed to another team — said everyone except the
  author sees **nothing** where content was hidden or removed. Rows 32–34 require the
  **opposite**: a marker stays in place. **That section is rewritten.**
- Flag-without-hide (rows 9–11), the disclosure banner (rows 24–25) and threat detail
  (row 44) had no design at all.
- Three recommendations — reporting in M2, posting pause in M2, mode adoption skipped —
  now collide with a HIGH row. All three revised.
- Every `US-N` reference in the pack is **stale**; the page grew from 26 stories to 36.
  Cite **row numbers**. The mapping is `11-story-coverage.md` §1.

`09-audit-findings.md` Part 4 is the post-mortem.

---

## The 6 sentences to open your presentation with

> A learner posts. The post goes live immediately — we never make them wait.
>
> In the background, AI reads the text and the images. If it looks bad, AI asks Rails
> to hide it and opens a case in the admin's queue.
>
> **If the AI isn't sure, it opens the case and leaves the post up.** Confidence gates the
> hide; severity gates the queue. A low-confidence guess never takes down a real question,
> and the learner is told nothing — a flag is not an accusation.
>
> The admin makes the final call. Always.
>
> Rails owns one thing: whether the post is visible. Proximity owns everything else:
> the judgment, the case, the queue, the history, the audit trail.
>
> If the AI is slow, broken, or down — nothing happens to the post. Posting never breaks.
>
> Right now our communities have zero moderation. 10,282 posts went through unchecked
> in seven months.

If you say only that, you've covered the feature.

---

## Running order for the senior review (30 min)

| Time | What you show | The point you're making |
|---|---|---|
| 0–3 min | The problem: 10,282 unmoderated posts, minors in these communities | Why now |
| 3–8 min | The flow map in the UI artifact — **four ways out of Layer 2** | This is a background pipeline, not a chatbot |
| 8–12 min | The 3-owner split (Rails / Proximity / Admin UI) | One field in Rails, the whole case in Proximity |
| 12–17 min | Walk 3 screens: queue → case detail → **what everyone else sees** | It's a triage tool, the human decides, and a removal doesn't erase the conversation |
| 17–22 min | The Rails ask list — **and that markers are the long pole** | This is what I need from another team, and one item on it will set the date |
| 22–26 min | What I build in Proximity, and how much already exists | ~70% is plumbing we already have |
| 26–30 min | The decisions + your recommendations | Here's what I need you to decide |

Leave the KPI and image sections for questions — you have them if asked, but they
aren't the main story.

**The one slide that changed:** the Rails ask used to open with *"we need `gs://` URIs —
that's the blocker."* It isn't, and it never was. It now opens with **markers**, which is
both bigger and genuinely not ours.

---

## What you are actually asking them to decide

**Three you need them to answer. Four you have already decided and want ratified.**
Everything else you decide yourself. (Same table as `08-decisions.md` — keep them
identical.)

| # | Decision | Who | Blocks what |
|---|---|---|---|
| 1 | 🔴 Legal + retention policy for child safety and credible threats | Legal + leadership | **Launch.** Nothing else. |
| 2 | 🔴 **Who scopes marker rendering (rows 32–34), and is it in M1?** | Eng leadership | **The date** |
| 3 | 🔴 Does Learnyst staff back up urgent safety cases, or is it school-only? | Leadership + support | The escalation design |
| 4 | 🟡 Milestone 1 scope — **it grew**. Ratify or cut *knowingly* | Product | All planning |
| 5 | 🟡 Reporting: the real 11-reason flow in M1, or row 27 at reduced fidelity? | Product | Whether bodhi work starts now |
| 6 | 🟡 Two people to label 400 posts | Product | Any accuracy claim, and Autopilot |
| 7 | 🟡 Ban-evasion signal (row 40 rung 5) + who owns the helpline list (row 42) | Product | Two HIGH rows' content |

Go in with these seven on one slide. That's the ask.

**Number 2 is new and it is the one to lead with after the legal question.** It is the
largest item in the feature, it isn't yours to build, and it arrived after the plan was
written.

---

## The three things to be honest about

Say these out loud before someone else finds them.

1. **The plan drifted from the page.** Nine HIGH stories were added after this pack was
   written, and one contradicted what I'd told the Rails team. All nine are reconciled;
   `11-story-coverage.md` is the row-by-row check that stops it recurring. The honest
   result: **M1 got bigger, mostly on the Rails side.** Say this first — someone will
   otherwise open the page, compare, and find it for you.
2. **We cannot claim accuracy yet.** We have no labeled data. Any number we quote today
   is a guess. Fix: label 400 real posts.
3. **We only know English works.** Our learners write Hindi, Tamil and Hinglish. We will
   screen it, but we have not measured it. Don't let marketing say otherwise.
4. **Rails is the long pole, not the AI.** My part is a contained new module. The Rails
   part touches the core content path and belongs to another team — and markers are the
   biggest piece of it.

---

## Two useful facts to have ready

- **Volume is small.** ~1,500 posts/month, ~50/day. One AI call per post costs almost
  nothing. This means we can afford to check twice for accuracy instead of optimising
  for cost. Nobody expects this answer, and it kills the "won't this be expensive?"
  question immediately.
- **~70% of the backend already exists.** Internal auth, durable queues, the
  Rails transport, OCR, GCS reading, embeddings, structured output, tracing. See
  `03-proximity-scope.md` for the reuse list. This kills "how long will this take?" — for
  *my* half. The Rails half is where the date lives.
- **Confidence gates the hide; severity gates the queue.** One line, and it's the cleanest
  summary of Layer 2 there is. It's also the answer to "won't this censor normal
  discussion?" — an unsure AI opens a case and leaves the post up.
