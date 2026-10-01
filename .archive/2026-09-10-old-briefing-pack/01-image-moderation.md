# Image & File Moderation

Text-only moderation does not work. Here's why, and what to build.

---

## 1. The reason this matters

**The moment you filter text, people move to images.**

Someone wants to share a paid-notes Telegram link. You block `t.me` in text. They
screenshot the link and post the image. Text filter sees nothing.

This is the single most common evasion route on every platform, and in an Indian
exam-prep community it is worse than average, because the two biggest real problems
are both image-shaped:

| What actually gets posted | Why text moderation misses it |
|---|---|
| Photo of a leaked question paper | It's a photo. No text in the post at all. |
| Screenshot with a phone number / QR code / Telegram link | The link is pixels, not characters. |
| Screenshot of someone's marksheet, roll number, address | Doxxing with zero text. |
| Sexual or violent image | Nothing to read. |
| Hate symbol | Nothing to read. |

If we ship text-only, spam moves to images within weeks. Not a theory — this is what
happens everywhere.

---

## 2. Where images actually appear

Read straight from the code (`createCommunityPostInterface.ts`):

| Field | What it is | Moderate it? |
|---|---|---|
| `featuredImage` | One banner image per post | **Yes — M1** |
| `content` | HTML from the editor, can contain `<img>` tags | **Yes — M1** |
| `attachmentUrl` | An attached file — image, PDF, anything | **Yes — M1** (see §4) |
| `profilePhotoFileName` | The learner's avatar | M2 — different trigger |
| Comments / replies | Text only today | Nothing to do |

So a single post can carry **one banner + several inline images + one attachment.**

Profile photos are a real abuse route (someone sets an offensive avatar and it appears
on every post they ever made) but it needs a different trigger — on avatar upload, not
on post. That's why it's M2.

---

## 3. How to read an image — two checks, both cheap

### Check A — read the text in the image (OCR)

Extract every word from the image, then run that text through **the same text
classifier we already built**. No new classifier needed.

This alone catches most of the real problems: the phone number, the Telegram link, the
QR code caption, the visible header on a leaked paper, the name and roll number on a
screenshotted marksheet.

**We already have this.** `src/shared/services/imageCaption.service.ts` in
proximity is an OCR service using Gemini Flash-Lite, with a strict
"extract every character" prompt. It was built for lesson ingestion.

⚠️ **But it must NOT be reused unchanged. See §3b — this is the most important
finding in this doc.**

### Check B — look at the image (visual)

A second Gemini call that asks, in plain terms: is this sexual, violent, a hate symbol,
a photo of an exam paper, or a screenshot showing someone's personal details?

OCR cannot answer any of those. This is the other half.

### Why both

```
Image posted
    │
    ├─→ Check A: OCR  →  text  →  the existing text classifier
    │                             (catches: spam links, phone numbers,
    │                              doxxing text, leaked-paper headers)
    │
    └─→ Check B: visual classify
                                  (catches: sexual, violence, hate symbols,
                                   exam-paper photos, screenshot-of-private-data)
    │
    └─→ worst result of the two wins
```

Run them in parallel. Take whichever is more severe.

---

## 3b. ⚠️ The trap: our OCR service fails **open**, and that is backwards here

**This is the finding to raise in your review. It is a genuine safety hole, and it is
not obvious.**

Gemini has its own safety filter. Send it a sexual or abusive image and it will often
**refuse to describe it** — that is the model behaving correctly.

But look at what our OCR service does with that refusal:

```ts
// imageCaption.service.ts — the last line of captionImage()
return text.trim();
```

There is **no check** for a safety block, a non-STOP finish reason, or an empty
response. So:

```
someone posts an abusive image
        ↓
Gemini refuses to describe it   ← the model working correctly
        ↓
captionImage() returns ""       ← the refusal becomes an empty string
        ↓
text classifier reads ""        ← nothing to flag
        ↓
verdict: CLEAN                  ← the worst possible outcome
```

**The image most likely to be refused is exactly the image we most need to catch.**

Same shape for oversized files: the service returns the literal string
`"Image too large to process"` instead of throwing, and the batch path falls back to the
image's alt text. Both quietly become "nothing bad here".

### Why this matters more than it looks

Our fail-open rule (`00-mental-model.md` §4) says: *if the AI breaks, the post stays
visible.* That rule is about **the service being down**, and it's correct — a moderation
outage shouldn't break posting.

This is a different thing. This is **a confident "clean" verdict produced by a failure**.
Nobody is alerted, no case opens, and the post is marked as checked. That is worse than
being down, because being down is visible.

### The fix — small, but non-negotiable

Do not call `captionImage()` from the moderation path. Wrap it:

| Situation | What the wrapper must do |
|---|---|
| Gemini returns a safety block or non-STOP finish reason | **Treat as a strong signal, not as clean.** Route to the human queue. |
| Empty or whitespace-only response | Treat as *unknown*, never as clean |
| `"Image too large to process"` | Treat as *unknown*, queue for a human |
| Any error or timeout | Treat as *unknown*, queue for a human |

**One rule:** in moderation, an image we could not read is *unknown*, never *clean*.
Unknown goes to a person.

The repo already knows this failure mode elsewhere — `imageGeneration.service.ts` logs
*"no predictions returned — likely safety filter"*, and the logo path handles *"a
response with no image part — safety filter, or a finishReason other than STOP"*. The
OCR service simply never needed to care. For moderation, it does.

---

## 4. Attachments are not always images

An `attachmentUrl` can be a PDF, a zip, a docx. **A PDF of a leaked paper is the
single highest-value thing to catch in an exam-prep community**, and it isn't an image.

| File type | What to do | Reuse |
|---|---|---|
| Image (jpg/png/webp/gif) | Checks A + B | `imageCaption.service.ts` |
| **PDF** | Extract text, then the text classifier | **`pdf-processor` in learnyst-services already does this** |
| docx / zip / anything else | Don't scan in M1. Log that it exists. | — |

We already run `pdf-processor` for lesson ingestion. Pointing it at a community
attachment is the same call we already make.

⚠️ **But it is not a call that returns an answer.** Verified against
`shared/services/learnystServicesApi.client.ts`: `postParse()` takes a
`ParseRequestPayload` that **requires `callback_url`, `callback_auth` and
`result_gcs_uri`**, and the client is a fire-and-forget `postJson` with a 15-second
timeout. It is an async enqueue with a webhook reply, exactly like the deepgram path.

So a PDF attachment costs us three things the earlier draft of this doc didn't name:

| | |
|---|---|
| A new webhook route | to receive the extraction result — the module already has `pipeline/webhook/` as the pattern |
| A results bucket | `result_gcs_uri` must start with `gs://` and pass the service's bucket allowlist. Output side only |
| Backpressure handling | the gateway can answer 429; the job has to retry rather than drop |

None of that is hard. It is just not "one more call".

Do not try to scan zips in M1. Low value, real security surface (zip bombs, path
traversal), and `pdf-processor`'s own docs list those as handled problems for a reason.

---

## 5. Reaching the files — smaller than I first thought

*Corrected after an audit against the repos. My first draft overstated this.*

Our OCR service reads Google Cloud Storage — `getFileBytesFromGcsUri()`, which takes a
`gs://bucket/path` address.

**What `featuredImage` and `attachmentUrl` actually are:** absolute **HTTPS URLs**, not
path strings. They're produced client-side by stripping the query off a pre-signed
upload URL, and used verbatim as `<img src>` / `<a href>`. There is no path-to-URL
resolution anywhere in bodhi. (The CDN hosts I first listed were a red herring —
`THUMBNAIL_CDN_BASE_URL` is unused dead code, `CDN_BASE_URL` is player/DRM only.)

So this splits into two problems, and only one is a Rails ask.

### PDFs — no ask needed

`pdf-processor` already accepts `source_url` as an alternative to `gcs_uri`, and has a
working HTTPS streaming downloader (`_download_from_url`, httpx, follows redirects).
Proximity's own client type exposes both.

**PDF attachments work over HTTPS today. No Rails change.**

One caveat: `result_gcs_uri` must still start with `gs://` and pass the service's bucket
allowlist — so we need a results bucket, on the output side only.

### Images — a small ask, or a small piece of code

| Option | What Rails does | Our effort | The catch |
|---|---|---|---|
| **A** | Send `gs://` URIs in the submit | Zero — the service works as-is | Needs a per-bucket read grant for our service account under Workload Identity. That's an infra ticket, not free. |
| **B** | Nothing — we use the HTTPS URLs already in the payload | Add an HTTPS fetch path + SSRF guarding | We own more code |

**Corrected recommendation: B, unless Rails offers A cheaply.**

I originally called A "zero effort". It isn't — GCS access is granted per bucket, per
service account, so it's a cross-team infra dependency. Meanwhile the URLs are *already
in the payload*, `pdf-processor` proves the HTTPS-download pattern works in our stack,
and `learnyst-services` already ships a `url_validator.py` (DNS resolution, private-IP
blocking) we can copy for the SSRF guarding.

**So images are not a blocker either** — it's a small piece of code on our side. Ask
Rails for `gs://` as a nice-to-have; don't wait on it.

---

## 6. Limits — reuse the ones we already set

The OCR service already has sensible caps. Don't invent new ones.

| Limit | Value | Where it's from |
|---|---|---|
| Max image size | 20 MB | existing service |
| Timeout per image | 30 s | existing service |
| Max images per job | 50 | existing service |
| Concurrent images | 5 | existing service |

---

## 7. What this costs us

**Latency goes up. Cost barely moves.**

| Post type | Time to verdict | AI calls |
|---|---|---|
| Text only | ~1.4 s | 1 |
| Text + 1 banner image | ~4 s | 3 (text + OCR + visual) |
| Text + banner + 3 inline | ~8 s | 9 |
| Text + PDF attachment | minutes, not seconds | 1 + an async `pdf-processor` job |

Slower, and it does not matter — **the post is already live**. Nobody is waiting.

The PDF row is the one to say carefully. It is **not a 15-second request** — it is a job
handed to another service's queue that answers on a webhook whenever it is done. The
15 seconds is only our enqueue timeout. Quote it as *"a PDF verdict arrives later, and
that's fine, because the post being up is not conditional on it."*

On cost: at 50 posts a day, even if every single one had four images, this is a
rounding error. Images cost more per call than text, and the volume is too small for it
to show up. Say this plainly if asked; it pre-empts the whole objection.

---

## 8. What breaks in the UI (a real gap)

Neither my UI artifact nor the senior developer's covers image cases. Both only draw
text. This needs fixing before implementation:

| Screen | What's missing |
|---|---|
| Queue row | A thumbnail. An admin cannot triage an image case from a text snippet. |
| Case detail | Show the actual image. Show what the OCR read. Show which check fired — OCR or visual. |
| Restricted case | An image in a child-safety case must **never** render inline, not even for permitted admins, without an explicit "reveal" click. |
| Author notice | "Your image was hidden" reads differently from "your post was hidden". |
| **Marker for everyone else** | Rows 32–34 apply to image posts too. A removed image post leaves the same attributed marker as a text one — and it must not leak a thumbnail. In the sensitive categories (row 35) it leaves nothing at all. |

The restricted-case one is not a nicety. An admin should not have a sexual-abuse image
auto-rendering on their screen in an open-plan office. It needs a click-to-reveal.

---

## 9. Recommendation for Milestone 1

| Surface | In M1? | Why |
|---|---|---|
| `featuredImage` | ✅ Yes | Highest-traffic image slot |
| Inline images in `content` | ✅ Yes | Same code path, no extra cost |
| Image attachments | ✅ Yes | Same code path |
| PDF attachments | ✅ Yes | `pdf-processor` already exists; leaked papers are the top local risk |
| Other file types | ❌ Log only | Low value, real security surface |
| Profile photos | ❌ M2 | Different trigger, needs its own submit |
| Video | ❌ Not planned | We have no video moderation capability and shouldn't pretend to |

**One line for your seniors:** *"Text-only moderation gets evaded by screenshots in
weeks. We already own the OCR service and the PDF extractor, so image and PDF checking
is mostly wiring, not new capability — the only new thing we need is for Rails to hand
us the file addresses."*
