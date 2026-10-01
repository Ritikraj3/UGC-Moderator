# Decisions

> Source: Spec — "Decisions".

| Question | Decision |
|---|---|
| Configured per product, or per place? | Per content area. Four rows, however many products exist. A product that must differ is an exception |
| Does the learner wait for the check? | No. Every check is asynchronous. Review first holds the post until the verdict; publish first lets it through and pulls it back |
| Default content review mode | Review first — safer for an academy that has not tuned its rules yet |
| Are old posts re-checked when a rule changes? | No. Rules apply going forward, and the Teacher is warned when publishing |
| Can a learner appeal? | No. Blocked posts can be fixed and reposted; removed posts come with the rule |
| Who can ban? | Teachers only. It affects a course the learner paid for |
| How long is removed content kept? | 90 days |
| Is a blocked post stored? | Yes, as a moderation record — never as a post, never restorable |
| Learnyst re-adds a word an academy deleted? | Stays deleted for that academy |
| Do we check whether a link is safe? | Not in v1. The AI already reads the address |
| Direct messages? | v2. Until then "message me" gets through, and we say so |
| Languages promised | English, Hindi, Hinglish, the big regional ones. Test each before launch |
| Rollout | Shadow mode → Copilot on pilot academies → Autopilot once wrong flags hold under 5% |
