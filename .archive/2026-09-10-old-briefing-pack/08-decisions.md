# What To Actually Ask Your Seniors

`06-open-questions-answered.md` answers all 22 questions. This doc is the filter: which
ones you take into the room, and what you say.

**The principle:** walking in with 22 questions reads as *"I need direction."* Walking in
with 2 reads as *"I've done the analysis."* Same work, completely different meeting.

---

⚠️ **Updated after nine HIGH stories shipped to Confluence.** It's now three questions,
not two — and the new one is the biggest. `11-story-coverage.md` has the row-by-row
reconciliation.

## Take exactly three questions in

### 1. The legal and retention policy for child safety and credible threats 🔴

**Why this one:** it's the only thing that can genuinely stop a launch, and it isn't
yours to answer.

**What you've already decided (the technical half):**

| | |
|---|---|
| Preserve or delete? | **Preserve.** Never hard-delete a critical case. |
| How long? | Minimum 90 days for threats; child safety per counsel |
| Where? | Restricted table, access-controlled, **every read logged** |
| Who can open it? | Only holders of a new `urgent_safety` permission |

**What you need from them:** whether we have a duty to report to authorities, and what
the retention rule actually has to be. India's IT Rules 2021 place obligations on
intermediaries, with extra duties around child sexual abuse material — but that's the
*shape* of the problem, not the answer.

**What to say:**

> "Everything else here is ready to build. This one question can stop the launch, and
> it isn't mine to answer. I need legal engaged now, not at the end."

**The ask:** get legal in the room this month.

---

### 2. Who scopes the marker work, and when? 🔴

**Why this one:** it is the largest single item in the feature, it is **not ours to
build**, and it appeared after this pack was written.

**What happened, said plainly:**

> Four HIGH stories were added to the page about what *everyone else* sees where hidden or
> removed content used to be. My Rails ask said the opposite — that everyone else sees
> nothing. I've fixed the document. But the work itself has never been estimated by the
> people who'd do it, and it touches every feed, thread, detail view and count.

**What it actually requires:**

| | |
|---|---|
| A removed reply | leaves a marker in the thread, so replies underneath still read |
| A hidden reply | leaves only `Under review` — no name, no reason, no blame |
| The marker names the actor | *"Removed automatically by <assistant name>"* or *"Removed by a moderator"* — because nobody should be told a person decided when no person did |
| Sensitive categories | leave **nothing at all** — a removal must never advertise that something serious happened |

**What you need from them:** an estimate, and a decision about whether it's in M1. It
gates nothing on our side — our work proceeds either way — but it will probably set the
date.

**What to say:**

> "This is the item most likely to move the launch, and it isn't mine. I need it scoped in
> the same conversation as the `moderation_state` field, not after."

---

### 3. Does Learnyst staff back up urgent safety cases? 🔴

**Why this one:** it's an operational commitment, not code, so only leadership can
answer it.

**What you recommend:** school first, Learnyst as backstop. If an urgent case is
untouched for **60 minutes**, it escalates to Learnyst.

**Why a backstop at all:** a school may have one admin, and they may be asleep. A
minor-safety case cannot wait for office hours.

**The honest part — say this:**

> "This means someone at Learnyst is on call. If we won't staff that, then the answer is
> school-only — and we should say so to schools in writing at signup. I don't want to
> build a backstop nobody is standing behind."

That sentence is the whole point. It gives them a real choice instead of a feature
request, and either answer is fine as long as it's deliberate.

---

## Decide these yourself — and say that you have

### 4. Milestone 1 scope — and be straight that it grew

Present it as decided. Invite them to **cut** it, not to write it.

**In M1:** text + image + PDF screening · Copilot only (Autopilot built but locked) ·
**flag-without-hide**, hide, queue, admin decides · all 12 categories with off-topic and
academic-integrity **off by default** · author notices on the post card, suppressed for
flag-only cases · **markers with actor attribution** · **the disclosure banner** · one
review request per removed post · restricted urgent queue + permission · **threat detail
fields** · author ledger + warning + ban + **posting pause** · audit trail · Socials
surface only · **the real 11-reason report flow**.

**Not in M1:** Autopilot enabled anywhere · profile-photo screening · appeal metrics ·
in-product cross-school mode adoption (Amplitude instead) · the KPI dashboard ·
**ban-evasion detection** (row 40's rung 5 — nothing detects it today, don't claim it).

**Say the growth out loud, with the reason:**

> "Five things moved into M1: markers, the disclosure banner, flag-without-hide, the real
> report flow, and posting pause. Four of the five are because the story is HIGH and was
> added after I wrote the plan. **Most of the growth is Rails-side, not mine.** If you want
> a smaller M1, the cut is a product decision about which HIGH row ships at reduced
> fidelity — I'd rather you make it than have me make it quietly."

That sentence is the whole point of this section. Invite them to **cut**, and make the
cost of each cut visible.

### 5. Who labels 400 posts

**This is your weakest point and someone will find it. Get there first.**

> "We cannot claim any accuracy number today — we have no labeled data. Any figure in
> this deck would be invented. Here's the fix: 400 posts from the 10,282 we already
> have, two people labelling independently so we can measure agreement, about two days
> each. It must include Hinglish and image posts."

Asking for two people's time is a small ask. Being caught without an answer is not.

### 6. Learner reporting in M1 — **the recommendation flipped**

I previously said: take the middle path, route the existing support tickets into the
queue, do the real flow in M2.

**Row 27 is HIGH and specifies the mechanism** — 11 named reasons, anonymous, confirmed,
and *"re-checked by AI using that reason."* The middle path carries no reason, so:

- Layer 1 gets no hint to re-screen with — the row's actual mechanism is gone
- The **Reports** tab in row 13 has nothing to sort by
- A learner who wants to report a threat can't; it lands in the ordinary queue

**Revised: build the real flow in M1.** One modal, one contract YAML, one Rails mutation,
one submit. It is genuinely smaller than the marker work that arrived in the same batch —
and unlike that work, it's ours to control.

If Product still wants the middle path, fine — but present it as *"we're shipping row 27
at reduced fidelity"*, not as a scoping detail.

---

## The two opinions I'd defend hardest

If you only argue for two things, argue for these.

### Off-topic and academic-integrity default to OFF

Ship them on, and the admin's first week is a queue full of nonsense. *"How does
proctoring detect cheating?"* is a completely normal question in an exam-prep community
that looks exactly like the bad thing.

They stop trusting the queue. And then the real harassment case is buried in noise.

> **A queue that gets ignored is worse than no queue.**

Let schools opt in once they trust the tool.

### ~~No "AI is checking your post" indicator~~ — ✅ already settled, drop it

This was a live disagreement with the senior developer's design. **Row 11 settles it:** a
learner hears from moderation *"only when their content actually moves, or when a person
decides something — never because the AI was merely unsure."* An indicator on every post
is precisely what that rules out.

Take it off the agenda. If it comes up, the one-liner is: *"the story answers it — a flag
is not an accusation, so we say nothing until something happens."*

### Flag-without-hide is worth defending in its own right

Rows 9–11 are new and they're the best thing that happened to this design. The old Layer 2
welded *flagged* to *hidden*, which meant a 0.42-confidence guess on *"how does proctoring
detect cheating?"* took down an innocent question.

Now it doesn't. The case opens, the post stays up, the author is told nothing, and the
admin gets a different verb set: leave it · warn · hide it now · remove.

> **Confidence gates the hide. Severity gates the queue.**

That single line is the cleanest summary of Layer 2 there is, and it's worth putting on a
slide.

---

## The three things to be honest about, before someone else finds them

Say all three out loud. Volunteering a weakness costs you nothing and buys you the
room's trust for everything else.

| # | The admission | The follow-up that saves it |
|---|---|---|
| 1 | **We can't claim accuracy yet.** No labeled data. | "Here's the labelling plan — 400 posts, two people, two days." |
| 2 | **We only know English works.** Our learners write Hindi, Tamil, Hinglish. | "We screen it. We haven't measured it. Don't let marketing say otherwise." |
| 3 | **Rails is the long pole, not the AI.** | "My part is a contained new module and ~70% of the plumbing already exists. The Rails part touches the core content path and belongs to another team — I need it scoped early." |
| 4 | **The plan drifted from the page.** Nine HIGH stories were added after I wrote it, and one of them contradicted what I'd told the Rails team. | "I found it, reconciled all nine, and `11-story-coverage.md` is now a row-by-row check that runs before every planning meeting. The honest result: M1 got bigger, mostly on the Rails side." |

Number 4 is the one you most want to say first. Someone will otherwise open the page,
compare it to the pack, and find it for you.

---

## Two facts to have loaded

These pre-empt the two questions you will definitely be asked.

**"Won't this be expensive?"**
→ ~1,500 posts a month. ~50 a day. One AI call per post is a rounding error. **The
volume is small enough that we can afford to check twice for accuracy instead of
optimising for cost.** Nobody expects that answer.

**"How long will this take?"**
→ ~70% of the backend already exists and is in production for lesson ingestion:
internal-host auth, durable queues, the Rails transport, the OCR service, GCS reading,
embeddings, structured output, tracing. I'm adding one module and seven tables, copied
from a working skeleton. The hard part isn't code — it's the prompts and the routing
table, and those need the labeled data.

---

## The build order that de-risks the whole thing

If you get one architectural point across, make it this one — it's the answer to *"how do
we know the AI is good enough before we let it touch anything?"*

| Step | Why in this position |
|---|---|
| 1. Tables + the 3 endpoints. Store cases, do nothing else. | Rails can integrate and test against us immediately, in parallel |
| **2. Full classifier running in production — verdicts written, nothing hidden, nobody told** | **Real accuracy numbers on real content, with zero user risk** |
| 3. Turn on the Rails callback — hide/restore/remove goes live | First user-visible behaviour |
| 4. Admin GraphQL + the queue screen | Admins can act |
| 5. Images + PDFs | Additive, no rework |
| 6. Notices, ledger, appeals | Additive |
| 7. KPIs | Needs data to exist first |

**Step 2 is the one to explain.** We can run the whole thing in production for two weeks
— classifying every real post, writing every verdict to our own table — while hiding
nothing and telling nobody. That is how we answer "is it accurate enough?" honestly,
before the AI is allowed to affect a single learner.

---

## Your one-slide summary

| # | Decision | Who | Blocks |
|---|---|---|---|
| 1 | Legal + retention for child safety and threats | 🔴 Legal + leadership | **Launch** |
| 2 | **Who scopes marker rendering (rows 32–34), and is it in M1?** | 🔴 Eng leadership | **The date** |
| 3 | Does Learnyst staff urgent backup? | 🔴 Leadership | The escalation design |
| 4 | M1 scope — it grew. Approve or cut *knowingly* | 🟡 Product | All planning |
| 5 | Reporting: real 11-reason flow in M1, or reduced fidelity? | 🟡 Product | Whether bodhi starts now |
| 6 | Two people to label 400 posts | 🟡 Product | Any accuracy claim, and Autopilot |
| 7 | Ban-evasion signal (row 40 rung 5) + who owns the helpline list (row 42) | 🟡 Product | Two HIGH rows' content |

Bring everything else as *"here's what I decided and why."*
