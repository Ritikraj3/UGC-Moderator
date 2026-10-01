# Every Open Question, Answered

For each one: what the code or data actually says, my recommendation, and who has to
sign off.

**How to use this in the review:** don't ask your seniors open questions. Give them
recommendations and ask them to approve or change. Only 5 of the 22 below genuinely
need someone else to decide — the rest you can answer yourself, and that's the point.

Legend: 🟢 you can decide · 🟡 needs product · 🔴 needs leadership or legal ·
✅ **settled by a published user story since this doc was written**

⚠️ **Read `11-story-coverage.md` first.** Nine HIGH rows shipped to Confluence after this
document was drafted. Three of the questions below have been **answered by the page**, and
three others are now in **direct conflict** with a HIGH row. Those are marked inline.

---

# Part 1 — The 7 from the Market Research doc

## MR-1 🔴 Who owns urgent safety response — school admin, Learnyst, or both?

**Recommendation: both. School first, Learnyst as a backstop.**

The school admin is the first responder — they know the learner, they have the parent's
number, they have a safeguarding process. Learnyst cannot do any of that.

But a school may have one admin, and they may be asleep. A minor-safety case cannot wait
for office hours. So: if an urgent case is untouched for **60 minutes**, it escalates to
Learnyst.

**The catch to be honest about:** this is not a code decision, it's an operational
commitment. It means someone at Learnyst is on call. If leadership won't staff that, then
it's school-only — and we should then say so plainly to schools, in writing, at signup.
Don't build a backstop nobody is standing behind.

**Blocks:** the escalation design and the copy in the product.

---

## MR-2 🔴 What legal escalation and retention applies to child safety and credible threats?

**This is the real launch blocker. Not AI accuracy.**

I can give a technical recommendation but **not the legal answer — that needs counsel.**

Technical recommendation:

| | |
|---|---|
| Preserve or delete? | **Preserve.** Never hard-delete a critical case. |
| How long? | Minimum 90 days for threats; child safety per counsel's instruction |
| Where? | The restricted table, access-controlled, **every read logged** |
| Who can see it? | Only `urgent_safety` permission holders |
| Reporting to authorities? | **Legal must answer this.** |

Why preserve: destroying evidence is a worse position than holding it. And India's IT
Rules 2021 place obligations on intermediaries, with additional duties around child
sexual abuse material. That's the shape of the problem — but I'm a developer, not a
lawyer, and this needs a real legal opinion before launch.

**What to say in the review:** *"Everything else is ready to build. This one question can
stop the launch, and it isn't mine to answer. I need legal engaged now, not at the end."*

**Blocks:** launch. Nothing else.

---

## MR-3 🟡 Can learner reporting ship in the same milestone as AI hide/queue?

⚠️ **This recommendation is now in conflict with a HIGH published story. Do not present
the old answer without saying so.**

**Row 27 is HIGH** and specifies the whole flow: report any post with **one of 11 named
reasons**, stay anonymous to the author, get a simple confirmation, and have the content
**re-checked by the AI using that reason**.

**The middle path delivers none of that.** Routing existing `SUPPORT_TYPE_REPORT` tickets
into the queue gives us a signal, but it carries no reason from the list, so:
- Layer 1 gets no hint to re-screen with — the row's actual mechanism is gone
- Row 13's **Reports** tab has nothing to sort or filter by
- Row 28's distinct-reporter priority still works; the reason-based routing does not
- Rows 42–44 lose their fastest path in: a learner who wants to report a threat has to
  pick a generic support category, and it lands in the ordinary queue

**Revised recommendation: build the real flow in M1, and cut something else if capacity
is the problem.** It is one new modal, one contract YAML, one Rails mutation and one
submit — genuinely smaller than the marker work in rows 32–34 that also arrived in the
same batch, and unlike that work it's ours.

**If Product still wants the middle path**, that is a legitimate choice — but present it
as *"we are shipping row 27 at reduced fidelity in M1"*, not as a scoping detail. It is
the difference between a plan and a surprise.

**Blocks:** whether bodhi work starts now or later.

---

## MR-4 🟡 What is the minimum acceptable appeal flow for launch?

**Recommendation for M1:**

- The author is told *what* happened and *why*
- One button: "Ask for a review", with an optional note
- It creates a queue item; the admin restores or keeps removed
- One review per post. No second appeal.
- **No SLA promised** in M1

That's enough to be fair, and it's cheap.

Deferred to M2: appeal outcome metrics, tracking overturn rate separately, appeal
deadlines.

My reasoning: an appeal path that exists and is slow is defensible. One that doesn't exist
is not — a learner whose post was wrongly removed with no recourse is the complaint that
reaches the school owner.

**Blocks:** whether `moderation_appeals` is M1 or M2.

---

## MR-5 🟡 Should off-topic and academic-integrity be on by default, or configurable?

**Recommendation: school-configurable, default OFF. Both of them.**

This is the strongest recommendation in this document.

These two categories are where every false positive lives. In an exam-prep community:

- "How does the proctoring software detect cheating?" — a completely normal question
- "Anyone know if the paper leaked?" — discussing a news story, not seeking it
- Off-topic chatter *is* what makes a community feel alive

If we ship these on by default, an admin's first week is a queue full of nonsense. They
stop trusting it. **A queue that gets ignored is worse than no queue** — because now the
real harassment case is buried in noise.

Let schools opt in once they trust the tool.

**Blocks:** the default settings row, and honestly the whole first impression.

---

## MR-6 🟡 Which admin roles can view restricted urgent cases?

**Recommendation: add one number to the permission scheme that already exists. Default:
owner only.**

*Corrected twice.* The first version said "existing roles are too coarse" — wrong. The
second version said `MANAGE_REVIEWS` and `MANAGE_DISCUSSIONS` are siblings of
`MANAGE_COMMUNITIES` in one scheme — **also wrong, and it matters.** Verified:

| Where | Contents |
|---|---|
| `ADMIN_PERMISSION_ROLES` (`appConstants.ts`) | **Exactly two:** `MANAGE_COMMUNITIES: 25`, `AFFILIATE_MARKETING: 27` |
| `sidebarConstants.ts` | `MANAGE_DISCUSSIONS: 8`, `MANAGE_REVIEWS: 10` — a **different** numbering space whose values collide with 25/27 |

So the granular scheme exists and `urgent_safety` slots into it as the next number — but
it is a **two-entry** list, not a rich one, and "the grant UI comes free" needs one
confirmation: does the custom-role builder enumerate `ADMIN_PERMISSION_ROLES` locally, or
is the permission list served from Rails? Ask before promising it's free.

So:
- Add `urgent_safety` as the **next number in the existing scheme**
- Granted to Owner by default; the owner can grant it to named individuals
- **Every view is logged** — who opened which case, when
- `MANAGE_COMMUNITIES: 25` already exists and is the natural gate for the *ordinary*
  queue — only the restricted queue needs anything new

The access log matters because the failure mode here is a curious admin, not an attacker.

**Blocks:** the Rails permission work and the admin UI gating.

---

## MR-7 🟢 What author sanctions are possible in Rails today?

**Answered from the code. No decision needed — this is a fact.**

| Sanction | Status |
|---|---|
| Ban from community | ✅ **Exists** — `banCommunityMember(status: IS_PERMITTED \| IS_BANNED)` |
| Remove from community | ✅ **Exists** — `removeCommunityMember` |
| Warning notice | ❌ Doesn't exist — but cheap, it's a message not a state |
| Posting cooldown / pause | ❌ Doesn't exist — needs a new field |
| Disable commenting only | ❌ Doesn't exist |

⚠️ **Revised: warning + ban + posting pause in M1.**

The original answer put the pause in M2. **Three published rows need it and one is HIGH:**
row 17 ("temporarily stop someone from posting"), row 22 ("choose how long a posting pause
lasts"), and row 40's ladder at rungs 3 and 4. Deferring it now means shipping row 17 with
two of its three verbs and a ladder with a hole in the middle.

`posting_paused_until` is one timestamp column plus a guard in two mutations. It is the
cheapest of the new Rails items by a distance — it is dwarfed by the marker work in
rows 32–34. If something has to give, it should not be this.

**Still skip comment-disable entirely** — it's a third state to build, render and explain,
for very little benefit over a pause, and no published row asks for it.

---

# Part 2 — Questions I raised in Phase 0

## P-1 🟢 Is `moderation_state` a new Rails field, or do we reuse `status`?

**New field. Confirmed, not a judgement call.**

Posts already have `status` (the author's published/unpublished choice). If moderation
writes into it:
- "Restore" can't return the post to what the author actually wanted
- We can't tell "the author unpublished this" from "we hid this"

Two different owners, two different meanings, two different fields.

---

## P-2 🟡 How does the learner get told? What notification channel exists?

**Recommendation: in-app for everything, email additionally for critical categories.**

**Needs a Rails answer first.** bodhi's Socials UI has a notifications bell, but I don't
know what feeds it.

Good news: this degrades safely. The notice also renders **on the post card itself**, so
even with no notification channel at all, the author sees it next time they open the post.
That's the M1 floor, and it works.

---

## P-3 🟡 Is there a reach signal — a view count on posts?

**Needs a Rails answer.**

If no: fall back to space member count × post age. Less accurate, entirely workable.

Not a blocker either way — Layer 2 just weighs one signal less. Ask, get an answer, move on.

---

## P-4 🟢 What do we tell schools about non-English accuracy?

**Recommendation: say plainly that measured accuracy is English-only.**

We screen Hindi, Tamil and Hinglish with the same model. It will catch things. We have
**not measured it**, and our actual user base writes in these languages.

Say: *"Screened in all languages; accuracy measured in English."* Don't let anyone round
that up to "works in Hindi".

This is also an argument for including Hinglish examples in the eval set from day one.

---

## P-5 🟢 Do images ship in M1?

**Recommendation: yes — featured image, inline images, image attachments, and PDFs.**

Because text-only moderation gets defeated by a screenshot within weeks, and because we
already own the OCR service and the PDF extractor. It's mostly wiring.

Excluded: profile photos (M2, different trigger), other file types (log only), video
(no capability, don't pretend).

Full reasoning in `01-image-moderation.md`.

---

## P-6 🟢 KPI framework — use the existing metadata one, or build custom?

**Recommendation: split by audience.** School dashboard via the existing metadata
framework (needs a small Rails mirror); live queue counts and Learnyst accuracy from our
own service.

The framework can only read Rails, so this isn't preference — it's the constraint.
Full reasoning in `04-admin-kpis.md`.

---

## P-6b 🟡 Mode adoption across schools — where does it live?

**New, because row 48 is HIGH and names it.**

Row 48 asks the Learnyst team to see "how many schools use each mode". That number cannot
live on a school's admin dashboard — a school only ever sees itself. `04-admin-kpis.md`
§6 recommended skipping it in M1; with the row at HIGH, skipping is now a **cut Product
has to make knowingly**, not a default.

Three ways out, cheapest first:

| Option | Effort | Honest? |
|---|---|---|
| An Amplitude / Langfuse dashboard | Near zero — we already send the events | Yes. An internal number doesn't have to live in the product |
| An internal page in `saasOptics/` | Small — that's where platform-wide metrics already live, and `LEARNYST_SYSTEM_ADMIN` gates it | Yes, and it's the right long-term home |
| Ship it inside a school's dashboard | — | **No.** It would be wrong by construction |

**Recommendation: Amplitude for M1, `saasOptics/` when someone actually needs it in the
product.** The other four numbers on row 48 ship from our own data as planned.

---

## P-7 🟡 Two community surfaces exist in bodhi. Both in M1?

**Recommendation: new Socials only in M1.**

bodhi has the new **Socials** implementation (spaces, groups, feed) and the older
`community-*` widgets. Both are live today.

Do Socials first — it's where the product is going. But **check which one each real school
is actually on before committing**, because if the big communities are still on the legacy
surface, M1 protects nobody.

That's a question for whoever owns the bodhi rollout, and it's worth asking early.

---

## P-8 🟡 Who labels the data?

**This is the question nobody has asked, and it gates every accuracy claim.**

We cannot measure precision, we cannot tune Layer 2, and we cannot unlock Autopilot
without labeled examples. The go/no-go document explicitly conditions Autopilot on proven
precision — which is unmeasurable today.

**Recommendation:**

| | |
|---|---|
| How many | 300–500 posts |
| From where | The existing 10,282 posts (Jan–Jul 2026) |
| Who | 2 people, independently, so we can measure agreement |
| Effort | ~2 days each |
| Must include | Hindi / Tamil / Hinglish examples, and image posts |
| Output | Baseline precision and recall per category |

Without this, every accuracy number in any deck is invented. With it, we can say
something true.

**Needs:** database read access, and two people's time. That's the ask.

---

## P-9 🟢 What unlocks Autopilot for a category?

**Recommendation: a concrete, published bar — not a judgement call.**

A category can act alone only when **all four** are true:

| # | Bar |
|---|---|
| 1 | ≥ 500 decided cases in that category, in that school |
| 2 | ≥ 0.98 precision (of what AI removed, 98%+ stayed removed) |
| 3 | ≤ 2% appeal overturn rate |
| 4 | Reviewed by the Learnyst team before the school can enable it |

First candidate: **spam and exact duplicates.** Highest volume, most objective, and
Layer 0 already catches most of it deterministically.

Never eligible, by design: self-harm, child safety, credible threats, personal info.

Why publish the bar: it makes "when can we turn on Autopilot?" a data question instead of
an argument, and it's the number that goes in the settings UI next to the locked toggle.

---

## P-10 🟡 What is Milestone 1?

**Recommendation:**

⚠️ **Revised after nine HIGH rows shipped.** The old list is below it, marked, so you can
see exactly what moved and why.

**In M1:**
- Screening: text + images + PDFs
- Copilot mode only (Autopilot built but locked)
- **Flag-without-hide, plus hide, plus queue — admin decides** ← rows 9–11, new
- All 12 categories, with off-topic and academic-integrity **off by default**
- Author notices (on the post card at minimum), **suppressed for flag-only cases**
- **Markers for hidden and removed content, with actor attribution** ← rows 32–35, new
  and the largest Rails item in the whole feature
- **The moderation disclosure banner** ← rows 24–25, new
- One review request per removed post, **including "update the message"**
- Restricted urgent queue + `urgent_safety` permission
- **Threat detail — target · place · time · means** ← row 44, new
- Author violation ledger + warning + ban + **posting pause** ← moved up from M2
- Audit trail
- Socials surface only
- **The real 11-reason report flow** ← moved up from M2; see MR-3

**Not in M1:**
- Autopilot enabled anywhere
- Profile photo screening (M2)
- Appeal metrics (M2)
- Cross-school mode adoption in-product (Amplitude instead — see P-6b)
- KPI dashboard (needs data first)
- **Ban-evasion detection** — row 40's rung 5, which has no design at all (see N-7)

**What moved, and why:**

| Item | Was | Now | Because |
|---|---|---|---|
| Posting pause | M2 | **M1** | Rows 17 (HIGH), 22, 40 |
| Real report flow | M2 | **M1** | Row 27 is HIGH and names 11 reasons |
| Markers | not listed at all | **M1** | Rows 32–35, all HIGH |
| Disclosure banner | not listed at all | **M1** | Rows 24–25 |
| Flag-without-hide | not listed at all | **M1** | Rows 9–11, all HIGH |

**This is a materially bigger M1 than the one in the earlier draft, and most of the
growth is Rails-side.** That is the single most important sentence to say out loud in the
review. The alternative is not a smaller M1 — it's an M1 that silently ships five HIGH
rows at reduced fidelity.

**Blocks:** all planning. This is the decision to walk out of the review with.

---

# Part 3 — New questions from this analysis

## N-1 🟡 What happens if an admin never looks at the queue?

Nobody has designed this, and it's the likely case for a busy single-admin school. Today
the answer is: content stays hidden forever and the learner never hears back.

**Recommendation:**

| Trigger | Action |
|---|---|
| Urgent untouched 1 hour | Notify safety contact, then Learnyst |
| Hidden > 7 days undecided | Email the admin a reminder |
| Hidden > 30 days undecided | **Auto-restore**, tell the admin, log it |

The third one needs senior agreement. My argument: content hidden for a month with no
human decision isn't moderation, it's silent censorship, and the benefit of the doubt
should go to the learner. But it must be logged and the admin must be told.

---

## N-2 🟢 Where does the moderation screen live in the admin dashboard?

The senior developer's design puts a **Moderation card inside the existing per-community
admin page**, next to Posts and Members. That's better than my top-level route —
it's where admins already are.

But the queue, the ledger and the metrics are all **school-level**, not per-community.

**Recommendation: both.** A school-level queue as the main screen, plus the per-community
card as an entry point that opens the queue pre-filtered to that community. Cheap, and it
matches how admins actually navigate.

---

## N-3 ✅ Should the learner see a "checking..." indicator on their post?

**Settled by the page. No longer a disagreement to raise.** Row 11 says a learner hears
from moderation *"only when their content actually moves, or when a person decides
something — never because the AI was merely unsure."* An indicator on every post is
exactly the thing that rules out. Drop this from the review agenda; the original
reasoning is kept below because it's the *why* behind the row.

*Original argument:*

The senior developer's design shows a bar on the live post: *"Live · AI safety check
running in background."* My design deliberately shows nothing.

**Recommendation: don't ship it in M1.**

Three reasons: it tells every learner their posts are being watched in real time; it
appears on the ~97% of posts that are perfectly fine; and it needs a live channel to clear
itself, which the post widget doesn't have today — so it's real engineering for a message
almost nobody needs.

This is a genuine disagreement worth raising openly in the review rather than quietly
resolving in code.

---

## N-4 ✅ Report reasons — 5 or 11?

**Settled: 11, and they're now published verbatim on row 27** — spam · harassment · hate ·
sexual content · self-harm · threat · personal info · illegal activity · cheating ·
off-topic · other. The recommendation below was taken. See **N-9** for the one reason that
is *still* missing from that list.

*Original argument:*

The user stories list **11** reasons. The senior developer's mock shows **5** — dropping
threat, personal info, sexual content, illegal activity, off-topic and "other".

**Recommendation: all 11.** The dropped ones include threat and personal info, which are
exactly the reports that need to reach the urgent queue fastest. A learner who can't
report a threat has to pick "Something else", and it lands in the normal queue.

Probably just mock shorthand — but confirm it, because it changes the routing.

---

## N-5 ✅ Is doxxing / personal info Critical or High?

**Settled: Critical.** Row 45 gives personal info the full Critical treatment — hidden
immediately, blanked in normal views, visible only to admins with special access. The
own-vs-someone-else's split proposed below is still worth keeping as a *product* nuance
(a learner posting their own number deserves a gentle warning, not a restricted case), but
it is no longer an open question about tiering.

*Original argument:*

The senior developer's design tiers **Doxxing as High**. The user story (US-23) says
personal info is hidden immediately, blanked in normal views, and visible only to admins
with special access — which is **Critical** treatment.

**Recommendation: Critical.** Either it's a mis-tier, or they're separating
"posting someone else's details" from "posting your own", which is a reasonable
distinction worth making explicit:

| Case | Tier |
|---|---|
| Exposing **someone else's** details | Critical, restricted |
| Exposing **your own** details | High, hidden + a gentle warning to the learner |

That split is genuinely better than one tier, and worth proposing.

---

## N-6 🔴 Marker rendering — who scopes it, and when?

**New, and it is now the largest single item in the feature.**

Rows 32–34 (all HIGH) require a marker where hidden and removed content used to be, with
actor attribution, in every feed, thread and detail view — and `02-rails-ask.md` §E1
previously told the Rails team the exact opposite. That section is rewritten, but the
work itself has never been estimated by the people who would do it.

It gates nothing on our side, and it will probably set the date. **Get it in front of eng
leadership in the same conversation as the `moderation_state` field, not later.**

---

## N-7 🟡 Ban evasion — what signal may we correlate on?

Row 40's ladder ends with *"tries to get around a block → admin gets alerted and a stronger
block is suggested."* Nothing detects that today, in any repo.

Detecting evasion means linking a new account to a blocked one — device, IP, email pattern,
behaviour, or some mix. Every one of those is a **privacy decision before it is an
engineering one**, especially in communities with minors.

**Recommendation: cut rung 5 from M1 and say so.** Ship the four rungs that work. A ladder
with four solid rungs is honest; one with a fifth rung that silently does nothing is worse
than not claiming it.

---

## N-8 🟡 Who owns the local helpline list?

Row 42 promises a self-harm notice with **"local emergency-help information"**. Nothing in
the design owns that content. `moderation_settings` holds a *school safety contact* — a
person at the school — which is a different thing entirely.

Questions that need one owner: which helplines, for which regions, who keeps them current,
and what a learner outside India sees.

**Recommendation:** ship India as the default (Tele-MANAS `14416`, KIRAN `1800-599-0019`),
put the list in `moderation_settings` so a school can override it, and give it an explicit
owner in Product. **Do not let this be discovered at implementation time** — a stale or
wrong crisis number is the worst possible bug in this feature.

---

## N-9 🟡 Child safety is missing from the report reasons

Row 27's list of 11 has no way for a learner to report **content involving a child**. The
closest options are "sexual content" or "other", and both land in the ordinary queue.

Rows 43 is explicit that child sexual safety gets the tightest handling of any category —
but only when *the AI* catches it. A learner who spots what the AI missed currently has no
route to that queue.

**Recommendation: add a 12th reason.** It costs one row in a modal and one branch in the
routing, and it closes the gap between "the AI is our only detector for the most serious
category" and "learners can tell us". Worth raising even though it means editing a
published story.

---

## N-10 🟢 The case must store the notice the author actually saw

Row 14 asks case detail to show *"what message the author saw or will see"*. The design
stored templates in `moderation_settings` but never the **rendered** text on the case. A
school can edit its messages, so a template read at review time may not be what was sent.

**Recommendation: store `notice_rendered` on `moderation_cases` at send time.** One
column. It also gives row 37's "update the message" something to edit, and it makes the
audit trail truthful. Already added to `03-proximity-scope.md` §3 — noted here so it
doesn't look like it appeared from nowhere.

---

# The things to actually put in front of your seniors

Everything above, filtered to what only they can decide. **This list grew from five to
seven** when nine HIGH rows shipped — and the two new ones are the two biggest.

| # | Question | Who | Blocks |
|---|---|---|---|
| 1 | **MR-2** — legal and retention for child safety and threats | 🔴 Legal + leadership | **Launch** |
| 2 | **N-6** — who scopes marker rendering, and when? It's the largest item and it isn't ours | 🔴 Eng leadership | The date |
| 3 | **MR-1** — does Learnyst staff back up urgent cases? | 🔴 Leadership + support | The escalation design |
| 4 | **P-10** — M1 scope, which is now materially bigger. Approve or cut *knowingly* | 🟡 Product | All planning |
| 5 | **MR-3** — real report flow in M1, or ship row 27 at reduced fidelity? | 🟡 Product | Whether bodhi starts now |
| 6 | **P-8** — who labels 400 posts, and when? | 🟡 Product | Any accuracy claim, and Autopilot |
| 7 | **N-7 + N-8** — ban-evasion signal, and who owns the helpline list | 🟡 Product | Row 40 rung 5, row 42's content |

Bring the rest as *"here's what I decided and why"*. That's the difference between asking
for direction and presenting analysis.

**And say this once, early:** *"Nine HIGH stories were added to the page after this pack
was written. One of them contradicted what I'd told the Rails team. I've reconciled all
nine — `11-story-coverage.md` is the row-by-row check — and the honest result is that M1
got bigger, mostly on the Rails side."* Volunteering that costs nothing and it is the
thing someone will otherwise find.
