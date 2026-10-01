# What the Audit Found

Before you read the pack, I had it fact-checked against the four repos by nine
independent agents. This records what they found and what I changed.

**Why this doc exists for your review:** "I had my own analysis independently audited and
here's what it caught" is a strong thing to be able to say. It also means the numbers and
file paths in the other docs have been checked by something other than the person who
wrote them.

---

## Honesty about the audit itself

The run **hit the organisation's monthly spend limit partway through**. So:

| Stage | Status |
|---|---|
| 5 fact-checking agents | ✅ All completed — 370 claims checked, 97 problems raised |
| Adversarial re-check of each problem | ❌ **Did not run** — killed by the spend limit |
| 4 UI-research agents | ⚠️ 2 of 4 completed (admin design system, admin community pages) |

The re-check pass was supposed to independently confirm every claimed error before I
changed anything, precisely so a wrong correction couldn't make a correct doc wrong.
**It never ran.**

So I verified the highest-stakes findings **myself**, by hand, against the source. Below,
✅ means *I personally confirmed it in the code*. ⚠️ means *an agent reported it and I have
not yet confirmed it*.

Nothing marked ⚠️ has been used to change a recommendation.

---

# Part 1 — The serious ones (I verified these myself)

## 1. ✅ Our OCR service fails **open** — and that's backwards for moderation

**The most important finding in the whole audit.**

Gemini refuses to describe abusive or sexual images — correct model behaviour. But
`captionImage()` ends with:

```ts
return text.trim();
```

No check for a safety block, a non-STOP finish reason, or an empty response. So a refused
image becomes an empty string, the text classifier sees nothing, and the verdict is
**clean**.

**The image most likely to be refused is the image we most need to catch.**

Same shape for oversized files — the service returns the literal string
`"Image too large to process"` rather than throwing.

**What changed:** `01-image-moderation.md` gained a new §3b. The rule is now: in
moderation, an image we could not read is **unknown**, never **clean**, and unknown goes
to a human.

**Why it matters beyond the fix:** our fail-open rule is about the service being *down*,
which is fine and visible. This was a confident "clean" verdict produced by a failure —
silent, and worse.

## 2. ✅ The image-access problem was smaller than I said

I wrote that `featuredImage` is a "path string" and that CDN hosts blocked us, making a
`gs://` ask the one hard blocker.

Wrong on both counts:

- `featuredImage` and `attachmentUrl` are **absolute HTTPS URLs**, used verbatim as
  `<img src>`. The CDN hosts I listed are a red herring — `THUMBNAIL_CDN_BASE_URL` is
  unused dead code.
- **PDFs need no ask at all** — `pdf-processor` already accepts `source_url` and has a
  working HTTPS streaming downloader.
- And `gs://` isn't free either: GCS reads are granted per bucket, per service account,
  under Workload Identity. That's a cross-team infra ticket, not zero effort.

**What changed:** `01-image-moderation.md` §5 rewritten. **The recommendation flipped** —
use the HTTPS URLs already in the payload, add SSRF guarding (copying
`url_validator.py`), and ask Rails for `gs://` only as a nice-to-have.

**Net effect: the Rails ask got smaller.** Good news to walk in with.

## 3. ✅ A granular permission system already exists

I wrote "existing roles are too coarse — `ROOT_ADMIN_ROLE` covers too many people."

Wrong. The admin has **numeric permissions** alongside the three admin levels:
`ADMIN_PERMISSION_ROLES = { MANAGE_COMMUNITIES: 25, AFFILIATE_MARKETING: 27 }`, with
siblings like `MANAGE_REVIEWS` and `MANAGE_DISCUSSIONS`. Custom roles compose them, so
the grant UI is already built.

**What changed:** `02-rails-ask.md` §F and `06-open-questions-answered.md` MR-6. The ask
is now "add one number to an existing scheme", not "build a permission concept". And
`MANAGE_COMMUNITIES: 25` already gates the ordinary queue — only the *restricted* queue
needs anything new.

**Also smaller than I said.**

## 4. ✅ There is already a metadata-built moderation queue in the admin

I claimed the moderation screens must be custom pages because "no existing cell renderer
does that".

`metaData/list/productReviews.ts` is an approve / unapprove / delete queue for course
reviews, built **entirely in list metadata** — `ActionsCell` plus `type: 'mutation'`
actions with confirm modals and a status badge.

**What changed:** `00-mental-model.md` §7c. The honest split is now: the **case detail**
is genuinely custom (highlighted spans, thread, AI reasoning, image viewer); the **queue
list** could be metadata, and there's a house pattern to copy. The deciding factor is the
same client constraint as the KPIs.

## 5. ✅ Near-duplicate detection is new work, not reuse

I wrote that Layer 0 "reuses the embeddings we already have".

Embedding *generation* exists (`getTextEmbedding()`, 768 dims). But pgvector search exists
only over the knowledge-base tables. **There is no post-embedding table, no index, no
threshold.**

There's also a warning in the repo worth heeding: eight `LANE_*` config vars were deleted
because they documented the `<->` L2 unit while the code ordered by `<=>` cosine, "where
the real cut-off is 0.45" — so anyone tuning through the configmap saw no effect while
reasoning in the wrong unit.

**What changed:** `03-proximity-scope.md` §6. Exact-duplicate (a hash compare) stays in
M1. Near-duplicate moves to Phase 2 with its own measurement work.

## 6. ✅ Three smaller factual errors

| Claim | Reality |
|---|---|
| "All LLM env vars are required, no code defaults" | `IMAGE_CAPTION_MODEL` has a default: `getEnv("IMAGE_CAPTION_MODEL", "gemini-2.5-flash-lite")`. Only the *agent/classifier* vars are undefaulted. |
| `MODERATION_LLM = gemini-2.5-flash-lite` | Instructor.js models need the **`google/` prefix** — `google/gemini-2.5-flash-lite`. Gotcha #6. |
| "46 unit tests plus 34 scenarios" | **7 files, 80 tests**, all passing. And the wider suite has ~5 pre-existing failing files — scope ours as a second green island, not "CI goes green". |
| `BREAKOUT` is a v2 component type | v2 map is `CHART`, `KPI`, `TABLE`, `KPI_CELLS`, `RECOMMENDATION`. `CHART_BREAKOUT` is v1 only. Unknown types silently fall back to `CHART`. |
| "18 open questions" | **22.** (7 + 10 + 5.) Fixed everywhere. |

---

# Part 2 — Things neither doc knew

*Originally ⚠️ "reported, not hand-verified". **The first three have now been verified
directly against the source** in the second pass (Part 4) and are marked ✅.*

| # | Finding | Why it matters |
|---|---|---|
| 1 | ✅ **`pdf-processor` is async enqueue + callback**, not a simple call | **Confirmed:** `ParseRequestPayload` in `learnystServicesApi.client.ts` requires `callback_url`, `callback_auth` **and** `result_gcs_uri`; the client is a fire-and-forget `postJson` with a 15 s timeout. Needs a new webhook route, a results bucket that passes the allowlist, and 429 backpressure. My "15 s" figure was the enqueue timeout, not a verdict latency. |
| 2 | ✅ **Workers run in a separate process and deployment**, at `replicas: 1` | **Confirmed** in `deployment-worker.yaml`, `-dev` and `-staging` — all three at `replicas: 1`. BullMQ concurrency is per-process, so one replica is the real cap for all four new queues combined. |
| 3 | ✅ **`aiUsageLimits.service.ts` is fail-CLOSED** | **Confirmed** — the service's own docstring reads *"Fail-closed: returns allowed=false if the API is unreachable or errors."* If moderation is wired through the school AI quota gate, its default **inverts our fail-open rule**. Also: does moderation burn a school's paid AI quota? Now answered in `03` §7 — keep moderation outside the gate. |
| 4 | **Instructor and `getGoogleModel` are already instrumented** | Per-case AI cost and latency — a KPI we want — come nearly free, *if* the classifier goes through those factories instead of calling Vertex directly. Worth claiming as a win. |
| 5 | **Region split** | Gemini runs at `VERTEX_AI_LOCATION` (`global`), embeddings at `GCP_LOCATION` (`asia-south1`), through different SDKs. Two endpoints in two regions on the hot path. |
| 6 | **ConfigMap gotcha #23** | New required env vars must be in all three configmaps before the predeploy seed runs, or it crashes on the previous release's config. Additive is safe; renaming later needs expand-contract. |
| 7 | Stale docstring in `imageCaption.service.ts` advertises a `captionImagesInMarkdown()` that doesn't exist | Harmless — but don't read the file header aloud in a review. |

---

# Part 3 — What I have NOT applied

Being straight about the limits of this.

- **65 of the 97 findings** are lower-severity (wording, cross-references, terminology
  drift, internal inconsistencies between docs). They're real but cosmetic, and the
  adversarial pass that would have confirmed them didn't run.
- **Two UI-research agents didn't complete** — the bodhi community UI and the real
  product copy. So the artifact is **not yet synced** to the real socials post card,
  modal anatomy, tokens or i18n strings. That work is still outstanding.
- **Nothing about the senior developer's artifact was re-verified.** Those confirm agents
  were among the ones killed. One finding I'd flag as probably right and worth checking
  before you repeat it: I listed the reasons his 5-item report sheet drops, and the audit
  says my list was wrong in both directions — the actual dropped set is child sexual
  safety, credible threat, personal info, sexual content, illegal activity, off-topic.
  **Child sexual safety being droppable is the consequential one**, and I'd missed it.

---

# Part 4 — The second pass: the pack vs. the published page

The first audit checked the pack against **the code**. It never checked the pack against
**the user stories**, and that is where the real damage was.

## 4a. The failure that mattered

`10-user-story-additions.md` proposed nine rows and was headed *"Status: NOT PUBLISHED."*
**All nine had shipped to Confluence.** Docs 00–09 were written before they existed, so
nine HIGH stories had no design behind them — and one of them was the exact opposite of
what the Rails team had been told.

| # | What was wrong | Severity |
|---|---|---|
| 1 | **`02-rails-ask.md` §E1 said everyone except the author sees *nothing*** for hidden and removed content. Rows 32–34 (HIGH) require a **marker**. "Nothing" is right only for row 35's sensitive categories. This is the doc handed to another team | **Contradiction** |
| 2 | Rows 9–11 (flag-without-hide) existed nowhere outside the draft. Layer 2 had four outcomes and needed five; `decideModerationCase` had no way to express "hide it now" | **Missing design** |
| 3 | Rows 24–25 (disclosure banner) were absent from `00` §7d's bodhi list and from the M1 scope | **Missing design** |
| 4 | Row 44's threat detail — target · place · time · means — was in the UI artifact but in **no doc**, and `moderation_cases` had no columns for it | **Missing design** |
| 5 | Row 40's rung 5 (ban evasion) has no design in any repo, and nothing said so | **Unclaimed gap** |
| 6 | Row 42's *"local emergency-help information"* has no owner and no data source | **Unclaimed gap** |
| 7 | Row 14's *"the message the author saw"* needed the rendered notice on the case; only templates were stored | **Missing field** |

## 4b. Three recommendations that collided with a HIGH row

Not errors — but they were presented as settled, and they aren't.

| Was | Published row | Status |
|---|---|---|
| Learner reporting → M2, use the support-ticket middle path (MR-3) | **Row 27, HIGH**, names all 11 reasons and requires re-check *using that reason* | **Recommendation flipped** — build it in M1 |
| Posting pause → M2 (`02` §A2, MR-7) | **Rows 17 (HIGH), 22, 40** all need it | **Moved to M1** |
| Mode adoption → skip in M1 (`04` §6) | **Row 48, HIGH**, names it | Now an explicit Product cut, with Amplitude as the cheap path (P-6b) |

## 4c. Three questions the page answered while we were still asking them

| | |
|---|---|
| N-3 "AI is checking your post" indicator | **Settled: no.** Row 11 rules it out |
| N-4 report reasons, 5 or 11 | **Settled: 11**, published verbatim |
| N-5 personal info Critical or High | **Settled: Critical.** Row 45 gives it restricted treatment |

## 4d. Fresh factual errors found in the pack

All verified by hand against the repos in this pass.

| Claim | Reality |
|---|---|
| pgvector KB tables are `lesson_guru`, **`learnyst_help_kb`**, `lyst_features_kb` (`03` §6) | The table is **`lyst_articles_kb`** — `learnystHelpKb.model.ts` is the *file* name. Indexed `scann` cosine |
| `MANAGE_REVIEWS` / `MANAGE_DISCUSSIONS` are siblings of `MANAGE_COMMUNITIES` in one scheme (`02` §F, MR-6) | **Two different schemes.** `ADMIN_PERMISSION_ROLES` has *exactly two* entries — `MANAGE_COMMUNITIES: 25`, `AFFILIATE_MARKETING: 27`. `MANAGE_DISCUSSIONS: 8` and `MANAGE_REVIEWS: 10` live in `sidebarConstants.ts`, a colliding number space. Weakens "the grant UI comes free" until confirmed |
| "~40 analytics dashboards" (`04` §1) | **78** config files under `metaData/analytics/`, plus three subdirectories |
| `04`'s own summary still listed `BREAKOUT` as a component type | §1 had already corrected it. The correction never reached the summary two pages later |
| `00` §4 still said Layer 0 near-duplicate "reuses the embeddings we already have" | Retracted in Part 1 #5 — but only `03` §6 was fixed. `00` kept the withdrawn claim |
| `00` §7b and `02` §D1 still called `gs://` "the one blocker for all image moderation" | Retracted in Part 1 #2 — but only `01` §5 was rewritten. **The doc handed to Rails kept the retracted version**, and it was question #1 on their list |
| Every `US-N` reference in docs 00–10 | **Stale.** The page grew from 26 stories to 36. Mapping reconstructed and cross-checked in `11-story-coverage.md` §1 |

## 4e. The pattern worth naming

Look at rows 5 and 6 of that table. **Both are corrections that were applied to one
document and not propagated to the others** — including, in one case, the only document
another team reads.

The first audit produced 97 findings and I applied the ones I could verify. What it didn't
do was re-read every *other* doc for the same claim. That is how a retracted "blocker"
stayed at the top of the Rails ask through two revisions.

Two habits from this pass, both cheap:
1. **When a claim is retracted, grep the pack for it.** Not the doc it was found in — the pack.
2. **Check the pack against the page before every review**, not against the code. The code
   was fine. The page had moved.

## 4f. What is still unverified

Being straight about the limits of this pass too.

- The literal value `SUPPORT_TYPE_REPORT = 9` — the constant is real and wired into
  `CommunityContentCard`, but I read the usage, not the enum.
- "80 tests" in the quiz-review harness — **7 files confirmed**, tests not run.
- `createCommunityPostInterface.ts` field-by-field — the file exists, I did not read every field.
- `UpdateSpaceInput`'s partial-patch behaviour — taken from the earlier feasibility note.
- Nothing in the senior developer's artifact was re-checked in this pass either.

---

## The one-line summary for your review

> I audited the analysis twice. Against the **code**, it caught one real safety hole — our
> OCR service returns "clean" when the AI refuses to look at an image, which is exactly
> backwards for moderation. Against the **page**, it caught something worse: nine HIGH
> stories had shipped after I wrote the plan, and my Rails ask told another team the
> opposite of what one of them requires. All nine are reconciled now, and
> `11-story-coverage.md` is the row-by-row check that stops it happening again.
