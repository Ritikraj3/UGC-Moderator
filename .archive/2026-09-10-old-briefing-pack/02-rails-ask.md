# What I Need From Rails

Hand this list to the Rails team. Nothing here is optional for Milestone 1 unless marked.

**The principle:** Rails stays thin. It owns whether a post is visible, and nothing
else. No AI, no case records, no queue, no thresholds. If a request below feels like it
belongs in Proximity, it probably does — push back.

---

## A. Database fields — 2 new fields

### A1. `moderation_state` — on community posts and comments

```
moderation_state: visible | flagged_visible | hidden | removed
```

**Four states, not three.** `flagged_visible` was added after user-story rows 9–11
shipped: content the AI is unsure about is queued for a human but **stays up**. To
everyone — including the author — it looks exactly like `visible`. The state exists so
that (a) the admin's queue can find it and (b) an admin can later hide it with one click
without re-screening.

**Do NOT reuse the existing `status` field.** Two reasons:

1. `status` is the author's own choice (published / unpublished). If moderation writes
   into it, "restore" cannot put the post back to what the author wanted.
2. The message shown to the learner is different. "You unpublished this" and "We hid
   this while we check it" are not the same thing, and one field cannot say both.

Applies to: community post table, and the discussion/comment table.

### A2. `posting_paused_until` — on community membership

A timestamp. While it's in the future, the learner can read but cannot post or comment.
Enforced in the create-post and create-comment mutations.

⚠️ **This moved from M2 to M1.** The earlier version of this doc marked it "M2 if the
team is tight". It can't be — **three published stories need it, and one is HIGH:**

| Row | Priority | What it says |
|---|---|---|
| 17 | **HIGH** | "temporarily stop someone from posting" — one of the admin's three core sanctions |
| 22 | MEDIUM | "choose how long a posting pause lasts" — a settings field for a thing that must exist |
| 40 | **HIGH** | the ledger ladder: rung 3 "maybe a short posting pause", rung 4 "maybe a temporary posting block" |

Without it, row 17 ships with two of its three verbs and the escalation ladder has a
hole in the middle. If the team genuinely cannot take it, that is a **product decision to
cut a HIGH story**, not a scoping detail — say so out loud.

That's the whole schema change. Two fields.

---

## B. Mutations Proximity will call

Server-to-server, over the internal API. We already have the transport
(`railsGraphQL` in proximity) — you just need the mutations.

| # | Mutation | Status today | Notes |
|---|---|---|---|
| B0 | `moderationFlagContent(contentType, contentId, caseId)` | ❌ New | Sets `moderation_state = flagged_visible`. **Changes nothing a user can see** — it exists so an admin can later hide it in one step, and so the read path knows a case is open. Rows 9–11 |
| B1 | `moderationHideContent(contentType, contentId, caseId, reason)` | ❌ New | Sets `moderation_state = hidden`. Called both by Layer 2 and by an admin acting on a `flagged_visible` item (row 10) |
| B2 | `moderationRestoreContent(contentType, contentId)` | ❌ New | Back to `visible` |
| B3 | `moderationRemoveContent(contentType, contentId)` | ❌ New | Sets `removed`. **Soft state, not a hard delete** — an appeal can restore it |
| B4 | `moderationPausePosting(userId, communityId, until)` | ❌ New | M2 if needed |
| B5 | `banCommunityMember(userId, status, communityId, schoolId)` | ✅ **Exists** | `IS_PERMITTED` / `IS_BANNED` |
| B6 | `removeCommunityMember(userId, schoolId, communityId)` | ✅ **Exists** | |
| B7 | Deliver an author notice | ❓ Ask | See §E3 — depends what notification channel exists |

**Important on B3:** removal must not hard-delete the row. The learner can ask for one
review, and the audit trail has to survive. Removed means invisible, not gone.

**Also on B3 — we must tell you *who* removed it.** The marker's wording depends on it
(§E1b): AI-removed and admin-removed read differently, and "AI hid it, an admin removed
it" counts as admin. So `moderationRemoveContent` takes an `actor: AI | ADMIN` and a
`category_is_sensitive: Boolean` — the second decides whether a marker renders at all.

---

## C. What Rails must send us

Rails fires these. **Fire-and-forget — never wait for our response, never block the
user's action.** If we're down, the post just stays up.

| # | When | Endpoint |
|---|---|---|
| C1 | Post created or edited; comment created or edited | `POST /api/moderation/content` |
| C2 | A learner reports something | `POST /api/moderation/report` |
| C3 | Author or admin deletes the content | `DELETE /api/moderation/content` — closes our open case |
| C4 | Profile photo changed | `POST /api/moderation/content` — **M2** |

Auth: none needed. These endpoints are guarded by internal-host check, same as the
existing `ai-ingest` endpoints. No token to manage.

### C1 payload — send everything, so we never have to call back

This is the part worth getting right. If the payload is complete, we do zero
round-trips, which is why the check is fast.

```
school_id, community_id, space_id
content_type          post | comment
content_id, revision  (revision so an edit makes a new case)
author_id, author_role, author_joined_at
title
body_html
featured_image_gcs_uri        ← see §D1
inline_image_gcs_uris[]       ← see §D1
attachment_gcs_uri + mime_type
parent_content_id + parent_body   (thread context, for comments)
created_at
```

Why `revision`: if a learner posts something clean and then edits it to something bad,
we need a new case, not an update to the old one. And the audit trail must show both.

---

## D. What Rails must give us access to

### D1. File addresses as `gs://` URIs — **nice to have, not a blocker**

*Corrected. An earlier version of this doc called this "the one real blocker" and said
`featuredImage` "comes back as a path string" over a CDN. Both were wrong, and the
correction makes your job smaller — so it's worth saying plainly.*

What they actually are: `featuredImage` and `attachmentUrl` are **absolute HTTPS URLs**,
already in the payload, used verbatim as `<img src>` / `<a href>`.

| | |
|---|---|
| **PDFs** | Work over HTTPS **today**. `pdf-processor` already accepts `source_url` alongside `gcs_uri`. **No Rails change at all.** |
| **Images** | Our OCR service reads GCS only, so we add an HTTPS fetch path with SSRF guarding on our side. `learnyst-services` already ships a `url_validator.py` we can copy. |

**Ask, downgraded:** if `gs://bucket/path` is cheap for you, send it in the C1 payload and
we skip writing that code. If it isn't, don't spend time on it — GCS reads are granted per
bucket per service account under Workload Identity, so it's a cross-team infra ticket
rather than a free win.

**Either way, image moderation is not blocked on you.**

Full reasoning in `01-image-moderation.md` §5.

### D2. A reach signal — **open question**

We route partly on "how many people have already seen this". A post seen by 400 people
is more urgent than one seen by 4.

**Ask:** does Rails track a view or impression count on community posts?

- If yes → send it in C1.
- If no → we approximate with space member count × post age. Works, less accurate.
  **Tell us which**, so we stop guessing.

### D3. The admin role / permission model

We need to know how permissions are structured today so the new one in §F fits in
rather than being bolted on.

---

## E. Rendering behaviour Rails must implement

This is the largest chunk of Rails work, and it's unavoidable — it's the read path.

### E1. Respect `moderation_state` on every read

⚠️ **This section was wrong and has been rewritten. Please re-read it even if you saw
the earlier version.** It previously said everyone except the author sees **nothing** for
hidden and removed content. Published story rows 32, 33 and 34 — all HIGH — require the
opposite: a **marker** stays in place so the conversation still reads correctly. "Nothing"
is right for exactly one case, row 35.

| State | Author sees | Everyone else sees | Admin sees |
|---|---|---|---|
| `visible` | it | it | it |
| `flagged_visible` | it, unchanged — **no notice** | it, unchanged | it, plus the case |
| `hidden` | it, plus a notice | **`Under review`** — nothing else | it |
| `removed` | notice + one review option | **an attributed marker** — see E1b | it |
| `removed`, sensitive category | notice | **nothing at all** — no marker, no gap filler | permitted admins only |

Every list, feed, detail, search and count.

**On `flagged_visible`: do nothing.** No badge, no "being checked" bar, no change of any
kind. Row 11 is explicit that the learner hears from moderation only when content
actually moves or a person decides. A flag is not an accusation and must not look like
one.

### E1b. The marker — what it says and what it must never say

This is new Rails render-layer work and it is the largest single item on this page.

**Attribution scales with finality.** Hidden is a pause; removed is a verdict. The marker
says more as the decision becomes more final.

| Situation | The marker reads |
|---|---|
| Hidden reply | `Under review` — no actor, no reason, no blame |
| Removed by AI | `Removed automatically by <assistant name>` + *"I am a bot and this action was performed automatically. Contact your school's moderators if you think this is wrong."* |
| Removed by an admin | `Removed by a moderator for breaking the community rules.` + a link to the rules |
| AI hid it, an admin then removed it | `a moderator` — a human made the decision, so a human is named |
| Any sensitive category | nothing renders at all |

**In every case the marker must omit:**
- the author's name
- the author's profile picture
- the reason or category

Only the author gets the reason. Everyone else needs the thread to make sense, nothing
more. Row 32 says this in as many words.

**Shape, by content type:**

| | |
|---|---|
| A removed **reply** | the marker **stays in the thread**, in position, so replies underneath still read correctly |
| A removed **post** | drops out of the feed, but the marker still renders **on its own detail page**, so people who commented aren't left with a dead link |

**`<assistant name>`** comes from `aiGuruSchoolProfile.aiAvatarName` — the school's
existing AI identity. Note it can be empty and the config is cached for a day, so the
render needs a fallback and a rename won't appear immediately.

### E1c. Counts — this now cuts both ways

The earlier version told you hidden posts must drop out of comment counts and
"latest post" summaries "or the gap is obvious". With markers, the gap is
*deliberately* visible, so the two rules have to be separated:

| | |
|---|---|
| `hidden` / `removed` **replies** | keep their slot in the thread (the marker occupies it) but **must not** count toward reply counts, "N new replies" or notification fan-out |
| `hidden` / `removed` **posts** | leave the feed and all feed-level counts entirely |
| Sensitive-category removals | leave everything, everywhere, with no residue |

If that reads ambiguous for a case you hit, the rule underneath is: **a marker is for
narrative continuity, never for engagement.**

### E2. Redaction for personal-info cases

The hardest item. A post exposing someone's phone number must be blanked in normal
views but readable by a permitted admin.

**Recommended approach — the simple one:** when we hide it, we send Rails a
`redacted_body` alongside the hide call. Rails stores it and serves *that* to
non-permitted viewers, and the original only to permitted admins.

The alternative — Rails computing spans at render time — means Rails needs our
character offsets and has to redo the work on every page load. Don't do that.

### E3. Deliver author notices — **open question**

When we hide or remove something, the learner must be told.

**Ask:** what notification channel exists today?

We know bodhi's Socials UI has a notifications bell. We don't know what feeds it.

- If there's an in-app notification system → we call it. Easiest.
- If it's email only → fine for M1, slower.
- If neither exists → this is new Rails work and needs to be scoped.

Recommendation: **in-app for everything, plus email for critical categories.** The
notice also renders on the post card itself (bodhi work, not Rails), so even with no
notification channel the author still sees it when they visit the post.

### E4. Enforce `posting_paused_until`

Block create-post and create-comment while the pause is active. Show why and until
when. (M2 if A2 is M2.)

---

## F. One new permission

```
urgent_safety
```

Gates the restricted queue — child safety, credible threats, personal info.

**A granular permission system already exists** — but there are **two** numbering
schemes, and an earlier version of this doc merged them. The distinction matters before
anyone picks a number.

| Where | What's in it |
|---|---|
| `bundles/common/constants/appConstants.ts` → `ADMIN_PERMISSION_ROLES` | **Exactly two entries:** `MANAGE_COMMUNITIES: 25`, `AFFILIATE_MARKETING: 27`. This is the one composed into custom admin roles |
| `bundles/common/constants/sidebarConstants.ts` | `MANAGE_DISCUSSIONS: 8`, `MANAGE_REVIEWS: 10` — a **different** space, whose numbers collide with 25/27 |

So `MANAGE_REVIEWS` and `MANAGE_DISCUSSIONS` are **not** siblings of
`MANAGE_COMMUNITIES`, and "the grant UI comes free" needs one confirmation before we
rely on it.

**Recommendation:** add `urgent_safety` to `ADMIN_PERMISSION_ROLES` as the next number in
*that* scheme.

**One question for you:** does the custom-role builder enumerate `ADMIN_PERMISSION_ROLES`,
or is the permission list served from Rails? If it's served from Rails, adding the number
there is the whole frontend job. If the admin app hardcodes it, that's a second small
change and we should know now.

Default it to Owner only, and let the school grant it to named admins.

Also note `MANAGE_COMMUNITIES: 25` already exists — that's the natural gate for the
ordinary moderation queue, so only the *restricted* queue needs anything new.

Also: **log every view** of a restricted case. Who opened it, when.

---

## G. The KPI fork — Rails may or may not be involved

See `04-admin-kpis.md` for the full reasoning. Short version:

The admin dashboard's KPI framework can only read from Rails `/graphql` or
`/dataengine`. It cannot read from our AI service.

| Option | Rails work | Our work |
|---|---|---|
| **A** — Proximity mirrors daily counters into Rails; KPIs come free from the existing framework | One table + one query: `communityModerationKpi` | A small nightly push |
| **B** — We build a custom KPI page reading our own service | **None** | Hand-built cards and charts |

**Recommendation: A for the school-admin numbers** (consistent with every other
Learnyst dashboard, almost no frontend work), **B for the Learnyst-team accuracy
numbers** (they're cross-school and don't belong in a school's Rails data).

So: one small extra Rails ask, and it buys us the whole KPI screen for nearly free.

---

## H. What Rails does NOT need to build

Say this explicitly, or scope will creep back.

- ❌ No moderation case table
- ❌ No AI, no prompts, no model calls
- ❌ No queue
- ❌ No thresholds, no severity logic, no routing rules
- ❌ No author violation history
- ❌ No blocklist storage
- ❌ No appeal records
- ❌ No accuracy metrics

All of that is Proximity. Rails flips a field and serves content.

---

## Summary — the one-page version

| Ask | Size | Blocks |
|---|---|---|
| `moderation_state` field on 2 tables — **4 states** | Small | Everything |
| 4 new mutations (flag / hide / restore / remove) | Small | Everything |
| Fire moderation submit on create + edit + report + delete | Small | Everything |
| Respect `moderation_state` on every read | **Medium** | Everything |
| **Markers for hidden and removed content, with actor attribution** (§E1b) | **Large — the real work, and it is new** | Rows 32–34, all HIGH |
| Count behaviour split by marker vs. no-marker (§E1c) | Small–Medium | Rows 32–34 |
| Redaction via `redacted_body` | Medium | Personal-info cases |
| `posting_paused_until` | Small | Rows 17, 22, 40 — **M1, not M2** |
| `urgent_safety` permission + access logging | Small | Restricted queue |
| Per-community moderation-banner flag | Small | Rows 24–25 — **doesn't exist at any layer today** |
| Author notice delivery | ❓ Unknown until you answer | Learner notices |
| Reach signal | ❓ Answer needed | Better routing (nice to have) |
| `gs://` URIs for images | Small | **Nothing** — convenience only (§D1) |
| `communityModerationKpi` query | Small | The KPI screen (option A) |

**What changed since the version you may have seen:**
- `gs://` is **no longer a blocker** — it dropped from the top of this list to the bottom.
- The permission ask got smaller — one number in an existing scheme.
- **Markers appeared, and they're the biggest item on the page.** Nine user-story rows
  shipped after the first draft of this doc; four of them are about what people *other
  than the author* see, and §E1 previously said they see nothing.

**Four questions you need answered before you can finish planning:**
1. Is there a view count on posts? (§D2)
2. What notification channel can we use to tell a learner? (§E3)
3. Does the custom-role builder read `ADMIN_PERMISSION_ROLES` from Rails, or is it
   hardcoded in the admin app? (§F)
4. **How big is the marker work in §E1b, really?** It touches every feed, thread, detail
   and count. It is the item most likely to set the date.
