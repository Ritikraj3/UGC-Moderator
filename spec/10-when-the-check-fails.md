# When the check fails

> Source: Spec — "When the check fails".

There is no timeout for the learner to wait through — the post is already written. What can fail is the verdict
never arriving, so each pending check has a deadline.

| Deadline | Applies to | What happens |
|---|---|---|
| **5 minutes** | Content held under review first | Publish it, file it under Unchecked |
| **15 minutes** | Background catch-up checks | Resolve as Unchecked |

A verdict that turns up after the deadline is still applied — the post can move from Unchecked into the queue.

**The cost:** while the AI is down, only blocked words and repeated posts are caught. Insults, threats and scams
get through until someone clears that tab. **Moderation must never stop people posting.**
