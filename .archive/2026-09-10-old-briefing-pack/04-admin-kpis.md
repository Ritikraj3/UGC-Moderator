# Admin KPIs — and which framework to use

You asked whether we need a framework for this. **We don't need to build one — the
admin dashboard already has one.** But there's a catch, and it decides the design.

---

## 1. The framework that already exists

The admin repo has a metadata-driven analytics framework. You write a config file, not
a React page.

```
URL: /admin-v3/analytics-dashboard?id=<yourKey>
  → fetches your metadata
  → renders each component
  → each component fetches its own data
```

Component types are resolved by a **lookup map**, not a fixed union — and the map differs
by version. Corrected after the audit:

| Version | Available `componentType` values |
|---|---|
| **v2** (use this — `chartsVersion: 'v2'`) | `CHART`, `KPI`, `TABLE`, `KPI_CELLS`, `RECOMMENDATION` |
| v1 (legacy) | `DashboardChart`, `CHART`, `KPI`, `INSIGHTS_KPI`, `TABLE`, `CHART_BREAKOUT`, `KPI_CELLS` |

| Type | What it renders |
|---|---|
| `KPI` | A row of number tiles, with tooltips and trend arrows |
| `CHART` | Line, bar, pie or donut |
| `TABLE` | A table, with a "view all" link |
| `KPI_CELLS` | A scrollable strip of KPI cells |

I originally listed `BREAKOUT` as a v2 option — it isn't. `CHART_BREAKOUT` exists only
in v1. Anything unrecognised silently falls back to `CHART`, so a typo renders a chart
rather than an error.

Layout is just nesting — one object is a full-width row, an array is
side-by-side:

```ts
column_defs: [
  { ... },              // full width
  [{ ... }, { ... }],   // two side by side
  { ... },
]
```

There are already **78 dashboard config files** under
`src/graphql/lowCodeAdmin/metaData/analytics/` (plus `dashboard/`, `report/` and
`saasOptics/` subdirectories) built this way. If we use it, the KPI screen is **a config
file, not a feature**.

---

## 2. The catch

I traced how the framework fetches data (`graphql/graphs/common/hooks/chartHooksV2.ts`).
It calls `useQuery` / `useLazyQuery` with **no client specified** — so it uses the
default Apollo client, which is **Rails `/graphql`**.

The dashboard has three clients:

| Client | Points at | Used by analytics? |
|---|---|---|
| `client` | Rails `/graphql` | ✅ yes, this is the default |
| `dataEngineClient` | `/dataengine` | available |
| `adminAiClient` | our AI service | ❌ **no — only the AI Cofounder module uses it** |

**So the KPI framework cannot read from Proximity.** Our moderation data lives in
`proximity_db`, and the framework can't see it.

That's the whole decision point.

---

## 3. The two options

### Option A — mirror counters into Rails, use the framework

Proximity pushes a small daily rollup into a Rails table. The framework reads it like
any other dashboard.

```
proximity_db (cases, actions)
   │  nightly job — one row per school per day
   ▼
Rails table: community_moderation_daily
   │
   ▼
Rails query: communityModerationKpi
   │
   ▼
existing KPI/CHART framework  →  screen done
```

| | |
|---|---|
| Our work | A small nightly aggregation job |
| Rails work | One table + one query |
| Admin frontend work | **One metadata file** |
| Looks like | Every other Learnyst dashboard |
| Freshness | Yesterday, not live |

### Option B — custom page reading our service

A React page in `src/ui-web/communityModeration/metrics/` using `adminAiClient`.

| | |
|---|---|
| Our work | Just the GraphQL query (we need it anyway) |
| Rails work | **None** |
| Admin frontend work | Hand-built cards and charts, from scratch |
| Looks like | Whatever we build |
| Freshness | Live |

---

## 4. Recommendation: split it by audience

They're two different screens for two different people, so use the right tool for each.

| Audience | Option | Why |
|---|---|---|
| **School admin** — "is moderation keeping up?" | **A** | Numbers can be a day old. Should look like every other Learnyst dashboard. Nearly zero frontend work. |
| **Live queue counts** — "3 urgent waiting" | **B** | Must be live. Already on the queue screen, from the same query the queue uses. Not a dashboard number. |
| **Learnyst team** — "is the AI right?" | **B**, and eventually separate | Cross-school data. Does not belong in any one school's Rails tables. |

So: one metadata file for the school dashboard, live counts on the queue header, and a
gated block (or a separate internal page) for accuracy.

---

## 5. The KPIs themselves

### For the school admin — "is moderation working for my community?"

An admin should be able to answer *should I be worried?* in five seconds.

| KPI | Type | Why an admin cares |
|---|---|---|
| Posts screened (30d) | `KPI` | Proof it's running at all |
| % flagged | `KPI` | Is my community healthy or not |
| Hidden before anyone saw it | `KPI` | The core value: we caught it in time |
| Median time to verdict | `KPI` | How fast the AI *decides* |
| Median time to hidden | `KPI` | How fast the decision *lands* — verdict → Rails applied. **Row 47 asks for both** ("how long AI takes to decide **and hide**"); the earlier version of this doc measured only the first. They come apart when the Rails callback queue backs up, and that is exactly when you want to know |
| Waiting for me now (+ urgent) | `KPI`, **live** | Their actual to-do count |
| My median review time | `KPI` | Am *I* the bottleneck |
| Approved back after flagging | `KPI` | **How often the AI annoys my learners** |
| Flags by category | `CHART` bar | What kind of community do I have |
| Repeat authors | `TABLE` | Who keeps causing problems |

That last KPI matters more than it looks. "Approved back" is the number that tells an
admin whether to trust the queue. If it's high, they'll start ignoring it — and a
queue that gets ignored is worse than no queue.

### For the Learnyst team — "is the AI right?"

| KPI | Type | Meaning |
|---|---|---|
| False positive rate | `KPI` | Flagged, then approved back |
| False negative rate | `KPI` | Missed by AI, caught by a learner report |
| Confidence calibration | `KPI` | When it says 90%, is it right 90% of the time? |
| Appeal overturn rate | `KPI` | Tracked separately from first-pass accuracy |
| Errors and timeouts | `KPI` | All of which failed open |
| **Unreadable images routed to a human** | `KPI` | The count of "we could not read it, so a person looked". ⚠️ **Row 49 asks how often the AI "lets content through by mistake" — and the OCR fail-open hole produces exactly that, as a silent *clean* verdict that is neither an error nor a timeout.** Without the `01` §3b wrapper this metric reads 0.0% while the failure happens. This KPI is how you prove the wrapper is working |
| Cost per 1,000 posts | `KPI` | Watch it, don't optimise it yet |
| Category trend over time | `CHART` line | Is spam rising? |
| **Mode adoption across schools** | `KPI` | How many on Copilot vs Autopilot |

**Calibration is the one to explain if asked.** It's not "is the AI accurate" — it's "is
the AI honest about how sure it is". A model that says 95% and is right 60% of the time
is more dangerous than one that says 60%, because Layer 2 routes on confidence. If
confidence lies, the routing is wrong even when the classification is fine.

---

## 6. A real gap: cross-school metrics have no home

The last KPI — mode adoption across schools — **cannot live on a school's admin
screen.** Neither my UI nor the senior developer's solves this. Both put the
"Learnyst team" block inside a school's dashboard, which by definition only sees one
school.

Three ways out:

| Option | Note |
|---|---|
| A Learnyst-only internal page | Cleanest. The admin repo has `LEARNYST_SYSTEM_ADMIN` and a `saasOptics/` area for exactly this kind of platform-wide metric |
| A Langfuse / Amplitude dashboard | Fastest. We already send events to both. Not in the product, which is fine for an internal number |
| Skip in M1 | Honest. Nobody needs it on day one |

**Recommendation, revised:** ⚠️ **row 48 is HIGH and names mode adoption explicitly**, so
"skip in M1" is no longer a free choice — it is a conscious cut that Product has to make.

The honest position to take into the review:

> The four accuracy numbers on row 48 — wrong in both directions, calibration, category
> trend — all come from our own data and we can ship them. **Mode adoption is the one
> that cannot live on a school's dashboard**, because a school only ever sees itself. It
> needs an internal page. `saasOptics/` is where platform-wide metrics already live and
> is the natural home, and the admin repo already has `LEARNYST_SYSTEM_ADMIN` to gate it.
> That's a small internal page, not a product feature — but it is not zero, and it is not
> in the M1 list today.

Cheapest interim: an Amplitude or Langfuse dashboard. We already send events to both, and
an internal number does not have to live in the product.

---

## 7. What a metadata file looks like

So you can show it's genuinely small:

```ts
export const communityModerationInsights = {
  key: 'communityModerationInsights',
  page_props: {
    heading: 'Community Moderation',
    description: 'How AI moderation is performing for your community.',
    chartsVersion: 'v2',
  },
  column_defs: [
    {
      id: 'moderationKpi',
      componentType: 'KPI',
      apiProps: {
        queryKey: 'communityModerationKpi',
        queryFields: ['screened', 'flaggedPct', 'hiddenPreView',
                      'medianVerdictSec', 'queueWaiting', 'approvedBackPct'],
        queryArgs: { communityId: 'ID!' },
        queryArgsValues: { communityId: 'var_communityId' },
        hasNodes: true,
      },
      componentProps: {
        type: 'insightBasedKpi',
        showToolTip: true,
        KPIDefs: [
          { accessor: 'screened',        label: 'Posts screened',   type: 'number' },
          { accessor: 'flaggedPct',      label: 'Flagged',          type: 'percentage' },
          { accessor: 'hiddenPreView',   label: 'Hidden in time',   type: 'percentage' },
          { accessor: 'medianVerdictSec',label: 'Time to decide',   type: 'number' },
          { accessor: 'queueWaiting',    label: 'Waiting for you',  type: 'number' },
          { accessor: 'approvedBackPct', label: 'Approved back',    type: 'percentage' },
        ],
      },
    },
    // + a CHART for categories, a TABLE for repeat authors
  ],
}
```

That's the whole screen. One file, deployed with the existing metadata push script.

---

## 8. One warning about the numbers

The senior developer's artifact shows **median review time of 2.4 minutes**. That
assumes an admin sitting on the queue all day. A school admin checks their community
when they get around to it — realistically hours, sometimes a day.

Fine as a mock. Dangerous if it becomes a target, because then we'd be measuring the
admin instead of the system. Pick the baseline from real data once we have it, and
don't put an SLA on it in M1.

---

## Summary

| Question | Answer |
|---|---|
| Do we need to build a KPI framework? | **No.** One exists. The v2 map is exactly `CHART` · `KPI` · `TABLE` · `KPI_CELLS` · `RECOMMENDATION` — verified in `AnalyticsDetailsRendererV2.tsx`. `CHART_BREAKOUT` is **v1 only**, and an unrecognised type silently renders a `CHART` rather than erroring. |
| Can it read our AI service? | **No.** It reads Rails `/graphql` only. |
| So what do we do? | Mirror daily counters into Rails for the school dashboard; keep live counts and Learnyst accuracy on our own service. |
| Extra Rails ask? | One table, one query. Small — and it buys the whole screen. |
| Frontend work for the school dashboard? | One metadata config file. |
