# §13 What is stored, and where

> Source: HLD §13.

| Data | Where |
|---|---|
| Rules, blocked words, per-academy settings, content review mode, moderation mode | Rails |
| Exceptions — one product set differently from its content area | Rails |
| Queue items, decisions, restore | Rails |
| Held content — a real row, visible only to its author | Rails |
| Removed content — kept and restorable for 90 days | Rails |
| Post and comment version history | Rails, PaperTrail |
| `content_reports` | Rails |
| Member state — restricted, banned, ban scope, counts | Rails |
| Record of every action | Rails, extending PaperTrail |
| An in-flight check | ai-server's Redis, via BullMQ — the payload lives for the life of the job, then is dropped. Failed jobs kept 24h for retry |
| Quality counters — checked, flagged, blocked, held, wrong-flagged, missed, per academy per day | Firestore. Numbers only. See [§15](15-measuring-quality.md) |
| Any learner content | Nowhere but Rails. No post text, no verdict log, no moderation tables in `proximity_db` |

## Settings resolution

Rails resolves settings and rules before calling. One order, first answer wins:

```
  an exception for this product  →  the content area it belongs to  →  the academy
```

ai-server never sees the hierarchy — it gets the effective rules and nothing else.

A queued job is not a record. It is the request in mid-air, gone the moment the verdict is delivered.
