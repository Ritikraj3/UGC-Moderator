# §15 Measuring quality

> Source: HLD §15.

Each academy sees its own numbers in Rails. Learnyst needs the view across all of them — is moderation actually
working, is a new prompt better than the last one, is the model still good enough. That lives in **Firestore, as
counters only**.

**Counters, not records.** No post text, no learner, no reason sentence — nothing but numbers going up. The privacy
question never arises, and the storage stays tiny.

```
 moderation_stats/{school_id}/daily/{2026-09-25}
   checked            4120     ← every check submitted
   clean              3992
   flagged             128
   blocked              61     ← rule action Block
   held                 44     ← rule action Hold
   guidance             15
   reported              8     ← rule action Report
   to_teacher           52     ← anything that reached the queue
   unchecked             3     ← deadline fired or ai-server errored
   errors                3
   by_area            { "product_discussions": 42, "community": 78, "feeds": 8 }
   by_rule            { "6": 74, "9": 38, "1": 16 }
   latency_ms_sum  4,310,000
   latency_count      4,117
   tokens_in       7,900,000
   tokens_out        410,000
   model           "gemini-2.5-flash-lite"
   prompt_version  "v3"
```

Written with Firestore's atomic increment at the moment the verdict is delivered, so there is no read-modify-write
race and no job to aggregate.

> ⚠ Several counters (`blocked`, `held`, `guidance`, `reported`, `to_teacher`, the deadline half of `unchecked`)
> depend on facts that stay in Rails, and ai-server is not told them. See [`../open-items.md`](../open-items.md) C8.

## The two numbers that say whether it works

A verdict on its own proves nothing. Quality is what a person did next, and that happens in Rails — so Rails sends
the outcome back ([§10](10-contract.md)).

| Counter | Means |
|---|---|
| `approved_after_flag` | We stopped it, a teacher let it through — a **wrong flag** |
| `removed_after_report` | We passed it, a learner reported it and a teacher removed it — a **miss** |

Wrong flags are visible without leaving ai-server. Misses are not — only Rails ever learns about them, which is the
whole reason for the outcome call.

## Where it is read

The existing **Proximity AI dashboard in `monitor`** — no new dashboard, no BigQuery export.

That page already works this way for every other panel: ai-server exposes a read API under `/api/monitor/…`,
monitor proxies it as `/api/proximity/…` (`src/routes/api/proximity.js`), and
`client/src/pages/ProximityAiPage.jsx` renders it alongside ingestion, queues and failures.

```
 Firestore counters
        │
        ▼
 ai-server   GET /api/monitor/moderation        ← reads the daily documents
        │
        ▼
 monitor     GET /api/proximity/moderation      ← proxy, same as every other panel
        │
        ▼
 ProximityAiPage.jsx  →  new "Moderation" section
```

One new panel, one new endpoint, no new infrastructure. Firestore access stays inside ai-server, which is the only
service writing it.

## Two limits, stated

**One document per academy per day.** Firestore sustains roughly one write per second to a single document;
per-academy-per-day keeps every academy far under that, and a Learnyst-wide total is the sum of those documents
rather than a hot global counter.

**Counters tell you what, never why.** They will say Rule 1 has a 43% wrong-flag rate; they cannot show the posts that
caused it. For that, open the rule performance report in Rails, where the content actually lives.
