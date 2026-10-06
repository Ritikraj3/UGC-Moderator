# API contracts: AI UGC Moderation (Rails hand-over)

One YAML file per operation, in the **learnyst-admin `api-contracts` format**
(`learnyst-admin/admin/api-contracts/docs/template.md`). All 63 pass that repo's validator, which is copied
here unchanged. The mental model, the reasoning, and what is new versus existing are in
[`../README.md`](../README.md). Open questions are in [`../../open-items.md`](../../open-items.md).

## Validate

```bash
cd rails-support/api-contracts
npm install --prefix validator        # once — installs js-yaml
node validator/validate.js            # → Summary: 63/63 passed
```

Last run on 2026-10-05: **63/63 passed**. In addition, all 55 `example_document`s parse with `graphql`.
Operation names and types match each contract, every `$variable` is declared and used, and every query input
appears as a variable.

## Reading a contract

| In the YAML | Means |
|---|---|
| `EXISTING …, changed` in the description | An API in production today. Same name and inputs; the description says exactly what changes. Only the inputs moderation reads are listed |
| `NEW …` | Does not exist yet |
| `PROPOSED` | A name or value the sources need but do not define. Needs Rails agreement |
| `C20` etc. | An open question in `open-items.md` |
| `Priority P1/P2` + story numbers | From the User Stories (page row numbers) |
| `return_type: Existing return type of …` | The Rails type name is unchanged and not known from the frontend code, so it is deliberately not guessed |
| Field names in `snake_case` | The template's rule. The GraphQL documents use `camelCase`, as the live API does |

## Index

### Service to service: `contracts/rest/`

| File | Call | P |
|---|---|---|
| `ai_server_moderation/submit_moderation_check.yml` | Rails → ai-server `POST /api/moderation/check` | P1 |
| `internal_moderation/receive_moderation_result.yml` | ai-server → Rails `POST /internal/v1/moderation/result` (**new Rails endpoint**) | P1 |
| `ai_server_moderation/submit_moderation_outcome.yml` | Rails → ai-server `POST /api/moderation/outcome` | P1 |
| `internal_moderation/list_learnyst_moderation_rules.yml` | Learnyst Monitor → Rails `GET /internal/v1/moderation/learnyst_rules` (**new**) | P1 |
| `internal_moderation/create_learnyst_moderation_rule.yml` | Learnyst Monitor → Rails `POST /internal/v1/moderation/learnyst_rules` (**new**) | P1 |
| `internal_moderation/update_learnyst_moderation_rule.yml` | Learnyst Monitor → Rails `PUT /internal/v1/moderation/learnyst_rules/{id}` (**new**; also publish / unpublish) | P1 |
| `internal_moderation/delete_learnyst_moderation_rule.yml` | Learnyst Monitor → Rails `DELETE /internal/v1/moderation/learnyst_rules/{id}` (**new**) | P1 |
| `internal_moderation/test_learnyst_moderation_rule.yml` | Learnyst Monitor → Rails `POST /internal/v1/moderation/learnyst_rules/test` (**new**; AI half blocked on C19) | P1 |

### Learner: existing APIs that change: `contracts/graphql/`

| File | Operation | P |
|---|---|---|
| `community_posts/create_community_post.yml` | `createCommunityPost` | P1 |
| `community_posts/update_community_post.yml` | `updateCommunityPost` | P1 |
| `community_posts/list_community_posts.yml` | `listCommunityPosts` | P1 |
| `community_posts/show_community_post.yml` | `showCommunityPost` | P1 |
| `newsfeed_posts/create_newsfeed_post.yml` | `createNewsfeedPost` | P1 |
| `newsfeed_posts/update_newsfeed_post.yml` | `updateNewsfeedPost` | P1 |
| `newsfeed_posts/list_socials_newsfeed_posts.yml` | `listSocialsNewsfeedPosts` | P1 |
| `newsfeed_posts/show_socials_post_by_slug.yml` | `showSocialsPostBySlug` | P1 |
| `discussion_boards/create_discussion_board.yml` | `createDiscussionBoard` | P1 |
| `discussion_boards/update_discussion_board.yml` | `updateDiscussionBoard` | P1 |
| `discussion_boards/list_discussion_boards.yml` | `listDiscussionBoards` | P1 |
| `comments/create_comment.yml` | `createComment` | P1 |
| `comments/update_comment.yml` | `updateComment` | P1 |

### Learner: new

| File | Operation | P |
|---|---|---|
| `community_rules/list_community_rules.yml` | `listCommunityRules` | P1 |
| `content_reports/report_content.yml` | `reportContent` | P1 |
| `moderation_member_status/show_my_moderation_status.yml` | `showMyModerationStatus` | P1 |

### Admin: new

| Folder | Operations |
|---|---|
| `moderation_settings/` | `showModerationSettings` · `updateModerationSettings` (P1) |
| `moderation_exceptions/` | `listModerationExceptions` · `createModerationException` · `updateModerationException` · `deleteModerationException` · `listEffectiveModerationRules` (P2) |
| `moderation_rules/` | `listModerationRules` · `showModerationRule` · `createModerationRule` · `updateModerationRule` · `publishModerationRule` · `unpublishModerationRule` · `testModerationRule` (P1; blocked on C19) · `deleteModerationRule` (P2) |
| `moderation_blocked_words/` | `listModerationBlockedWords` · `createModerationBlockedWord` · `deleteModerationBlockedWord` (P1) · `updateModerationBlockedWord` · `testModerationBlockedWord` (P2) |
| `moderation_queue/` | `listModerationQueueItems` · `showModerationQueueSummary` · `showModerationQueueItem` · `approveModerationContent` · `removeModerationContent` · `restoreModerationContent` (P1) · `markModerationExample` (P2) |
| `moderation_members/` | `restrictLearner` · `liftLearnerRestriction` · `banLearner` · `liftLearnerBan` · `removeBannedLearnerContent` · `listModerationMemberLimits` (P1) |
| `moderation_reports/` | `showModerationSummaryReport` · `listModerationRulePerformance` · `listModerationProductActivity` · `listModerationProblemMembers` · `listModerationLogEntries` (P1) |

### Reference (unchanged)

`_reference/show_community.yml` (`showCommunity`) is here only as the documented source of `community_id`,
which the validator requires.

**Totals:** 63 files = 8 service (3 Rails ↔ ai-server + 5 Learnyst Monitor → Rails) + 13 changed + 3 learner-new + 38 admin-new + 1 reference.
53 are P1 and 9 are P2.

## Note for the bodhi side

bodhi generates code from its own, lighter contract template (`learnyst-bodhi/bodhi/.claude/contracts/templates/`,
used by `/create-model`). The learner contracts here have everything that template needs: the schema,
variables, response shape, examples, errors and business rules. They can be converted to it when bodhi work starts.
