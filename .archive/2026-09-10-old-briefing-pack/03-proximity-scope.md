# What I Build — Proximity AI-NG

My side of the feature. This is the main role.

**The headline for your seniors:** *most of this already exists.* I'm adding one module
and seven tables. The plumbing — internal auth, durable queues, the Rails transport,
OCR, GCS reading, embeddings, structured output, tracing — is all already in the repo
and already in production for lesson ingestion.

---

## 1. The shape: this is a pipeline, not a chatbot

Proximity has two kinds of feature today:

| Kind | Example | Fits moderation? |
|---|---|---|
| Chat / agentic workflow | admin assistant, quiz generator | ❌ No human present at screening time |
| **Async pipeline** | `ai-ingest/lesson` | ✅ **This one** |

Moderation is the `ai-ingest/lesson` pattern, near-exactly:

```
Rails submits → 202 Accepted → worker does the work → durable callback to Rails
```

So I copy an existing, working skeleton rather than inventing one. That's the single
biggest de-risking fact about my part.

---

## 2. Module layout

Mirrors `src/modules/pipeline/ai-ingest/lesson/` — same folders, same roles.

```
src/modules/pipeline/moderation/
├── routes/            the 3 Rails-facing endpoints
├── controllers/       one per endpoint
├── schemas/           request validation (Fastify JSON schema)
├── handlers/          Layer 0, Layer 1 text, Layer 1 image, Layer 2 router,
│                      rails-callback, notice, ledger
├── services/          orchestrator, queue names, prompts, classifier client
├── db/
│   ├── models/        the 7 tables
│   └── repository.ts
└── workers/           BullMQ consumers
```

---

## 3. Tables — 7 new, all in `proximity_db`

| Table | What it holds |
|---|---|
| `moderation_cases` | The case file. Content reference, snapshot, category, severity, confidence, the exact span, reason, AI's recommendation, state, which mode was active, how long it took. **Plus three fields the first draft missed:** `disposition` (`flagged_visible` vs `hidden` — rows 9–11), `notice_rendered` (the message the author actually saw, so the case detail can show it — row 14), and `threat_detail` (target · place · time · means — row 44) |
| `moderation_reports` | Learner reports. Case, reporter, reason. Distinct-reporter count drives priority; also catches people who report everything |
| `moderation_actions` | Audit log. Append-only. Who (AI / admin / system), what, before → after, when |
| `moderation_author_ledger` | Per school + learner: rolling violations, current strike level, **and the evasion signal for rung 5 of row 40's ladder** — see §6b |
| `moderation_settings` | Per school (and per space): on/off, mode, per-category strictness, notify list, custom messages, exempt roles, pause length, safety contact |
| `moderation_blocklist` | The school's blocked words and links, plus always-allowed links |
| `moderation_appeals` | One review request per removed item; outcome tracked separately from the AI's first decision |

**Two gotchas from the repo's own notes:**
- New tables must be added to `tablesFilter` in `drizzle.config.ts` or Drizzle ignores them.
- Never rename a table with drizzle-kit — it breaks. Use `ALTER TABLE ... RENAME TO` directly.

---

## 4. Endpoints

### Rails-facing REST (internal only)

```
POST   /api/moderation/content    submit a post/comment for screening
POST   /api/moderation/report     a learner reported something
DELETE /api/moderation/content    content was deleted — close the case
```

Auth: `fastify.checkInternalHost` — the same network-origin guard the `ai-ingest`
endpoints already use. The request must arrive on our internal hostname. No token to
issue, rotate, or leak.

### Admin-facing GraphQL (on the existing `admin-ai` schema)

Queries:
```
moderationQueue           tab, filters, sort, search, paging
moderationCase            one case, everything
moderationSettings
moderationBlocklist
moderationMetrics
authorModerationHistory
```

Mutations:
```
decideModerationCase      approve / remove / keep hidden          ← for HIDDEN content
applyCaseAction           leave / warn / hide-now / remove        ← for FLAGGED-VISIBLE content
applyAuthorSanction       warn / pause / ban
reportAiMistake           the feedback loop
addBlocklistEntry
updateModerationSettings
escalateToLearnyst
resolveAppeal             restore / keep removed / update the notice
```

**Two of these changed after rows 9–11 and 37 shipped.**

`decideModerationCase` assumed the content was already down — its whole vocabulary is
*approve back / remove / keep hidden*. It has no way to say **"hide it now"**, which is
exactly what row 10 asks for on a post that is still visible. Rather than overload it,
`applyCaseAction` is the flagged-visible verb set. Same case table, different starting
state, different sentence.

`resolveAppeal` gained **"update the message"** — row 37 lets an admin fix the notice text
when they resolve, not only the outcome. That reads back from `notice_rendered`.

The admin dashboard already has a working Apollo client for this endpoint
(`adminAiClient`). Nothing new to wire on the frontend transport.

---

## 5. Queues — 4 new BullMQ queues

| Queue | Job |
|---|---|
| `moderation-screen` | Run Layers 0, 1 and 2 on one piece of content |
| `moderation-rails-callback` | Deliver hide / restore / remove to Rails, durably |
| `moderation-notice` | Tell the learner what happened. ⚠️ **This queue needs a suppression gate.** Row 11: a learner hears from moderation only when their content actually moved, or when a person decided something. A flag-only case enqueues **no notice at all**. The gate belongs here, in one place, not scattered through the handlers |
| `moderation-ledger` | Update the author's record, re-evaluate the strike level |

⚠️ **One deployment fact that caps all four:** the worker runs in a **separate
deployment at `replicas: 1`** — verified in `app/manifests/deployment-worker{,-dev,-staging}.yaml`.
BullMQ concurrency is per-process, so one replica is the real ceiling for every queue
here combined. At 50 posts/day that is fine and worth saying so explicitly, because the
first question anyone asks about four new queues is whether they need capacity. They
don't — but adding a queue is a documented multi-step ritual, not just naming it.

**Why the callback is its own queue:** if Rails is briefly unreachable, the decision
must not be lost. `ai-ingest` already solved this — `enqueueRailsCallback` dedupes by
job id so Rails gets exactly one call, and the terminal state is only written after
Rails answers 2xx. I copy that.

---

## 6. The three layers

### Layer 0 — plain rules, no AI (~20 ms)

- School blocklist: words and links
- Always-allowed links (so `ncert.nic.in` never trips)
- Repeat / near-duplicate detection

Exact-duplicate detection (same text posted 7 times in 40 minutes) is a hash compare —
genuinely free, no model call.

⚠️ **Near-duplicate detection is NOT reuse — it's new work.** I originally wrote that we
"reuse the embeddings we already have". Corrected: embedding *generation* exists
(`getTextEmbedding()` in `vertexAi.service.ts`, 768 dims), but pgvector search exists
only over the knowledge-base tables — `lesson_guru`, `lyst_articles_kb` and
`lyst_features_kb`. (The middle one is often called "help KB" after its model file
`learnystHelpKb.model.ts`; the **table** is `lyst_articles_kb`, and that is the name
`tablesFilter` and the indexes use.) **There is no post-embedding table, no index, and no similarity
threshold.** That's a new table + a new index + a threshold that has to be measured.

Also worth knowing before anyone tunes it: the repo carries a hard-won warning that
eight `LANE_*` config vars were deleted because they documented the `<->` L2 distance
unit while the repositories actually order by `<=>` cosine, "where the real cut-off is
0.45". Anyone tuning through the configmap saw no effect and was reasoning in the wrong
unit. Pick the unit deliberately and write it down.

**Recommendation: exact-duplicate only in M1.** Near-duplicate is a Phase-2 item with
its own measurement work.

### Layer 1 — the AI reads it

**Text:** one Instructor.js call with a strict schema out. Returns category, severity,
confidence, the exact matched span, a plain reason, and a judgement on whether it's a
real violation or just normal class discussion.

Instructor.js is the right tool here per the repo's own guidance: classification with a
strict schema and speed, not open-ended generation.

**Images:** OCR the image and feed the extracted text back through the text classifier,
plus one visual safety call. Details in `01-image-moderation.md`.

**PDF attachments:** hand off to `pdf-processor` in learnyst-services, then classify the
extracted text. ⚠️ **Not a call that returns an answer** — `ParseRequestPayload` requires
`callback_url`, `callback_auth` and a `result_gcs_uri` that passes the service's bucket
allowlist, and the client is a fire-and-forget `postJson` with a 15 s enqueue timeout. So
this costs a **new webhook route** (the `pipeline/webhook/` pattern), a results bucket, and
429 backpressure handling. Small, but not "one more call". Details in
`01-image-moderation.md` §4.

### Layer 2 — the router, pure code (~5 ms)

Weighs severity × confidence × author history × reach × reports × mode × strictness, and
picks one of **five** outcomes:

| Outcome | Content | Case | Learner told |
|---|---|---|---|
| allow | stays up | none | no |
| **flag + queue** | **stays up** | opened | **no** — row 11 |
| hide + queue | hidden | opened | yes |
| auto-remove | removed | opened | yes |
| restricted urgent | hidden | opened, sealed | yes |

**The second row is new** and it is the one to get right. Rows 9–11 (all HIGH) say a
low-confidence guess must never take content down: it opens a case, lands in the
**Low confidence** tab still live, and the author is told nothing. The admin then picks
from row 10's verb set — leave it / warn / hide it now / remove it — via `applyCaseAction`.

Practically: **confidence gates the hide, severity gates the queue.** A Critical category
at 0.40 still goes to a human, but it goes there visible unless severity alone justifies
the hide. Which categories override that (self-harm, child safety, credible threat and
personal info always hide on sight) is the routing table Phase 2 pins down.

### 6b. Ban evasion — row 40's top rung has no design

The ladder in row 40 ends with *"tries to get around a block → admin gets alerted and a
stronger block is suggested."* Nothing in this pack, or in Rails, detects that today.

Detecting it means correlating a new account with a blocked one — some mix of device,
IP, email pattern and behaviour. That is a **product and legal question before it is an
engineering one**, and it is the only rung of the five with no path. Flagged as an open
question rather than quietly designed; see `06-open-questions-answered.md` N-7.

Everything below rung 5 is straightforward once `posting_paused_until` exists.

**Deliberately no AI here.** Two reasons worth saying out loud:
1. Product will want to tune this weekly. Tuning code is fast; tuning a prompt is not.
2. It must be unit-testable without a model. Every routing rule gets a test.

---

## 7. Model config

New env vars. The pattern is mixed, so match the right half of it: the **agent and
classifier** vars (`INSTRUCTOR_LLM`, `AI_COACH_LLM`, `QUIZ_AGENT_LLM`) are required with
no code default; some others *do* have defaults — `IMAGE_CAPTION_MODEL` is
`getEnv("IMAGE_CAPTION_MODEL", "gemini-2.5-flash-lite")`. Moderation is a classifier, so
**required, no default**.

| Var | Value | Used for |
|---|---|---|
| `MODERATION_LLM` | `google/gemini-2.5-flash-lite` | First-pass classify (fast, cheap) |
| `MODERATION_LLM_STRONG` | `google/gemini-2.5-flash` | Second pass on anything not clearly clean, and all critical categories |
| `IMAGE_CAPTION_MODEL` | `gemini-2.5-flash-lite` | ✅ **Already exists** — OCR |

⚠️ **The `google/` prefix is required** for anything routed through Instructor.js —
gotcha #6 in the repo: *"`INSTRUCTOR_LLM` needs `google/` prefix — Vertex AI model names
require this."* The live value is `google/gemini-2.5-flash-lite`. Models reached through
`getGoogleModel()` do **not** take the prefix. Since our classifier is Instructor-based,
ours do.

Two deployment notes, both from repo gotchas:
- Both vars must be added to `.env` **and all three configmaps** (dev/staging/prod).
  This is exactly the step that was missed for `IMAGE_CAPTION_MODEL`.
- Adding a new **required** var interacts with gotcha #23 — the ConfigMap must be live
  before the Cloud Deploy predeploy seed, or the seed reads the previous release's
  config and crashes. Adding keys is the safe, additive case; renaming one later needs
  expand-contract across two releases.

⚠️ **Do not route moderation through `aiUsageLimits.service.ts`.** It is **fail-closed** —
its own docstring reads *"Fail-closed: returns allowed=false if the API is unreachable or
errors."* Wiring the screening path through the school AI quota gate would invert our
fail-open rule at the worst moment, and it raises a question nobody wants to answer in a
sales call: *does moderating a school's community burn the AI credits they paid for?*
Moderation is platform safety, not a school-consumed AI feature. Keep it outside the gate
and say so in the code comment, or someone will helpfully add it later.

**Never `gemini-2.5-pro`.** The repo has a documented failure: thinking plus structured
output produces stream errors mid-JSON, seconds of latency, and about 5× the cost. This
is written down as gotcha #16 for a reason.

**Why two passes:** at 50 posts/day we can afford it. A cheap first pass filters the
obvious 97%; a stronger second pass handles the rest. This buys accuracy for almost no
money and it's the main lever we have before we get labeled data.

---

## 8. What already exists vs. what's new

This is the table to show if someone asks how long it will take.

### Already in the repo — reuse as-is

| Thing | Where |
|---|---|
| Internal-host auth guard | `shared/plugins/auth.ts` — `checkInternalHost` |
| Durable Rails callback pattern | `ai-ingest/lesson/services/final-callback.service.ts` |
| Rails GraphQL transport | `shared/services/railsApi.service.ts` |
| **OCR / image reading** | `shared/services/imageCaption.service.ts` |
| GCS file reading | `shared/services/gcs.service.ts` |
| Embeddings (duplicate detection) | `shared/services/embeddings.service.ts` |
| Structured output | `shared/libs/instructor.ts` |
| BullMQ queue adapter | `shared/libs/redis.ts` + queue-names pattern |
| Drizzle models + migrations | `shared/db/` |
| Tracing | `infrastructure/observability/langfuse.ts` |
| Analytics events | `shared/analytics/amplitude/` |
| PDF text extraction | `pdf-processor` in learnyst-services |
| Admin GraphQL schema + client | `admin-ai` schema; `adminAiClient` in admin repo |

### Genuinely new

| Thing | Notes |
|---|---|
| The `moderation` module | New folders, but a copy of a working skeleton |
| 7 tables | Straightforward |
| Classifier prompts + output schemas | The real design work |
| Layer 0 rules engine | Small |
| Layer 2 router | Small, but needs thorough tests |
| Visual safety check | One new Gemini call |
| Notice service | Small |
| Ledger / strike-level service | Small |
| The admin-ai GraphQL surface | Medium — a lot of fields, little logic |

**Roughly 70% plumbing that exists, 30% new.** The genuinely hard part is not code — it
is the prompts and the routing table, and those need labeled data to validate.

---

## 9. Testing

Follow the repo's own contract, which is already proven on the quiz workflow:

| Layer | How | Needs credentials? |
|---|---|---|
| Layer 0 rules | Plain unit tests | No |
| Layer 2 router | Plain unit tests — **every routing rule gets one** | No |
| Layer 1 classify | Mocked-LLM dispatch harness in `test/unit/moderation/` | No |
| Accuracy | Real-LLM scenario suite in `test/integration/`, env-gated | Yes (Vertex) |

The quiz workflow's harness (`test/unit/quiz-review/`) is the maintained reference —
**7 test files, 80 tests, all passing** (verified by running it). Same structure here.

⚠️ **The wider suite is not green.** The repo states plainly: *"`npm test` currently has
~5 pre-existing failing files (stale expectations + integration tests collected by the
unit config)."* Scope the moderation harness as **a second green island**, not as
"CI goes green" — and say so before someone runs the suite and asks.

**The rule I'd adopt from that work:** every live mistake becomes a pinned test case
*before* it gets fixed. That's how the accuracy set grows without anyone having to plan it.

One caution from the repo notes: rapid Vertex calls in a scenario suite trip per-minute
quotas, and the backoff looks like a hang. Stagger the tests.

---

## 10. What I do NOT own

Worth being clear, so nobody assigns it to me later.

- ❌ Whether a post is visible — that's Rails
- ❌ Rendering anything to a learner — that's bodhi
- ❌ The admin screens — that's the admin repo (though the data is mine)
- ❌ Delivering notifications — Rails' channel
- ❌ The legal and retention policy — leadership and legal

---

## 11. Build order I'd propose

Not the implementation plan — just the sensible order, so nothing waits on the wrong thing.

| Step | Why first |
|---|---|
| 1. Tables + the 3 REST endpoints, storing cases and doing nothing else | Rails can integrate and test against us immediately, in parallel |
| 2. Layer 0 + Layer 1 text + Layer 2, verdicts written but no callback | We can measure accuracy on real traffic while changing nothing for users |
| 3. Rails callback — hide / restore / remove goes live | First user-visible behaviour |
| 4. Admin GraphQL + the queue screen | Admins can act |
| 5. Images + PDFs | Additive, no rework |
| 6. Notices, ledger, appeals | Additive |
| 7. KPIs | Needs data to exist first |

**One reordering to argue for.** Rows 32–34 — the markers everyone else sees — are the
largest Rails item and they gate nothing on our side. Get them scoped in **step 1's
conversation**, not step 3's, because they will set the date and they are not ours to
build. Our step 2 (classifier running in production, hiding nothing, telling nobody) runs
happily while that work is in flight — and conveniently, step 2's shape *is*
`flagged_visible`, so rows 9–11 fall out of the safest thing we were going to do anyway.

**Step 2 is the important one to explain.** We can run the full classifier in
production, writing verdicts to our own table, hiding nothing and telling nobody. That
gives us real accuracy numbers on real content with zero user risk — and it is the
honest way to answer "is the AI good enough?" before we let it touch anything.
