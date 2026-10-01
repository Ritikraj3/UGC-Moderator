# HLD — AI Moderation for Community Content

Parent page: [AI UGC Moderation](https://learnyst-dev.atlassian.net/wiki/spaces/SR/pages/1428815875/AI+UGC+Moderation)
· received 2026-09-30.

Links on the HLD page: **Spec:** Tech Notes → [`../spec/`](../spec/README.md) · **Stories:** User Stories →
[`../stories/`](../stories/README.md)

> The wording and diagrams are the HLD's own. **File number = HLD § number**; §1 and §2 share `01`. "ai-server" is
> the HLD's name for `proximity-ai-ng` (this repo, from the HLD's point of view).

| File | HLD § | Covers |
|---|---|---|
| [01-overview-and-systems.md](01-overview-and-systems.md) | §1–2 | In one paragraph · The systems |
| [03-ownership.md](03-ownership.md) | §3 | Who owns what — Rails vs ai-server · the three Rails content models |
| [04-flow-learner-posts.md](04-flow-learner-posts.md) | §4 | Flow — a learner posts |
| [05-content-review-mode.md](05-content-review-mode.md) | §5 | Content review mode · the mode combinations |
| [06-images.md](06-images.md) | §6 | Images |
| [07-flow-learner-reports.md](07-flow-learner-reports.md) | §7 | Flow — a learner reports a post · `content_report` |
| [08-flow-admin-reviews.md](08-flow-admin-reviews.md) | §8 | Flow — the admin reviews · PaperTrail |
| [09-flow-late-verdict.md](09-flow-late-verdict.md) | §9 | Flow — when a verdict is late or never comes · deadlines · failures |
| [10-contract.md](10-contract.md) | §10 | The contract — submit · callback · outcome |
| [11-inside-the-check.md](11-inside-the-check.md) | §11 | Inside the check — Instructor, verdict schema, the classifier interface |
| [12-learner-and-admin-views.md](12-learner-and-admin-views.md) | §12 | What the learner sees, and what the admin sees |
| [13-storage.md](13-storage.md) | §13 | What is stored, and where · settings resolution |
| [14-scale-and-cost.md](14-scale-and-cost.md) | §14 | Scale and cost |
| [15-measuring-quality.md](15-measuring-quality.md) | §15 | Measuring quality — Firestore counters · monitor panel |
| [16-security.md](16-security.md) | §16 | Security |
| [17-rollout.md](17-rollout.md) | §17 | Rollout |
| [18-decisions.md](18-decisions.md) | §18 | Decisions |
| [19-open-items.md](19-open-items.md) | §19 | Open items |

## The endpoints at a glance

Collected from §10, §15 and §16.

| Call | Direction | Guard | HLD |
|---|---|---|---|
| `POST /api/moderation/check` | Rails → ai-server | `checkInternalHost` | §10 |
| `POST {RAILS_INTERNAL_URL}/internal/v1/moderation/result` | ai-server → Rails | shared service token | §10, §16 |
| `POST /api/moderation/outcome` | Rails → ai-server | `checkInternalHost` | §10 |
| `GET /api/monitor/moderation` | monitor → ai-server | not stated in the HLD | §15 |
| `GET /api/proximity/moderation` | monitor's own proxy route | not stated in the HLD | §15 |
| `GET /api/moderation/check/{request_id}` | — | **Not built in v1** | §10 |
