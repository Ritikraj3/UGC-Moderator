# Open items and cross-document conflicts

This file adds no design. It lists questions the three documents leave open, and places where they say different
things. Each entry quotes the sources and names the stories or sections it affects. **Nothing here is resolved.**
Each entry needs the owner of the spec, stories or HLD to decide.

- **Part A:** the HLD's own open items (§19)
- **Part B:** where the documents disagree (C1–C10)
- **Part C:** smaller gaps (C11–C19)
- **Part D:** found while mapping the Rails work against production code (C20–C32) — see [`rails-support/README.md`](rails-support/README.md)

---

## Part A — Open items the HLD lists itself

Copied in full in [`hld/19-open-items.md`](hld/19-open-items.md).

| # | HLD §19 item |
|---|---|
| A1 | Re-checking old content is out of scope — would need a `rule_change` trigger, a bulk job and a look-back decision |
| A2 | Held content and notifications — under review first, is a learner told their post went live, or do they just see it appear? *(see also C14)* |
| A3 | Cutover for the Report button — does anything still need to reach the help desk? |
| A4 | Comment context — does Rails send the parent post when checking a comment? |
| A5 | Examples — how many past decisions per academy get sent, and who trims the list |

---

## Part B — Where the documents disagree

### C1 · How many ready-made rules?

| Source | Says |
|---|---|
| Spec — [`spec/05-rules.md`](spec/05-rules.md) | "**Nine** rules ship ready-made and switched on" (lists rules 1–9) |
| Stories — system rule 1 | "A new academy starts with the **ten** Learnyst rules published and the Learnyst blocked-word list active." |

**Affects:** the default rule set, rows 21 and 29, system rule 1.

### C2 · Where the content review mode and moderation mode are set

| Source | Says |
|---|---|
| Spec — [`spec/04-two-settings.md`](spec/04-two-settings.md) | "Both are set for the academy, **then per content area**, and an exception can differ from its area." |
| Spec — [`spec/11-settings.md`](spec/11-settings.md) | Resolution: "an exception for this product → **the content area it belongs to** → the academy" |
| HLD §5 | "Set per academy, **then per content area**" |
| HLD §13, §18 | Same three-step order: exception → content area → academy |
| Stories — glossary | Both modes: "**Set once for the academy**" |
| Stories — notes | "Both are set once for the academy. The four places only decide where moderation runs at all — **they do not carry their own mode**." · "**Not in v1:** a different mode per place" |
| Stories — system rule 5 | "Settings resolve in one order: an exception for the product, **then the academy**. Content review mode and moderation mode are **academy-wide in v1**" |

**Affects:** the Settings screen, rows 3–5 and 10, Rails' settings resolution (HLD §13), and whether the four
content areas carry a mode or only an on/off switch.

### C3 · Can a content area override rules?

| Source | Says |
|---|---|
| Spec — [`spec/05-rules.md`](spec/05-rules.md) | "Rules are written once for the academy; **a content area or an exception** can override any of them." |
| Stories — system rule 3 | "Rules are written once for the academy and **apply everywhere moderation runs**." |
| Stories — system rule 6 | "An **exception** can switch a rule off for one product, never create one." |
| Stories — rows 11–13 | Rule switch-off is described only within an exception |
| HLD §10 `rules[]` | "the effective rules after **exceptions** have been applied" |

**Affects:** rows 11–13, and what "effective rules" means in the submit payload.

### C4 · What happens when a blocked word matches?

| Source | Says |
|---|---|
| Spec — flow, [`spec/03-how-it-works.md`](spec/03-how-it-works.md) | "Blocked words (instant, local) → blocked word or link → **BLOCK**" |
| Stories — glossary | Blocked word: "Stops content on sight, with no AI check" |
| Stories — row 26 | "content containing it is **stopped instantly** without an AI check" |
| Spec — [`spec/06-blocked-words-and-languages.md`](spec/06-blocked-words-and-languages.md) | "A blocked word does nothing on its own. It is attached to a rule, and **the rule's action is what happens** when it matches." |

**Open:** a word can sit on a rule whose action is Guidance, Report or Hold (rules 5 and 8 ship as Hold). Is a
match on it a Block, or does the rule's action apply?
**Affects:** rows 26 and 30, system rule 7, HLD §4 step ②.

### C5 · One academy list, or words inside each rule?

| Source | Says |
|---|---|
| Spec — [`spec/06-blocked-words-and-languages.md`](spec/06-blocked-words-and-languages.md) | "**One list per academy**, pre-filled by Learnyst, fully editable … Academies add rival names and web addresses." · also "It is attached to a rule" |
| Stories — system rule 1 | "the Learnyst **blocked-word list** active" |
| Stories — notes | "Blocked words are added inside the rule; **there is no separate list**." |
| Stories — rows 26–29 | Every blocked-word action is "on a rule" |

**Affects:** whether an academy-level word-list screen exists, rows 26–29 and 33, and the spec's "word-list edits"
in the record.

### C6 · Do blocked words stop content under Copilot?

| Source | Says |
|---|---|
| Spec — Copilot | "**Nothing is stopped automatically** — everything flagged goes to the queue" |
| Stories — Copilot | "Nothing is stopped automatically; flagged content waits for a person" |
| Stories — blocked word | "Stops content on sight, with no AI check" |
| Spec / Stories — AI disabled | "Blocked words and learner reports only" |

**Open:** under Copilot, does a blocked-word match stop content, or go to the queue like an AI flag? The same
question applies to a rule pinned to Copilot (row 31) that has blocked words.
**Affects:** HLD §4 and the §5 combination table, and rows 26 and 31.

### C7 · Who picks the "most severe" rule when two are broken?

| Source | Says |
|---|---|
| Spec — [`spec/05-rules.md`](spec/05-rules.md) | "Break two rules and the most severe is named." |
| HLD §10 — callback `rule_id` | returned by ai-server: "If more than one is broken, the most severe — **Block over Hold over Report over Guidance**" |
| HLD §10 | "ai-server is **never told the rule's action**, the moderation mode, or the content review mode." |
| HLD §10 — `rules[]` | `{ id, name, description }` — no action field |

**Open:** ai-server is asked to rank by action but is not sent the actions.
**Affects:** the submit and callback contract (HLD §10–§11).

### C8 · Quality counters that need facts only Rails holds

HLD §15 has ai-server write its counters "at the moment the verdict is delivered". Some of those counters depend on
facts the HLD keeps in Rails:

| Counter (HLD §15) | Depends on | What the HLD says ai-server receives |
|---|---|---|
| `blocked`, `held`, `guidance`, `reported` — "rule action …" | the rule's action | "never told the rule's action" (§10) |
| `to_teacher` — "anything that reached the queue" | moderation mode, pinned rules, reports | "never told … the moderation mode" (§10) |
| `unchecked` — "deadline fired …" | Rails' deadline | deadlines are Rails' (§3, §9) |
| `approved_after_flag` | the verdict was a flag, plus the decision | outcome = `request_id`, `school_id`, `outcome`, `decided_at` (§10); "no verdict log" (§13); job "gone the moment the verdict is delivered" (§13) |
| `removed_after_report` | the verdict was clean, the content was reported, then removed | same outcome fields; the report never reaches ai-server (§7: "No AI call") |

**Open:** how ai-server obtains these facts under the stated contract.
**Affects:** rows 82–83, HLD §15, and the outcome contract in HLD §10.

### C9 · Four content areas, three Rails models

| Source | Says |
|---|---|
| Spec / HLD §5 | Four areas: Product discussions · Community · Feeds (posts and comments) · Newsfeed (discussions) |
| HLD §10 `content_area` | `product_discussions` / `community` / `feeds` / `newsfeed` |
| HLD §3 | "The **Feed** is `NewsfeedPost`. Community posts are `Post` + `CommunityContent`. **Course, batch and bundle** discussions are `DiscussionBoard` + `Comment`." |

**Open:** which model holds "Newsfeed — Discussions" as opposed to "Feeds — Posts and comments"? And which model
holds the discussions under mock test, test series, ebook, webinar, free resource, podcast and custom products,
which the spec includes in Product discussions?
**Affects:** Rails' shared moderation service (HLD §3), row 3, and the "Where it is" and "Where it runs" columns
(rows 36 and 61).

### C10 · Where the record of blocked content and settings changes lives

| Source | Says |
|---|---|
| Spec — [`spec/07-what-the-learner-sees.md`](spec/07-what-the-learner-sees.md) | "A blocked post still leaves a record — text, rule, author, time. **Not a post**" |
| Spec — [`spec/11-settings.md`](spec/11-settings.md) | "The record — every action, plus **rule changes, mode changes and word-list edits**." |
| Stories — row 67, system rule 11 | Moderation log "including content that was blocked and never published" |
| HLD §8 | "`Post` and `Comment` already have PaperTrail … The record of every action should **extend that** rather than build a parallel audit table." |
| HLD §13 | "Record of every action — Rails, extending PaperTrail" |

**Open:** PaperTrail as described versions `Post` and `Comment` rows. A blocked post has no post row, and a rule,
mode or word-list change is not a post or comment. The HLD's storage table (§13) has no entry for either.
**Affects:** row 67, system rule 11, and the spec's statement that a blocked record counts toward a restriction and
feeds the reports.

---

## Part C — Smaller gaps

| # | Gap | Sources |
|---|---|---|
| **C11** | **Rollout stages are described on different axes.** The spec names the moderation mode at each stage; the HLD names the content review mode and an enforcement flag. Do both describe the same plan? | Spec: "Shadow mode → Copilot on pilot academies → Autopilot once wrong flags hold under 5%" · HLD §17: "Shadow mode — publish first with enforcement off" → "Pilot academies — enforcement on, review first, per-academy flag" → "Widen once the wrong-flag rate holds under 5%" |
| **C12** | **Academy description is missing from the spec's settings list.** | Story row 6 (P1): Description\*, Learner age group\*, Tone of conversation\* · HLD §3 "academy description", §10 `school_context` · the spec's Settings list does not include it |
| **C13** | **The report's Note field.** | Row 80: "Rule broken\*, Note" · HLD §7: the new mutation carries "the content reference and the rule the learner picked" — no note mentioned |
| **C14** | **How the learner is "told".** The spec requires it but no channel is named, and the HLD lists it as open (A2). | Spec: "After a decision — Always told" · Spec: "No notifications in v1 — the waiting count on the dashboard, plus a nudge when the queue goes untouched" · HLD §1/§4 "tells the learner" · HLD §19 item 2 |
| **C15** | **Which rules go into `rules[]`.** Nothing says whether rules with AI checking off, or pinned to Copilot, are sent to ai-server. | Spec: words-only rules still run "with the AI disabled" · Row 30 · HLD §10 `rules[]` "the effective rules after exceptions have been applied" |
| **C16** | **Guidance: "broken" or "close to"?** The spec defines Guidance as a rule's action, which applies when the rule is broken. Row 79 describes content that is allowed but *close to* breaking a rule. The verdict carries only `breaks_rule: true / false`. | Spec — actions table · Row 79 · HLD §10–§11 verdict |
| **C17** | **Wrong-flag rate during shadow mode.** Wrong-flag rate is "content a rule stopped that a Teacher then approved", but shadow mode "acts on nothing". | Stories glossary · HLD §15 `approved_after_flag` · HLD §17 "so the wrong-flag rate is known before anyone is stopped" |
| **C18** | **Path shorthand in diagrams.** The HLD's sequence diagrams write `/moderation/check` and `/moderation/outcome`. The contract paths are `/api/moderation/check` and `/api/moderation/outcome`. | HLD §4, §8, §9 vs §10 |
| **C19** | **Testing a rule against sample text has no AI path.** Row 32 (P1) needs a verdict for text that is not a post. The HLD's only path is the async submit, keyed by `content_id` / `content_version`, with "no synchronous path". | Spec — Rule performance: "Test before publishing — type a sample post, see whether the rule catches it" · Row 32 · HLD §10, §18 #1 |

---

## Part D — Found while mapping the Rails work (C20–C32)

These came from reading the three documents against the production code (bodhi, admin, ai-server,
monitor). Each one is stated with its evidence. Where a proposal exists, it is labelled **PROPOSED** in
[`rails-support/README.md`](rails-support/README.md), and nothing is resolved here.

| # | Question | Evidence |
|---|---|---|
| **C20** | **An AI Block verdict arrives after the row exists.** "Blocked — post never created … still in the composer" fits the synchronous blocked-word path. The AI verdict comes a second later, after the post was written (held or live). What happens to the row? PROPOSED: status `BLOCKED`, visible only to the author with the rule, never restorable, plus a blocked-content record. | Spec — What the learner sees · HLD §4 (the row is written before the check) · spec actions table (Block: not live, not queued) |
| **C21** | **`content_id` collides across Rails models.** `Post` and `NewsfeedPost` both go as `post`, and `DiscussionBoard` and `Comment` both go as `comment`. Their integer ids overlap, so `idempotency_key` and the callback cannot identify the row. PROPOSED: a Rails-opaque id such as `"Post-5521"`. | HLD §10 (content_type post/comment; key format) · bodhi: four models (rails-support §2) |
| **C22** | **When does Rails send `trigger: catchup`?** Which Unchecked items, how soon after ai-server recovers, and how far back? | HLD §9, §10, §14 (the bulk lane after an outage) |
| **C23** | **Defaults the sources do not state:** the moderation mode, removals before a restriction, the repeated-post count and window (and the window's unit), the number of first posts to hold, and AI checking on a new rule. Only the content review mode default (review first) and first-posts hold (off) are stated. | Stories 5, 7, 8, 9, 17 · spec — Settings |
| **C24** | **Who owns the self-harm support message and helpline text**, and for which regions and languages? | Spec: "Fixed message plus a helpline" · HLD §12: "Rails shows its own fixed message and the helpline" · story 78 |
| **C25** | **Can an academy delete a Learnyst rule?** Story 22 covers "a rule they created". System rule 2 speaks of "a Learnyst rule … the academy deletes". The spec says academies "reword, re-action, switch off". | Story 22 · SR 2 · spec — Rules |
| **C26** | **The callback token versus the internal http host.** HLD §16 wants a shared service token on the callback. Today's `/internal/v1` Rails callbacks (`/internal/v1/ai_ingest/lesson_result`) are **authless** over the http-only internal gateway, and ai-server deliberately keeps credentials off that plaintext path (CWE-319 comment). Options: https on the internal host, a token over internal http, or network-only as today. | HLD §16 · ai-server `rails-callback.handler.ts`, `constants.ts` |
| **C27** | **Is a post's `attachment_url` moderated?** HLD §6 lists `posts.featured_image`, `comments.attachment_url` and `comments.image`. Community posts also carry `attachmentUrl`. | HLD §6 · bodhi `CreateCommunityPostInput` |
| **C28** | **PaperTrail coverage.** HLD §8 says Post and Comment have PaperTrail. DiscussionBoard and NewsfeedPost are not mentioned, but edit history (story 39) and the record need them. | HLD §8, §13 · story 39 |
| **C29** | **Read-side details the sources do not cover:** do counts (`totalCount`, `totalDiscussions`, `commentCount`) exclude content the viewer cannot see? What do staff see of held content in the learner apps? What happens to a queue item when the learner deletes their content? Can a learner edit REMOVED or BLOCKED content? | HLD §13 ("visible only to its author") · the existing delete mutations in bodhi |
| **C30** | **Existing community ban versus the new scoped ban.** `banCommunityMember(IS_PERMITTED \| IS_BANNED)` and `user.communityStatus` ban per community today. The new ban is per product or academy, and "community" is not a product type. Is a community a "product" for ban scope, and what happens to existing bans? | bodhi `BanCommunityMemberRepo` · stories 48–49 · HLD §10 `product_type` list |
| **C31** | **Which Rails roles are "Teacher / Admin" and "Teaching Assistant"?** Every admin API needs the mapping: Teaching Assistants may view, approve, remove, restore and restrict, but not ban or change settings or rules. | Stories 51–55 · spec: "Who can ban? Teachers only" · SR 18 |
| **C32** | **Self-harm under publish first.** Rule 5 is Hold and pinned to Copilot by default. Copilot means "nothing is stopped automatically", and publish first + Copilot means "nothing is removed until a person says so". So a self-harm post would stay visible until a person acts. Is that intended? | Spec — Rules and two settings · HLD §5 combinations |
