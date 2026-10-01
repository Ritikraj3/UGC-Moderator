# What the School Admin Is Responsible For

The AI does not moderate the community. **The admin does, with AI help.** That's the
whole design, and this doc says exactly where the human's job starts and stops.

---

## 1. The one-line split

| | Does |
|---|---|
| **AI** | Reads everything, flags what looks wrong, hides risky content, ranks the queue. **When it isn't sure, it flags without hiding** — the post stays up and the author is told nothing |
| **Admin** | Decides. Every removal, every account action. |
| **Learnyst** | Provides the tool, watches accuracy, backs up urgent safety cases |

The AI never bans anyone. The AI never permanently deletes anything an admin hasn't
seen — except in Autopilot, and only in categories the school explicitly unlocked.

---

## 2. Setup — one time, ~15 minutes

Before moderation does anything, an admin does this once:

| Step | Required? | If they skip it |
|---|---|---|
| Turn AI moderation on | **Required** | Nothing is screened |
| Pick Copilot or Autopilot | Defaults to Copilot | Fine — Copilot is the safe default |
| **Name an urgent safety contact** | **Required** | Nobody gets called for a self-harm or threat case |
| Choose who gets queue notifications | Recommended | Cases pile up unseen |
| Set per-category strictness | Defaults to standard | Fine |
| Add blocked words / links | Optional | Layer 0 catches less |
| Mark trusted members exempt | Optional | Teachers get flagged for normal moderation talk |

**The safety contact is the one we should hard-require.** Everything else can default.
A self-harm case with nobody to notify is the worst failure state in the whole feature,
and it's the one thing a default can't fix.

---

## 3. Ongoing — the daily job

| Priority | What | How often | Why |
|---|---|---|---|
| 1 | Clear the **Urgent** tab | Same day, ideally within hours | Real-world safety |
| 2 | Work the **Reports** tab | Daily | Learners are waiting; several reports means it's visible |
| 3 | Work the main queue | Every day or two | Content is hidden while they wait |
| 4 | Check **Low confidence** | Weekly | This is where false positives live — **and these items are still live**, so nothing is being suppressed while they wait. That's the whole point of the flag-only branch |
| 5 | Check **Repeat authors** | Weekly | Patterns, not incidents |
| 6 | Handle review requests | Within a few days | Fairness |

Realistically, at ~50 posts/day and ~2–3% flagged, that's **1–2 cases a day**. This is
not a full-time job. Say that clearly — admins will assume it's a burden.

---

## 4. The judgement calls only a human should make

This is the part worth spending time on in your presentation, because it's the
justification for Copilot being the default.

| Situation | Why AI can't decide |
|---|---|
| "You're too slow for this batch" | Harsh coaching or bullying? Depends on who said it and the relationship. |
| "Anyone got the leaked paper?" | Asking for cheating, or asking about a news story? Context. |
| "How does proctoring detect cheating?" | A completely normal question in an exam-prep community that looks exactly like the bad thing. |
| Sarcasm, in-jokes, regional slang | AI reads tone badly, and worse in Hinglish. |
| Repeated borderline behaviour | No single post crosses a line, but the pattern does. |
| Is this learner in real trouble? | Only a person who knows them can judge this. |

**The line:** AI decides *what this looks like*. The admin decides *what it means here*.

---

## 5. Account actions — always the admin

| Action | Who can trigger | Notes |
|---|---|---|
| Flag without hiding | AI or admin | **Invisible to everyone.** The post stays up, a case opens, the author is told nothing |
| Hide content temporarily | AI or admin | Reversible, low stakes. An admin can also hide a *flagged-but-visible* item after reading it |
| Restore content | Admin only | |
| Remove content permanently | Admin — or AI in Autopilot, allow-listed categories only | |
| **Send a warning** | Admin only | AI can suggest it |
| **Pause posting** | Admin only | AI can suggest it |
| **Ban from community** | Admin only | Never AI. Ever. |
| Remove from community | Admin only | Never AI |
| Escalate to Learnyst | Admin, or automatically for urgent | |

The AI can *suggest* every one of these. It can *perform* only the content ones.

Reason to state: an AI mistake on content costs a hidden post and an apology. An AI
mistake on a ban costs a paying customer's learner losing access to a course they
bought. Different order of magnitude.

---

## 5b. The escalation ladder — five rungs, and one of them isn't built

Row 40 spells this out and it had never been written down here. The response gets
stronger automatically as problems repeat; the *ladder* is automatic, every *sanction*
on it still needs the admin's click.

| Rung | Trigger | What happens |
|---|---|---|
| 1 | First minor mistake | Just a notice to the author. No admin involvement |
| 2 | It happens again | The admin gets a **warning suggestion** on the case |
| 3 | Several inside 30 days | Stricter checks on this author, and a suggested **short posting pause** |
| 4 | One serious violation | Urgent review, and a suggested **temporary posting block** |
| 5 | Tries to get around a block | Admin alerted, stronger block suggested |

Two things to know before you present this:

- **Rungs 3 and 4 need `posting_paused_until`, which does not exist in Rails yet.** It was
  scheduled for M2 and has been moved to M1, because three published rows depend on it.
- **Rung 5 has no design at all.** Detecting evasion means correlating a new account with
  a blocked one, and that is a product-and-legal question before it is an engineering
  one. It is the only rung with no path — don't claim it.

"Stricter checks" on rung 3 is the interesting one: it means the ledger feeds back into
Layer 2's routing for that author, so the same borderline post from a repeat author lands
differently from a first-timer's. That is already how Layer 2 is designed — author history
is one of its inputs — so rung 3 is mostly free once the pause exists.

---

## 5c. What the rest of the community sees

Worth knowing, because admins will be asked about it and the answer is deliberate.

When an admin removes something, **it does not vanish silently.** A marker stays where it
was, so the conversation still reads correctly — and it names who acted:

| | What everyone else sees |
|---|---|
| Hidden reply | `Under review` — no name, no reason, no blame |
| Removed by the AI | `Removed automatically by <your school's assistant name>` |
| Removed by you | `Removed by a moderator for breaking the community rules` |
| Self-harm, child safety, threats, personal info | **Nothing at all** — a removal must never advertise that something serious happened |

The author's name and picture never appear on a marker, and the reason never does. Only
the author is told why.

**The line worth repeating to an admin:** *hidden is a pause, removed is a verdict, and
the marker says more as the decision gets more final.*

---

## 6. Urgent safety — the admin's real obligation

For self-harm, child safety, credible threats:

| The admin should | Not |
|---|---|
| Look at it the same day | Wait for a weekly review |
| Contact the learner, or their parent/guardian | Only delete the post |
| Involve the school's own safeguarding process | Assume Learnyst handles it |
| Escalate to Learnyst if unsure | Sit on it |

**What the admin must NOT do:** delete a self-harm post and move on. The design prevents
this — self-harm content is never auto-removed and "Remove for good" is disabled on
those cases — but the *expectation* has to be set in the product copy too, not just the
code.

**Open question this depends on:** whether Learnyst staff back up urgent cases.
Recommendation in `06-open-questions-answered.md` (MR-1): school first, Learnyst as
backstop after 60 minutes untouched.

---

## 7. The admin's other job: making the AI better

Two buttons on the case screen, both of which feed back to us:

| Button | What it does |
|---|---|
| **"AI got this wrong"** + a reason | Becomes our training and evaluation data. This is how accuracy improves. |
| **"＋ Block this word"** | Adds to the school's own Layer 0 list — instant, no AI involved |

Worth telling admins plainly: *pressing "AI got this wrong" actually does something.*
If they think it's a dead button, they won't press it, and we lose our only source of
correction signal from real use.

---

## 8. What the admin is NOT responsible for

Be explicit, or admins will think they need to do these:

- ❌ Writing prompts or tuning the AI
- ❌ Setting confidence thresholds
- ❌ Judging restricted cases without the `urgent_safety` permission
- ❌ Reviewing the 97% of posts that pass cleanly — they never see them
- ❌ Non-English accuracy — that's our problem, not theirs
- ❌ Legal reporting decisions — that's a Learnyst + legal path

---

## 9. The failure mode nobody has designed for

**What happens if the admin does nothing?**

Right now: the content stays hidden forever. The learner never hears back. The queue
grows. Nobody is told.

That's a bad outcome and neither UI design covers it. It's also the *likely* outcome for
a school with one busy admin.

Recommendation — three small things:

| Trigger | Action |
|---|---|
| Urgent case untouched for 1 hour | Notify the safety contact directly. Then Learnyst. |
| Any case hidden > 7 days undecided | Email the admin: "3 items have been waiting a week" |
| Any case hidden > 30 days undecided | Auto-restore it, tell the admin, log it |

That last one is a real product decision and someone senior should agree to it. My
argument for auto-restore: content hidden for a month with no human decision is not
moderation, it's silent censorship. If nobody looked, the benefit of the doubt should go
to the learner. But it must be logged and the admin must be told.

---

## Summary — the admin's job in five lines

1. **Set it up once.** Turn it on, name a safety contact.
2. **Clear the urgent tab the same day.** That's the only real SLA.
3. **Decide the 1–2 cases a day** the AI couldn't decide alone.
4. **Own every account action** — warnings, pauses, bans.
5. **Tell us when the AI is wrong.** That's how it gets better.
