# System rules

> Source: User Stories — "System rules".

| # | Rule |
|---|---|
| 1 | A new academy starts with the ten Learnyst rules published and the Learnyst blocked-word list active. No setup needed before moderation works. |
| 2 | A Learnyst rule or blocked word the academy deletes stays deleted for them, even when Learnyst updates the defaults. |
| 3 | Rules are written once for the academy and apply everywhere moderation runs. |
| 4 | A rule applies from the moment it is published. Content posted before is never re-checked against it, and the Teacher is warned of this when publishing or rewording a rule. |
| 5 | Settings resolve in one order: an exception for the product, then the academy. Content review mode and moderation mode are academy-wide in v1 — the four places only decide where moderation runs at all. |
| 6 | Rules are written only in Rules. An exception can switch a rule off for one product, never create one. |
| 7 | Content stopped by a blocked word names the same rule to the learner as content caught by the AI. |
| 8 | A learner always sees the academy's own rule wording, never machine-written text. |
| 9 | Self-harm content never names a rule to the learner. |
| 10 | A restriction counts confirmed removals only, never flags. |
| 11 | Every moderation action is recorded, including content that was stopped and never published. |
| 12 | Removed content is kept and restorable for 90 days. |
| 13 | A ban is scoped — one product, or the whole academy. A restriction is always academy-wide. |
| 14 | A ban never touches enrolment. A banned learner keeps access to their paid course content; they just cannot post. |
| 15 | Every check runs the same way. Review first holds content until the verdict arrives; publish first lets it through and takes it down if it breaks a rule. Default is review first. |
| 16 | A restricted learner is always held for review, whatever the content review mode says. |
| 17 | Every listing is filterable and paginated. Reports that list products show only products with activity in the period. |
| 18 | Moderation permissions are academy-wide. A Teaching Assistant sees the whole queue and filters it by product; per-product staff assignment is not in v1. |
| 19 | Banning a learner from the academy replaces any product ban they already have. Lifting it clears both. |
| 20 | Restrict and ban are done from the queue, beside the content that caused them. Restrictions & bans is the list and the undo. |

> ⚠ Rule 1 ("ten Learnyst rules") and rule 5 ("exception → academy") differ from the spec. See
> [`../open-items.md`](../open-items.md) C1 and C2.
