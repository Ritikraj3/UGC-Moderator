# §11 Inside the check

> Source: HLD §11.

**Instructor, not an agent.** `src/shared/libs/instructor.ts` with `INSTRUCTOR_LLM`
(`google/gemini-2.5-flash-lite`, thinking disabled). Closed-enum classification, strict schema. No grounding, no
tools, no memory, no Mastra workflow.

One pass produces both the classification and the reason sentence.

```
{ breaks_rule: boolean,
  rule_id: string | null,     // must be one of the rules sent
  reason: string,             // ≤ 200 chars, admin-facing
  confidence: "low" | "medium" | "high" }
```

A rule id Rails didn't send is treated as no match. **The model cannot invent a rule.**

## The classifier interface

The model sits behind one interface. `classify(payload) → verdict` — one function, one verdict shape:

| | What it is | Status |
|---|---|---|
| **Live call** | One Vertex request per check, ~1s | Today |
| **Batch** | Vertex batch API — many checks in one job, roughly half the price, minutes not seconds | Possible now that nothing waits on the answer. Fits catchup |
| **Self-hosted** | An open-source model on our own hardware, no per-call cost | Same. Swap it in behind the interface |

Because every verdict arrives by webhook, swapping the implementation changes no Rails code and no contract field.
The counters in [§15](15-measuring-quality.md) carry `model` and `prompt_version`, so a swap can be judged rather
than guessed at.
