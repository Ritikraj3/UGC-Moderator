# Admin UI plan: the five moderation screens before Rails is ready

> **PROPOSED v1**, 2026-10-03. Owner: admin frontend. Repo: `learnyst-admin/admin`.
> **M0–M8 coded 2026-10-03** (not committed) in worktree `learnyst-admin/admin-moderation`, branch
> `feat/ai-moderation-admin`. The working copy, with what is built and the D1 list as confirmed by the M0
> spike, is `docs/plans/ai-moderation-admin.md` there — keep that one current. Routes and metadata keys
> below are as built. **Changed 2026-10-03 at the user's request:** the review queue is four framework
> tables with KPI tiles, a row opens an item page, Reports is five report tables, and every moderation page opens inside the admin sidebar.
> Screens and fields come from the stories, spec and HLD (row numbers are story rows). The API shapes are the
> GraphQL contracts in [`../rails-support/api-contracts/`](../rails-support/api-contracts/README.md).
> Routes, files and the hardcoded-data layer are this plan's own proposal. **No code until "code it".**

## 1. The idea in five lines

1. **Five screens** (HLD §1: "queue, rules, settings, restrictions & bans, reports"), built the way the admin repo
   builds everything. Tables, settings and dashboards are **metadata**; screens the framework can't draw are custom React.
2. **Hardcoded data lives in one place:** a dev-only "mock link" inside the GraphQL client. Every page, metadata or
   custom, sends the **real** contract query. The mock link answers it from fixtures instead of Rails.
3. **The swap is a switch, not a rewrite, even if Rails changes the API.** The contracts are our best guess, not a
   promise, so screens never read raw API data. Each area's query files and one adapter file turn API data into what the
   screen shows. When Rails ships something different, only those files change (for framework pages, the layout file's
   field list). A drift check lists every difference against Rails' real schema, and each area switches to Rails on its
   own ([§2.1](#21-ready-for-rails-to-differ-from-the-contracts)).
4. **Most contracts fit as they are.** The three list tables and five row-action mutations need small shape changes
   so the table framework can call them ([§7](#7-contract-fit-what-rails-must-match)). That is decision D1.
5. **Nothing is touched on your current checkout.** Work goes in a separate worktree on its own branch.

## 2. How the hardcoded data works

```
                       ┌──────────────── today ────────────────┐
Page ── real GraphQL ──► errorLink ──► moderationMockLink ──► (answers from fixtures + in-memory store)
query/mutation                              │
                                            └─ not a moderation operation → httpLink → backend (unchanged)

                       ┌──────────── when Rails is ready ───────┐
Page ── same query ───► errorLink ──► httpLink ──► Rails          (mock link off, then deleted)
```

- **Insertion point:** `src/graphql/apolloClient.ts:74`. The default `client`'s chain becomes
  `from([errorLink, moderationMockLink, httpLink])`, and only when `import.meta.env.DEV` and `VITE_MODERATION_MOCKS` is
  set (`all`, or a list of areas, [§2.1](#21-ready-for-rails-to-differ-from-the-contracts)).
  The flag lives in `.env.development.local`, which is already git-ignored. A production build never contains it.
- **What it answers** (by operation name, and only for moderation):
  - The metadata queries `${key}Meta` and `ChartsMeta`. It serves the local metadata files, so **nothing has to be
    pushed to the backend during development.** Today metadata always comes from the backend.
  - Table data, `${key}`. It reads the tab and paging arguments from the query text and applies search, filters and paging.
  - Settings fetch and save.
  - Every custom-page query and mutation from the contracts.
- **The in-memory store makes the actions real.** Approve moves an item to Done. Remove bumps the learner's count and
  can raise the ban prompt. Publish changes a rule's status. A reload resets everything.
- **Errors go through the real error path.** The mock link sits after `errorLink`, so contract errors such as
  `INVALID_ITEM_STATE` and `RESTORE_WINDOW_EXPIRED` show exactly as Rails' will.
- **Dev knobs** in `localStorage.moderationMock`:
  - `scenario`: `full` · `empty` · `error` · `slow`
  - `role`: `teacher` · `ta`

  So you can test empty, error and loading states, and Teaching Assistant rights, without changing code.
- **Fixtures are in the API's shape**, typed from the contracts (`moderationApiTypes.ts`), so the adapters run in
  development exactly as they will against Rails. Fixtures contain **synthetic content only**.

### 2.1 Ready for Rails to differ from the contracts

The rails-support contracts are a proposal. Rails can rename fields, change arguments, split or merge calls, or ship
areas at different times. Four things keep that contained:

| Guard | What it is | What changes when Rails differs |
|---|---|---|
| **Screen models** | Screens use our own types (`moderationViewTypes.ts`: `QueueRow`, `RuleForm`, …), never the API's. A component never sees an API field name | nothing in the screens |
| **Adapters** | One file per area (`adapters/queueAdapters.ts`, …): API response → screen model, and form values → mutation input. Enum values (for example `AI_CHECK` → "AI check") are mapped here | the adapter for that area |
| **Queries in one place** | Every GraphQL document lives in `queries/` or `mutations/`. Nothing is written inline in a component. Framework pages name their fields only in their layout file (`query_keys`, `accessorKey`, `mutationKey`) | that area's query file, or its layout file's field list |
| **Drift check** | `scripts/moderation/checkModerationDrift.ts` loads Rails' GraphQL schema (introspection on the dev backend, or `api-contracts/schemas/graphql/schema.graphql`). It validates every moderation query and mutation against it, including the queries the table framework builds from the layout files. Output: each missing field, renamed argument or wrong type, by file | it tells you which of the files above to fix, in minutes, before anything is switched on |

**Switching on per area.** `VITE_MODERATION_MOCKS` takes a list, not just true/false: `all`, or for example
`queue,reports`, which keeps only those two areas on hardcoded data. The areas are `queue`, `rules`, `settings`,
`limits` and `reports`. If Rails ships rules first, rules go live while the queue stays on mocks. When the list is
empty, every area talks to Rails.

What a Rails change costs, by kind:

| Rails ships… | Files you touch |
|---|---|
| a renamed field | query file + adapter (custom page), or the layout file's `query_keys`/`accessorKey` (framework page) |
| a renamed argument or input field | query/mutation file + the adapter's input mapping |
| a different enum value | the adapter's enum map |
| one call split into two, or two merged | that area's query file + hook + adapter. The screen stays the same |
| a different list shape (not `nodes`/`pageInfo`) | the adapter (custom page). For a framework page, see D1 |
| a field we need is missing | a screen change. The drift check shows it before go-live, so it goes back to Rails as a question |

## 3. Which framework each screen uses

| Screen | Built as | Why |
|---|---|---|
| **Review queue** + actions | Custom page `src/ui-web/moderation/reviewQueue/` | "Three panes: the list, the content in its thread, and who wrote it" (spec 08), plus the member panel and the ban prompt. The table framework draws one table, not three panes |
| **Rules** list | List metadata `moderationRules` + `moderationDraftRules` (v3, one per tab) | A plain table with row actions, which is what the framework is for |
| **Add / edit rule** | Custom page `src/ui-web/moderation/ruleEditor/` | One form with an action picker, a blocked-words list inside it, a test panel and a publish warning. A settings form can't hold a list inside it |
| **Settings** | Settings metadata `moderationSettings` | Switches, radios, text and numbers, which are standard settings fields |
| **Restrictions & bans** | List metadata `listModerationMemberLimits` (v3) | A plain table with Lift actions |
| **Reports** | Analytics metadata `moderationReports` + list metadata `listModerationLogEntries` | Summary tiles plus three tables match the analytics framework. The log is a long filtered list |

Repo note: `.claude/CLAUDE.md:104` says custom UI goes in `src/features/`. `.claude/conventions/custom-pages.md` says
`src/ui-web/<feature>/` and "Do NOT create a `src/features/` folder". `src/features/` doesn't exist, so this plan
follows the conventions file.

## 4. Page routes

All routes follow the house pattern: a `/admin-v3/` prefix, `?id=<metadataKey>` for metadata pages, and `create` /
`edit/:id` for forms (like `/admin-v3/community/create` and `/admin-v3/community/edit/:id`).

| # | Screen | Route | Renders |
|---|---|---|---|
| 1 | **Review queue** (Moderation's landing screen, spec 08) | `/admin-v3/moderation/queue?id=moderationQueueNeedsReview&tab=NEEDS_REVIEW` (tabs: `moderationQueueReported` · `moderationQueueUnchecked` · `moderationQueueDone`) | `ReportsTableWrapper` (list metadata, KPI tiles, Approve / Remove row actions) |
| 1a | Queue item (thread, member panel, decisions) | `/admin-v3/moderation/queue/item?itemId=<id>&tab=<tab>` | `QueueItemPage` (custom) |
| 2 | **Rules** | `/admin-v3/moderation/rules?id=moderationRules&status=PUBLISHED` (Drafts tab: `id=moderationDraftRules&status=DRAFT`) | `ReportsTableWrapper` (list metadata) |
| 2a | **Add rule** | `/admin-v3/moderation/rules/create` | `RuleEditorPage` (custom) |
| 2b | Rule detail and edit (words, test) | `/admin-v3/moderation/rules/edit?ruleId=<id>` (the table framework's row links add query parameters) | `RuleEditorPage` (custom) |
| 3 | **Settings** ("Moderation → Settings", spec 11) | `/admin-v3/moderation/settings?id=moderationSettings&group=default&page=moderation` | `SettingsContainer` (settings metadata) |
| 4 | **Restrictions & bans** | `/admin-v3/moderation/restrictions?id=moderationRestrictions&kind=RESTRICTED` (Banned tab: `id=moderationBans&kind=BANNED`) | `ReportsTableWrapper` (list metadata) |
| 5 | **Reports** (five tabs: Summary by area · Rule performance · Product activity · Problem members · Moderation log) | `/admin-v3/moderation/reports?id=moderationSummaryByArea` (other tabs: `moderationRulePerformance` · `moderationProductActivity` · `moderationProblemMembers` · `moderationLogEntries`) | `ReportsTableWrapper` (list metadata; period = the table's date filter) |

Queue URL parameters keep the view shareable: `tab` (`needs_review` · `reported` · `unchecked` · `done`),
`contentArea`, `productId`, `ruleId`, `decision` (Done only), `dateFrom`, `dateTo`.

**Sidebar:** in the **Engage** group, after Community, add a **Moderation** submenu in `getRootSidebarMenuList.tsx`
(about :346–366, `isSubMenu` + `subMenuList`). Its items are Review queue, Rules, Restrictions & bans, Reports and Settings.
For now it shows only when the mocks are on. Later it is gated on a school-config flag (D2). Sub-admins get it through
a new permission in `dashboardSidebar.ts` once roles are settled (D3).

## 5. File architecture

`NEW` is a new file. `EDIT` is a small change to an existing file.

```
learnyst-admin/admin/                                (worktree: learnyst-admin/admin-moderation)
├── .env.development.local                            VITE_MODERATION_MOCKS=all   (or e.g. queue,reports; git-ignored)
├── scripts/moderation/checkModerationDrift.ts        NEW   validates every moderation query against Rails' schema (§2.1)
├── src/
│   ├── bundles/common/
│   │   ├── routes/moderationRoutes.ts                NEW   every /admin-v3/moderation/* route (§4)
│   │   ├── routesBundle.ts                           EDIT  +1 import, +1 spread
│   │   └── utils/getRootSidebarMenuList.tsx          EDIT  Engage → Moderation submenu (gated)
│   │
│   ├── graphql/
│   │   ├── apolloClient.ts                           EDIT  dev-only mock link in `client`'s chain (1 line + import)
│   │   ├── modules/moderation/
│   │   │   ├── moderationApiTypes.ts                 NEW   API shapes (from the contracts; updated to Rails' real ones)
│   │   │   ├── moderationViewTypes.ts                NEW   screen models: what components use, never API fields
│   │   │   ├── adapters/                             NEW   API → screen model, form → mutation input, enum maps
│   │   │   │   ├── queueAdapters.ts · memberAdapters.ts · ruleAdapters.ts
│   │   │   ├── queries/
│   │   │   │   ├── moderationQueueQueries.ts         NEW   ListModerationQueueItems · ShowModerationQueueItem · ShowModerationQueueSummary
│   │   │   │   └── moderationRuleQueries.ts          NEW   ShowModerationRule · ListModerationBlockedWords
│   │   │   ├── mutations/
│   │   │   │   ├── moderationQueueMutations.ts       NEW   Approve · Remove · Restore · MarkExample (P2)
│   │   │   │   ├── moderationMemberMutations.ts      NEW   RestrictLearner · BanLearner · RemoveBannedLearnerContent
│   │   │   │   └── moderationRuleMutations.ts        NEW   Create/Update/Publish/Unpublish/Delete rule · word CRUD · TestRule · TestBlockedWord
│   │   │   ├── hooks/
│   │   │   │   ├── useReviewQueue.ts                 NEW   list + summary + tab/filter state from the URL
│   │   │   │   ├── useQueueItem.ts                   NEW   item, thread, member, versions, reports
│   │   │   │   ├── useQueueActions.ts                NEW   approve/remove/restore/restrict/ban + refetch + ban prompt
│   │   │   │   └── useRuleEditor.ts                  NEW   load/save/publish a rule, its words, its test
│   │   │   └── mocks/                                NEW   ← ALL hardcoded data; deleted at the swap
│   │   │       ├── moderationMockLink.ts                   answers the mocked areas' operations, forwards the rest
│   │   │       ├── moderationMockStore.ts                  in-memory state that mutations change
│   │   │       ├── moderationMockMeta.ts                   serves ${key}Meta / ChartsMeta from the local metadata
│   │   │       ├── moderationMockScenarios.ts              full · empty · error · slow; teacher · ta
│   │   │       └── fixtures/
│   │   │           ├── queueItemsFixtures.ts               every whyStopped source, Unchecked, Done, a 91-day-old removal
│   │   │           ├── queueItemDetailFixtures.ts          threads, member panels, edit history, learner reports
│   │   │           ├── rulesFixtures.ts                    Learnyst rules + academy rules (one draft), rule 5 self-harm
│   │   │           ├── blockedWordsFixtures.ts             words and web addresses, Learnyst and academy
│   │   │           ├── settingsFixtures.ts                 the academy's moderation settings
│   │   │           ├── memberLimitsFixtures.ts             restricted (auto / by Teacher), product ban, academy ban
│   │   │           ├── reportsFixtures.ts                  summary, rule performance, product activity, problem members
│   │   │           └── logEntriesFixtures.ts               the moderation log
│   │   │
│   │   └── lowCodeAdmin/metaData/                    submodule learnysthq/metaData → its own PR
│   │       ├── list/listModerationRules.ts           NEW   Rules table
│   │       ├── list/listModerationMemberLimits.ts    NEW   Restrictions & bans table
│   │       ├── list/listModerationLogEntries.ts      NEW   Moderation log
│   │       ├── settings/moderationSettings.json      NEW   Settings form
│   │       └── analytics/report/moderationReports.ts NEW   Reports dashboard
│   │
│   ├── pages/moderation/index.tsx                    NEW   thin wrappers (the house pattern for pages)
│   │
│   ├── ui-web/moderation/                            NEW   custom screens (conventions/custom-pages.md)
│   │   ├── reviewQueue/
│   │   │   ├── ReviewQueuePage.tsx                         three panes, tabs, header
│   │   │   ├── ReviewQueueConstants.ts                     tabs, why-stopped labels, filter options
│   │   │   ├── ReviewQueueUtils.ts                         waiting time, which actions a status allows
│   │   │   ├── reviewQueueTypes.ts
│   │   │   ├── queueList/       QueueHeader.tsx · QueueFilters.tsx · QueueList.tsx · QueueListRow.tsx
│   │   │   ├── queueItem/       QueueItemPane.tsx · ThreadView.tsx · EditHistory.tsx · LearnerReports.tsx · QueueItemActions.tsx
│   │   │   └── memberPanel/     MemberPanel.tsx · RestrictDialog.tsx · BanDialog.tsx · BanPrompt.tsx
│   │   └── ruleEditor/
│   │       ├── RuleEditorPage.tsx                          create, edit, publish
│   │       ├── RuleEditorConstants.ts · RuleEditorUtils.ts · ruleEditorTypes.ts
│   │       ├── ruleForm/        RuleForm.tsx · RuleActionPicker.tsx · PublishWarningDialog.tsx
│   │       ├── blockedWords/    BlockedWordsList.tsx · BlockedWordForm.tsx · BlockedWordTest.tsx
│   │       └── ruleTest/        RuleTestPanel.tsx
│   │
│   └── res/locales/en/moderation.json                NEW   + register in en/index.ts (namespace `moderation`)
│
└── tests/e2e/moderation.spec.ts                      NEW   Playwright smoke with the mocks on
    (unit tests in __tests__/ next to the code, as in src/dataTable/__tests__/)
```

Naming follows the conventions file: camelCase folders, PascalCase components, and `<Component>Utils.ts`,
`<Component>Constants.ts`, `<feature>Types.ts` instead of generic names. UI is built from the existing shadcn
molecules (`src/shadcn/`, `SHADCN_COMPONENTS.md`). A new molecule is created only if one is missing.

## 6. The screens

### 6.1 Review queue: `/admin-v3/moderation/queue`

| Part | What it shows or does | Source | Contract |
|---|---|---|---|
| Header | Amount waiting, plus how long the oldest has waited | rows 43–44 | `ShowModerationQueueSummary` |
| Tabs | Needs review · Reported · Unchecked · Done, with counts | spec 08, row 45 | summary counts |
| Filters | Content area, product, rule, date. Decision on Done | spec 08 | `ListModerationQueueItems` args |
| Row | Content, Rule broken, Why it was stopped, Learner, Product, Where it is, Status, Waiting time. **Approve** and **Remove** on the row. "edited after being held" flag | row 36, spec 08, spec 07 | `ListModerationQueueItems` |
| Item pane | Content in its thread · edit history · learner reports (Reported tab) | rows 37, 39 | `ShowModerationQueueItem` |
| Item actions | Approve (40) · Remove (41) · Restore (42) · Mark as example (46, P2) | rows 40–42, 46 | Approve/Remove/Restore/MarkModerationExample |
| Member panel | Joined, courses, posts written, past actions, current restriction | row 38 | `ShowModerationQueueItem.member` |
| Member actions | Restrict (47) · Ban from one product (48) · Ban from the academy (49) · Remove a banned learner's content (50) | rows 47–50 | RestrictLearner · BanLearner · RemoveBannedLearnerContent |
| Ban prompt | "5 posts removed — ban this member?" after a removal | spec 08 | `RemoveModerationContent.learnerConfirmedRemovals` |

**What each status allows** (from the contracts):
- Approve: PENDING only.
- Remove: PENDING or APPROVED.
- Restore: REMOVED, within 90 days.
- Mark as example: APPROVED or REMOVED.

Buttons that a status doesn't allow are hidden. The contract's error message still shows if the item changed meanwhile.

**Teaching Assistant:** can view, approve, remove, restore and restrict. Cannot ban, use row 50 or mark examples (stories/04).

### 6.2 Rules: `/admin-v3/moderation/rules`, plus `/create` and `/edit/:ruleId`

- **List** (row 18):
  - Columns: Rule name ("Rule 6"), Checked by, What happens when it is broken, Status.
  - Tabs: Published · Drafts.
  - Row click opens the editor. The header button is **Add rule**.
  - Row actions: Publish (23) · Unpublish (25) · Delete own rule (22, P2).
  - Publish confirms with "it applies only to content posted from now on" (row 24).
- **Add or edit** (row 17, rows 20–21):
  - Rule name\* (1–200), What it means\* (1–2000).
  - What happens when it is broken\*: Guidance · Report · Hold · Block, shown with spec 05's what-happens table.
  - Checked by AI (row 30), Pin to Copilot (row 31), Reason shown to learners (1–200).
  - A new rule saves as a **draft** and does nothing until it is published.
- **Blocked words**, inside the rule:
  - List: Word or web address, Added by (row 27).
  - Add (26), update (28), delete (29).
  - Test a word before saving (33).
- **Test the rule** (row 32): type a sample post, then see the word matches and the AI result. The AI result is "not
  available" until C19 is settled.
- **Teacher only.**

### 6.3 Settings: `/admin-v3/moderation/settings`

| Field | Source |
|---|---|
| Moderation on/off | row 2 |
| Four areas on/off: Product discussions · Community · Feeds · Newsfeed | row 3 |
| Content review mode: Review first *(default)* · Publish first | row 4, SR 15 |
| Moderation mode: Autopilot · Copilot · AI disabled | row 5 |
| Academy description\*, Learner age group\* (Under 18 · Adults · Mixed), Tone of conversation\* (Casual · Professional) | row 6 |
| Number of removals before restriction\* | row 7 |
| Later: repeated posts (row 8, P2) · hold first posts (row 9, P3) · per-product exceptions (rows 10–15, P2, own route `/admin-v3/moderation/settings/exceptions`) | |

A Teaching Assistant can view these settings but not change them (contract). Load is `ShowModerationSettings`, save is
`UpdateModerationSettings`. Both fit the settings framework as they are.

### 6.4 Restrictions & bans: `/admin-v3/moderation/restrictions`

- **Columns:** Learner, Restricted or banned, Where it applies, Since (row 57), plus How: Automatic or By a Teacher.
- **Tabs:** All · Restricted · Banned.
- **Row actions:** Lift restriction (58), Lift ban (59). Lifting an academy ban "clears both" (SR 19).
- **No create here:** restricting and banning are done from the queue (SR 20). **Teacher only.**

### 6.5 Reports: `/admin-v3/moderation/reports`

- **Period:** last 7 or last 30 days.
- **Moderation summary** (row 61), as tiles:
  - Where it runs · Content checked · Blocked before publishing · Held for review
  - Approved after review · Removed · Reported by learners
  - Waiting for review · Longest waiting · Published without a check
- **Rule performance** (rows 62–63): Rule, Times this rule stopped content, Approved anyway by a Teacher, Removed,
  Wrong-flag rate. Any number opens that content in the queue (`/queue?tab=done&ruleId=…&decision=…`).
- **Product activity** (row 64). "Add an exception" from a row is row 65, P2.
- **Problem members** (row 66).
- **Moderation log** (row 67), at `/admin-v3/moderation/log`: Action, Done by, Content, Rule, Date and time, with
  filters by action, rule and date.
- Export (row 68) is P2 and has no contract.
- **Teacher only.**

## 7. Contract fit: what Rails must match

The custom pages call the contracts exactly as written. The framework pages build their own queries, so Rails' fields
must take the framework's shape. **Proposed changes to the `rails-support` contracts (D1):**

| Contract | Today | The framework sends | Change |
|---|---|---|---|
| `list_moderation_rules` | `(status, search, first, after)` | `first, before, after, q: JSON, sort: JSON` plus tab args written into the query. It selects `data: nodes`, `totalCount`, `pageInfo{endCursor startCursor hasNextPage hasPreviousPage}` | Add `before`, `q`, `sort`, `startCursor`, `hasPreviousPage`. Search goes into `q`. `status` stays as the tab argument |
| `list_moderation_member_limits` | `(kind, first, after)` | same | Same additions. `kind` is the tab argument |
| `list_moderation_log_entries` | `(action, ruleId, dateFrom, dateTo, first, after)` | same, plus `startDate`/`endDate` for the date filter | Same additions. Dates become `startDate`/`endDate`. Action and rule go into `q` |
| `publish_`, `unpublish_` and `delete_moderation_rule` | `input{ruleId}` | row actions send `input{id}` (the row's id) | Accept `id` |
| `lift_learner_restriction` | `input{userId}` | `input{id}` (the limit row's id) | Accept the limit `id`. Rails finds the learner |
| `lift_learner_ban` | `input{banId}` | `input{id}` | Accept `id` |
| `show_` / `update_moderation_settings` | `contentAreas[{area enabled}]` | one value per field | **Four booleans** instead of `contentAreas[]`: `productDiscussionsEnabled`, `communityEnabled`, `feedsEnabled`, `newsfeedEnabled` (confirmed in M0) |
| Tab arguments (`status`, `kind`) on the list fields | enums | written into the query as quoted strings (`status:"PUBLISHED"`) | Type those arguments `String` (confirmed in M0) |
| The five report contracts | explicit args, `nodes` or flat | the same | None |
| Queue, rule editor and member contracts | used directly by custom pages | — | None |

If D1 is refused, those three tables become custom React pages, which goes against the repo rule ("Do NOT create
React pages for tables").

## 8. What the fixtures cover

All of it is synthetic. Fixtures cover the cases the screens must handle:

- **Every why-stopped source:** AI check (rule 6 spam), blocked word, learner report (report count 3), repeat post,
  restricted member, first-posts hold.
- **Item cases:**
  - an image with a phone number (rule 8);
  - an item edited after being held;
  - Unchecked items with no rule;
  - Done items, approved and removed, including one removed 91 days ago, which can't be restored.
- **Learners:** one at 4 removals with a threshold of 5, which triggers the ban prompt; one already restricted; one
  banned from a product.
- **Rules:**
  - Learnyst rules and two academy rules, one of them a draft;
  - rule 5 self-harm, pinned to Copilot;
  - a rule checked by words only, and one checked by nothing (report reason only).
- **Reports:** a rule that never fired (spec 09: "Never fires → too vague"), and a product with no activity, which is
  not shown (SR 17).
- **Scenarios:** `empty` gives every list empty and the summary at zero. `error` makes every call return the
  contract's error. `slow` adds a 2 s delay, so loading states are visible.

## 9. Work split: 12 tasks, 31 SP

| # | Task | SP | Done when |
|---|---|---|---|
| M0 | Worktree, submodules, mock link. **Spike**: one metadata list, the settings page and the analytics page render from local metadata and fixtures with no backend push. Answer the §11 checks | 3 | the three framework pages render offline |
| M1 | Routes, page wrappers, sidebar submenu, `moderation` i18n namespace, API and screen types, adapters, mock store, per-area mock switch, dev knobs | 3 | every route opens, sidebar shows with mocks on, no component imports an API type |
| M2 | Queue: header, tabs, filters, list rows with Approve / Remove | 3 | all four tabs work on fixtures |
| M3 | Queue item pane: thread, edit history, learner reports, Restore, status rules, contract errors | 3 | each status shows only its allowed actions |
| M4 | Member panel, Restrict and Ban dialogs, ban prompt, remove a banned learner's content, Teaching Assistant limits | 3 | ban prompt appears at the threshold; TA sees no ban |
| M5 | Rules list metadata: tabs, publish / unpublish / delete, publish warning | 2 | publish moves a draft to Published |
| M6 | Rule editor: form, action picker, blocked words, word test, rule test | 3 | create → draft → publish works end to end |
| M7 | Settings metadata | 2 | save survives a page change (mock store) |
| M8 | Restrictions & bans metadata and Lift actions | 2 | lifting removes the row |
| M9 | Reports dashboard: period, tiles, three tables, drill-down to the queue; Moderation log list | 3 | a rule-performance number opens the queue filtered |
| M10 | Empty, error and loading pass on every screen; Playwright smoke with mocks | 2 | `empty`, `error` and `slow` scenarios all look right |
| M11 | Drift check script (validates custom-page queries and framework-built queries against a schema); write the D1 changes into the rails-support contracts; copy the moderation contracts into the `api-contracts` submodule; dry-run the swap | 2 | drift check passes on our contracts and catches a deliberately renamed field |

## 10. When Rails is ready: the swap

Do this **per area**, as Rails ships each one. Rails may not match the contracts, and nothing assumes it does.

1. **Run the drift check** against Rails' dev schema: `npx tsx scripts/moderation/checkModerationDrift.ts --schema <dev url>`.
   It lists every difference for that area.
2. **Fix what it lists**, and only in the files from the [§2.1](#21-ready-for-rails-to-differ-from-the-contracts) table:
   - query/mutation files, adapters and API types for custom pages;
   - the layout file's field list for framework pages.

   Update that area's fixtures to Rails' real shape too, so dev mode stays honest. Run it again until it's clean.
3. **Upload that area's layout file** with `bash .claude/scripts/push-metadata.sh <file> development`. Set
   `METADATA_API_BASE` if Rails runs on the AI-moderator preview backend
   (`api-ai-moderator.boss-preview.learnyst.com`, which your local `vite.config.ts` already points to).
4. **Take the area off the mock list**, for example `VITE_MODERATION_MOCKS=queue,reports` once rules and settings are live.
5. **Run that area's Playwright smoke** against the backend.
6. When the list is empty and every area is live, and before release, delete
   `src/graphql/modules/moderation/mocks/` and the one line in `apolloClient.ts`.

If Rails matches the contracts, steps 1–2 find nothing. Either way, screens, hooks and routes don't change. A missing
field is the one exception: the drift check shows it early, and it goes back to Rails as a question.

## 11. Decisions and checks

**Decisions needed**

| # | Decision | Proposal |
|---|---|---|
| D1 | Rails matches the table framework for the three lists and the row actions ([§7](#7-contract-fit-what-rails-must-match)) | Yes. It is how every other admin table works |
| D2 | What turns the Moderation menu on for an academy | A school-config flag from Rails (PROPOSED name `aiModerationEnabled`). Until then, the menu shows only with mocks on |
| D3 | Teacher and Teaching Assistant in admin roles (C31) | Teacher = Owner and Root admin; Teaching Assistant = a sub-admin with a new moderation permission. Needs product and Rails |
| D4 | Design source | No Figma exists. Use the layout from `moderation-prototype.html` (not a source document) and the shadcn molecules, or wait for Figma |
| D5 | Where the work happens | Worktree `learnyst-admin/admin-moderation`, branch `feat/ai-moderation-admin` from `origin/main`. Two more PRs for the submodules (`metaData`, `api-contracts`). Your current checkout, with its uncommitted changes, is not touched |

**Checks for the M0 spike**, with a fallback for each:

| # | Check | Fallback |
|---|---|---|
| 1 | The mock link can serve `${key}Meta`, so metadata pages render without a push | push to the dev backend once; mock only the data |
| 2 | `SettingsContainer` works at `/admin-v3/moderation/settings`, not only at `/admin-v3/settings` | link to `/admin-v3/settings?id=moderationSettings` |
| 3 | Four switches can bind to `contentAreas[{area enabled}]` | four booleans in the contract (§7) |
| 4 | Row actions can differ per row (Lift restriction or Lift ban) | one `liftModerationMemberLimit(input{id})` mutation |
| 5 | ~~Analytics reads `period` from the URL~~ — superseded: Reports is now report tables using the date filter | — |
| 6 | A Teaching Assistant gets Settings read-only | hide Save for that role |

**Open items that change a screen:**
- C1: nine or ten ready-made rules (Rules list).
- C2: whether each area has its own modes (Settings layout).
- C4 / C6: does a blocked word block or go to the queue (queue sources).
- C9: what "Where it is" shows (queue column).
- C19: the rule test has no AI path yet (test panel).
- C23: defaults (Settings, Checked by AI).
- C25: can a Learnyst rule be deleted (Rules actions).
- C30: today's community ban versus the new scoped ban.
- C31: roles (D3).

## 12. Not in this plan

- Learner-side screens (bodhi): rows 70–80.
- The Learnyst traction report: rows 82–85, on the Proximity AI monitor.
- The shadow-mode enforcement flag: HLD §17, Learnyst-only.
- Notifications: none in v1 (spec 11).
- Export: row 68, P2, no contract.
- A queue count badge in the sidebar: spec 11 "the waiting count on the dashboard". Later.
