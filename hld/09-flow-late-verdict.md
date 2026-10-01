# §9 Flow — when a verdict is late or never comes

> Source: HLD §9.

There is no HTTP timeout to fire — the submit returns in milliseconds. What Rails waits on is a webhook that may
not arrive, so **the fail-open is a deadline on the pending check**.

```
   Rails                                 ai-server
     │  POST /moderation/check                │
     ├───────────────────────────────────────>│
     │<───────────────────────────────────────┤  202
     │                                        │
     │  review first: the post sits held      │  ... slow, crashed,
     │  publish first: it is already live     │      or the callback
     │                                        │      never lands
     │  deadline passes, nothing arrived      │
     │                                        │
     │  review first  → publish it, mark Unchecked
     │  publish first → mark Unchecked, it is already up
     │
     │  (a verdict that turns up later is still applied)
```

## Deadlines

| Deadline | Applies to | Length | What happens |
|---|---|---|---|
| **Held content** | create and edit under review first | **5 minutes** | Publish it and file it under Unchecked. A learner is never left waiting indefinitely for something nobody is coming to check |
| **Background checks** | catchup | **15 minutes** | Resolve as Unchecked. Nobody is watching |

## Failures

| Failure | What happens |
|---|---|
| ai-server is slow | The deadline fires → content published → Unchecked tab |
| ai-server returns an error, or invalid JSON | ai-server retries the model once internally, then calls back with `status: error`. Rails treats it as Unchecked |
| The callback exhausts its retries | Silence. The deadline covers it |
| ai-server is down entirely | The submit fails outright → Rails publishes and marks Unchecked. Blocked words, repeat-post and restricted-member checks still run |

**A late verdict is not wasted.** It arrives after the content is live and Rails applies it — the post can move from
Unchecked into the queue, or be held.

**The cost of fail-open, stated:** while ai-server is down, only blocked words and repeat-posts are caught.
