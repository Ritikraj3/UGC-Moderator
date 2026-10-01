# Story Coverage — every published row, and where its design lives

**This doc exists because the pack drifted from the page.** Nine rows were added to
Confluence from `10-user-story-additions.md` while that file still said *"Status: NOT
PUBLISHED"*, and docs 00–09 were written before those rows existed. One of them —
what everyone else sees where removed content used to be — is the **opposite** of what
`02-rails-ask.md` told the Rails team to build.

Check this table before any planning meeting. If a row has no design, it isn't scoped.

---

## 1. First: the `US-N` numbers in the other docs are stale

The page today is **49 rows = 13 section headers + 36 stories**. The docs were written
against a **26-story** version — before the non-English row and before the 9 insertions.

Every `US-N` reference in docs 00–10 therefore points at the wrong row now. The mapping
below is reconstructed and cross-checked three ways (doc 10's *"US-16 covers hidden /
removed / restored"* → row 30 ✓ · doc 06 N-5's *"US-23 says personal info is blanked"* →
row 45 ✓ · doc 00 §2's *"user story #25"* → row 48 ✓).

| Old `US-N` | Now row | What it is |
|---|---|---|
| US-1 | 2 | Posting never blocked |
| US-2 | 3 | Blocklist + repeat patterns before AI |
| US-3 | 4 | Category / severity / confidence / span / reason |
| US-4 | 7 | On-off + Copilot / Autopilot |
| US-5 | 8 | Hide + queue by severity × confidence × history × reach |
| US-6 | 13 | The queue and its tabs |
| US-7 | 14 | Case detail |
| US-8 | 16 | Approve / remove / keep hidden |
| US-9 | 17 | Warn / pause / escalate |
| US-10 | 18 | "AI got this wrong" + block a word |
| US-11 | 20 | Strictness + blocklist + allowlist |
| US-12 | 21 | Exempt / notify / custom message |
| US-13 | 22 | Per-space rules, pause length, cheating rules |
| US-14 | 27 | Learner report, 11 reasons |
| US-15 | 28 | Distinct reporters raise priority |
| US-16 | 30 | Author notices |
| US-17 | 37 | One appeal |
| US-18 | 38 | Appeal outcomes tracked apart |
| US-19 | 40 | Ledger + escalation ladder |
| US-20 | 42 | Self-harm |
| US-21 | 43 | Child sexual safety |
| US-22 | 44 | Credible threat |
| US-23 | 45 | Safety contact + personal info |
| US-24 | 47 | School-admin metrics |
| US-25 | 48 | Learnyst-team accuracy metrics |
| US-26 | 49 | Audit trail + reliability |

**Rule from here on: cite the row number, not `US-N`.** Row numbers are what the page
shows; `US-N` is a private numbering that has already broken once.

---

## 2. The coverage table

Legend — **Design**: ✅ fully covered · ⚠️ partial or contradicted · ❌ nothing written.

### Automated Content Screening

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 2 | HIGH | Posting never delayed or blocked | ⚠️ | `00` §4 fail-open. **Missing:** `aiUsageLimits.service.ts` is fail-**closed** — if moderation is wired through the school AI quota gate, this row breaks. Now called out in `00` §4 and `03` §7. |
| 3 | HIGH | Blocklist + repeated-post patterns before AI | ⚠️ | `03` §6. Exact-duplicate is M1; **near-duplicate is Phase 2** (new post-embedding table + index + threshold). The row says "patterns" — confirm which half M1 owes. |
| 4 | HIGH | Category, severity, confidence, span, reason, real-vs-class-talk | ✅ | `00` §4 · `03` §6 · artifact screen 04 |
| 5 | MED | Non-English screened, accuracy English-only | ✅ | `06` P-4. This row **is** P-4's recommendation, now committed. |

### Moderation Modes & Risk Routing

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 7 | HIGH | On/off + Copilot / Autopilot | ✅ | `07` two modes · `06` P-9 unlock bar · artifact 10 |
| 8 | HIGH | Hide + queue by severity × confidence × history × reach | ⚠️ | `00` §4 Layer 2. **Reach depends on an unanswered Rails question** (`02` §D2). |
| 9 | HIGH | Unsure → flagged for review but **left visible** | ⚠️ | Was draft-only. Now in `00` §4 (fourth Layer-2 branch), `03` §6, `07`, artifact flow map + screen 04. |
| 10 | HIGH | Admin decides on a **still-visible** flagged post: leave / warn / hide / remove | ⚠️ | Was draft-only. `decideModerationCase` had **no "hide it now"** action — added to `03` §4 as `applyCaseAction`. |
| 11 | HIGH | Learner hears from moderation only when content moves or a person decides | ⚠️ | Was draft-only. Needs a **notice-suppression gate** on `moderation-notice` — added to `03` §5. Also settles `06` N-3: no "AI is checking" indicator. |

### Admin Review Queue

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 13 | HIGH | Queue, search/filter/sort, 5 tabs | ✅ | `07` "a case is a row, a queue is a query" · artifact 03. Note the Reports tab must include reports on content the AI **cleared**. |
| 14 | HIGH | Case detail — everything in one place | ⚠️ | artifact 04/05. **Missing:** "what message the author saw **or will see**" needs the *rendered* notice stored on the case, not just the template. Added to `03` §3. |

### Admin Moderation Actions

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 16 | HIGH | Approve back / remove / keep hidden | ✅ | `03` §4 · artifact 04 |
| 17 | HIGH | Warn · **temporarily stop posting** · escalate to Learnyst | ⚠️ | Posting pause was **M2** in `02` §A2 and `06` MR-7. This row is HIGH and pause also appears in rows 22 and 40 — **moved to M1**. Escalation depends on MR-1 (does Learnyst staff it?). |
| 18 | HIGH | "AI got this wrong" + block a word, without leaving the screen | ✅ | `03` §4 · `05` §7 · artifact 04 action bar |

### School Moderation Settings

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 20 | HIGH | Per-category strictness · blocklist · allowlist · search & filter | ✅ | `03` §3 · artifact 10 |
| 21 | MED | Exempt people · notify list · per-category learner message | ✅ | `moderation_settings` covers all three |
| 22 | MED | Per-space rules · pause length · own cheating rules | ✅ | `06` MR-5 (academic integrity default OFF) |

### Community Disclosure & Rules

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 24 | HIGH | Banner on every community under the **school's assistant name**, opens to full disclosure + rules | ⚠️ | Was draft-only; **absent from `00` §7d's bodhi list**. Now added. Uses `aiGuruSchoolProfile.aiAvatarName` — **one name per school, already the lesson-chat and assistant identity**, can be empty, cached 24 h. `social-banner` exists but is **not wired into production** and has no slots. |
| 25 | MED | Admin toggles the banner per community, edits the guidelines | ⚠️ | The published row **dropped** "name their school's AI moderator" — so the name is inherited, not editable here. The **per-community on/off flag does not exist at any layer**; cheapest path is `UpdateSpaceInput`. |

### Learner Reporting

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 27 | HIGH | Report with one of **11 reasons**, anonymous, confirmation, AI re-check using that reason | ⚠️ | **Direct conflict:** `06` MR-3 / `08` recommend the support-ticket middle path for M1 and put the real flow in M2. The middle path delivers no reason, no anonymity guarantee and no re-check hint — and row 13's Reports tab needs the reason. See `06` MR-3 (rewritten). |
| 28 | MED | Distinct reporters raise priority; reporter frequency visible | ✅ | `moderation_reports` — exactly this |

### Author Notices

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 30 | HIGH | Notice on hidden / removed / restored, kind for self-harm | ✅ | `02` §E3 · artifact 02 and 07. Delivery channel is still an open Rails question; the post-card notice is the floor and works with no channel at all. |

### Hidden & Removed Content — What Others See

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 32 | HIGH | Removed → a marker in place, author name and picture hidden, no reason | ❌→⚠️ | **`02` §E1 said "everyone else sees nothing" — the opposite.** Rewritten. Marker rendering, name/picture suppression and comment-count behaviour are **new Rails read-path asks** that were not on the list. |
| 33 | HIGH | Hidden reply → only "Under review" | ❌→⚠️ | Same. A pause must not read as a verdict. |
| 34 | HIGH | Who removed it + a message for that case (AI names itself / moderator cites rules) | ❌→⚠️ | Needs **actor attribution on the marker**. `moderation_actions` has the actor; Rails has to render it. New ask. |
| 35 | HIGH | Sensitive categories leave **no trace at all** | ✅ | This is the only row `02` §E1's old "nothing" answer was right for. |

### Review & Appeal

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 37 | HIGH | One review request; admin restores / keeps removed / **updates the message** | ⚠️ | `03` §4 had `resolveAppeal` only — "update the message" was missing, now added. |
| 38 | MED | Appeal outcomes tracked apart from first-decision accuracy | ✅ | `moderation_appeals` + `04` §5. MEDIUM, so M2 deferral holds. |

### Repeat Violations Ledger

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 40 | HIGH | Ledger + a **five-rung** ladder | ⚠️ | `moderation_author_ledger` exists but the ladder was never written down. Now in `05` §5b. **Rung 3 and 4 need posting pause (M1 now). Rung 5 — "tries to get around a block" — is ban-evasion detection and is genuinely unscoped**; see `06` N-7. |

### Special Handling

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 42 | HIGH | Self-harm → urgent, never auto-deleted, caring message + **local emergency-help info** | ⚠️ | Tone and routing ✅. **"Local" helpline data has no owner and no source** — see `06` N-8. The artifact shows Tele-MANAS and KIRAN as the India default. |
| 43 | HIGH | Child sexual safety → hidden at once, restricted queue | ✅ | `02` §F · `06` MR-6 · artifact 06. Note row 27's reason list has **no child-safety option** — see `06` N-9. |
| 44 | HIGH | Credible threat → restricted, with **who's targeted, where, when, how** | ⚠️ | The four fields were in the artifact but **in no doc** — Layer 1 needs a threat sub-schema and `moderation_cases` needs the columns. Added to `03` §3 and §6. |
| 45 | HIGH | Safety contact + personal info blanked in normal views | ✅ | `02` §E2 `redacted_body` · `05` §2. Settles `06` N-5: personal info gets Critical treatment. |

### Metrics & Audit

| Row | Pri | Story (short) | Design | Where · what's missing |
|---|---|---|---|---|
| 47 | MED | How long AI takes to **decide and hide** · % hidden pre-view · queue depth · review time | ⚠️ | `04` §5 measures verdict latency only. **Hide latency — verdict → Rails applied — is a second number** and is the one the row actually asks for. Added. |
| 48 | HIGH | AI wrong both ways · calibration · category trend · **mode adoption across schools** | ⚠️ | `04` §6 recommended skipping mode adoption in M1. Row is HIGH — see `06` P-6b. |
| 49 | HIGH | Full audit history · how often AI errors, times out, or **lets content through by mistake** | ⚠️ | `moderation_actions` ✅. **But the OCR fail-open hole produces a silent "clean" that is neither an error nor a timeout** — so this metric under-reports the one failure the audit found. The `01` §3b wrapper is what makes this row honest. |

---

## 3. Scored

| | Count |
|---|---|
| ✅ fully covered | 14 |
| ⚠️ partial, conflicted, or newly repaired | 21 |
| ❌ still nothing | 0 |

Of the 21 ⚠️, **9 are the rows that shipped from the draft** and had no design at all
until this pass.

---

## 4. The five that still need a person, not a doc

| # | Row(s) | Question | Who |
|---|---|---|---|
| 1 | 27 | Real report flow in M1, or the support-ticket middle path? The row is HIGH and says 11 reasons. | 🟡 Product |
| 2 | 17, 22, 40 | Posting pause in M1 — three rows need it, `02` had it at M2. | 🟡 Product + Rails |
| 3 | 40 | Ban-evasion detection (rung 5) — what signal are we allowed to use? | 🟡 Product + legal |
| 4 | 42 | Who owns the helpline list, and for which regions? | 🟡 Product |
| 5 | 32–34 | Marker rendering is new Rails read-path work that was never scoped. | 🔴 Eng leadership |

Everything else on this page is decided and written down.
