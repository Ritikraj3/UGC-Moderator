# §8 Flow — the admin reviews

> Source: HLD §8.

```
  admin app                    Rails                      ai-server
      │                          │                            │
      │  open queue              │                            │
      ├─────────────────────────>│                            │
      │<─────────────────────────┤  AI flags + learner reports│
      │                          │                            │
      │  approve ───────────────>│  publish                   │
      │  remove  ───────────────>│  take down, restorable     │
      │  restore ───────────────>│  put back                  │
      │  restrict ──────────────>│  held before visible       │
      │  ban     ───────────────>│  product or academy        │
      │                          │                            │
      │                          │  POST /moderation/outcome  │
      │                          ├───────────────────────────>│
      │                          │  counters only, §15        │
      │                          │                            │
      │                          │  every action → PaperTrail │
      │                          │  learner told the outcome  │
```

| Admin action | What Rails does |
|---|---|
| approve | publish |
| remove | take down, restorable |
| restore | put back |
| restrict | held before visible |
| ban | product or academy |

`Post` and `Comment` already have **PaperTrail** with `school_id` in the metadata. The record of every action
should extend that rather than build a parallel audit table.

Restricting and banning happen here, beside the content that caused them. The Restrictions & bans screen is the
list and the undo.

*The outcome call is specified in [§10](10-contract.md). The diagram shortens `/api/moderation/outcome` to
`/moderation/outcome`.*
