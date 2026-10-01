# §10 The contract

> Source: HLD §10.

Three calls. Inbound guarded by `checkInternalHost`, outbound by a service token.

## Submit — `POST /api/moderation/check`

Fastify, `preValidation: [fastify.checkInternalHost]`, JSON schema on the body. Same pattern as
`lesson-ingest.route.ts`.

| Field | |
|---|---|
| `idempotency_key` | `{school_id}:{content_type}:{content_id}:{content_version}`. A resubmit of the same key returns the same `request_id` instead of queueing a second job |
| `trigger` | `create` / `edit` / `catchup`. This picks the lane — Rails states what happened, not how fast it wants an answer |
| `school_id` | Which academy |
| `content_area` | `product_discussions` / `community` / `feeds` / `newsfeed` — the four places a learner can write. This is what the academy configures |
| `product_type` | `course` / `batch` / `bundle` / `mock_test` / `test_series` / `ebook` / `webinar` / `free_resource` / `podcast` / `custom` — carried for reporting only |
| `product_id` | Which product the content sits in. Context only — Rails has already resolved the rules |
| `content_type` | `post` / `comment` |
| `content_id`, `content_version` | What is being checked, and which version. `content_version` is a counter Rails bumps whenever the moderated fields change — echoed on the callback so a verdict for text that has since been edited can be dropped |
| `title`, `body` | The text. Optional when checking an image |
| `image_url` | An already-uploaded image. Optional. One of body or image required |
| `school_context` | A line or two describing the academy — type, audience, rough age, tone |
| `context` | The last few posts in the thread, so a pitch split across messages is caught |
| `rules[]` | `{ id, name, description }` — the effective rules after exceptions have been applied |
| `examples[]` | Optional — this academy's past decisions: `{ text, rule_id, verdict }` |

**Always `202 Accepted`:**

```json
{ "status": "accepted", "request_id": "b6f1…" }
```

No verdict on this response, ever, for any trigger. There is **no mode field** and **no `callback_url` field** — one
behaviour, and the callback address is ai-server's own configuration.

## Callback — `POST {RAILS_INTERNAL_URL}/internal/v1/moderation/result`

| Field | |
|---|---|
| `request_id` | The id from the 202. Rails deduplicates on it |
| `school_id`, `content_type`, `content_id`, `content_version`, `trigger` | Echoed back exactly as sent |
| `status` | `ok` / `error` — lets Rails tell "clean" from "couldn't check" |
| `breaks_rule` | `true` / `false` |
| `rule_id` | Which rule, `null` when clean. Must be one Rails sent. If more than one is broken, the most severe — Block over Hold over Report over Guidance |
| `reason` | One or two sentences, for the admin queue only |
| `confidence` | `low` / `medium` / `high` |
| `model`, `latency_ms` | ai-server monitoring |

Rails answers **200** to stop the retries. Delivery is **at-least-once**, so Rails deduplicates on `request_id`.

| Attempt | After |
|---|---|
| 1 | immediately |
| 2 | 10s |
| 3 | 60s |
| 4 | 5 min |
| then | give up, log, leave it to Rails' deadline |

Retry on 5xx and network errors only. A 4xx is a contract bug.

**Two rapid edits produce two in-flight jobs.** Nothing serialises them, so each verdict carries the
`content_version` it judged and Rails drops any verdict for a version that is no longer current.

**ai-server classifies, Rails enforces.** ai-server is never told the rule's action, the moderation mode, or the
content review mode. It returns which rule broke and why.

> ⚠ "The most severe — Block over Hold over Report over Guidance" is ranked by the rule's action, which ai-server
> is never told (`rules[]` carries `{ id, name, description }`). See [`../open-items.md`](../open-items.md) C7.

## Outcome — `POST /api/moderation/outcome`

Rails tells ai-server what a person decided, so the quality counters in [§15](15-measuring-quality.md) mean
something.

| Field | |
|---|---|
| `request_id` | The check this outcome belongs to |
| `school_id` | Which academy |
| `outcome` | `approved` / `removed` / `restored` |
| `decided_at` | When |

Same `checkInternalHost` guard as the submit. **Fire and forget** — if this call fails, a statistic is lost and
nothing else. It must never be able to block or undo a decision Rails has already made.

## Not built in v1

`GET /api/moderation/check/{request_id}`. The callback plus Rails' deadlines cover every case.
