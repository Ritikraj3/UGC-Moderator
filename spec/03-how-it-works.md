# How it works

> Source: Spec — "How it works".

Every check is asynchronous. The learner's post is answered immediately; the verdict lands a second later.

```
 Learner posts
      │
      ├─ Blocked words (instant, local)  → blocked word or link → BLOCK
      ├─ Repeat post / restricted member → held, no AI call
      │
      ├─ the post is written straight away
      │     REVIEW FIRST  → held, only the author sees it
      │     PUBLISH FIRST → live, everyone sees it
      │
      ├─ AI check (~1s, in the background)
      │     → which rule broke, and why
      │     → nothing came back in time → published, lands in Unchecked
      │
 Rule broken → Guidance · Report · Hold · Block
                          │
                   REVIEW QUEUE
                approve → live · remove → down, restorable
                          │
                Learner told the outcome
```

Editing a post runs the checks again. A picture adds 1–2 seconds to the check, and no extra wait for the
learner.

**Related:** the two settings named in the diagram → [04-two-settings.md](04-two-settings.md) · the four
actions → [05-rules.md](05-rules.md) · the Unchecked path → [10-when-the-check-fails.md](10-when-the-check-fails.md)
