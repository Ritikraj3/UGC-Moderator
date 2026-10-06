# ai-server plan: build moderation before Rails is ready

> **PROPOSED v2**, 2026-10-01. Owner: AI backend. Repo: `Proximity/proximity-ai-ng`.
> **T1 done.** The working copy of this plan now lives in the repo: `docs/plans/ai-moderation.md` on branch
> `feat/ai-moderation` (worktree `Proximity/proximity-ai-ng-moderation`). Keep that one current.
> **Follows the approved HLD exactly. Decision 2026-10-01: Gemini only; JEV is set aside for the future.** JEV has not been approved: this plan leaves a slot for it ([§8](#8-later-jev-if-it-is-approved))
> and builds nothing for it. The contracts are the three validated YAMLs in
> [`../rails-support/api-contracts/`](../rails-support/api-contracts/README.md) (A1–A3).

## 1. The idea in five lines

1. The HLD is approved and the contract is frozen. We build everything on ai-server's side of the three calls now:
   **A1** `POST /api/moderation/check`, **A2** the verdict webhook into Rails, and **A3** `POST /api/moderation/outcome`.
2. **The check is HLD §11 as written.** Instructor with `INSTRUCTOR_LLM` (flash-lite, now `gemini-3.1-flash-lite`, thinking off) makes one pass that returns the
   decision and the reason sentence together.
3. **No Rails needed for testing.** Postman plays Rails' outgoing calls (A1, A3). A small **Rails stub** that runs only on dev
   receives the webhook (A2). When Rails is ready, the callback address moves to Rails and the token is shared. Nothing else changes.
4. **Room for JEV.** The check sits behind the HLD's own interface, `classify(payload) → verdict`. If JEV is approved later,
   it is one new file and one setting.
5. **Learnyst's default rules and blocked words** are written and tested here, then handed to Rails as a seed file.

## 2. HLD check: rules this plan breaks

**None.** How each rule is kept:

| HLD rule | How the plan keeps it |
|---|---|
| §10: three calls, 202 always, no mode field, no `callback_url` | A1 to A3 built to the YAMLs, field for field |
| §10: idempotency key returns the same `request_id` | Redis `SET NX` on the key |
| §10: retries "immediately, 10s, 60s, 5 min", only on 5xx or network errors | Exactly that schedule. A 4xx gets no retry |
| §11: Instructor + flash-lite, one pass, `rule_id` must be one Rails sent | One Instructor call. An unknown id counts as no match |
| §6: the image is checked with the post, and "the model reads text inside the picture" | The image goes into **the same** call as the text |
| §13: "No post text, no verdict log, no moderation tables in `proximity_db`" | No table, no verdict log. The job payload lives in Redis only while the job runs |
| §14: live lane for create/edit, bulk lane for catchup | Two queues. The bulk lane has a concurrency cap |
| §15: counters per academy per day, numbers only | `moderation_stats/{school_id}/daily/{date}` |
| §16: internal host, service token on the callback, content stays in Learnyst's Vertex | `checkInternalHost`, Bearer token, Vertex only |
| §18.1: "No synchronous path" | None is built. Tests use Postman and the webhook stub |
| §18.11: "The callback address is configuration" | `MODERATION_CALLBACK_BASE_URL` (defaults to `RAILS_INTERNAL_URL`) |
| §18.16: "Rule changes never need an ai-server deploy" | The default rules are a seed file for Rails. ai-server never reads them while running |

> **Correction to the first draft of this plan:** it kept a 90-day verdict memo to count wrong flags. That breaks
> §13 ("no verdict log"), so it is gone. Those two counters wait for C8 (see below).

**Where the HLD is open, and the default we build with.** None of these blocks starting:

| Open item | What we build until it is decided |
|---|---|
| **C7**: the HLD says return the most severe rule, but ai-server is never told the actions | Return the single rule most clearly broken |
| **C8**: `approved_after_flag`, `removed_after_report`, `blocked`, `held`, `guidance`, `reported`, `to_teacher`, deadline `unchecked` | Not written. They need facts the contract doesn't carry. The outcome is counted as plain numbers: approved, removed, restored |
| **C26**: today's `/internal/v1` callbacks have no auth | Send the Bearer token anyway (HLD §16). Rails verifies it |
| **HLD §19-4**: does Rails send the parent post with a comment? | Use whatever `context` arrives |
| **HLD §19-5**: how many examples per academy | Accept up to 20 and trim to a token budget |

## 3. Architecture

```
 Rails's side (Postman until Rails is ready)  ai-server (proximity-ai-ng)
 ─────────────────────────────────────────    ─────────────────────────────────────────────────────
 A1 POST /api/moderation/check  ───────────▶  moderation.route (checkInternalHost · JSON schema = A1)
          ◀──── 202 { status, request_id }        │  idempotency_key → same request_id (Redis SET NX)
                                                  ▼  trigger picks the lane
                                    moderation-check-live (create, edit) · moderation-check-bulk (catchup)
                                                  │
                                                  ▼
                                    classify(payload) → verdict             ← HLD §11 interface
                                      └─ instructor.classifier   one Instructor call, flash-lite,
                                                                 text + image together
                                         (jev.classifier — slot only, see §8)
                                                  │
                                                  ▼
                                    moderation-callback ──▶ A2 POST {MODERATION_CALLBACK_BASE_URL}/internal/v1/moderation/result
                                                             Bearer token · retries 0 · 10s · 60s · 5 min
                                                             (dev: the Rails stub · later: Rails)
 A3 POST /api/moderation/outcome ──────────▶  counters → Firestore moderation_stats/{school_id}/daily/{date}
                                                  │
                                    GET /api/monitor/moderation → monitor → Proximity AI dashboard panel
```

### 3.1 Module layout: `src/modules/moderation/`

```
src/modules/moderation/
├── routes/moderation.route.ts        A1 + A3 (checkInternalHost)
├── routes/railsStub.route.ts         dev only: the Rails stub (§3.8). Never registered in prod
├── schemas/                          Fastify JSON schemas copied from the A1 / A3 YAMLs
├── classifiers/
│   ├── classifier.ts                 interface Classifier { id; model; classify(payload) → verdict }
│   ├── instructor.classifier.ts      the HLD §11 classifier
│   ├── prompt.ts                     system prompt + PROMPT_VERSION
│   └── index.ts                      picks the classifier from MODERATION_CLASSIFIER (only "instructor" today)
├── services/
│   ├── idempotency.service.ts        idempotency_key → request_id
│   ├── image.service.ts              fetch image_url (allowlisted hosts, size cap) → inline for the model
│   └── stats.service.ts              per-academy daily counters
├── workers/                          check-live · check-bulk · callback (*.worker.register.ts)
├── handlers/callback.handler.ts      A2 delivery
├── catalog/                          Learnyst default rules, blocked words, matcher test vectors
└── eval/                             labelled set + runner
```

### 3.2 The classifier (HLD §11)

- **One Instructor call** on `INSTRUCTOR_LLM` (flash-lite, thinking off, temperature 0, as `instructor.ts` already does),
  with the exact schema `{ breaks_rule, rule_id, reason (≤ 200 chars), confidence: low|medium|high }`.
- **What goes into the prompt:**
  - the `rules[]` exactly as sent;
  - `school_context`, `content_area` and `content_type`;
  - `title` and `body`;
  - `context`, the thread;
  - `examples[]`.

  The reason is written for the admin only. Learners never see it (HLD §12).
- **After the call:**
  - an unknown `rule_id` becomes `breaks_rule: false` (§11);
  - `model` and `latency_ms` go on the verdict;
  - `PROMPT_VERSION` goes to the counters (§15).
- **Images:** `image_url` is fetched only from Learnyst's own image hosts (an allowlist with a size cap, so a payload can't
  make ai-server fetch anything it likes). The image is sent inline in the same call.
  **Day-1 spike:** confirm Instructor on the Vertex OpenAI-compatible client accepts an image part. That is the only technical
  unknown in the plan.
- **Failure:** the existing `withRetries` covers short-lived Vertex errors. If the call still fails, the verdict goes out with
  `status: "error"`, which tells Rails "couldn't check" and starts its Unchecked path (§9).
- **The JEV slot:** `classifiers/index.ts` chooses by `MODERATION_CLASSIFIER`. Nothing else knows which classifier ran.

### 3.3 Lanes, idempotency and ordering (HLD §10, §13, §14)

- **Lanes:** `create` and `edit` go to the live lane (concurrency 8). `catchup` goes to the bulk lane (concurrency 2), so a backlog
  after an outage never slows a held post. Both numbers come from env.
- **Idempotency:** a resubmit with the same `idempotency_key` gets the same `request_id`, and no second job is queued.
- **Ordering:** nothing is serialised. `content_version` is echoed back, and Rails drops stale verdicts.
- **Job cleanup:** `removeOnComplete: true`, and failed jobs are kept 24 h for retry (exactly §13).

### 3.4 Callback delivery (A2)

- **Address and token:**
  - It goes to `MODERATION_CALLBACK_BASE_URL`, which defaults to `RAILS_INTERNAL_URL`. On dev it points at the Rails stub.
    When Rails is ready, unset it.
  - It carries `Authorization: Bearer ${MODERATION_CALLBACK_TOKEN}`.
- **Retries:** immediately, 10 s, 60 s, 5 min, then give up and log. Rails' deadline takes it from there. A 4xx is a contract bug:
  no retry, log it, count it.
- **Adapter change:** the queue adapter only knows `exponential | fixed` backoff, so `queue.adapter.ts` and `bullmq.adapter.ts`
  gain a `custom` backoff that takes a list of delays.

### 3.5 Outcome and counters (A3, HLD §15)

- **A3:** answers 200 at once and never fails the caller (fire and forget).
- **Counters:** `moderation_stats/{school_id}/daily/{IST date}`. These are written when the verdict is delivered:
  - `checked`, `clean`, `flagged`, `errors`;
  - `by_area`, `by_rule`;
  - `latency_ms_sum` and `latency_count`, `tokens_in` and `tokens_out`;
  - `model`, `prompt_version`.

  The outcome adds the plain numbers `outcome_approved`, `outcome_removed` and `outcome_restored`. The rest waits for C8.
- **Reuse the buffered writer** in `firestoreCounter.ts`, extended to take a document path, with existing callers unchanged.
  It is prod-only today, so moderation gets its own switch, `MODERATION_STATS_ENABLED`, to test on dev.
- **The panel:** `GET /api/monitor/moderation` is a new panel in `monitor/panels/`. The monitor repo adds one section to
  `ProximityAiPage.jsx`.

### 3.6 Learnyst default rules and blocked words (catalog v1)

> **Moved to Rails (decision 2026-10-05).** Rails holds the Learnyst standard rules and blocked words, like every
> academy rule, and sends them in each A1 request's `rules`. ai-server never stores rules, so nothing below is built here;
> it stays as input for Rails and product. The Learnyst team edits these rules on the Learnyst Monitor (AI Operations →
> Moderation Rules), which calls Rails' `/internal/v1/moderation/learnyst_rules`, never ai-server.

| File | What it holds |
|---|---|
| `catalog/learnyst-rules.v1.json` | The ten rules (SR 1): key, name, description, suggested default action, report reason, and a `selfHarm` flag (row 78). **Only Rule 6's wording is in the sources. We draft the other nine and product signs off** (C1: nine or ten) |
| `catalog/blocked-words.v1.json` | Words and web addresses per rule, in English, Hindi and romanised Hinglish |
| `catalog/matcher-test-vectors.json` | Input → should match or not, covering every HLD §3 disguise. The matcher is Rails' deliverable. This is the acceptance test we hand them |

The catalog is versioned (`catalog_version`) so Learnyst updates never bring back a word an academy deleted (SR 2).
The descriptions are tuned with the eval, because they are what the model reads.

### 3.7 Eval

- **`eval/moderation/v1.jsonl`, about 400 labelled posts:**
  - mostly clean, to keep a realistic base rate;
  - every rule;
  - Hindi and Hinglish;
  - disguised words;
  - a pitch split across messages;
  - image posts (a screenshot of a phone number, a rival's poster);
  - hard cases (a teacher discussing self-harm as a topic).
- **`npm run eval:moderation`** calls `classify()` in-process and prints:
  - precision and recall per rule;
  - the wrong-flag and miss rates;
  - p50 and p95 latency;
  - tokens per check.

  Each run's results are committed.
- **Pass bar before a pilot:** wrong flags under 5% (HLD §17).
- **Unit tests** mock only the model boundary (repo rule).

### 3.8 Testing without Rails: Postman + Rails stub (no frontend prototype)

**Why Postman and not a frontend:**
- A browser can't pass `checkInternalHost`: it can't set the `Host` header, so a page would need its own proxy. Postman can set the header.
- The Postman collection also becomes Rails' reference for how to call us.
- Newman runs the same collection as a regression suite.
- A frontend would be throwaway work. Add one later only if Postman becomes painful.

**The Rails stub** lives in `routes/railsStub.route.ts`:
- It is registered only when `MODERATION_RAILS_STUB=true` **and** `DEPLOY_ENV !== "prod"`.
- Its state is kept in Redis with a 1-hour TTL, so it works across dev pods. It only ever sees synthetic test posts.

| Stub route | Does |
|---|---|
| `POST /debug/rails-stub/internal/v1/moderation/result` | Plays A2 exactly: checks the token, deduplicates on `request_id`, drops a stale `content_version`, records what arrived |
| `GET  /debug/rails-stub/received?request_id=` | What arrived: verdict, attempt count, time of each attempt |
| `POST /debug/rails-stub/mode` | Fault switches: `{ fail_status: 500, fail_times: 2 }` · `{ fail_status: 400 }` · `{ delay_ms }` · `{ down: true }` |

**The Postman collection, "AI Moderation (ai-server)":**

| Folder | Requests and tests |
|---|---|
| 1 · Submit (A1) | create · edit (version 2) · two rapid edits · catchup · image post · the same key sent twice → the same `request_id` |
| 2 · Verdict (A2) | Polls the stub's `/received` and checks the verdict against the A2 YAML |
| 3 · Failures | 500 twice → delivered on attempt 3 · 400 → one attempt only · down → give-up logged · wrong token → 401, no retry |
| 4 · Outcome (A3) | approve · remove · restore → 200 |
| 5 · Counters | `GET /api/monitor/moderation` → the numbers moved |

**Environments:**
- **local:** `AI_SERVICE_END_POINT=http://localhost:<port>`, so the guard accepts localhost.
- **dev:** port-forward to the ai-server service and send `Host: <dev internal host>`. Postman desktop and Newman both allow it.

## 4. Existing code that changes (small, all additive)

| File | Change |
|---|---|
| `shared/queue/queue.adapter.ts`, `bullmq.adapter.ts` | `custom` backoff with a list of delays; `removeOnComplete` / `removeOnFail` per queue |
| `shared/queue/queues.ts`, `worker-entry.ts` | Three queues and three worker registrations |
| `shared/config/env.ts` + `app/manifests/configmap*.yaml` | New keys only, which is safe (gotcha 23): `MODERATION_CLASSIFIER=instructor`, `MODERATION_CALLBACK_BASE_URL`, `MODERATION_CALLBACK_TOKEN` (Secret Manager), `MODERATION_LIVE_CONCURRENCY`, `MODERATION_BULK_CONCURRENCY`, `MODERATION_STATS_ENABLED`, `MODERATION_RAILS_STUB`, `MODERATION_IMAGE_HOSTS` |
| `shared/config/constants.ts` | `RAILS_API_PATHS.MODERATION_RESULT = "/internal/v1/moderation/result"` |
| `monitor/firestoreCounter.ts` | A writer that takes a document path. Existing callers unchanged |
| `monitor/panels/index.ts` | Register the moderation panel |
| Server route registration | `moderation.route`, plus `railsStub.route` behind its two switches |

## 5. Work split: 10 tasks × 3 SP = 30 SP

| # | Task | Needs | Done when |
|---|---|---|---|
| **Phase 0 · Plan** ||||
| T1 | Planning: confirm the §2 defaults, env names, a branch `feat/ai-moderation` from `main`, the Postman workspace, the day-1 image spike | — | Defaults agreed; spike answered |
| **Phase 1 · Foundation** ||||
| T2 | ~~Catalog v1~~ — **moved to Rails (decision 2026-10-05):** Rails holds the Learnyst standard rules and blocked words and sends them in every check request. Nothing to build in ai-server | — | — |
| T3 | Eval set (about 400) and runner (its own synthetic sample rules) | — | One command prints the per-rule report |
| **Phase 2 · Service** ||||
| T4 | A1: route, schema, host guard, idempotency, 202, two lanes | — | Same key → same `request_id`; trigger → right lane |
| T5 | Classifier: interface, Instructor one pass, prompt, image in the same call, `status: error` path | T4 | A fixture post produces a verdict that matches the A2 YAML |
| T6 | A2 delivery: token, 0 / 10 s / 60 s / 5 min, no retry on 4xx, configurable address | T4 | Stub fails twice → delivered on attempt 3; 400 → one attempt |
| T7 | A3 and per-academy counters | T5 | Today's doc for a dev academy moves after a check and an outcome |
| **Phase 3 · Prove** ||||
| T8 | Rails stub, Postman collection, Newman run, end to end on dev | T4–T7 | Every box in §6 ticked on dev |
| T9 | Prompt and rule-wording tuning with the eval | T3, T5 | Wrong flags under 5% on the eval; results committed |
| T10 | `GET /api/monitor/moderation` and the monitor panel (frontend) | T7 | The panel shows today's numbers |

**Critical path:** T1 → T4 → T5 → T6 → T8 → T9. T3 needs no code and starts on day one (T2 moved to Rails).
The admin screens can also start against mocked GraphQL built from the 58 contracts, as a separate track.

## 6. "Ready for Rails" checklist (Postman, against the stub on dev)

- [ ] A1 → 202 `{ status, request_id }` in under 100 ms. The same `idempotency_key` → the same `request_id`
- [ ] A create posts its verdict to the stub in about 1–2 s (HLD §1)
- [ ] An image post is judged on the text inside the picture (HLD §6)
- [ ] A catchup burst of 500 doesn't slow live-lane verdicts
- [ ] Two rapid edits → two verdicts, each with its own `content_version`
- [ ] 500 twice → attempt 3 delivers. 400 → one attempt. Down → give-up logged after the 5-minute try
- [ ] The Bearer token is present. A wrong token → 401, not retried
- [ ] Vertex failing → `status: "error"` delivered
- [ ] A3 → 200 every time. The counters move
- [ ] No learner text left in Redis after the job, nor in Firestore or the logs (HLD §13)
- [ ] The eval pass bar is met

**When Rails arrives:**
1. Rails builds A2 to its YAML, using the Postman folders as acceptance.
2. Unset `MODERATION_CALLBACK_BASE_URL` on dev and turn off `MODERATION_RAILS_STUB`.
3. Share `MODERATION_CALLBACK_TOKEN` with Rails.
4. Rails seeds catalog v1.

## 7. Are we ready to start?

**Yes.** Nothing on this list waits on Rails or on JEV.

| Needed | State |
|---|---|
| Approved HLD | ✅ |
| Contracts A1–A3 | ✅ Written and validated |
| Fastify + `checkInternalHost`, BullMQ adapter, Instructor + flash-lite, Firestore + buffered counters, monitor panels | ✅ All exist in ai-server |
| Rails | Not needed until §6's "When Rails arrives" |
| JEV approval | Not needed. It's a slot (§8) |
| Wording for nine of the ten default rules | Rails and product (T2 moved to Rails, 2026-10-05) |
| Instructor taking an image in the same call | ✅ T1 spike: 4/4 on two runs, about 1–3 s warm |
| Model | ℹ `main` moved `INSTRUCTOR_LLM` to `gemini-3.1-flash-lite` (Gemini 2.5 retires 2026-10-16). We follow `INSTRUCTOR_LLM`, as the HLD says. FYI for the HLD owner: §11's model name is out of date |
| Repo | ✅ `feat/ai-moderation` from `origin/main`, in its own worktree. Your `feat/learner-platform-help` checkout is untouched |
| Repo rule | ✅ "code it" given 2026-10-01 |

## 8. Later: JEV, if it is approved

Not scheduled. JEV can't drop in under today's HLD, so **the HLD must change first**:

- §16: content would leave Learnyst's Vertex;
- §11: JEV returns no text, so the reason needs a second call;
- §6: JEV reads text only.

If those changes are approved:
1. Add `classifiers/jev.classifier.ts` with a short flash-lite reason step for flagged posts.
2. Compare it with Instructor on the same eval (T3's runner).
3. Switch `MODERATION_CLASSIFIER`.
4. Later, lift the interface into `src/platform/` so the intent router can use it too.

JEV facts, checked 2026-10-01:
- TypeSafe AI, early access since 2026-09-15, model `jev-1.13.0`.
- Typed `choice`, `noul` and `score` answers with probabilities. No text.
- Text only, English first.
- 70–500 ms (vendor-measured, US West Coast).
- $0.042 per million input tokens.
- Zero data retention for enterprise only.

Sources: [TypeSafe docs](https://docs.typesafe.ai/introduction) ·
[API](https://docs.typesafe.ai/api.md) · [OpenRouter](https://openrouter.ai/docs/guides/community/jev) ·
[Wavect review](https://wavect.io/blog/jev-ai-decision-model-review/) ·
[ITECS](https://itecs.ai/insights/jev-ai-agent-routing)
