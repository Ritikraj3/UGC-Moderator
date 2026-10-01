# Settings

> Source: Spec — "Settings".

Under **Moderation → Settings**:

- master on/off
- content review mode
- moderation mode
- the four content areas
- exceptions
- repeated-post thresholds
- removals before a restriction
- holding a new learner's first posts (off by default, for free-signup academies)

## Resolution order

Settings resolve in one order, first answer wins:

```
  an exception for this product  →  the content area it belongs to  →  the academy
```

## Notifications

No notifications in v1 — the waiting count on the dashboard, plus a nudge when the queue goes untouched.

## The record

The record — every action, plus rule changes, mode changes and word-list edits.

> ⚠ Two gaps between documents, [`../open-items.md`](../open-items.md):
> - The User Stories resolve settings as *exception → academy*, with both modes academy-wide in v1 (C2).
> - Story row 6 (academy description, learner age group, tone of conversation) is not in this settings list (C12).
