# §7 Flow — a learner reports a post

> Source: HLD §7.

**Today** the Report button raises a help-desk ticket — `createSupportTicket`, category `48`,
`detailInfo.supportType: 9`, with the content id inside free-text JSON.

That cannot be the moderation record:

| Why not | |
|---|---|
| **The content link is untyped JSON** | No foreign key, no index. Rails can't count reports per post, which the queue and the thresholds both need |
| **The lifecycle is support-shaped** | `TICKET_OPEN`, `ESCLATED_TO_LEARNYST`, `TECH_TEAM_ANALYSIS` — none map to approve, remove, restore |
| **Tickets escalate to Learnyst** | An academy's moderation decisions should not enter Learnyst's support queue |

**So: a `content_report` record in Rails.** The existing button stays; it points at a new mutation carrying the
content reference and the rule the learner picked. **No AI call** — a report is a human saying something is wrong.

A report is also a quality signal. Content the AI passed and a learner then reported is the only way we learn
about a miss — see [§15](15-measuring-quality.md).

*Open item in [§19](19-open-items.md): cutover for the Report button — does anything still need to reach the help
desk?*
