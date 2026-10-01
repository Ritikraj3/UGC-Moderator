# Rails support — AI UGC Moderation

What the Rails team (`plato` / `jarvism2`) builds for moderation: the mental model, what already exists
and gets reused, what is new, every API in sequence, every new field and why, and the open questions.
The API contracts to implement are in [`api-contracts/`](api-contracts/README.md). All 58 pass the
learnyst-admin contract validator.

**Built from:** the spec, stories and HLD in this folder ([`../spec/`](../spec/README.md),
[`../stories/`](../stories/README.md), [`../hld/`](../hld/README.md)), plus what the production code does today:

- **bodhi:** `learnyst-bodhi/bodhi` (`models-and-repos` repos and the Socials widgets)
- **admin:** `learnyst-admin/admin` (including its `api-contracts` format)
- **ai-server:** `Proximity/proximity-ai-ng`
- **monitor:** `Learnyst-Monitor/monitor`

**Not verified:** the Rails repo is not in this workspace. Anything Rails-internal (PaperTrail coverage, table
shapes) is taken from the HLD and says so.

**How to read the labels**

| Label | Meaning |
|---|---|
| `HLD §n` · `spec` · `story n` · `SR n` | Stated in that source. SR = the stories' system rules. |
| `bodhi:` / `ai-server:` | Seen in that production code today. |
| **PROPOSED** | Our proposal for something the sources need but do not name. Needs Rails agreement. |
| **C*n*** | An open question in [`../open-items.md`](../open-items.md). C1–C19 were found earlier; C20–C31 came up while writing this doc. |

---

## 0. The mental model

1. **Rails owns everything that persists.** That covers rules, blocked words, settings, exceptions, the queue,
   decisions, member state, reports and the record. ai-server keeps counters and no content (HLD §1, §3, §13).
2. **ai-server answers one question:** does this break one of the rules Rails sent, and why (HLD §2). It is
   never told the rule's action, the moderation mode or the content review mode (HLD §10).
3. **Nothing waits on HTTP.** Rails submits and gets a 202 receipt. The verdict arrives about a second later
   on a Rails webhook, and Rails applies it (HLD §1, §4). The fail-open is a **deadline**, not a timeout (HLD §9).
4. **Two settings answer two different questions.** The *content review mode* decides whether content
   appears before or after the check. The *moderation mode* decides who acts on a flag (spec, HLD §5).
5. **Four places a learner writes, spread over four Rails models** (§2 below). One shared Rails moderation
   service object is called from all of them (HLD §3).
6. **Learners only ever see the academy's own rule wording.** They never see the AI's sentence, which is
   for the admin queue only (SR 8, HLD §12).

```
 learner apps (bodhi) ──GraphQL──┐          ┌──GraphQL── admin app
                                 ▼          ▼
                     ┌──────────────────────────────────┐
                     │ Rails — plato / jarvism2          │  gates ①–④ local · writes the row ·
                     │ ModerationService (one object)    │  deadlines · queue · decisions · record
                     └───┬──────────────▲───────────┬───┘
       ① POST /api/moderation/check    │           │ ③ POST /api/moderation/outcome
         → 202 { request_id }          │           │   (fire and forget)
                         ▼             │ ② POST /internal/v1/moderation/result
                     ┌──────────────────────────────────┐
                     │ ai-server (proximity-ai-ng)       │  classify · counters in Firestore
                     └──────────────────────────────────┘
```

---

## 1. What already exists and what is new

This is the section to read first. Each "existing" line was checked in code, except where marked *(HLD, not verified)*.

### 1a. Existing — reused as-is or extended

| # | What exists today | Where (verified) | How moderation uses it |
|---|---|---|---|
| E1 | **Community post writes**: `createCommunityPost`, `updateCommunityPost` | bodhi `CreateCommunityPostRepo`, `UpdateCommunityPostRepo` | **Extended.** Same mutations and inputs. They run the gates and return `moderationStatus` + `moderationNotice`. |
| E2 | **Feed post writes**: `createNewsfeedPost`, `updateNewsfeedPost` | bodhi `CreateNewsfeedPostRepo` (socials-feed-dashboard), `UpdateNewsfeedPostRepo` | **Extended**, as E1. |
| E3 | **Comments on posts**: `createDiscussionBoard` with `postId`, `updateDiscussionBoard` | bodhi `CreateCommunityDiscussionRepo` (social-community-discussion-list, bodhi-newsfeed-discussion, socials-story-viewer) | **Extended**, as E1. |
| E4 | **Product-discussion threads**: `createDiscussionBoard` with `packageId` + `courseId` | bodhi `CreateDiscussionBoardRepo` (Batch discussions) | **Extended**, as E1. The same mutation as E3, used for the PRODUCT_DISCUSSIONS area. |
| E5 | **Replies**: `createComment`, `updateComment` (`discussionBoardId`, `packageId` 0 for post replies) | bodhi `CreateCommentRepo`, `UpdateCommentRepo` | **Extended**, as E1. |
| E6 | **Reads**: `listCommunityPosts`, `showCommunityPost`, `listSocialsNewsfeedPosts`, `showSocialsPostBySlug`, `listDiscussionBoards` (with nested `comments`) | bodhi `CommunityPostListRepo`, `CommunityPostDetailRepo`, `SocialsNewsfeedPostListRepo`, `SocialsNewsfeedPostDetailRepo`, `CommunityDiscussionBoardRepo`, `DiscussionBoardRepo` | **Extended.** Same arguments. The result is filtered by moderation status and gains two fields per node. |
| E7 | The existing `status` field on posts (for example `published`) | returned by every post query today | **Kept separate** from the new `moderation_status`. Moderation never writes into `status`. PROPOSED; see §5. |
| E8 | The **Report button** and `bodhi-raise-ticket-modal` | bodhi: `srcDetails { supportType: 9, communityPostId \| discussionId }` → `createSupportTicket` | **The button is kept but re-pointed** at the new `reportContent` mutation (HLD §7). Whether the ticket path stays for help-desk complaints is A3. |
| E9 | **Community ban** `banCommunityMember(status: IS_PERMITTED \| IS_BANNED)` and `user.communityStatus` | bodhi `BanCommunityMemberRepo`; `communityStatus` on posts | **Unresolved:** how it relates to the new product/academy ban is C30. Not removed. |
| E10 | The **`/internal/v1` Rails namespace** on the internal host, e.g. `/internal/v1/ai_ingest/lesson_result` (`Api::Internal::V1`) | ai-server `RAILS_API_PATHS`, `rails-callback.handler.ts` | **Reused.** The new webhook lives there: `/internal/v1/moderation/result`. |
| E11 | **ai-server internal-host guard** `checkInternalHost` (the request must arrive on `ai-api.internal.learnyst.com`) | ai-server `shared/plugins/auth.ts` | **Reused** for `/api/moderation/check` and `/api/moderation/outcome`. Rails calls the same host it already calls for `/api/ai-ingest/lesson`. |
| E12 | **The Rails → ai-server submit pattern**: `POST /api/ai-ingest/lesson` → 202 → BullMQ → callback | ai-server `lesson-ingest.route.ts` | **Reused shape** (HLD §10: "same pattern as lesson-ingest.route.ts"). |
| E13 | **PaperTrail on Post and Comment**, with `school_id` in the metadata | *(HLD §8, not verified)* | **Extended** for version history (story 39) and the record of every action. Coverage of DiscussionBoard and NewsfeedPost is C28. |
| E14 | The **Proximity AI dashboard**: monitor proxies `/api/proximity/…` → ai-server `/api/monitor/…` | monitor `src/routes/api/proximity.js`, `client/src/pages/ProximityAiPage.jsx` | **Reused** for Learnyst's cross-academy view (stories 82–84). It needs **no Rails work**. |
| E15 | The ai-server **Firestore counter helper** (`bumpCounter`, one global doc per IST day in `monitor_counters`) | ai-server `firestoreCounter.ts` | **The pattern is reused, but not the collection.** HLD §15 wants per-academy documents `moderation_stats/{school_id}/daily/{date}`. This is ai-server work, not Rails. |
| E16 | **Instructor + `INSTRUCTOR_LLM`** (`google/gemini-2.5-flash-lite`) | ai-server `shared/libs/instructor.ts`, `env.ts` | **Reused** for the classifier (HLD §11). This is ai-server work, not Rails. |
| E17 | Existing free-text `community.rules` on `showCommunity` | bodhi `CommunityDetailsRepo` | **Not the moderation rules.** It stays as it is. Learners read moderation rules from the new `listCommunityRules`. |

### 1b. New in Rails — nothing like it exists today

| # | New piece | Why (source) |
|---|---|---|
| N1 | **`ModerationService`**, one shared service object called by all four models' write paths | HLD §3: "Rails needs one shared moderation service object that all of them call" |
| N2 | **Gates ①–④**: moderation on? · blocked word or link · repeat post · restricted author | HLD §3, §4. These are local and free, with no AI call |
| N3 | **Disguise matcher** for blocked words: capitals, spacing, numbers-for-letters, symbol wildcards, stretched letters; a web address also covers its subpages | HLD §3 ("a Rails deliverable"), spec, story notes, HLD §16 (runs server-side only) |
| N4 | **ai-server client** for `POST /api/moderation/check` and `POST /api/moderation/outcome` | HLD §10 |
| N5 | **Webhook** `POST /internal/v1/moderation/result`, with token check, dedupe on `request_id`, the stale-version drop, and applying the verdict | HLD §9, §10, §16 |
| N6 | **Pending-check rows**, plus **deadline jobs**: 5 min for held content, 15 min for catchup. When the deadline fires, publish and mark Unchecked; a late verdict is still applied | HLD §9, §16 ("checks request_id against a row it created") |
| N7 | **Catchup re-submits** of Unchecked content (`trigger: catchup`) | HLD §9, §10, §14. When they run is C22 |
| N8 | **`moderation_status` + `content_version`** on Post, NewsfeedPost, DiscussionBoard and Comment, plus author-only notice data | HLD §10 (content_version), §13 ("Held content — a real row, visible only to its author") |
| N9 | **Read-path filtering** on every list and detail read, nested comments included | HLD §13, stories 72, 73, 76 |
| N10 | **Rules**: CRUD, publish and unpublish, pin to Copilot, report reason, numbering in creation order, the self-harm marker | spec "Rules", stories 17–25, 30–32, 34 |
| N11 | **Blocked words on rules**: CRUD, "added by", and remembering deleted Learnyst defaults | spec, stories 26–29, 33, SR 2 |
| N12 | **Seeding the Learnyst defaults**: the ready-made rules (nine or ten, C1) and the blocked-word list with romanised Hindi and regional terms | spec, SR 1 |
| N13 | **Settings**: master switch, four areas, both modes, academy description, thresholds, and holding first posts | spec "Settings", stories 2–9 |
| N14 | **Exceptions**: one product set differently, with rules switched off per product | stories 10–15, SR 5, SR 6 |
| N15 | **Settings and rules resolution**: exception → academy (SR 5; C2 asks whether content area is a middle level) → the effective `rules[]` | HLD §13 |
| N16 | **Queue**: four tabs, items, decisions, undo, examples | spec "The review queue", stories 36–46, HLD §8 |
| N17 | **`content_reports`** table and the `reportContent` mutation | HLD §7, story 80 |
| N18 | **Member state**: restrictions (automatic threshold or manual, always academy-wide) and scoped bans (product or academy) | spec, stories 47–50, 55, 57–59, SR 10, 13, 14, 16, 19 |
| N19 | **Blocked-content records**: text, rule, author and time; never a post, never restorable | spec "What the learner sees", SR 11 |
| N20 | **The moderation record**: every action, plus rule, mode and word-list changes, built on PaperTrail | spec "Settings", HLD §8, §13, story 67. Where it lives is C10 |
| N21 | **Reports**: summary, rule performance, product activity, problem members, log | stories 61–68 |
| N22 | **90-day retention** of removed content, with the restore window enforced | spec, SR 12 |
| N23 | **Per-academy enforcement flag** for shadow mode and pilots. Learnyst sets it; Teachers never see it | HLD §17 |
| N24 | **Role checks**: Teacher vs Teaching Assistant on every admin operation, and Teachers and Teaching Assistants never checked when they post | spec, stories 51–55, SR 18. The role mapping is C31 |

### 1c. Not Rails — so the Rails team knows where these went

| What | Who | Source |
|---|---|---|
| The AI check, the verdict schema, lanes, retries, callback delivery | ai-server | HLD §2, §10, §11 |
| Quality counters in Firestore, `GET /api/monitor/moderation`, the monitor panel | ai-server + monitor | HLD §15. Stories 82–84 |
| The learner UI (composer errors, notices, report form, rules view) | bodhi | HLD §2 |
| The admin screens: queue, rules, settings, restrictions & bans, reports | admin app | HLD §2 |

---

## 2. Where learners write: four areas across four Rails models

HLD §3 names three models. The bodhi code shows DiscussionBoard doing two jobs, so there are four.

| Content area (spec) | What the learner writes | Rails model | Write mutation today | Read today | `content_type` to ai-server |
|---|---|---|---|---|---|
| **COMMUNITY** | a post | `Post` + `CommunityContent` | `createCommunityPost` / `updateCommunityPost` | `listCommunityPosts`, `showCommunityPost` | `post` |
| COMMUNITY | a comment on the post | `DiscussionBoard` (`postId`) | `createDiscussionBoard` / `updateDiscussionBoard` | `listDiscussionBoards(input: { postId })` | `comment` |
| COMMUNITY | a reply | `Comment` (`discussionBoardId`, `packageId: 0`) | `createComment` / `updateComment` | nested `comments` | `comment` |
| **FEEDS** | a feed post | `NewsfeedPost` ("The Feed is NewsfeedPost", HLD §3) | `createNewsfeedPost` / `updateNewsfeedPost` | `listSocialsNewsfeedPosts`, `showSocialsPostBySlug` | `post` |
| FEEDS | a comment or reply | `DiscussionBoard` (`postId`) / `Comment` | as above | as above | `comment` |
| **NEWSFEED** | "Discussions" (spec) | most likely `DiscussionBoard` under a newsfeed post (bodhi-newsfeed-discussion) | `createDiscussionBoard` | `listDiscussionBoards` | `comment` |
| **PRODUCT_DISCUSSIONS** | a thread under a product | `DiscussionBoard` (`packageId`, `courseId`) | `createDiscussionBoard` | `listDiscussionBoards(input: { packageId, … })` | `post` |
| PRODUCT_DISCUSSIONS | a reply | `Comment` (`packageId` > 0) | `createComment` / `updateComment` | nested `comments` | `comment` |

**Still open (C9):**
- How Rails tells a FEEDS NewsfeedPost from a NEWSFEED one.
- Which model holds discussions under mock tests, test series, ebooks, webinars, free resources, podcasts and
  custom products. bodhi only shows course, batch and bundle using `DiscussionBoard`.

**Consequence (C21):** `Post` and `NewsfeedPost` both go as `post`, while `DiscussionBoard` and `Comment` both
go as `comment`. Their integer ids overlap, so `idempotency_key` and the callback cannot name the row.
**PROPOSED:** send a Rails-opaque `content_id` that carries the model name, such as `"Post-5521"` or
`"Comment-77"`. ai-server echoes it back unchanged. This needs no new contract field.

"Comments are checked like the posts they sit under" (spec): a comment or reply takes the content area,
settings and exception of the thing it sits under.

---

## 3. The life of one piece of content

### 3a. `moderation_status` (new field; see §5 for why it is separate from `status`)

| Status | Who can see it | How it gets here |
|---|---|---|
| `PUBLISHED` | Everyone who can see the place | Written live under publish first; a clean verdict; a deadline that fired (Unchecked); a Guidance or Report action; a Teacher's approve or restore; moderation not running |
| `HELD` | **Only the author**, marked *Waiting for review* | Written held under review first; a Hold rule; a restricted author (SR 16); a repeat post; a new learner's first posts; a flag under Copilot while already held |
| `REMOVED` | Only the author, with the rule | A Teacher or Teaching Assistant removed it. Restorable for 90 days (SR 12) |
| `BLOCKED` | Only the author, with the rule | A Block rule's AI verdict arrived **after** the row was written. Never restorable (C20) |

A **blocked word** that blocks never creates a row at all. The mutation fails with `CONTENT_BLOCKED` and
Rails writes a *blocked-content record* instead (spec: "Post never created … they're still in the composer").

### 3b. `moderationNotice.kind`: what the author is told

The notice follows the spec's "What the learner sees" table and the four rule actions.

| Kind | When | Rule shown? |
|---|---|---|
| `WAITING_FOR_REVIEW` | HELD. "Worded as a check, not a verdict" | Yes when a Hold rule (or a flag waiting for a person) caused it. No while a review-first post waits for its verdict, or when the learner is restricted |
| `GUIDANCE` | Live, and a Guidance rule matched ("a gentle note") | Yes |
| `BLOCKED` | A Block rule stopped it after it was written ("the rule, and why") | Yes |
| `REMOVED` | A person removed it ("removed posts come with the rule") | Yes |
| `APPROVED` | A person approved held content ("Always told — live") | — |
| `SELF_HARM_SUPPORT` | Any case involving the self-harm rule | **Never.** A fixed message plus a helpline instead (SR 9, HLD §12; C24) |

`afterPublishing: true` means other people saw the content before it came down (publish first). It is the
difference between "taken down" (story 76) and "can't be published". A **Report** action tells the learner nothing.

---

## 4. The sequence, flow by flow

### 4.1 A learner posts or edits (HLD §4)

One `ModerationService` call inside each write mutation (E1–E5):

1. **Skip moderation entirely** if the author is a Teacher or Teaching Assistant (spec), the academy switch
   is off, or the content area is off (stories 2–3).
2. **Ban check.** If the learner is banned in this product or the academy, refuse with `POSTING_BANNED`
   (stories 48–49).
3. **② Blocked words.** Run the disguise matcher over title, body and link text against the blocked words of
   published rules in force. A match that blocks refuses with `CONTENT_BLOCKED`, names the rule (or gives
   the self-harm support) and writes a blocked-content record. Whether a word on a Guidance, Report or Hold
   rule also blocks is C4; under Copilot, C6.
4. **③ Repeat post / ④ restricted / first posts.** Write the row `HELD`, open a queue item
   (`REPEAT_POST` / `RESTRICTED_MEMBER` / `FIRST_POSTS_HOLD`), and **make no AI call** (HLD §4).
5. **Write the row.** `HELD` under review first, `PUBLISHED` under publish first (resolved per §4.8).
   Bump `content_version` if this is an edit of title, body or image, and keep the old version.
6. **Answer the learner now**, with `moderationStatus` and `moderationNotice`.
7. **If AI runs** (mode is not AI disabled, and at least one rule in force has AI checking on; C15):
   create a pending-check row and `POST /api/moderation/check`. Store `request_id`. If the submit fails,
   publish and mark Unchecked (HLD §9).
8. Under review first, the pending check gets a **5-minute deadline**.

An edit of `HELD` content is allowed (story 74). It re-runs 1–8. Still breaking, it goes to the back of the
queue flagged *edited after being held* (spec).

### 4.2 The verdict arrives: `POST /internal/v1/moderation/result` (HLD §9, §10)

Verify the token (C26) → find the pending row by `request_id` (unknown → drop) → dedupe → drop if
`content_version` is stale → apply → answer **200**.

| Verdict | Autopilot | Copilot, **or** a rule pinned to Copilot (rule 5 by default) |
|---|---|---|
| `status: error` | Unchecked. Review first → publish now | same |
| clean | Review first: `HELD → PUBLISHED`. Publish first: nothing | same |
| **Guidance** rule | Stays or becomes `PUBLISHED`; notice `GUIDANCE`; no queue item | Queued for a person; content stays as it is |
| **Report** rule | `PUBLISHED`; queue item; learner told nothing | same |
| **Hold** rule | `HELD`; queue item; notice `WAITING_FOR_REVIEW` with the rule (`afterPublishing` under publish first) | Queued for a person; content stays as it is. Under publish first it is **not** taken down: "nothing is removed until a person says so" (HLD §5). See C32 for rule 5 |
| **Block** rule | `BLOCKED`; no queue item; notice `BLOCKED`; blocked-content record (C20) | Queued for a person; content stays as it is (held stays held, live stays live) |
| self-harm rule | whatever its action says, but the notice is always `SELF_HARM_SUPPORT` | same |

Sources:
- Spec, the actions table: Guidance goes live with no queue; Report goes live and queued; Hold is not live
  and queued; Block is not live and not queued.
- Spec, Copilot: "Nothing is stopped automatically — everything flagged goes to the queue".
- HLD §5, the combinations: Review first + Copilot means every flagged post waits for a person. Publish first
  + Copilot means nothing is removed until a person says so.
- Shadow mode (HLD §17): Rails records what the verdict *would* have done and acts on nothing.

### 4.3 When the verdict is late or never comes (HLD §9)

| Case | Rails does |
|---|---|
| Held content, no verdict in **5 min** | Publish it and file it under **Unchecked** |
| Catchup check, no verdict in **15 min** | Resolve as Unchecked |
| Submit fails outright (ai-server down) | Publish and mark Unchecked. Blocked words, repeat posts and restricted members were already caught |
| `status: error` | Unchecked |
| The callback exhausts its retries (0s · 10s · 60s · 5 min) | Silence. The deadline covers it |
| A verdict arrives **after** the deadline | **Still applied.** The content can move from Unchecked into the queue, or be held |

**Catchup:** Unchecked content is re-submitted later with `trigger: catchup`, on ai-server's bulk lane. When
Rails does this, and for how far back, is C22. Nothing ever re-scans old content because of a rule change
(HLD §14).

### 4.4 Learners read (E6)

- **Everyone else** receives only `PUBLISHED` content: nodes, nested comments, detail pages.
- **The author** also receives their own `HELD`, `REMOVED` and `BLOCKED` content, with `moderationNotice`
  (stories 72, 73, 76).
- `moderationNotice` is **null for everyone but the author**.
- Counts, staff views, deletes, and edits of removed content are C29.

### 4.5 A learner reports (HLD §7)

`reportContent { contentType, contentId, ruleId, note }` writes a `content_reports` row, with a real
foreign key and a count per post. It opens or updates a queue item in the **Reported** tab. **No AI call.**
The content stays live. The rule picker comes from `listCommunityRules`, labelled with each rule's report
reason (stories 34, 80).

Note: today a reply's Report sends the *parent* `discussionId` (bodhi `discussion-reply-list.ts`). The new
mutation takes the reply itself.

### 4.6 A Teacher or Teaching Assistant reviews (HLD §8)

| Action | Content becomes | Then |
|---|---|---|
| Approve | `PUBLISHED`; notice `APPROVED` | `outcome: approved` → ai-server; logged |
| Remove | `REMOVED` (restorable 90 days); notice `REMOVED` | `outcome: removed`; counts as a confirmed removal. If the learner passes the threshold, **restrict them automatically** (the only automatic step). Return the counts so the app can prompt *"5 posts removed — ban this member?"* (spec) |
| Restore | `PUBLISHED` | `outcome: restored`. Refused after 90 days |
| Mark as example | — | Sent in `examples[]` on future checks (story 46; A5) |

The outcome call is fire and forget. It never blocks or undoes a decision (HLD §10). Whether its fields are
enough for ai-server's counters is C8.

### 4.7 Restrict and ban (from the queue; Restrictions & bans is the list and the undo; SR 20)

| Action | Who | Rules |
|---|---|---|
| Restrict | Teacher (P1), Teaching Assistant (P2) | Always academy-wide (SR 13). Everything is held, with no AI call (SR 16, HLD §4). Not a ban |
| Ban | **Teacher only** (spec) | One product or the whole academy. An academy ban replaces product bans (SR 19). Enrolment is untouched (SR 14). Never automatic |
| Lift a ban | Teacher | Lifting an academy ban clears both (SR 19) |
| Remove a banned learner's content | Teacher | Everything they posted within the ban's scope → `REMOVED` (story 50) |

### 4.8 Settings, rules, exceptions: what Rails resolves before calling (HLD §13)

- **Resolution:** exception for the product → the academy (SR 5). The spec and HLD also put the content area
  in the middle; that is C2. First answer wins. ai-server never sees the hierarchy.
- **`rules[]`** holds the published rules in force for this product, after its exception, that the AI should
  judge. Each is `{ id, name, description }`. Which rules count (AI checking off? pinned?) is C15.
- **`school_context`** is built from the academy description, learner age group and tone of conversation
  (story 6 → HLD §10).
- **`context`** holds the last few posts in the thread. Whether a comment check includes its parent post is A4.
- **`examples[]`** holds decided items marked as examples (A5).
- **Rules apply going forward.** Publishing or rewording a rule never re-checks existing content. The admin
  app shows that warning (story 24, SR 4).
- **Deleted Learnyst defaults stay deleted** when Learnyst updates the defaults (SR 2). Rails has to remember
  the deletion, not just drop the row.

### 4.9 Reports and the record

- Reports read Rails data, because the content lives there (HLD §15). Each is paginated and filterable;
  product reports list only products with activity in the period (SR 17).
- Wrong-flag rate = content a rule stopped that a Teacher then approved, as a percentage.
- **The record** holds every action, including blocked content that never became a post, plus rule, mode and
  word-list changes (spec, SR 11). HLD §8 says to extend PaperTrail rather than build a parallel audit
  table. Where blocked records and settings changes fit is C10.

### 4.10 Rollout flags (HLD §17)

1. **Shadow mode:** publish first with enforcement off. Rails submits, records what the verdict would have
   done, and acts on nothing.
2. **Pilot academies:** enforcement on, review first, a per-academy flag.
3. **Widen** once the wrong-flag rate holds under 5%. What that rate means in shadow mode is C17.

→ One Learnyst-controlled `enforcement_enabled` per academy (N23). It is not a Teacher setting.

---

## 5. Data model: new columns and new tables (PROPOSED names)

### 5a. New columns on the four content models

The four models are `Post`, `NewsfeedPost`, `DiscussionBoard` and `Comment`.

| Column | Type | Why |
|---|---|---|
| `moderation_status` | enum: published / held / removed / blocked | HLD §13: held content is a real row visible only to its author. Kept **separate** from the existing `status` (E7), so a Teacher's restore never has to guess the author's own state |
| `content_version` | integer, starts at 1 | HLD §10: bumped whenever title, body or image changes, echoed on the callback, and stale verdicts are dropped |
| `moderation_notice_kind` · `moderation_notice_rule_id` · `moderation_notice_after_publishing` · `moderation_notice_at` | enum · FK · bool · datetime | Serve `moderationNotice` to the author without joining the queue on every feed read (stories 71–76) |
| `removed_at` | datetime | The 90-day restore window and the purge (SR 12) |

### 5b. New tables

| Table | Holds | Why |
|---|---|---|
| `moderation_settings` | One row per academy: `enabled`; the four area switches; `content_review_mode` (default review first); `moderation_mode`; `academy_description`, `learner_age_group`, `tone_of_conversation`; `removals_before_restriction`; `repeated_post_count`, `repeated_post_window_minutes`; `hold_first_posts_enabled`, `hold_first_posts_count`; `enforcement_enabled` (Learnyst only) | spec "Settings", stories 2–9, HLD §17. Defaults are C23 |
| `moderation_exceptions` | `product_type`, `product_id`, `content_review_mode` (null = follow), `moderation_mode` (null = follow) | stories 10, 14, 15 |
| `moderation_exception_rules` | `exception_id`, `rule_id`: rules switched off for that product | stories 11–13, SR 6 |
| `moderation_rules` | `number` (creation order), `name`, `description`, `action`, `ai_check_enabled`, `pinned_to_copilot`, `report_reason`, `status` (draft/published), `source` (learnyst/academy), `default_key` (Learnyst seed id), `is_self_harm`, `published_at`, `deleted_at` | spec "Rules", stories 17–25, 30–31, 34, SR 9 |
| `moderation_blocked_words` | `rule_id`, `value`, `normalized_value`, `kind` (word/web address), `added_by` (learnyst/academy), `default_key` | spec, stories 26–29 |
| `moderation_deleted_defaults` | `school_id`, `default_key`, `kind` (rule/word) | SR 2: a deleted Learnyst default stays deleted through default updates |
| `moderation_checks` | `request_id` (unique), content ref, `content_version`, `trigger`, `state` (pending/ok/error/unchecked), `deadline_at`, verdict fields (`breaks_rule`, `rule_id`, `reason`, `confidence`, `model`, `latency_ms`), `received_at` | HLD §9 (deadlines), §10 (dedupe), §16 ("a row it created") |
| `moderation_items` | The queue: content ref and version, `content_area`, product ref, author, `stop_source`, `rule_id`, AI `reason`, `status` (pending/approved/removed), `edited_after_held`, `waiting_since`, `decided_by`, `decided_at`, `is_example`, `check_id` | spec "The review queue", stories 36–46, HLD §8 |
| `content_reports` | Content ref, `reporter_id`, `rule_id`, `note`, `moderation_item_id` | HLD §7, §13, story 80 |
| `moderation_blocked_records` | Author, content area, product ref, content type, title/body/image, `rule_id`, `matched_word`, `created_at`: **never a post** | spec, SR 11 |
| `moderation_restrictions` | `user_id`, `source` (automatic/teacher), `restricted_by`, `restricted_at`, `lifted_at` | stories 47, 55, 58, SR 10, 13 |
| `moderation_bans` | `user_id`, `scope` (product/academy), product ref, `banned_by`, `banned_at`, `lifted_at` | stories 48–50, 59, SR 13, 14, 19 |

All tables are scoped by `school_id` (HLD §16: academy scoping is Rails' job). The record of actions extends
PaperTrail (HLD §8); rule, word and settings changes need it too (C10, C28).

---

## 6. Every API: in order, with its contract

58 contract files: 48 are P1, 9 are P2, and one is an unchanged reference.

### A. Service to service (Rails ↔ ai-server): 3, all P1

| # | Call | Direction | Contract |
|---|---|---|---|
| A1 | `POST /api/moderation/check` → 202 `{ status, request_id }` | Rails → ai-server | [`submit_moderation_check`](api-contracts/contracts/rest/ai_server_moderation/submit_moderation_check.yml) |
| A2 | `POST /internal/v1/moderation/result` → 200 | ai-server → **Rails (new endpoint)** | [`receive_moderation_result`](api-contracts/contracts/rest/internal_moderation/receive_moderation_result.yml) |
| A3 | `POST /api/moderation/outcome` | Rails → ai-server | [`submit_moderation_outcome`](api-contracts/contracts/rest/ai_server_moderation/submit_moderation_outcome.yml) |

### B. Learner: existing APIs that change (13, all P1). Same names and inputs

| # | Operation | Change | Contract |
|---|---|---|---|
| B1 | `createCommunityPost` | gates + `moderationStatus`, `moderationNotice` + `CONTENT_BLOCKED`, `POSTING_BANNED` | [`create_community_post`](api-contracts/contracts/graphql/community_posts/create_community_post.yml) |
| B2 | `updateCommunityPost` | as B1, plus `content_version` and version history | [`update_community_post`](api-contracts/contracts/graphql/community_posts/update_community_post.yml) |
| B3 | `createNewsfeedPost` | as B1 | [`create_newsfeed_post`](api-contracts/contracts/graphql/newsfeed_posts/create_newsfeed_post.yml) |
| B4 | `updateNewsfeedPost` | as B2 | [`update_newsfeed_post`](api-contracts/contracts/graphql/newsfeed_posts/update_newsfeed_post.yml) |
| B5 | `createDiscussionBoard` | as B1 (comments on posts, and product threads) | [`create_discussion_board`](api-contracts/contracts/graphql/discussion_boards/create_discussion_board.yml) |
| B6 | `updateDiscussionBoard` | as B2 | [`update_discussion_board`](api-contracts/contracts/graphql/discussion_boards/update_discussion_board.yml) |
| B7 | `createComment` | as B1 | [`create_comment`](api-contracts/contracts/graphql/comments/create_comment.yml) |
| B8 | `updateComment` | as B2 | [`update_comment`](api-contracts/contracts/graphql/comments/update_comment.yml) |
| B9 | `listCommunityPosts` | filter + 2 fields per node | [`list_community_posts`](api-contracts/contracts/graphql/community_posts/list_community_posts.yml) |
| B10 | `showCommunityPost` | author sees any status; others only PUBLISHED | [`show_community_post`](api-contracts/contracts/graphql/community_posts/show_community_post.yml) |
| B11 | `listSocialsNewsfeedPosts` | filter + 2 fields | [`list_socials_newsfeed_posts`](api-contracts/contracts/graphql/newsfeed_posts/list_socials_newsfeed_posts.yml) |
| B12 | `showSocialsPostBySlug` | as B10 | [`show_socials_post_by_slug`](api-contracts/contracts/graphql/newsfeed_posts/show_socials_post_by_slug.yml) |
| B13 | `listDiscussionBoards` | filter on discussions **and** nested comments + 2 fields | [`list_discussion_boards`](api-contracts/contracts/graphql/discussion_boards/list_discussion_boards.yml) |

The legacy `listNewsfeedPosts` and newsfeed-detail queries need the same filter wherever learner-written
content appears in them.

### C. Learner: new (3, all P1)

| # | Operation | Stories | Contract |
|---|---|---|---|
| C1 | `listCommunityRules`: published rules only, never blocked words | 70, 80, 34 | [`list_community_rules`](api-contracts/contracts/graphql/community_rules/list_community_rules.yml) |
| C2 | `reportContent`: replaces the `createSupportTicket` report | 80 | [`report_content`](api-contracts/contracts/graphql/content_reports/report_content.yml) |
| C3 | `showMyModerationStatus`: restricted? banned where? | 77 | [`show_my_moderation_status`](api-contracts/contracts/graphql/moderation_member_status/show_my_moderation_status.yml) |

### D. Admin: new (38)

| Area | Operations (priority) | Stories |
|---|---|---|
| **Settings** | `showModerationSettings` (P1) · `updateModerationSettings` (P1) | 2–9 |
| **Exceptions** | `listModerationExceptions` · `createModerationException` · `updateModerationException` · `deleteModerationException` · `listEffectiveModerationRules`, all P2 | 10–15, 65 |
| **Rules** | `listModerationRules` · `showModerationRule` · `createModerationRule` · `updateModerationRule` · `publishModerationRule` · `unpublishModerationRule` · `testModerationRule` (P1, **blocked on C19**) · `deleteModerationRule` (P2) | 17–25, 30–32, 34 |
| **Blocked words** | `listModerationBlockedWords` · `createModerationBlockedWord` · `deleteModerationBlockedWord` (P1) · `updateModerationBlockedWord` · `testModerationBlockedWord` (P2) | 26–29, 33 |
| **Queue** | `listModerationQueueItems` · `showModerationQueueSummary` · `showModerationQueueItem` · `approveModerationContent` · `removeModerationContent` · `restoreModerationContent` (P1) · `markModerationExample` (P2) | 36–46, 51–54, 63 |
| **Restrictions & bans** | `restrictLearner` · `liftLearnerRestriction` · `banLearner` · `liftLearnerBan` · `removeBannedLearnerContent` · `listModerationMemberLimits`, all P1 | 47–50, 55, 57–59 |
| **Reports** | `showModerationSummaryReport` · `listModerationRulePerformance` · `listModerationProductActivity` · `listModerationProblemMembers` · `listModerationLogEntries`, all P1 | 61–64, 66–67 |

Files: [`api-contracts/contracts/graphql/moderation_*`](api-contracts/README.md).

**Not given a contract:**
- **Story 68, export any report (P2):** use Learnyst's existing export mechanism once someone confirms which one.
- **Stories 82–85, the Learnyst traction view:** served by ai-server + monitor, not Rails (§1c). Story 85 ("which
  academies have moderation switched on") is a Rails setting, so its source is still open (C8).

### E. Reference (unchanged)

[`_reference/show_community`](api-contracts/contracts/graphql/_reference/show_community.yml) is included only
because the validator needs a documented source for `community_id`.

---

## 7. New fields and keys: which API, and why

### 7a. On existing learner APIs (B1–B13)

| Field (GraphQL) | On which APIs | Who receives it | Why |
|---|---|---|---|
| `moderationStatus: ModerationStatusEnum!` | every node returned by B1–B13, nested comments included | everyone (others only ever get `PUBLISHED`) | Stories 72–73: the author must see that held content exists and is waiting. HLD §13: a held row is visible only to its author |
| `moderationNotice { kind ruleNumber ruleName ruleDescription afterPublishing supportMessage helpline updatedAt }` | same | **the author only**; null otherwise | Stories 71, 75, 76, 78, 79. The spec's "What the learner sees". The learner sees the academy's own wording, never machine text (SR 8) |
| error `CONTENT_BLOCKED` + `extensions.moderation { ruleNumber, ruleName, ruleDescription }` or `{ supportMessage, helpline }` | B1–B8 | the author | Blocked means "post never created … still in the composer" (spec). The same rule is named whether a word or the AI caught it (SR 7). Self-harm never names a rule (SR 9) |
| error `POSTING_BANNED` + `extensions.moderation { scope }` | B1–B8 | the author | Stories 48–49. A ban stops posting, not access (SR 14) |

### 7b. Keys Rails sends to ai-server: `POST /api/moderation/check` (HLD §10)

| Key | Rails fills it from | Why |
|---|---|---|
| `idempotency_key` | `{school_id}:{content_type}:{content_id}:{content_version}` | A resubmit returns the same `request_id` |
| `trigger` | `create` / `edit` / `catchup` | ai-server picks the lane from it |
| `school_id` | the academy | Scope and the counters |
| `content_area` | §2 mapping | What the academy configures |
| `product_type`, `product_id` | the product for product discussions; **null otherwise** (C9) | Reporting only |
| `content_type` | §2 mapping (`post` / `comment`) | As the HLD defines it |
| `content_id` | **PROPOSED** `"<Model>-<id>"` (C21) | Unique across the four models |
| `content_version` | the new column | Drop stale verdicts |
| `title`, `body`, `image_url` | the row. `image_url` = `posts.featured_image`, `comments.attachment_url`, `comments.image` (HLD §6; post `attachment_url` is C27) | What is judged. At least one of body or image |
| `school_context` | the academy description + age group + tone | Judge in context (story 6) |
| `context` | the last few posts in the thread (A4) | A pitch split across messages |
| `rules[] { id, name, description }` | the effective rules (§4.8, C15) | The model may only answer with these ids |
| `examples[] { text, rule_id, verdict }` | marked examples (A5). `verdict` values are PROPOSED: `breaks_rule` / `allowed` | Sharpens checks for this academy only |

**Rails never sends** the rule's action, the moderation mode or the content review mode (HLD §10).

### 7c. Keys ai-server sends back: `POST /internal/v1/moderation/result` (HLD §10)

`request_id` · `school_id, content_type, content_id, content_version, trigger` (echoed back) · `status` (ok/error) ·
`breaks_rule` · `rule_id` (null when clean) · `reason` (≤200 characters, admin only) · `confidence` (low/medium/high) ·
`model`, `latency_ms`.

The 200 response body `{ status: applied | ignored }` is **PROPOSED**, for logs only.

### 7d. Keys Rails sends on `POST /api/moderation/outcome` (HLD §10)

`request_id` · `school_id` · `outcome` (approved / removed / restored) · `decided_at`. **Open (C8):** this may
not be enough for the "missed" and per-action counters.

---

## 8. Rails behaviour checklist (not visible in any one API)

- [ ] Teachers and Teaching Assistants are never checked when they post (spec)
- [ ] A comment follows the area, settings and exception of what it sits under (spec)
- [ ] The disguise matcher runs server-side only. The blocked-word list never reaches a learner app (HLD §16)
- [ ] Editing re-runs the checks, bumps `content_version` and keeps the old version (HLD §4, story 39)
- [ ] Deadlines: 5 min held, 15 min catchup. A late verdict is still applied (HLD §9)
- [ ] Callback: token check, unknown `request_id` dropped, dedupe, stale version dropped, **always 200** once handled (HLD §10, §16)
- [ ] Automatic restriction at N confirmed removals, never flags (SR 10). Banning is never automatic (spec)
- [ ] An academy ban replaces product bans, and lifting it clears both (SR 19). Enrolment is never touched (SR 14)
- [ ] A restricted learner is always held, whatever the mode (SR 16)
- [ ] Removed content kept 90 days, then purged. Restore refused after that (SR 12)
- [ ] A blocked post leaves a record that is never a post and never restorable (spec)
- [ ] A deleted Learnyst default stays deleted through default updates (SR 2)
- [ ] Seed the Learnyst rules (published) and blocked words (active) for every new academy (SR 1; how many rules is C1)
- [ ] Every action, rule change, mode change and word-list edit goes into the record (spec, SR 11)
- [ ] The outcome call is fire and forget, and never blocks a decision (HLD §10)
- [ ] Shadow mode and pilot via a per-academy enforcement flag (HLD §17)
- [ ] Every admin list is paginated and filterable (SR 17). Moderation permissions are academy-wide (SR 18)

---

## 9. Open questions for the Rails team

All of these are in [`../open-items.md`](../open-items.md). The ones that block Rails work:

| # | Question | Blocks |
|---|---|---|
| **C21** | `content_id` collides across the four models. Agree the opaque `"<Model>-<id>"` proposal? | A1, A2 |
| **C26** | The callback token (HLD §16) versus today's authless `/internal/v1` over the http-only internal host | A2 |
| **C9** | FEEDS vs NEWSFEED NewsfeedPosts; the models for other product types' discussions | §2 mapping |
| **C20** | An AI Block arriving after the row exists: the `BLOCKED` status proposal | §3, A2 |
| **C2** | Do content areas carry their own mode (spec/HLD) or not (stories)? | settings, resolution |
| **C4 / C6** | Does a blocked word always block, or take its rule's action? And under Copilot? | gate ② |
| **C7 / C8** | Who ranks "most severe"? Are the outcome fields enough for the counters? | A2, A3 |
| **C10 / C28** | Where blocked records and settings changes live; PaperTrail on DiscussionBoard and NewsfeedPost | the record, story 39, story 67 |
| **C22** | When catchup re-submits happen | N7 |
| **C23** | Defaults: moderation mode, removal threshold, repeated-post count and window, first-posts count, AI checking on new rules | settings |
| **C24** | Who owns the self-harm support message and helpline text | notices |
| **C25** | Can a Learnyst rule be deleted (story 22 vs SR 2)? | `deleteModerationRule` |
| **C27** | Is a post's `attachment_url` moderated? | gate, A1 |
| **C29** | Counts, staff views, learner deletes, editing removed or blocked content | reads |
| **C30** | The existing `banCommunityMember` vs the new scoped bans | bans |
| **C31** | Which Rails roles are "Teacher / Admin" and "Teaching Assistant" | every admin API |
| **C32** | Rule 5 (self-harm) is pinned to Copilot. Under publish first, the sources imply a self-harm post stays visible until a person acts. Intended? | §4.2 |
| C1, C15, C19 | Nine or ten rules; which rules go in `rules[]`; `testModerationRule` has no AI path | seeding, A1, story 32 |
