# §5 Content review mode

> Source: HLD §5.

Set per academy, then per content area — the four places a learner can write:

| Content area | What is in it |
|---|---|
| **Product discussions** | The discussion under any course, bundle, batch, mock test, test series, ebook, webinar, free resource, podcast or custom product |
| **Community** | Posts and comments |
| **Feeds** | Posts and comments |
| **Newsfeed** | Discussions |

Four rows however many courses the academy has. A single product that needs to differ from its area is an
exception — rare, listed in Settings, and removable.

| | Review first | Publish first |
|---|---|---|
| **The moment they post** | Held. Only the author sees it, marked waiting for review | Live. Everyone sees it |
| **A second later, clean** | Published | Nothing happens |
| **A second later, breaks a rule** | The rule's action applies. Nobody else ever saw it | The rule's action applies. It comes down |
| **The learner sees** | Waiting for review, then the outcome | Their post, then a note if it was taken down |
| **Suits** | Under-18 academies, free signup, small or new communities | Busy communities |
| **The cost** | Every post takes a second or two to appear — minutes or hours for anything a person must confirm | Bad content is visible for a second or two, longer if the check is delayed |

**Default: review first.** It is the safer starting point, and an academy that finds it slow can switch.

## Content review mode × moderation mode

This is a different question from the moderation mode. The content review mode decides whether content appears
before or after the check. The moderation mode — Autopilot, Copilot, AI disabled — decides who acts on a flag
once it is raised:

| Combination | What it feels like |
|---|---|
| **Review first + Autopilot** | Safest automatic setup. Bad content never appears; clean content appears in a second |
| **Review first + Copilot** | Strictest. Every flagged post waits for a person — hours, in practice |
| **Publish first + Autopilot** | Self-cleaning feed. Bad posts appear briefly, then vanish |
| **Publish first + Copilot** | Today's world plus evidence — nothing is removed until a person says so |
| **Either + AI disabled** | The AI never runs. Blocked words and learner reports only |

> ⚠ "Set per academy, then per content area" matches the spec. The User Stories say academy-wide in v1. See
> [`../open-items.md`](../open-items.md) C2.
