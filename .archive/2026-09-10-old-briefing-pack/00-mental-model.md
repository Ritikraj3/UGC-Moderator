# AI Moderator (Community) — Phase 0: Mental Model

Not an implementation plan. This is: what the feature really is, how it maps onto
our three codebases, and what we must have in hand before writing code.

---

## 1. The one-line idea

> A learner posts. The post goes live **immediately**. In the background AI reads it,
> and if it looks bad, AI asks Rails to hide it and drops a case in the admin's queue.
> The admin makes the final call.

Everything else in the spec is a detail hanging off that sentence.

---

## 2. The core mental model: 3 owners, 1 field

This is the most important decision in the whole feature. Get this right and the
rest follows.

| Owner | Owns | Does NOT own |
|---|---|---|
| **Rails** | The content, and whether it is visible | Any AI logic, any case record |
| **Proximity (AI backend)** | The judgment + the case file + the queue | The content, the visibility |
| **Admin UI** | Showing cases, taking decisions | Any logic |

The seam between Rails and Proximity is **one field on the post/comment**:

```
Rails:      post.moderation_state = visible | hidden | removed
Proximity:  moderation_cases row  = everything else (why, how sure, who, when, what next)
```

**Proximity never hides anything itself. It asks Rails to.** Rails never reasons
about content. It just flips the field when asked.

### Why this split (and not the alternatives)

- *Cases in Rails instead?* Then every prompt/threshold/category tweak becomes a
  Rails migration, and Learnyst-wide AI accuracy metrics (row 48 of the user stories)
  can't be queried — they'd be scattered across per-school Rails data.
- *Visibility in Proximity instead?* Then every learner feed read has to
  cross-service join. Posting and reading are the hot path. Never.
- So: **thin field in Rails, fat case file in Proximity.**

---

## 3. This is a pipeline, not a chatbot

Proximity has two shapes of feature today:

| Shape | Example | Fits moderation? |
|---|---|---|
| Chat / agentic workflow | admin assistant, quiz generator | ❌ No human in the loop at screening time |
| **Async pipeline** | `ai-ingest/lesson` | ✅ **This one** |

Moderation is the `ai-ingest/lesson` pattern, almost exactly:

```
Rails submits  →  202 Accepted  →  BullMQ worker does the work  →  callback to Rails
```

So we already have the blueprint in-repo:
`src/modules/pipeline/ai-ingest/lesson/` — controllers, routes, schemas, handlers,
services, workers, db. Copy that skeleton. Same internal-host auth
(`checkInternalHost`). Same durable-callback-via-queue trick
(`enqueueRailsCallback`) so a Rails blip never loses a decision.

**The admin queue is the only chat-shaped-looking part, and it isn't chat either —
it's a plain GraphQL list + detail on the admin-ai endpoint.**

---

## 4. The screening pipeline (3 layers)

```
post created / edited
        │
        ▼
┌─ Layer 0 ─ deterministic pre-filter ──────────────┐   no LLM, instant
│  school blocklist (words/links)                    │
│  allowed-links list                                │
│  exact-duplicate detection (hash compare)          │   ← M1
│  near-duplicate detection                          │   ← Phase 2, NOT reuse — see 03 §6
└────────────────────┬───────────────────────────────┘
                     │  clean? still go to Layer 1
                     ▼
┌─ Layer 1 ─ LLM classifier ─────────────────────────┐   Instructor.js, strict schema
│  TEXT:  → category, severity, confidence           │
│         → the exact span that triggered it         │
│         → a plain-English reason                   │
│         → "is this real, or normal class talk?"    │
│                                                     │
│  IMAGES: → OCR the image, run that text through    │   ← reuses imageCaption.service
│            the same text classifier                │
│          → plus one visual safety check            │
│  PDFs:   → pdf-processor extracts text, then        │   ← reuses learnyst-services
│            the text classifier                     │
│  (worst result across all of them wins)            │
└────────────────────┬───────────────────────────────┘
                     ▼
┌─ Layer 2 ─ router (pure code, no LLM) ─────────────┐
│  severity × confidence × author history × reach    │
│  × school mode (Copilot / Autopilot) × strictness  │
│  →  allow                                          │
│  →  FLAG + queue, content STAYS VISIBLE   ← rows 9–11
│  →  hide + queue                                   │
│  →  auto-remove (Autopilot, allow-listed only)     │
│  →  urgent-restricted                              │
└────────────────────────────────────────────────────┘
```

### The flag-only branch is not optional (rows 9, 10, 11 — all HIGH)

This was added to the user stories after the first draft of this pack, and it changes
Layer 2's shape. **Low confidence must not hide anything.** A 0.42-confidence guess on
*"how does proctoring detect cheating?"* opens a case and leaves the post up.

Three consequences that ripple outward:

| | |
|---|---|
| The case exists without a hide | So "case opened" and "content hidden" are separate events, and the queue's **Low confidence** tab is a list of things that are still live |
| The admin gets a **different action set** | Not approve/remove/keep-hidden — it's *leave it as it is · send a warning · hide it while I look · remove it*. `decideModerationCase` could not express "hide it now"; see `03-proximity-scope.md` §4 |
| The learner is told **nothing** | Row 11: moderation speaks only when content actually moves, or when a person decides. A flag is not an accusation. This also settles the "AI is checking your post" question — no indicator |

Layer 2 being **pure code** matters: it is the part product will want to tune
weekly, and it must be testable without an LLM.

### Fail-open is a hard rule

If Proximity is slow, down, or errors — **nothing happens to the post**. It stays
visible. Moderation degrades; posting never breaks. This is why the submit from
Rails is fire-and-forget and never blocks the create mutation.

⚠️ **Two things in the repo invert this rule, and both are verified.**

1. `shared/services/aiUsageLimits.service.ts` is **fail-CLOSED** — its own docstring says
   *"returns allowed=false if the API is unreachable or errors."* If moderation is wired
   through the school AI quota gate, an outage stops screening in a way that also raises
   *"does moderation burn a school's paid AI quota?"* — **moderation must not go through
   that gate.**
2. The OCR service returns `""` when Gemini refuses an image, and empty text scores as
   *clean*. That is a confident wrong answer produced by a failure — worse than being
   down, because being down is visible. See `01-image-moderation.md` §3b.

Fail-open means *"the service is unavailable, so we did nothing."* It never means
*"we produced a clean verdict."*

---

## 5. Volume reality check (this changes design)

From the market research: **10,282 posts in 7 months ≈ 1,500/month ≈ 50/day.**

That is tiny. Consequences:

- One `flash-lite` classifier call per post is a rounding error in cost.
- **We can afford a second, stronger pass** on anything not obviously clean, and a
  third on critical categories. Precision is cheap here.
- No need for batching, sampling, or "only moderate popular posts" cleverness.
- Do NOT build for scale we don't have. Build for accuracy.

---

## 6. Categories & severity (needs product sign-off in Phase 2)

Taxonomy comes straight out of the learner report reasons in the user stories:

| Severity | Categories | Default routing |
|---|---|---|
| **Critical** | self-harm, child sexual safety, credible threat, personal info | Hide now → **restricted** urgent queue. Never auto-delete. |
| **High** | hate, sexual content, harassment | Hide → urgent/normal queue by confidence |
| **Medium** | spam, illegal activity | Hide → queue. **First Autopilot candidate (spam/exact-duplicate).** |
| **Low** | off-topic, academic integrity (cheating) | School-configurable; off by default |

Self-harm is special everywhere: hide is optional, the queue is urgent, the message
to the learner is **supportive with helpline info**, and it is never auto-removed.

---

## 7. What each repo has to do

### 7a. Proximity AI-NG — the main role

New module, mirroring `ai-ingest/lesson`:

```
src/modules/pipeline/moderation/
├── routes/        POST /api/moderation/content      ← Rails submits (internal host)
│                  POST /api/moderation/report       ← learner report re-check
│                  DELETE /api/moderation/content    ← author deleted it, close cases
├── controllers/ schemas/ handlers/ services/ workers/
└── db/models/
```

New tables in `proximity_db` (Drizzle — remember `tablesFilter`):

| Table | Holds |
|---|---|
| `moderation_cases` | the case file: content ref, snapshot, category, severity, confidence, span, reason, recommended action, state, mode-at-decision, latency, **whether the content was hidden or left visible**, **the notice text actually shown to the author** (row 14), **threat detail — target / place / time / means** (row 44) |
| `moderation_reports` | learner reports: case, reporter, reason. Distinct-reporter count drives priority; also catches abusive reporters |
| `moderation_actions` | append-only audit log — who (ai/admin/system), what, before→after, when |
| `moderation_author_ledger` | per (school, user) rolling violations + current sanction tier |
| `moderation_settings` | per school (+ per space): on/off, mode, per-category strictness, notify list, custom messages, exempt roles, cooldown length, safety contact |
| `moderation_blocklist` | blocked words/links + always-allowed links |
| `moderation_appeals` | one appeal per removed item; outcome tracked separately from first-decision accuracy |

BullMQ queues: `moderation-screen`, `moderation-rails-callback`,
`moderation-notice`, `moderation-ledger`.

GraphQL on the existing **admin-ai** schema (the admin UI reads this):
`moderationQueue`, `moderationCase`, `moderationSettings`, `moderationBlocklist`,
`moderationMetrics`, `authorModerationHistory` + mutations `decideModerationCase`,
`applyAuthorSanction`, `reportAiMistake`, `addBlocklistEntry`,
`updateModerationSettings`, `escalateToLearnyst`, `resolveAppeal`.

New env var `MODERATION_LLM`. Use **Instructor.js** (classification = strict schema
+ speed, per repo convention). `gemini-2.5-flash-lite` first pass,
`gemini-2.5-flash` second pass. **Never `gemini-2.5-pro`** — known broken with
structured output in this repo.

### 7b. Rails — what we need from it

**Reads we need:**
1. Content snapshot at submit time (body, author, space, thread context, created_at)
   — so the case file survives the content being deleted.
1b. **File addresses for images** — *nice to have, not a blocker.* `featuredImage` and
   `attachmentUrl` are already absolute HTTPS URLs in the payload; we add an HTTPS fetch
   path with SSRF guarding on our side. `gs://` would let us use the OCR service as-is,
   but GCS reads are granted per bucket per service account, so it is a cross-team infra
   ticket, not free. **PDFs need no ask at all.** See `01-image-moderation.md` §5.
2. Author basics: role, join date, current ban state (`communityStatus` already
   exists on the post payload).
3. **Reach signal** — a view/impression count, or we fall back to space member
   count × age. ❓ *Open: does Rails have this?*

**Writes we need Rails to expose (Proximity calls these):**
1. `hideContentForModeration` / `restoreContent` / `removeContent`
2. Author sanctions — **status today, read from the codebase:**
   - ✅ ban exists → `banCommunityMember(status: IS_PERMITTED | IS_BANNED)`
   - ✅ remove member exists → `removeCommunityMember`
   - ❌ posting cooldown — does not exist, new Rails work
   - ❌ comment disable — does not exist, new Rails work
   - ❌ warning notice — does not exist, new Rails work
   *(This partly answers Open Question #7 in the market research doc.)*
3. Author notice delivery — a channel to tell the learner. ❓ *Open: in-app
   notification, email, or both?*

**Submits Rails must fire (fire-and-forget, non-blocking):**
- post create / post edit / comment create / comment edit → `POST /api/moderation/content`
- learner report → `POST /api/moderation/report`

**Rails must own:**
- `moderation_state` on community post + discussion/comment. Note this is now a
  **four-state** field — `visible | flagged_visible | hidden | removed` — because rows
  9–11 require content that is flagged but still live.
  ⚠️ Note: posts already have a `status` field. Moderation hiding must be a
  **separate** field, not reuse `status` — otherwise "restore" can't return the post
  to its previous author-chosen state, and the learner-facing message can't be told
  apart from an author unpublish.
- Field-level redaction for personal-info cases (blank in normal views, full for
  permitted admins) — this is Rails render-layer work.
- **Markers where removed and hidden content used to be** (rows 32–35). This is new, it
  is the biggest single Rails ask, and the old version of `02-rails-ask.md` §E1 said the
  opposite — that everyone else sees *nothing*. That is true **only** for the sensitive
  categories in row 35. Everywhere else a marker must render, carrying the actor
  ("removed automatically by *<assistant name>*" / "removed by a moderator") but never the
  author's name or picture and never the reason.
- A new admin permission for the restricted urgent queue.

**Rails does NOT need:** any case table, any AI schema, any queue. Keep it thin.

### 7c. Admin repo — where the UI goes

Two surfaces. **Corrected after the audit — this is more nuanced than I first wrote.**

There is already a metadata-built moderation queue in the admin:
`metaData/list/productReviews.ts` is an approve / unapprove / delete queue for course
reviews, built entirely in list metadata — `ActionsCell` plus `type: 'mutation'`
actions with confirm modals and a status badge. So "a decision queue must be a custom
page" is **wrong**, and there's a house pattern to copy.

The real constraint is narrower:

| Screen | Metadata or custom? | Why |
|---|---|---|
| The queue list | **Metadata is viable** — `productReviews.ts` is the precedent | but its data must be reachable from Rails `/graphql` (see §2 of the KPI doc) |
| **Case detail** | **Custom** | Highlighted spans + thread context + AI reasoning + an image viewer. No cell renderer does this, and it isn't a table. |
| Settings | Either | |

So the honest version: **the case detail is the custom part.** The queue could go either
way, and the deciding factor is the same client constraint as the KPIs — metadata reads
Rails, our cases live in proximity.

```
src/ui-web/communityModeration/          ← per conventions/custom-pages.md
├── ModerationQueuePage.tsx
├── caseDetail/       CaseDetail.tsx + Utils/Constants/Types
├── settings/         ModerationSettings.tsx
└── metrics/          ModerationMetrics.tsx

src/bundles/common/routes/communityModerationRoutes.ts   ← route file
```

- Data client: **`adminAiClient`** — already exists in `src/graphql/apolloClient.ts`,
  already points at `ADMIN_AI_GRAPHQL_URL`, same Bearer token. Nothing new to wire.
- Components: shadcn layers (atoms → molecules → organisms), no Theme-UI.
- Lives under the **Engage** sidebar group (that's where community already sits).
- Role gating needed for the restricted urgent queue.

### 7d. Bodhi (learnyst-web) — learner side

The community here is the **new "Socials"** implementation (spaces, groups, feed) —
`apps/widgets/src/raven/dynamic-components/Socials/` and
`organisms/social-community-post-listing/`. The older `community-*` widgets are the
legacy surface; both exist today.

**Important finding — the existing "Report" is not a moderation report.**
Today the "•••" → Report action opens `raise-ticket-modal` and creates a **support
ticket** (`SupportTypes.SUPPORT_TYPE_REPORT = 9`). It does not create a moderation
case. So learner reporting is genuinely new work, not a rewire.

What bodhi needs:
1. **Real report flow** — reason picker (the 11 reasons on row 27), anonymous to author,
   simple confirmation. Learner → **Rails** → Proximity. Never learner → Proximity
   directly.
2. **Author notice** on a hidden/removed/restored post — visible only to the author: what
   happened, why, and "Ask for a review" (appeal). Supportive variant for self-harm with
   local helpline info.
3. **Markers for everyone else** (rows 32–35) — *"Under review"* where a hidden reply was,
   an attributed marker where a removed one was, and nothing at all in the sensitive
   categories. This is the item the earlier drafts of this pack missed entirely.
4. **Personal-info redaction** rendering.
5. **The moderation disclosure banner** (rows 24–25) — permanent on every community, under
   the school's assistant name, opening to what gets checked, what happens when something
   is flagged, that a person from the school decides, and the community rules.
   Three findings that change the estimate:
   - The name already exists — `aiGuruSchoolProfile.aiAvatarName`, school-configurable,
     already reaching every widget through the school config. **But it is one name per
     school and is already the lesson-chat and school-assistant identity**, it can be
     empty, and the config is cached for a day. Pair it with the role in the copy
     (*"NexaBot · moderation"*) so the AI that helps you is not silently the AI that
     polices you.
   - `social-banner` exists as a molecule but is **not wired into production**, has no
     slots so it cannot host an ⓘ affordance, and `role="alert"` would interrupt screen
     readers on every page load. A dedicated disclosure molecule is likely cleaner.
   - The **per-community on/off flag does not exist at any layer**. Cheapest path is
     hanging it off `UpdateSpaceInput`, which already takes partial patches.

Build order is fixed by the repo: **API Contract YAML → models-and-repos →
widgets → learny-web page.** The repo rule is hard: *no GraphQL without a contract
YAML.* So contracts are a prerequisite, not a step.

---

## 8. Data flow, end to end

```
LEARNER POSTS
  bodhi → Rails createCommunityPost → post is LIVE
                    │ (async, fire-and-forget)
                    ▼
  Proximity POST /api/moderation/content → 202 → moderation-screen queue
                    ▼
        Layer 0 → Layer 1 → Layer 2
                    ▼
        moderation_cases row written
                    │
        ┌───────────┼────────────────────┐
     allow      FLAG ONLY            hide/remove
      done   case + queue only    moderation-rails-callback queue
             content stays up                 ▼
             LEARNER TOLD NOTHING   Rails sets moderation_state
             (row 11)                         ▼
                    │              moderation-notice → learner sees notice
                    └──────────────► case appears in admin queue

LEARNER REPORTS
  bodhi → Rails → Proximity POST /api/moderation/report
  → re-screen with the reason as a hint → case created or priority raised

ADMIN DECIDES
  admin UI → adminAiClient → decideModerationCase (proximity)
  → moderation_actions audit row
  → moderation-rails-callback → Rails flips moderation_state
  → moderation-notice → learner told
  → moderation_author_ledger updated → escalation ladder re-evaluated
```

---

## 9. What we must have before writing code

### 9a. Decisions we cannot make ourselves (need an owner)

| # | Decision | Why it blocks |
|---|---|---|
| 1 | Self-harm & child-safety: legal escalation + retention policy | Named in the go/no-go as the **biggest launch blocker** |
| 2 | Who owns urgent response — school admin / Learnyst support / both | Changes the escalation path and the notify design |
| 3 | Which admin roles see the restricted queue | Rails permission + admin UI gating |
| 4 | Confirm the sanction set Rails will build (cooldown? comment-disable? warning?) | Ban exists; the rest is new Rails work |
| 5 | Learner reporting in M1 — the real 11-reason flow, or the support-ticket middle path? **Row 27 is HIGH and specifies the reasons**, so the middle path is now a conscious downgrade, not a neutral choice | Decides whether bodhi is in scope for M1 at all |
| 6 | Minimum appeal flow for launch | Decides if `moderation_appeals` is M1 or M2 |
| 6b | **Posting pause in M1?** Rows 17, 22 and 40 all need it and row 17 is HIGH — the earlier plan had it at M2 | The ledger's rungs 3 and 4, and one of row 17's three verbs |
| 6c | **Ban-evasion detection** (row 40, rung 5) — what signal may we correlate on? | Whether the ladder's top rung can exist at all |
| 6d | **Who owns the local helpline list** (row 42), and for which regions? | The self-harm notice's content |
| 7 | Off-topic / academic-integrity: default on or school-configurable? | Default-on will generate false positives on normal class chat |
| 8 | `moderation_state` — new Rails field, confirmed? | The whole seam depends on it |
| 9 | Author notice channel (in-app / email / both) | New Rails delivery work if in-app doesn't exist |
| 10 | English-only accuracy statement to schools | Product/marketing commitment |

### 9b. Data & access we need

1. **A labeled eval set — this is the single biggest gap.** The go/no-go says
   Autopilot only ships after spam proves high precision in production. We cannot
   claim precision on anything without labels. Need: read access to the existing
   10,282 posts, and a labeling pass over ~300–500 of them by category. Without this
   there is no baseline and no way to tune Layer 2.
2. Answer on the **reach signal** — does Rails track post views?
3. The current **Rails admin role/permission model**, to place the restricted-queue
   permission.

### 9c. Things to write before code

| Order | Artifact | Where |
|---|---|---|
| 1 | This mental-model doc | ✅ done |
| 2 | **UI artifact** (admin queue + case detail + settings + learner surfaces) | next |
| 3 | Category taxonomy + severity + Layer-2 routing table, product-signed | Phase 2 |
| 4 | Contracts: proximity REST schemas, admin-ai GraphQL SDL, Rails mutation contracts, bodhi API contract YAMLs | Phase 3 |
| 5 | Eval set + classifier prototype + baseline precision/recall | Phase 4 |
| 6 | Implementation plan | Phase 5, **last** |

---

## 10. Phases

| Phase | What | Output |
|---|---|---|
| **0** | Mental model + repo mapping | this doc |
| **1** | UI, all screens, illustrative | artifact |
| **2** | Taxonomy + severity + routing decision table | md + review |
| **3** | Contracts + data model | schemas, SDL, YAMLs |
| **4** | Eval set + classifier prototype, baseline numbers | notebook/script + report |
| **5** | Implementation plan | plan doc per repo |

---

## 11. Risks worth naming now

| Risk | Note |
|---|---|
| **False positives on normal class discussion** | The #1 product risk. A learner asking "how do I cheat detection work" in an exam-prep community is not a violation. Layer 1 must be told to separate real violations from academic discussion, and off-topic/cheating should stay off by default. |
| **No eval set** | Everything about accuracy is a guess until we label real data. Blocks Autopilot entirely. |
| **Non-English** | Hindi/Tamil/Hinglish is our actual user base and is completely unmeasured. Screen it, but don't claim it. |
| **Rails is the bottleneck, not the AI** | The AI work is a contained new module. The Rails-side work (new field, redaction, new sanctions, permission, notice channel) touches the core content path and is not ours. Get it scoped early. |
| **Two community surfaces in bodhi** | New Socials + legacy `community-*` widgets both exist — verified, seven legacy widgets are still in the tree. Decide whether M1 covers both, or Socials only. |
| **The pack drifting from the page again** | Nine HIGH rows reached Confluence while the file that proposed them still said *NOT PUBLISHED*, and one of them contradicted the Rails ask. `11-story-coverage.md` is the fix — a row-by-row table to check before any planning meeting. Cite **row numbers**, never `US-N`; the `US-N` scheme has already broken once. |
