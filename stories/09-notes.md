# Notes

> Source: User Stories — "Notes · How rules and blocked words work" and "Notes · Review first or publish first".

## How rules and blocked words work

A rule carries a description the AI judges against, and a list of blocked words — words or web addresses that
stop content on sight with no AI check. Blocked words are added inside the rule; there is no separate list.
Either one stopping content names the same rule to the learner.

A rule can run on blocked words alone with AI checking off, on AI alone with no blocked words, or on both.

A new rule starts as a draft and does nothing until it is published. Unpublishing takes it back to draft — the
rule and its blocked words are kept.

A rule applies from the moment it is published. Content posted before that is never re-checked against it — the
Teacher is warned of this when they publish or reword a rule.

A blocked word can be a **word** — `idiot`, matched through disguises like `1d10t` — or a **web address** —
`rivalacademy.com`, which also covers `www.rivalacademy.com/neet`. **Added by** is Learnyst or Academy; a Learnyst
word the academy deletes stays deleted for them, even when Learnyst updates the defaults.

## Review first or publish first

Every check runs the same way — the content is submitted and the verdict comes back about a second later. The
setting decides what the learner sees in that second.

| | Review first | Publish first |
|---|---|---|
| **The moment they post** | Held. Only the author sees it, marked waiting for review | Live. Everyone sees it |
| **A second later, clean** | Published | Nothing happens |
| **A second later, breaks a rule** | The rule's action applies. Nobody else ever saw it | The rule's action applies. It comes down |
| **Suits** | Under-18 academies, free signup, small or new communities | Busy communities |
| **The cost** | Every post takes a second or two to appear | Bad content is visible for a second or two |

This is a different question from the moderation mode. The content review mode decides whether content appears
before or after the check; the moderation mode decides who acts on a flag once it is raised.

Both are set once for the academy. The four places only decide where moderation runs at all — they do not carry
their own mode. One product that has to differ is an exception.

**Not in v1:** a different mode per place — Community strict while Feeds run loose. Left out on purpose; revisit
when an academy actually asks for it.

> ⚠ The spec and HLD set both modes "for the academy, then per content area". See
> [`../open-items.md`](../open-items.md) C2.
