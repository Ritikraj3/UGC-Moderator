# Review: Rails slice 1 contract (Moderation Settings API)

- **What's reviewed:** the Rails dev's page, "Moderation settings and rules: the API surface". It covers slice 1, WOW-2550, epic WOW-2542. Dev: Shridhar G. Lead reviewer: Vishal. Drafted 2026-10-09.
- **Link:** https://claude.ai/artifact/P8FaJzbE1GJTyMhRPzQruw
- **Scope, slice 1 only:**
  - the academy's moderation **settings** and **exceptions**;
  - **rules** and **blocked words**, and testing a rule;
  - the 5 internal REST APIs the **Monitor** uses for Learnyst rules.
- **Not in slice 1:** checking content, holding or removing it, and the ai-server check/webhook/outcome calls (slice 2). Also the review queue and reports (slices 3–4).
- **Status:** that page is the **source of truth**. It replaces our own YAML contracts in `api-contracts/` for settings, exceptions, rules and words.
- **Reviewed on 2026-10-09** against `spec/`, `stories/`, the HLD, the Monitor code and ai-server.

This page is a design summary. Details such as enum lists, max lengths and ranges will come with the real API contract, so they aren't raised here. What follows is only what's **really missing, or a blocker**.

---

## Real gaps: comment on the page (4)

### 1. Rule numbers clash between Learnyst and academy rules

- **Where:** Exceptions → `rulesInForceForProduct` (the example), and Rules → `createModerationRule` (the note "The number is the school's next number").
- **What's wrong:** in their own example, `"No hate speech"` (LEARNYST) and `"No spam or advertising"` (ACADEMY) are **both number 1**. Learnyst rules belong to no school, so "the school's next number" doesn't cover them.
- **Why it's a blocker:** the number is part of the data model, protected by a unique index, and frozen on approval. Learners and Teachers will see "Rule 1" twice. The spec numbers rules in creation order (`spec/05-rules.md`).

> **Comment:** Learnyst and academy rules can both be "number 1" (see the rulesInForceForProduct example). Learnyst rules have no school, so "school's next number" doesn't cover them. How is a rule numbered across the two sources? This decides the unique index, so it needs settling before the freeze.

### 2. `isSelfHarm` is missing from the GraphQL rule

- **Where:** Rules → `moderationRule` query.
- **What's wrong:** the REST rule (Monitor) has `is_self_harm`, but the GraphQL rule (admin) doesn't.
- **Why it matters:** the self-harm rule is never named to learners and is pinned to Copilot by default (`spec/07-what-the-learner-sees.md`, `spec/04-two-settings.md`). The admin can't tell which rule it is.

> **Comment:** `isSelfHarm` is in the REST shape but missing from the GraphQL rule type. The admin needs it: the self-harm rule is never named to learners and is pinned to Copilot by default.

### 3. Change history ("the record") isn't stored

- **Where:** "Patterns this slice reuses" → Storage (or a general comment).
- **What's wrong:** nothing records who changed a rule, a setting, an exception or a blocked word, and when.
- **Sources:**
  - `spec/11-settings.md`: "the record — … rule changes, mode changes and word-list edits";
  - system rule 11;
  - HLD §8 and §13: extend **PaperTrail**, not a new audit table;
  - open item C10.
- **Why now:** the screen can come later, but if saving doesn't start in slice 1, every early change is lost.

> **Comment:** The spec's record (rule, mode and word-list changes — who and when) isn't stored in slice 1. HLD §8/§13 says extend PaperTrail. Can `moderation_rules`, `moderation_settings` and the exception column get PaperTrail now, so history starts from day one?

### 4. Their open decision 1 (AI test) needs our answer

- **Where:** the top box "Needs Vishal's decision", item 1.
- **What it is:** "test a rule" can't get an AI answer on screen, because our AI check is asynchronous (it sends now and the answer comes by webhook).
- **Our answer:**
  - **C** for slice 1: words only, AI returns `NOT_AVAILABLE`.
  - **A** for slice 2: ai-server adds a direct test endpoint with the same Gemini call and no queue or webhook.
  - Not **B**: it pushes test results through the real webhook, Rails has to store fake checks, and the screen has to wait.

> **Comment:** Agree with C for slice 1. For slice 2 we (ai-server) prefer A: a synchronous test endpoint, same classifier, no queue/webhook. B would push test verdicts through the production webhook and needs fake check rows + polling on screen.

---

## Check when the real contract arrives (no comment now)

Tick each of these off when the full contract comes. Raise only the ones it still doesn't answer.

- **Enum lists:**
  - `moderationMode`: what "AI disabled" is called;
  - `learnerAgeGroup`, `conversationTone`;
  - `action`: GUIDANCE / REPORT / HOLD / BLOCK, lowercase in REST.
- **Ranges:** `spamPostsThreshold`. The other numbers have ranges.
- **Max lengths:** rule `description` (the Monitor uses 2000), the academy profile `description`, and `sample_text` (the Monitor uses 5000).
- **When the profile is required.** Story 6 marks it required, but the defaults are null.
- **First-posts hold.** How do you send "on, without a number" when the only field is the number?
- **Monitor token.** Which claims does Rails read (`email`?) and which scope does it check? The Monitor sends HS256 `{ email, name, scope: "monitor" }` with a 60 s expiry.
- **REST list without `?status=`.** Do drafts come back? The Monitor shows them.
- **REST create with `"status": "published"`.** Is it allowed? The Monitor's Publish button on a new rule sends it.
- **`report_reason`.** Is it optional? The Monitor sends `null` when it's empty.
- **Test limit.** Does it count while the AI half is `NOT_AVAILABLE`? The example shows `remainingTests: 4`.
- **`updateModerationRule` example.** It shows a notice on a draft rule; the note says notices are for published rules only.

## Tell the PM (no comment on the page)

- **Stories rows 21 and 29 are dropped.** Those are "Teacher can update a Learnyst rule" and "delete a Learnyst blocked word". That was our decision (Learnyst rules are locked), and the page follows it. `stories/03-rules-and-blocked-words.md`, `stories/09-notes.md` and `spec/06-blocked-words-and-languages.md` still say the old thing.
- **Only schools on external pricing get moderation** (decision 2; everyone else gets a 412).

## Our own fixes: the Monitor

These are the Monitor's mismatches against the REST part:

| # | What | Monitor now | Contract |
|---|---|---|---|
| 1 | Test request | `{ rule: {...}, text }` | flat `{ name, description, action, blocked_words, sample_text }` |
| 2 | Test response | reads `word_matches`, `ai_check_status` | `blocked_word_match: { matches, matched_words }`, `ai_verdict: { status }` |
| 3 | Blocked words per rule | no limit | max 200 |
| 4 | Footer text | "apply to every academy" | only academies on moderation (external pricing) |

Everything else matches:
- the list returns `{ rules }`;
- all field names;
- create and update bodies;
- `draft` / `published`;
- delete;
- the error `message`.

## ai-server: nothing blocked by slice 1

Slice 1 stores everything ai-server's check (A1) needs from rules and settings:
- **`rules[]`:** rule `id`, `name` and `description`;
- **`school_context`:** the academy's description, age group and tone.

`examples` (few-shot, from Teacher decisions) come with the review queue later.

**For the slice 2 webhook contract:** ai-server takes `rule_id` as a **string**, but Rails ids are numbers.
