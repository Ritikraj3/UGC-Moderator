# §14 Scale and cost

> Source: HLD §14.

**10,000 posts and comments a day ≈ 0.12 requests per second.** Even a 20× peak is under 3 rps — the existing
Fastify service absorbs that without help.

**The queue is there for bursts, not for steady state.** Coming back from an outage can put thousands of Unchecked
items through at once. The bulk lane's concurrency cap keeps that from starving the live lane a held post depends
on.

**Nothing re-scans old content.** A new or reworded rule applies from the moment it is published — the posts already
up are not checked against it. That removes the one workload big enough to threaten this design, and it is a promise
the product makes out loud rather than a limit we hide.

Per check: ~1,500–2,000 input tokens and ~100 output. Roughly 17M input and 1M output tokens a day. On flash-lite
that is **tens of dollars a month** — the argument for checking every post rather than only reported ones.

Images cost more per check but are a fraction of posts.
