# Every Word Explained

Read this if any term in the other docs made you stop. Nothing here is complicated —
it just needs saying once, plainly.

---

# Part 1 — The two words that confused you most

## "Case"

**A case is a file about one piece of content.**

Think of a support ticket. When the AI thinks something is wrong with a post, it doesn't
just hide it — it opens a **file** about that one post. The file holds everything:

| What's inside a case |
|---|
| Which post, and which version of it |
| What the AI thought — category, severity, how sure it was |
| The exact words that triggered it |
| What the AI recommends doing |
| A frozen copy of the post's text and images |
| Who reported it, and why |
| What the admin decided, and when |
| Every step, timestamped |

One flagged post = one case.

**The case outlives the post.** If the learner deletes the post tomorrow, the case
stays. That's your audit trail — and it's the reason a case has to be a separate thing
instead of a few extra columns on the post.

> The post is the **incident**. The case is the **paperwork about the incident**.

## "Queue"

**A queue is the list of cases waiting for a human.**

That's all. It's the admin's in-tray.

The five tabs — Urgent, Reports, Low confidence, Repeat authors, Resolved — are **not
five queues**. They're five sorted views of the same in-tray. An admin asking "what's
dangerous?" and an admin asking "where is the AI unsure?" want the same pile, sorted
differently.

## The one line that makes it click

> **A case is a row. A queue is a query.**

`moderation_cases` is a real database table. **There is no queue table.** The queue
doesn't exist as a thing — it's:

```sql
SELECT * FROM moderation_cases
WHERE this still needs a human
ORDER BY <whatever this tab sorts by>
```

That's why "the queue" can be re-sliced into new tabs later without any migration.

## How a case moves

```
post gets flagged
       │
       ▼
  CASE OPENED         ← a row is written. always happens when flagged.
       │
       ├──────────────────────────┐
       ▼                          ▼
  post hidden               post STAYS UP        ← low confidence. "flag-only".
  learner told              learner told NOTHING    Rails: flagged_visible
       │                          │
       ▼                          ▼
  IN THE QUEUE  ←───────── Low confidence tab
       │
       ▼
  admin decides
       │  hidden item   → approve / remove / keep hidden
       │  visible item  → leave it / warn / hide it now / remove
       ▼
  CASE RESOLVED        ← row updated. drops out of the queue, appears in Resolved.
       │                 the row is NEVER deleted.
       ▼
  (maybe one appeal)   ← re-enters the queue once, then it's final
```

**The right-hand branch is the one people miss.** A case can exist without anything
happening to the post and without the author ever knowing. That is deliberate: at 0.42
confidence we'd be accusing innocent people most of the time.

**And the ~97% of posts the AI clears?** No case, no queue entry, nothing at all. Cases
only exist for content something was wrong with.

---

# Part 2 — The rest of the vocabulary

## About the content

| Term | Plain meaning |
|---|---|
| **Flag** | The AI saying "something looks wrong here". A flag opens a case. |
| **Category** | *What kind* of problem. Spam, harassment, hate, self-harm, etc. 12 of them. |
| **Severity** | *How bad* the category is. Critical / High / Medium / Low. Set by us, not per-post. |
| **Confidence** | *How sure* the AI is, 0 to 1. `0.88` means the AI is fairly sure. Separate from severity — a Critical category can have low confidence. |
| **Span** (or trigger) | The exact words that caused the flag. We highlight this so the admin doesn't have to hunt for it. |
| **Reach** | Roughly how many people already saw it. A post seen by 400 is more urgent than one seen by 4. |

**Severity vs confidence — the difference matters.** Severity says *how bad it would be
if true*. Confidence says *how likely it is to be true*. Layer 2 needs both: a Critical
category at 40% confidence goes to a human; a Medium category at 99% can be handled
automatically.

## The three visibility states

These live in **Rails**, on one field called `moderation_state`. There are **four**, not
three.

| State | Author sees | Everyone else sees | Reversible? |
|---|---|---|---|
| **Visible** | it | it | — |
| **Flagged-visible** | it, unchanged — **no notice** | it, unchanged | n/a — nothing happened |
| **Hidden** | it, plus a notice | **`Under review`** marker | Yes — it's temporary, pending review |
| **Removed** | a notice, plus one appeal | **an attributed marker** | Yes, via appeal |

⚠️ **"Everyone else sees nothing" was wrong** and is corrected here. It's true only for the
sensitive categories — self-harm, child safety, threats, personal info — where a removal
must leave no trace at all.

**Removed is not deleted.** The row stays in the database. An appeal can bring it back,
and the audit trail has to survive. "Removed" means invisible, not gone.

**Restored** isn't a fourth state — it just means going back to Visible.

## The screening pipeline

| Term | Plain meaning |
|---|---|
| **Layer 0** | Plain rules, no AI. The school's blocked words and links, plus repeat-post detection. ~20 ms. |
| **Layer 1** | The AI actually reading the text and the images. ~1.4 s for text. |
| **Layer 2** | Plain code again — the **router**. Weighs everything and picks what to do. ~5 ms. |
| **OCR** | Reading the words *inside an image*. How we catch a phone number in a screenshot. |
| **Pipeline** | A background job: something comes in, work happens, a result comes out. Nobody is watching. |

**Why Layer 2 has no AI, on purpose:** product will want to tune it weekly, and tuning
code is fast while tuning a prompt is not. It also means every routing rule gets a unit
test that runs without a model.

## The two modes

| Mode | What the AI may do | Default? |
|---|---|---|
| **Copilot** | Hide and queue. The admin makes every removal. | ✅ Yes |
| **Autopilot** | Also remove on its own — but only in categories that proved themselves. | No, locked |

Both modes hide. The only difference is whether the AI may **remove** without a human.

## Safety words

| Term | Plain meaning |
|---|---|
| **Fail-open** | If the AI breaks, times out, or the service is down, **nothing happens to the post**. It stays visible. Moderation degrades; posting never breaks. |
| **Non-blocking** | The learner never waits for the check. The post is live first, checked after. |
| **Restricted** | A case only certain admins may open — child safety, credible threats, personal info. Others see that a case exists and who to call, never the content. |
| **Sealed** | What a restricted case looks like to an admin without permission. |
| **Urgent safety contact** | The one person at the school we phone for a self-harm or threat case. Required at setup. |
| **Escalate** | Hand it to someone more senior — the school's safety contact, or the Learnyst team. |

## Author history

| Term | Plain meaning |
|---|---|
| **Ledger** | One running record per learner per school: what they've been flagged for, and when. Like a conduct record. |
| **Strike level** (tier / rung) | Where a learner currently sits on the escalation ladder — 1st mistake is just a notice, several in 30 days gets stricter. |
| **Sanction** | Something applied to the *person* rather than the post: a warning, a posting pause, a ban. **Always admin-approved. Never the AI.** |
| **Exempt** | Trusted people (teachers, moderators) who skip the minor filters. |
| **Ladder** | The five rungs of row 40: notice → warning suggestion → stricter checks + short pause → urgent review + temporary block → evasion alert. The *ladder* is automatic; every *sanction* on it still needs an admin's click. |
| **Ban evasion** | Coming back on a new account after being blocked. Rung 5 of the ladder — **and the one rung nothing detects today.** |

## Learner-facing words

| Term | Plain meaning |
|---|---|
| **Report** | A learner telling us a post is bad. Anonymous to the author. 11 reasons. |
| **Notice** | The message the author sees explaining what happened and why. **Only the author sees it.** |
| **Marker** (tombstone) | What **everyone else** sees where hidden or removed content used to be. Keeps the conversation readable. Never carries the author's name, picture, or the reason. |
| **Flag-only** | A case opened with nothing hidden and nobody told. Where low-confidence guesses go. |
| **Disclosure banner** | The permanent notice on every community saying it's moderated by AI, under the school's assistant name. Opens to the full explanation and the rules. |
| **Assistant name** | The school's own name for its AI (`aiAvatarName`). One per school — it's also the lesson-chat and school-assistant identity, so moderation copy should pair it with the role: *"NexaBot · moderation"*. |
| **Appeal** (review request) | The author asking a human to look again. One per post, then it's final. |

**Notice vs marker is the pair to keep straight.** A *notice* is private, explains *why*,
and goes only to the author. A *marker* is public, explains *who* acted and nothing more,
and exists so replies underneath still make sense. Hidden content gets a bare
`Under review`; removed content gets an actor. **Attribution scales with finality.**

## Settings words

| Term | Plain meaning |
|---|---|
| **Blocklist** | The school's own banned words and links. Checked in Layer 0, no AI. |
| **Allowlist** | Links that must never be flagged — `ncert.nic.in`, the school's own YouTube. |
| **Strictness** | Per category: **Standard** or **Strict**. Strict catches more and gets more wrong. |

## Measurement words

These come up in the KPI doc and they get mixed up constantly.

| Term | Plain meaning |
|---|---|
| **False positive** | AI flagged something that was actually fine. We see this as "flagged, then approved back". |
| **False negative** | AI missed something bad. We only find out when a learner reports it. |
| **Precision** | Of everything the AI flagged, what share was genuinely bad. *"When it speaks, is it right?"* |
| **Recall** | Of everything genuinely bad, what share the AI caught. *"Does it miss things?"* |
| **Calibration** | Is the AI **honest about how sure it is**. When it says 90%, is it right 90% of the time? |
| **Labeled data / eval set** | Real posts a human has tagged with the correct answer. The only way to measure any of the above. **We have none yet.** |
| **Audit trail** | The full timestamped history of a case. Who did what, when, and what changed. |

**Calibration is the one worth understanding.** It isn't "is the AI accurate". It's "does
the AI know when it's unsure". A model that says 95% and is right 60% of the time is
*more dangerous* than one that honestly says 60% — because Layer 2 routes on confidence.
If confidence lies, the routing is wrong even when the category is right.

---

# Part 3 — The four systems, in one line each

| System | Repo | Its job here |
|---|---|---|
| **Rails** | (not local) | Owns the content, and whether it's visible. One new field. |
| **Proximity** | `proximity-ai-ng` | The AI backend. **My main job.** Judgment, cases, queue, history, audit. |
| **bodhi** | `learnyst-bodhi` | What the learner sees. Report flow, author notices, hidden states. |
| **Admin** | `learnyst-admin` | What the admin sees. Queue, case detail, settings, KPIs. |

## The seam, in one sentence

> **Rails owns one field. Proximity owns the whole case file.**

Proximity never hides anything itself — it *asks* Rails to. Rails never reasons about
content — it just flips the field when asked.

---

# Part 4 — Names to use, and names to stop using

I drifted between synonyms across the docs. These are the ones to standardise on, so
nobody in your review thinks two words mean two things.

| Use this | Not these |
|---|---|
| **case** | item, flag record, ticket, entry |
| **queue** | review queue, case list, inbox, moderation list |
| **flagged** | caught, detected, triggered |
| **hidden** | suppressed, unpublished, taken down |
| **removed** | deleted, banned (a *person* is banned, a *post* is removed) |
| **span** | trigger, snippet, excerpt, matched text |
| **strike level** | tier, rung, step |
| **ledger** | history, record, author file |
| **notice** | message, alert, warning (a *warning* is a sanction — different thing) |
| **marker** | tombstone, placeholder, stub, gravestone |
| **flag-only** | soft flag, silent flag, shadow flag |
| **row 12** (etc.) | US-12 — **the `US-N` numbering is stale**, see `11-story-coverage.md` §1 |
| **appeal** | review request, dispute, second look |
| **Layer 0 / 1 / 2** | pre-filter / classifier / router (fine as descriptions, but number them) |

Two that are genuinely easy to mix up, so be careful out loud:

- A **warning** is a sanction applied to a person. A **notice** is an explanation shown
  to an author. Every hide sends a notice; only some send a warning.
- A **post** is *removed*. A **person** is *banned*. Never swap these.
