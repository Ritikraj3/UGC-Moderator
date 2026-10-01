# User Story Additions — ✅ SHIPPED

**Status: PUBLISHED. All nine rows are live on the page.**

⚠️ **This file said "NOT PUBLISHED" for longer than it was true, and that caused real
damage.** Docs 00–09 were written on the assumption these rows didn't exist yet, so nine
HIGH stories had no design behind them — and `02-rails-ask.md` §E1 ended up telling the
Rails team the *opposite* of what Insertion 3 requires. All of it is reconciled now; the
row-by-row check is `11-story-coverage.md`, and the post-mortem is `09-audit-findings.md`
Part 4.

Page: **User Stories AI Moderator Community**
`https://learnyst-dev.atlassian.net/wiki/spaces/SR/pages/1326874633` · space `SR`

**Three insertions, nine new rows** — plus a tenth row (non-English screening) that
appeared separately and is now row 5.

---

## What actually shipped vs. what this file proposed

Four differences between the draft below and the published rows. Two of them change
behaviour.

| # | Draft said | Page says | Consequence |
|---|---|---|---|
| 1 | Insertion 1 row 2 — *"Admin can decide what happens to a flagged post that is still visible"* — priority **MEDIUM** | **HIGH** | It's M1, not a nice-to-have. `applyCaseAction` is required, not optional |
| 2 | Insertion 2 — banner runs under *"the school's **own name for it**"* | *"the school's **assistant name**"* | **Locks it to `aiGuruSchoolProfile.aiAvatarName`** — the existing, single, school-wide AI identity. The concern below about the AI that helps you also policing you is now a live constraint, not a suggestion |
| 3 | Insertion 2 row 2 — admin can *"**name their school's AI moderator**"*, and edit the guidelines | The naming clause is **dropped**; only the toggle and the guidelines remain | Consistent with #2 — the name is inherited from the school assistant, not set per community |
| 4 | Insertion 3 row 1 carried **two** bullets: a removed **reply** stays as a marker, *and* a removed **post** leaves the feed but keeps its marker on its own page | Only the **reply** bullet is published | The post case is still the right behaviour and is specified in `02-rails-ask.md` §E1b — but it is **not** on the page. Worth adding, or it will be missed in build |

**Row numbering:** the page is now 49 rows = 13 section headers + 36 stories. The nine
rows below are rows **9, 10, 11** (Insertion 1), **24, 25** (Insertion 2) and
**32, 33, 34, 35** (Insertion 3).

---

## Format to match

The existing table has two columns: **User Story** and **Priority**.

- **Section header rows** — column 1 bold, column 2 **empty**
- **Story rows** — capability phrase in bold, then "so that…"; column 2 a status
  lozenge (HIGH / MEDIUM) styled like the existing ones

Existing status ids run `id-0` → `id-27`. New rows use `id-28` onward.

---

# Insertion 1 — into **Moderation Modes & Risk Routing**

**Placement:** immediately after the US-5 row (ends *"…so that risky content is stopped
fast without a costly AI mistake"*), before the **Admin Review Queue** header.

**No new section header.** These join the existing section.

| User Story | Priority |
| --- | --- |
| Admin can **rely on content the AI is unsure about being flagged for review but left visible, instead of hidden**, so that a low-confidence guess never takes down genuine discussion | HIGH |
| Admin can **decide what happens to a flagged post that is still visible — leave it as it is, send the author a warning, hide it while they look closer, or remove it**, so that the response is chosen by a person rather than already decided by the AI | HIGH |
| Learner can **only hear from moderation when their content actually moves, or when a person decides something — never because the AI was merely unsure**, so that a low-confidence guess never arrives as an accusation | HIGH |

Status ids: `id-28` HIGH · `id-29` MEDIUM · `id-30` HIGH

### Why this is needed

The page currently welds *flagged* and *hidden* together. US-5 says flagged content **is
hidden**, and every action in US-8 (approve back / remove / keep hidden) assumes it is
already down. There is no flag-without-hide anywhere.

But two rows already assume it exists: US-3 promises *"genuine discussion isn't wrongly
hidden"* with no mechanism behind it, and US-6's **Low Confidence** queue lane only makes
sense if those items are still visible.

Without this, a 0.42-confidence guess on *"how does proctoring detect cheating?"* takes
down an innocent question.

---

# ✅ Insertion 2 — new section **Community Disclosure & Rules** — ADDED

**Placement:** after the last row of **School Moderation Settings** (ends *"…so that
strictness can be tuned per space and per topic"*), before the **Learner Reporting**
header.

| User Story | Priority |
| --- | --- |
| **Community Disclosure & Rules** |  |
| Learner can **see a banner on every community saying it is moderated by AI under the school's own name for it, and open it to read what gets checked, what happens when something is flagged, that a person from their school makes the final decision, and the community's rules**, so that they always know automation is involved and never have to guess who is judging them | HIGH |
| Admin can **turn the moderation banner on or off for each community, name their school's AI moderator, and edit the guidelines shown behind it**, so that disclosure fits how each community is run | MEDIUM |

Status ids: `id-31` HIGH · `id-32` MEDIUM

---

# Insertion 3 — new section **Hidden & Removed Content — What Others See**

**Placement:** immediately after the **Author Notices** row (ends *"…so that they're never
left confused or made to feel attacked"*), before the **Review & Appeal** header.

| User Story | Priority |
| --- | --- |
| **Hidden & Removed Content — What Others See** |  |
| Learner can **see that something was removed in the place where it used to be, with the author's name and picture hidden and no reason shown**, so that conversations still make sense and nobody is left confused about what happened: A removed **reply** → **stays in the thread as a marker**, so replies underneath still read correctly A removed **post** → **gone from the feed, but the marker still shows on its own page**, so people who commented are not left with nothing | HIGH |
| Learner can **see only "Under review" where a hidden reply used to be — no name, no reason, no blame**, so that a pause is never mistaken for a verdict and nobody is publicly accused over something that may come back | HIGH |
| Learner can **see who removed something and read a message written for that case — the AI naming itself and saying it acted automatically, or a moderator pointing to the community rules**, so that nobody is told a person made a decision when no person did | HIGH |
| Admin can **rely on removals in sensitive categories leaving no trace at all — self-harm, child safety, threats and personal information vanish completely instead of leaving a marker**, so that a removal never advertises that something serious happened | HIGH |

Status ids: `id-33` · `id-34` · `id-35` · `id-36` — all HIGH

**Section renamed** from the earlier draft ("Removed Content…") to cover both markers,
since the hidden-reply marker belongs here too.

---

# The agreed rules behind these rows

Design detail for implementation. Not part of the Confluence table.

## Attribution scales with finality

**Hidden is a pause. Removed is a verdict.** The marker says more as the decision
becomes more final.

| State | What everyone else sees |
|---|---|
| **Hidden reply** | `Under review` — nothing else. No actor, no reason, no blame. |
| **Removed by AI** | `Removed automatically by <botname>` + *"I am a bot and this action was performed automatically. Contact your school's moderators if you think this is wrong."* |
| **Removed by admin** | `Removed by a moderator for breaking the community rules.` + link to the rules |
| **AI hid it, admin removed it** | `a moderator` — a human made the decision |
| **Sensitive category** | Nothing anywhere |

Why the hidden marker carries no disclosure: **the banner already does.** It sits at the
top of every page permanently. Repeating it inline on every marker is noise. It appears
on removals specifically because a removal is a named action by a named actor.

## Author vs everyone else

| | Hidden | Removed |
|---|---|---|
| **Author** | Full message — what, why, roughly when to expect an answer | Full message — reason, bot disclosure if AI, appeal button |
| **Everyone else** | `Under review` | Attribution + disclosure or rules link |

The author needs to know what happened to their words. Everyone else only needs the
conversation to still read correctly.

## Flag-only is silent

| | |
|---|---|
| Content | Stays fully visible |
| Author | **Told nothing** |
| Admin | Low-confidence queue lane, lowest priority |
| Appeal | Nothing to appeal — nothing was taken |
| Exception | An admin may choose to send a **warning**. A human decision, never automatic. |

Two reasons: *appeal* is the wrong verb when nothing happened to you; and at 0.42
confidence we would be accusing innocent people roughly six times out of ten.

Third reason, less obvious: telling people what trips the filter teaches them to route
around it — someone who learns `t.me` gets flagged just writes `t·me`.

---

# Still open — updated

| | |
|---|---|
| ❓ | **The dropped bullet (difference #4 above).** A removed *post* leaving the feed while keeping its marker on its own detail page is specified in the Rails ask but not on the page. **Recommendation: add it**, or someone builds only half of row 32. |
| ✅ | **Bot name scope — settled by the published wording.** "The school's assistant name" means one identity per school, inherited from `aiAvatarName`. The per-community toggle stays; the per-community *name* is gone. |
| ❓ | **Public explainer under a marker** — the AutoModerator-style reply. **Recommendation: still no.** In a subreddit it stops a weekly argument; in a paid school community it invites the drama the removal was meant to end. The banner already carries the disclosure permanently. |
| ❓ | **Manual admin hide** — an admin taking down something the AI missed, without removing it. Still not on the page. Costs nothing in UI (the marker is already `Under review`), and `applyCaseAction`'s *hide-now* verb covers the mechanism — but there's no story for an admin acting on content that was never flagged. |
| ⏸ | **Waiting-period notices** — still parked. The gap: row 30 covers hidden / removed / restored, but nothing updates the author while they wait, so *"usually within a day"* is silently broken on day 7. `05-admin-responsibilities.md` §9's reminder ladder is the cheap fix if anyone wants it. |
| 🆕 | **Child safety is missing from row 27's report reasons.** Eleven reasons, and none of them is "content involving a child" — so a learner who spots what the AI missed can't route it to the restricted queue. See `06-open-questions-answered.md` N-9. Adding it means editing a published story, which is why it's listed here. |

---

# Feasibility findings (do not change the stories, do change the estimate)

**The bot name already exists.** `aiGuruSchoolProfile.aiAvatarName` — school-configurable,
set in the AI Avatar Configurations wizard, already reaches every bodhi widget through the
school config. Free.

⚠️ But it is **one name per school**, already used by the lesson chat bot and the school
assistant. Reusing it means the AI that helps you is the AI that polices you.
Recommendation: pair it with the role — *"NexaBot · moderation"*. Also: it can be **empty**
(the "AI Coach" default is only an i18n placeholder), and the config is **cached for a
day**, so a rename takes up to 24h to appear.

**The banner component needs work.** `bodhi-social-banner` exists but: the dismiss button
is unconditional, it has **no slots** so it cannot host an ⓘ button or open a dialog, it
is **not wired into production** at all, it is ~49px rather than thin, and `role="alert"`
would interrupt screen readers on every page load. A dedicated
`bodhi-moderation-disclosure` molecule may be cleaner than bending it.

**The per-community on/off flag does not exist at any layer.** New backend work. Cheapest
path: hang it off the existing `UpdateSpaceInput`, which already takes partial patches.

**Verified in this pass:** `aiGuruSchoolProfile.aiAvatarName` is real and reaches bodhi
through the school config — it drives the lesson chat panel and the mobile chatbot today.
`social-banner` exists at `apps/widgets/src/raven/molecules/social-banner`. Both
confirmed; the constraints above stand.

**And the item this file underestimated:** Insertion 3 is not a copy change. It is
**new Rails read-path work across every feed, thread, detail view and count** — marker
rendering, actor attribution, author name and picture suppression, and a split in how
counts behave. It is now the largest single item in the feature and the most likely thing
to set the date. Specified in `02-rails-ask.md` §E1b and §E1c; raised as decision #2 in
`08-decisions.md`.
