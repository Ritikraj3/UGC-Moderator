# §17 Rollout

> Source: HLD §17.

1. **Shadow mode** — publish first with enforcement off. Rails submits, records what the verdict would have been,
   acts on nothing. The counters still fill, so the wrong-flag rate is known before anyone is stopped.
2. **Pilot academies** — enforcement on, review first, per-academy flag.
3. **Widen** once the wrong-flag rate holds under 5%.

For comparison, the spec's decisions table ([`../spec/12-decisions.md`](../spec/12-decisions.md)) gives rollout as:
*Shadow mode → Copilot on pilot academies → Autopilot once wrong flags hold under 5%.* See
[`../open-items.md`](../open-items.md) C11.
