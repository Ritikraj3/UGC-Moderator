# Rules

> Source: Spec — "Rules".

The academy writes its rules in plain English and the AI enforces exactly those.

## What a rule is made of

Each rule: **name** · **description** · **blocked words** attached to it · **AI checking** on/off · **action** ·
**the wording learners see when reporting**.

Checked by words, by AI, or both. Words-only still works with the AI disabled — useful for *"no asking for exam
answers"*. Neither, and the rule is published to learners as a report reason but nothing is checked.

## The four actions

| Action | Goes live? | To the queue? | Learner told |
|---|---|---|---|
| **Guidance** | Yes | No | A gentle note |
| **Report** | Yes | Yes | Nothing |
| **Hold** | No | Yes | Which rule it's being checked against |
| **Block** | No | No | The rule, and why |

## The nine ready-made rules

Nine rules ship ready-made and switched on:

| # | Rule | Action |
|---|---|---|
| 1 | Be civil — no insults, bullying or personal attacks | Block |
| 2 | No hate speech — caste, religion, gender, disability, origin | Block |
| 3 | No sexual content | Block |
| 4 | No threats or violence | Block |
| 5 | No self-harm content | Hold |
| 6 | No spam or advertising | Block |
| 7 | No scams or fraud | Block |
| 8 | No sharing phone numbers, emails or outside links | Hold |
| 9 | No promoting other academies, coaching centres or courses | Block |

> ⚠ The User Stories' system rule 1 says a new academy starts with **ten** Learnyst rules. See
> [`../open-items.md`](../open-items.md) C1.

Academies reword, re-action, switch off or add their own. Rules are written once for the academy; a content area
or an exception can override any of them.

## Lifecycle

- **Draft → published.** A rule must be published before it is enforced. Draft rules do nothing, and
  unpublishing one stops it without deleting it.
- **Forward only.** Rules apply going forward. Publishing or rewording a rule never re-checks posts that are
  already up — the Teacher is warned of this when publishing.
- **Numbering.** Numbered in creation order — no reordering, no priority. Break two rules and the most severe is
  named.

## Why some rules are set the way they are

- **5 and 8 are Hold on purpose.** Self-harm needs a person. A shared phone number looks the same from a study
  group or a poacher.
- **9 is the edtech one.** A rival posts *"join XYZ Academy, lower fees"* — the AI catches it unnamed, the word
  list catches it named. Nothing catches *"DM me"*; direct messages are v2.
