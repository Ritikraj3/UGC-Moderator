# Traceability — every story, and where the spec and HLD describe it

This file adds no design. It points each story row at the sections that already describe it.

- **Part 1:** story → spec → HLD, row by row
- **Part 2:** stories that only the story itself describes
- **Part 3:** spec behaviour that has no story of its own
- **Part 4:** what the sources put outside v1

**Key**

- **Spec** column: the file number in [`spec/`](spec/README.md) (02 Scope · 03 How it works · 04 Two settings ·
  05 Rules · 06 Blocked words & languages · 07 What the learner sees · 08 Review queue & repeat offenders ·
  09 Rule performance · 10 When the check fails · 11 Settings · 12 Decisions)
- **HLD** column: the § number, the same as the file number in [`hld/`](hld/README.md). "§18 #n" is decision *n*
  in [`hld/18-decisions.md`](hld/18-decisions.md)
- **SR** column: the stories' system rules, [`stories/10-system-rules.md`](stories/10-system-rules.md)
- **C*n***: a conflict or gap in [`open-items.md`](open-items.md)
- **—**: not described there

---

## Part 1 — Story by story

### Moderation Settings — [`stories/02`](stories/02-moderation-settings.md)

| Row | Pri | Story | Spec | HLD | SR |
|---|---|---|---|---|---|
| 2 | P1 | Moderation on/off for the academy | 11 | §3, §4 ① | — |
| 3 | P1 | On/off for each content area | 02, 11 | §5, §10 `content_area` | 5 |
| 4 | P1 | Content review mode | 04, 11 | §4, §5 | 5, 15 |
| 5 | P1 | Moderation mode | 04, 11 | §5, §10 | 5 |
| 6 | P1 | Describe the academy — description, learner age group, tone | — (C12) | §3, §10 `school_context` | — |
| 7 | P1 | Number of removals before a restriction | 08, 11 | §3 | 10 |
| 8 | P2 | Repeated content counted as spam | 03, 11 | §3, §4 ③ | — |
| 9 | P3 | Hold a new learner's first posts | 11 | — | — |
| 10 | P2 | Add an exception for a product | 02, 04, 11 | §5, §13 | 5, 6 |
| 11 | P2 | Switch a rule off within an exception | 05 (C3) | §10 `rules[]` | 6 |
| 12 | P2 | Switch a rule back on for a product | 05 | §10 `rules[]` | 6 |
| 13 | P2 | View the rules in force for a product | — | — | — |
| 14 | P2 | Exceptions list | 02 | §5 | — |
| 15 | P2 | Remove an exception | 02 | §5 | — |

### Rules & Blocked Words — [`stories/03`](stories/03-rules-and-blocked-words.md)

| Row | Pri | Story | Spec | HLD | SR |
|---|---|---|---|---|---|
| 17 | P1 | Create a rule | 05 | §3, §10 `rules[]` | 3, 6 |
| 18 | P1 | Rules list | 05 | §2 (rules screen) | 17 |
| 19 | P1 | Rule detail | 05 | §2 | — |
| 20 | P1 | Update a rule | 05 | §14, §18 #16 | 4 |
| 21 | P1 | Update a Learnyst-provided rule | 05 (C1) | — | 1, 2 |
| 22 | P2 | Delete a rule they created | — | — | — |
| 23 | P1 | Publish a rule | 05 | §14, §18 #6 | 4 |
| 24 | P1 | Warning on publish or reword | 05, 12 | §14, §18 #6, §19 #1 | 4 |
| 25 | P1 | Unpublish a rule | 05 | — | — |
| 26 | P1 | Add a blocked word to a rule | 06 (C4, C5) | §3, §4 ②, §16 | 7 |
| 27 | P1 | View a rule's blocked words | 06 | — | 2 |
| 28 | P2 | Update a blocked word | 06 | — | — |
| 29 | P1 | Delete a blocked word, including Learnyst's | 06, 12 | — | 2 |
| 30 | P1 | Switch AI checking off for a rule | 05 (C15) | — | — |
| 31 | P1 | Pin a rule to Copilot | 04 (C6) | — | — |
| 32 | P1 | Test a rule against sample text | 09 | — | — |
| 33 | P2 | Test a blocked word against sample text | — | — | — |
| 34 | P2 | Reason shown to learners when reporting | 05 | §7 | — |

### Review Queue — [`stories/04`](stories/04-review-queue.md)

| Row | Pri | Story | Spec | HLD | SR |
|---|---|---|---|---|---|
| 36 | P1 | Content needing review — list | 08 | §2, §8, §12 | 17, 18 |
| 37 | P1 | Surrounding conversation | 08 (three panes) | — | — |
| 38 | P1 | Learner's moderation history | 08 (member panel) | §3, §13 | 10 |
| 39 | P1 | Edit history | 07 | §13 (PaperTrail) | — |
| 40 | P1 | Approve | 03, 08 | §8, §10 outcome | — |
| 41 | P1 | Remove | 03, 08 | §8, §10 outcome | 12 |
| 42 | P1 | Restore | 08 | §8, §13 | 12 |
| 43 | P1 | How much is waiting | 11 | — | — |
| 44 | P1 | How long the oldest has waited | 08 | — | — |
| 45 | P1 | Published without a check | 08, 10 | §9 | 15 |
| 46 | P2 | Mark decided content as an example | 09 | §10 `examples[]`, §19 #5 | — |
| 47 | P1 | Restrict a learner | 08 | §8 | 13, 16, 20 |
| 48 | P1 | Ban from one product | 08 | §8 | 13, 14, 20 |
| 49 | P1 | Ban from the academy | 08 | §8 | 13, 14, 19, 20 |
| 50 | P1 | Remove a banned learner's content within the ban's scope | — | — | 13 |
| 51 | P1 | TA views the queue | — | — | 18 |
| 52 | P1 | TA approves | — | — | 18 |
| 53 | P1 | TA removes | — | — | 18 |
| 54 | P1 | TA restores | — | — | 18 |
| 55 | P2 | TA restricts a learner | — | — | 18 |

### Restrictions & Bans — [`stories/05`](stories/05-restrictions-and-bans.md)

| Row | Pri | Story | Spec | HLD | SR |
|---|---|---|---|---|---|
| 57 | P1 | Restricted and banned learners — list | 08 | §2, §8 | 17, 20 |
| 58 | P1 | Lift a restriction | 08 (the undo) | §8 | — |
| 59 | P1 | Lift a ban | 08 (the undo) | §8 | 19 |

### Moderation Reports — [`stories/06`](stories/06-moderation-reports.md)

| Row | Pri | Story | Spec | HLD | SR |
|---|---|---|---|---|---|
| 61 | P1 | Moderation summary | — | §15 ("each academy sees its own numbers in Rails") | — |
| 62 | P1 | Rule performance report | 09 | §15 | 17 |
| 63 | P1 | Open the content behind a number | — | §15 ("open the rule performance report in Rails") | — |
| 64 | P1 | Product activity report | — | §15 | 17 |
| 65 | P2 | Add an exception from the Product activity report | — | — | — |
| 66 | P1 | Problem members report | 08 | §3, §13 | 17 |
| 67 | P1 | Moderation log, including blocked content | 07, 11 (C10) | §8, §13 | 11 |
| 68 | P2 | Export any report | — | — | — |

### Learner Experience — [`stories/07`](stories/07-learner-experience.md)

| Row | Pri | Story | Spec | HLD | SR |
|---|---|---|---|---|---|
| 70 | P1 | View the community rules | 05 | — | 8 |
| 71 | P1 | Which rule stopped their content | 07 | §12 | 7, 8 |
| 72 | P1 | Content is waiting for review | 07 | §4, §5, §12 | 15 |
| 73 | P1 | See their own waiting content | 07 | §13 | — |
| 74 | P1 | Update their own waiting content | 07 | §4, §10 `content_version` | — |
| 75 | P1 | The outcome once decided | 07 (C14) | §8, §19 #2 | — |
| 76 | P1 | Why published content was taken down | 07 | §5, §12 | 15 |
| 77 | P1 | Why they are restricted | — | — | 13, 16 |
| 78 | P1 | Helpline instead of a rule name for self-harm | 05, 07 | §12 | 9 |
| 79 | P2 | Guidance when close to breaking a rule | 05 (C16) | — | — |
| 80 | P1 | Report content | 05 (C13) | §7 | — |

### Learnyst Traction Report — [`stories/08`](stories/08-learnyst-traction-report.md)

| Row | Pri | Story | Spec | HLD | SR |
|---|---|---|---|---|---|
| 82 | P1 | Volume across all academies | — | §15 (C8) | — |
| 83 | P1 | Wrong-flag and miss rates across all academies | 12 (rollout, under 5%) | §10 outcome, §15 (C8) | — |
| 84 | P2 | Cost and latency by model and prompt version | — | §11, §15 | — |
| 85 | P2 | Which academies have moderation switched on | — | §15 (per-academy documents; no on/off counter is listed) | — |

---

## Part 2 — Stories that only the story itself describes

Neither the spec nor the HLD describes these beyond the story row. System rules apply where noted.

| Row | Pri | Story | System rule |
|---|---|---|---|
| 13 | P2 | View the rules in force for a product | — |
| 22 | P2 | Delete a rule they created | — |
| 33 | P2 | Test a blocked word against sample text | — |
| 50 | P1 | Remove a banned learner's content within the ban's scope | 13 |
| 51–55 | P1 / P2 | Teaching Assistant: view, approve, remove, restore, restrict | 18 |
| 65 | P2 | Add an exception from the Product activity report | — |
| 68 | P2 | Export any report | — |
| 77 | P1 | Why they are restricted | 13, 16 |

---

## Part 3 — Spec behaviour with no story of its own

| Spec says | Where |
|---|---|
| "Teachers and Teaching Assistants are never checked." | [`spec/02-scope.md`](spec/02-scope.md) |
| Editing a held post that still breaks a rule sends it "to the back of the queue flagged **edited after being held**" | [`spec/07-what-the-learner-sees.md`](spec/07-what-the-learner-sees.md) |
| The queue prompts: *"5 posts removed — ban this member?"* | [`spec/08-review-queue.md`](spec/08-review-queue.md) |
| The queue's four tabs — Needs review · Reported · Unchecked · Done — and the three panes | [`spec/08-review-queue.md`](spec/08-review-queue.md) |
| "A nudge when the queue goes untouched" | [`spec/11-settings.md`](spec/11-settings.md) |
| A late verdict "is still applied — the post can move from Unchecked into the queue" | [`spec/10-when-the-check-fails.md`](spec/10-when-the-check-fails.md) |
| Learnyst's word list "ships with romanised Hindi and regional terms too" | [`spec/06-blocked-words-and-languages.md`](spec/06-blocked-words-and-languages.md) |
| Rule 5 (self-harm) "is pinned [to Copilot] by default" | [`spec/04-two-settings.md`](spec/04-two-settings.md) |

---

## Part 4 — What the sources put outside v1

### Deferred

| Item | When | Source |
|---|---|---|
| Direct messages, live chat, reviews, doubts, profiles | v2 | Spec — Scope |
| Video and audio | later | Spec — Scope |
| Checking whether a link is safe | not in v1 | Spec — Decisions |
| Notifications | none in v1 — "the waiting count on the dashboard, plus a nudge when the queue goes untouched" | Spec — Settings |
| A different mode per content area | not in v1 | Stories — Notes |
| Per-product staff assignment | not in v1 | Stories — system rule 18 |
| `GET /api/moderation/check/{request_id}` | not built in v1 | HLD §10 |
| BigQuery | not in v1 | HLD §15, §18 |
| Re-checking old content (`rule_change` trigger, bulk job) | out of scope | HLD §19 |
| Batch or self-hosted classifier | "Possible" — behind the same interface | HLD §11 |

### Decided against

| Item | Source |
|---|---|
| Learner appeals — "Blocked posts can be fixed and reposted; removed posts come with the rule" | Spec — Decisions |
| Re-checking posts when a rule changes | Spec — Decisions · HLD §14, §18 |
| A synchronous check path, a mode field, a `callback_url` field | HLD §10, §18 |
| Learner content stored in ai-server — "no moderation tables in `proximity_db`" | HLD §13 |
| An agent or Mastra workflow for the check | HLD §11, §18 |
| Checking images at upload | HLD §6, §18 |
| Machine-written text shown to learners | Spec — What the learner sees · HLD §12 · SR 8 |
| Word matching in the client | HLD §16 |
| Reports as help-desk tickets | HLD §7 |
