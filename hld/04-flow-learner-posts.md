# §4 Flow — a learner posts

> Source: HLD §4.

```
 Learner    bodhi            Rails                        ai-server
    │         │                │                              │
    │  Post   │                │                              │
    ├────────>├───────────────>│                              │
    │         │                │ ① moderation on?             │
    │         │                │ ② blocked word?    (local)   │
    │         │                │ ③ repeat post?     (local)   │
    │         │                │ ④ restricted?      (local)   │
    │         │                │                              │
    │         │                │ REVIEW FIRST  → write it held│
    │         │                │ PUBLISH FIRST → write it live│
    │         │                │                              │
    │         │                │ POST /moderation/check       │
    │         │                ├─────────────────────────────>│
    │         │<───────────────┤<─────────────────────────────┤
    │<────────┤  answered now  │        202 { request_id }    │
    │  "waiting for review" or "posted"                       │
    │         │                │                              │ classify
    │         │                │                              │ (~1s)
    │         │                │ POST /internal/v1/moderation/result
    │         │                │<─────────────────────────────┤
    │         │                │                              │
    │         │                │ clean → publish it / leave it│
    │         │                │ broke a rule → the rule's action
    │         │                │                              │
    │         │<───────────────┤                              │
    │<────────┤  told the outcome, and which rule             │
```

Steps ① to ④ never leave Rails. They are free, and a restricted member is caught there without an AI call at all.

The learner's request is answered immediately, either way. No thread is held, no socket is required, and bodhi
needs nothing it does not already have — the post simply starts in a different state.

**Editing takes the same path.** The edit lands, the check runs behind it, and the verdict can pull the content
back into review.

*The full request and callback fields are in [§10](10-contract.md). The diagram shortens
`/api/moderation/check` to `/moderation/check`.*
