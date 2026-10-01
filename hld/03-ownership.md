# §3 Who owns what

> Source: HLD §3.

| Rails owns | ai-server owns |
|---|---|
| Rules, blocked words, content review mode, moderation mode, exceptions, academy description | — |
| Content review mode — and what the learner sees meanwhile | — |
| Word and link matching, with the disguise handling | — |
| Repeat-post detection and the restricted-member hold | — |
| The deadline on a check that never comes back | Delivering the verdict, fast |
| Queue, decisions, undo, record, member state | — |
| Telling ai-server what a person decided, so quality can be measured | The quality counters — Learnyst's view across every academy |
| — | The AI check and the callback. Holds no learner content |

**The disguise matcher is a Rails deliverable.** Capitals, spacing, numbers-for-letters, symbol wildcards,
stretched letters — specced in the Tech Notes, built in the other repo.

**Learners post in three different Rails models.**

| Where | Rails model |
|---|---|
| The Feed | `NewsfeedPost` |
| Community posts | `Post` + `CommunityContent` |
| Course, batch and bundle discussions | `DiscussionBoard` + `Comment` |

Rails needs one shared moderation service object that all of them call.

> ⚠ The HLD names three models for four content areas and does not say which model holds "Newsfeed —
> Discussions", or the discussions under mock test, test series, ebook, webinar, free resource, podcast and
> custom products. See [`../open-items.md`](../open-items.md) C9.
