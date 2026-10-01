# Blocked words and links · Languages

> Source: Spec — "Blocked words and links" and "Languages".

## Blocked words and links

One list per academy, pre-filled by Learnyst, fully editable — Learnyst's own words included, and a removal
sticks even when we update the defaults. Academies add rival names and web addresses.

A blocked word does nothing on its own. It is attached to a rule, and the rule's action is what happens when it
matches.

The list holds normal words; the matching handles disguises. One entry `idiot` covers `1d10t`, `id**t`,
`IDIOT`, `i d i o t`.

> ⚠ Two cross-document questions touch this section, [`../open-items.md`](../open-items.md) C4–C6:
> - The flow in [03-how-it-works.md](03-how-it-works.md) shows a blocked word leading to **BLOCK**, while this
>   section says the rule's action applies.
> - The User Stories say "there is no separate list".

## Languages

Learners write in **Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi and Hinglish**. The AI reads all
of them. A word list only catches what's typed into it, so Learnyst's list ships with romanised Hindi and
regional terms too.

Languages promised at launch (from [12-decisions.md](12-decisions.md)): English, Hindi, Hinglish, the big
regional ones. Test each before launch.
