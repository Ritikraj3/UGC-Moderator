# Learnyst Traction Report — rows 81–85

> Source: User Stories — section **Learnyst Traction Report** (header row 81).

| Row | Story | Priority |
|---|---|---|
| 82 | Learnyst can view moderation volume across all academies with Academies using moderation, Content checked, Blocked before publishing, Held for review, Sent to review, Published without a check so that adoption and load are visible | P1 |
| 83 | Learnyst can view the wrong-flag and miss rates across all academies so that the quality of the AI check can be judged before it is widened | P1 |
| 84 | Learnyst can view moderation cost and latency by model and prompt version so that a model change can be judged rather than guessed at | P2 |
| 85 | Learnyst can view which academies have moderation switched on so that rollout can be tracked academy by academy | P2 |

## Fields named in these stories

| Row | View | Columns |
|---|---|---|
| 82 | Moderation volume across all academies | Academies using moderation, Content checked, Blocked before publishing, Held for review, Sent to review, Published without a check |

Where the HLD reads these numbers from (Firestore counters → the Proximity AI dashboard in `monitor`) →
[`../hld/15-measuring-quality.md`](../hld/15-measuring-quality.md).
