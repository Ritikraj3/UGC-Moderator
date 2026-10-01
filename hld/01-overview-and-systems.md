# §1 In one paragraph · §2 The systems

> Source: HLD §1 and §2.

## §1 In one paragraph

A learner writes a post. Rails checks it against the academy's blocked words locally, then hands it to ai-server
and gets back a receipt, not an answer. ai-server classifies it and posts the verdict to a Rails webhook, about a
second later. Rails applies the rule's action and tells the learner.

Nothing waits on an HTTP response. What the learner sees in that second is the academy's choice of content review
mode: **review first** — the post is held until the verdict arrives — or **publish first** — the post is live and
comes down if it breaks a rule.

**Everything that persists lives in Rails. ai-server keeps counters, and no content.**

## §2 The systems

```
  ┌────────────────────────┐      ┌────────────────────────┐
  │  bodhi                 │      │  admin                 │
  │  learner apps          │      │  admin app             │
  │  learny-web            │      │  React + Vite          │
  │  learny_mobile         │      │  queue · rules ·       │
  │  widgets               │      │  settings · reports    │
  └───────────┬────────────┘      └───────────┬────────────┘
              │                               │
              │  GraphQL / REST               │  GraphQL
              └───────────────┬───────────────┘
                              ▼
        ┌───────────────────────────────────────────┐
        │  plato / jarvism2          (Rails)        │
        │                                           │
        │  Product discussions · Community ·        │
        │  Feeds · Newsfeed                         │
        │  Rules, blocked words, queue, decisions   │
        │  Content review mode · moderation mode    │
        └──────┬──────────────────────────▲─────────┘
               │  ① submit    ③ outcome   │  ② verdict
               ▼                          │
        ┌──────────────────────────────────────────┐
        │  ai-server                 (this repo)   │
        │                                          │
        │   submit ─▶ BullMQ ─▶ classifier ─▶ hook │
        │             (Redis)                      │
        │   live lane and bulk lane, chosen from   │
        │   trigger. Rails is not told which ran   │
        └──────┬────────────────────┬──────────────┘
               ▼                    ▼
   ┌───────────────────────┐  ┌──────────────────────────┐
   │ the model behind the  │  │ Firestore                │
   │ interface             │  │ counters only, per       │
   │ today Vertex flash-   │  │ academy per day          │
   │ lite · later batch or │  │      │                   │
   │ self-hosted           │  │      ▼                   │
   └───────────────────────┘  │ monitor — Proximity AI   │
                              │ dashboard, one new panel │
                              └──────────────────────────┘
```

| System | Repo | Role here |
|---|---|---|
| **Learner apps** | bodhi | Where posts are written, images uploaded, reports raised, messages shown |
| **Admin app** | admin — React + Vite, Apollo GraphQL | Five screens: queue, rules, settings, restrictions & bans, reports |
| **Rails** | plato/jarvism2 | Owns the content and every moderation decision |
| **AI service** | proximity-ai-ng ("ai-server") | Answers one question: does this break a rule, and why. Keeps the quality counters |
| **Monitoring** | monitor | The existing Proximity AI dashboard. Gains one Moderation panel — see [§15](15-measuring-quality.md) |
