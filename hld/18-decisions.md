# §18 Decisions

> Source: HLD §18.

| # | Decision | |
|---|---|---|
| 1 | **One transport: submit, then be told.** | Every check is acknowledged with 202 and answered on a webhook. No synchronous path, no mode field, no second integration for Rails to get wrong. |
| 2 | **The content review mode is the academy's choice, not the architecture's.** | Review first holds content until the verdict; publish first lets it through and pulls it back. Both ride the same async contract. |
| 3 | **Default review first.** | Safer for an academy that has not tuned its rules yet. |
| 4 | **Moderation is configured per content area, not per product.** | Four rows — product discussions, Community, Feeds, Newsfeed — however many courses the academy has. A single product that must differ is an exception, and exceptions are rare by design. |
| 5 | **Settings resolve in one order.** | An exception for the product, then its content area, then the academy. First answer wins. |
| 6 | **Rules apply going forward.** | Publishing or rewording a rule never re-checks content that is already up. The Teacher is warned of this when they publish — a stated limit rather than a surprise, and it keeps the biggest possible burst off the table. |
| 7 | **Quality is measured in counters, not copies.** | Firestore holds per-academy daily totals — checked, flagged, blocked, held, wrong flags, misses. No content ever leaves Rails. |
| 8 | **Read on the existing Proximity AI dashboard.** | One more panel in monitor, fed by `/api/monitor/moderation` and proxied exactly like every other panel on that page. No new dashboard, no BigQuery in v1. |
| 9 | **Rails reports the outcome back.** | `POST /api/moderation/outcome` closes the loop: without it we can count what we stopped, but never what we missed. |
| 10 | **The lane comes from `trigger`.** | Live for create and edit, bulk for catchup. |
| 11 | **The callback address is configuration, not a request field.** | No SSRF surface. |
| 12 | **Deadlines, not timeouts.** | 5 minutes on held content, 15 on background checks. Past either, publish and file under Unchecked; a late verdict is still applied. |
| 13 | **Ordering is handled by `content_version`.** | A verdict for a version that is no longer current is dropped. |
| 14 | **The classifier is behind an interface.** | Live Vertex today; batch or self-hosted later without a contract change. That is what the webhook buys. |
| 15 | **A queued job is transient, not stored.** | Redis for the life of the job. |
| 16 | **ai-server classifies, Rails enforces.** | Rule changes never need an ai-server deploy. |
| 17 | **Instructor, not a Mastra workflow.** | One classification call. |
| 18 | **Gate 1 stays in Rails.** | Blocked words and repeat-post checks are local and free. |
| 19 | **Images are checked with the post, not at upload.** | |
| 20 | **Learners see the rule, not generated text.** | |
| 21 | **Reports get their own record.** | |

*The HLD lists these as paragraphs without numbers. The numbers here are for citing only and follow the page order.*
