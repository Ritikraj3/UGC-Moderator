# AI UGC Moderation — documentation

Documentation for AI moderation of learner content (posts and comments). It is built **only** from the three
documents on the Confluence page
[AI UGC Moderation](https://learnyst-dev.atlassian.net/wiki/spaces/SR/pages/1428815875/AI+UGC+Moderation),
received 2026-09-30.

| Folder | Source document | Also called |
|---|---|---|
| [`spec/`](spec/README.md) | **AI Moderation for UGC** — the product spec | "Tech Notes" (in the HLD header) |
| [`stories/`](stories/README.md) | **User Stories** — 78 stories, 20 system rules, glossary | — |
| [`hld/`](hld/README.md) | **HLD: AI Moderation for Community Content** | "Design: HLD" |
| [`rails-support/`](rails-support/README.md) | **Rails hand-over**, built from the three documents plus the production code: what already exists and what is new, every API in sequence, new fields and why, and 58 validated API contracts | — |
| [`ai-server-plan/`](ai-server-plan/README.md) | **ai-server build plan** (PROPOSED v2): what the AI backend builds before Rails is ready, to the approved HLD — the three calls tested with Postman and a dev-only Rails stub, Learnyst default rules and words, evals, a 30-SP task split, and a slot for JEV if it is approved | — |
| [`admin-ui-plan/`](admin-ui-plan/README.md) | **Admin UI plan** (PROPOSED v1): the five admin screens (queue, rules, settings, restrictions & bans, reports) built in `learnyst-admin` before Rails is ready — page routes, file layout, which admin framework each screen uses, a dev-only mock layer that serves hardcoded data through the real contract queries, the contract changes the table framework needs, and a 30-SP task split | — |

The spec also links **Market Research**. That document is not in this folder.

## Start here

Open **[moderation-map.html](moderation-map.html)** (published: https://claude.ai/artifact/6FQvsBXJaHgHU1sSv59FVG).
It is the whole feature on one page, built from the User Stories and HLD only: the seven-step flow, a
what-happens-when simulator, who does what, your build order, and the questions still open. The
files below are the detail behind it.

## Rules for this folder

1. **Source wording only** in `spec/`, `stories/` and `hld/`. Each file starts with a `Source:` line naming its
   section. Text is kept as written; tables and diagrams are rebuilt where the copy flattened them.
2. **Cite stories by page row number.** Rows 1, 16, 35, 56, 60, 69 and 81 are section headers.
3. **Only `rails-support/`, `ai-server-plan/` and `admin-ui-plan/` propose anything.** Every proposal there is labelled **PROPOSED** and cites its source.
   The two root files ([`traceability.md`](traceability.md), [`open-items.md`](open-items.md)) add no design:
   they only point at, quote and compare the sources.
4. **A ⚠ note in any file** links to the matching entry in [`open-items.md`](open-items.md), where the documents
   disagree.

## Layout

```
Ai moderator/
├── README.md               ← this file
├── traceability.md         ← each story → spec section → HLD section; v1 boundary
├── open-items.md           ← HLD open items + where the three documents disagree (C1–C32)
├── ai-server-plan/         ← ai-server build plan (PROPOSED)
├── admin-ui-plan/          ← admin screens build plan (PROPOSED)
├── rails-support/          ← Rails hand-over
│   ├── README.md                   existing vs new · sequence · data model · new fields · open questions
│   └── api-contracts/              58 YAML contracts (learnyst-admin format) + validator
├── spec/                   ← 12 sections of the spec
│   ├── 01-overview.md              02-scope.md               03-how-it-works.md
│   ├── 04-two-settings.md          05-rules.md               06-blocked-words-and-languages.md
│   ├── 07-what-the-learner-sees.md 08-review-queue.md        09-rule-performance.md
│   └── 10-when-the-check-fails.md  11-settings.md            12-decisions.md
├── stories/                ← user stories by section, plus notes and system rules
│   ├── 01-glossary.md              02-moderation-settings.md 03-rules-and-blocked-words.md
│   ├── 04-review-queue.md          05-restrictions-and-bans.md 06-moderation-reports.md
│   ├── 07-learner-experience.md    08-learnyst-traction-report.md
│   └── 09-notes.md                 10-system-rules.md
└── hld/                    ← file number = HLD § number (§1–2 share 01)
    ├── 01-overview-and-systems.md  03-ownership.md           04-flow-learner-posts.md
    ├── 05-content-review-mode.md   06-images.md              07-flow-learner-reports.md
    ├── 08-flow-admin-reviews.md    09-flow-late-verdict.md   10-contract.md
    ├── 11-inside-the-check.md      12-learner-and-admin-views.md 13-storage.md
    ├── 14-scale-and-cost.md        15-measuring-quality.md   16-security.md
    └── 17-rollout.md               18-decisions.md           19-open-items.md
```

## Reading order

| If you want… | Read |
|---|---|
| What the feature is | [`spec/01`](spec/01-overview.md) → [`spec/02`](spec/02-scope.md) → [`spec/03`](spec/03-how-it-works.md) → [`spec/04`](spec/04-two-settings.md) → [`spec/05`](spec/05-rules.md) |
| The words used | [`stories/01-glossary.md`](stories/01-glossary.md) |
| What must be built, story by story | [`stories/`](stories/README.md), then [`traceability.md`](traceability.md) |
| How the systems fit | [`hld/01`](hld/01-overview-and-systems.md) → [`hld/03`](hld/03-ownership.md) → [`hld/04`](hld/04-flow-learner-posts.md) → [`hld/10`](hld/10-contract.md) → [`hld/13`](hld/13-storage.md) |
| What still needs a decision | [`open-items.md`](open-items.md) |
| What Rails builds, and the contracts to hand over | [`rails-support/README.md`](rails-support/README.md) → [`rails-support/api-contracts/`](rails-support/api-contracts/README.md) |

## At a glance

Every line below is taken from the sources.

| | |
|---|---|
| **The idea** | AI checks every post and comment against rules the academy wrote. *(spec)* |
| **The shape** | Rails checks blocked words locally, submits to ai-server, gets a 202 receipt; ai-server classifies and posts the verdict to a Rails webhook about a second later; Rails applies the rule's action and tells the learner. *(HLD §1)* |
| **Ownership** | Everything that persists lives in Rails. ai-server keeps counters, and no content. *(HLD §1)* |
| **Where it runs** | Four content areas — Product discussions · Community · Feeds · Newsfeed. *(spec, HLD §5)* |
| **Two settings** | Content review mode — Review first *(default)* / Publish first. Moderation mode — Autopilot / Copilot / AI disabled. *(spec)* |
| **Rule actions** | Guidance · Report · Hold · Block. *(spec)* |
| **Ready-made rules** | Nine in the spec; "ten" in system rule 1 — see [C1](open-items.md#c1--how-many-ready-made-rules). |
| **Deadlines** | 5 minutes on held content, 15 on background checks; then publish and file under Unchecked. *(spec, HLD §9)* |
| **Retention** | Removed content kept and restorable for 90 days. *(spec, SR 12)* |
| **Appeals** | None. *(spec decisions)* |
| **Classifier** | Instructor, `google/gemini-2.5-flash-lite`, thinking disabled, one pass. *(HLD §11)* |
| **Quality view** | Firestore counters per academy per day → one new Moderation panel on the Proximity AI dashboard in `monitor`. *(HLD §15)* |
| **Rollout** | Shadow mode → pilot academies → widen once wrong flags hold under 5%. *(spec, HLD §17)* |
| **Stories** | 78 — 59 P1 · 18 P2 · 1 P3. *(counted from the page)* |

## Superseded

The earlier briefing pack (docs `00`–`11`, 2026-09-10) described a different design. Among other things it had
moderation cases held in `proximity_db`, removal markers, flag-without-hide and appeals, none of which are in the
new sources. It has been moved to `.archive/2026-09-10-old-briefing-pack/` and is **not current**.
