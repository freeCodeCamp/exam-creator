# Per-exam moderation counts in ExamMetricsCard

## Context

Metrics page (`/metrics`) cards show "Number of Attempts: N" per exam. Replace with approved/denied/pending badge counts (same visual style as `ModerationSummary` in `client/components/attempt/landing-card.tsx:82-159`), one row per exam. User decisions:
- Current environment only (no staging/production split) - metrics endpoint already uses `database_environment(&state, &user)`.
- Attempts without moderation record: excluded from counts.
- `numberOfAttempts` dropped entirely (only consumed by this card; `attempt-analytics.tsx` uses only `exam`).

## Server changes

### `server/routes/moderations.rs`
Add `#[derive(Default, Clone)]` to existing `ModerationCount` (lines 70-75) so it can be defaulted for exams with zero moderated attempts. Reuse it in metrics.

### `server/routes/metrics.rs` (`get_exams_metrics`, lines 29-59)
1. Change response struct:
```rust
use crate::routes::moderations::ModerationCount;

#[derive(Serialize)]
pub struct GetExamMetrics {
    exam: prisma::ExamCreatorExam,
    #[serde(rename = "moderationCounts")]
    moderation_counts: ModerationCount,
}
```
2. Replace per-exam `count_documents` loop with ONE aggregation on moderation collection ($lookup on `_id` uses default index; join direction inherently excludes unmoderated attempts). Raw collection names from `server/app.rs:69-93`: `ExamEnvironmentExamAttempt`, `ExamEnvironmentExamModeration`.
```rust
let pipeline = vec![
    doc! { "$lookup": {
        "from": "ExamEnvironmentExamAttempt",
        "localField": "examAttemptId",
        "foreignField": "_id",
        "as": "attempt"
    }},
    doc! { "$unwind": "$attempt" },
    doc! { "$group": {
        "_id": { "examId": "$attempt.examId", "status": "$status" },
        "count": { "$sum": 1 }
    }},
];
```
Run via `database.exam_environment_exam_moderation.aggregate(pipeline).with_type::<ModerationGroup>()` (pattern at metrics.rs:114), where:
```rust
#[derive(Deserialize)]
struct ModerationGroup {
    #[serde(rename = "_id")]
    id: ModerationGroupKey,
    count: u64, // fallback: i64 if Int32→u64 coercion errors
}
#[derive(Deserialize)]
struct ModerationGroupKey {
    #[serde(rename = "examId")]
    exam_id: ObjectId,
    status: prisma::ExamEnvironmentExamModerationStatus,
}
```
Status enum serializes as plain variant strings ("Approved"/"Denied"/"Pending") - same as `bson::serialize_to_bson(&status)` usage in moderations.rs:38.

3. Collect into `HashMap<ObjectId, ModerationCount>`, then in existing exam loop (keep `find` + `projection({"questionSets": false})`):
```rust
let moderation_counts = counts_map.remove(&exam.id).unwrap_or_default();
```
Delete `count_documents` call. No `server/app.rs` route changes.

## Client changes

### `client/utils/fetch.ts` (`getExamsMetrics`, line 816)
Replace `numberOfAttempts: number` with `moderationCounts: { pending: number; approved: number; denied: number }` in deserialize type.

### `client/pages/metrics.tsx` (lines 83-88)
Destructure and pass `moderationCounts` instead of `numberOfAttempts`.

### `client/components/exam-metrics-card.tsx`
- Props: `moderationCounts` replaces `numberOfAttempts`.
- Add `Grid, GridItem` to Chakra import; `import { Tooltip } from "./tooltip";` (note `./`, card lives in `client/components/`).
- Replace line 74 in `Card.Body` with single badge row, modeled on landing-card:
```tsx
<Grid templateColumns="repeat(3, 1fr)" columnGap={2} alignItems="center">
  {(["approved", "denied", "pending"] as const).map((statusKey) => (
    <GridItem key={statusKey}>
      <Tooltip
        content={`${moderationCounts[statusKey]} ${statusKey} attempt${
          moderationCounts[statusKey] !== 1 ? "s" : ""
        }`}
      >
        <Badge
          colorPalette={statusKey === "approved" ? "green" : statusKey === "denied" ? "red" : "yellow"}
          fontSize="xs" px={2} py={1} display="inline-block" width="100%" textAlign="center"
        >
          {moderationCounts[statusKey]}
        </Badge>
      </Tooltip>
    </GridItem>
  ))}
</Grid>
```
Card wrapped in `Button` (navigates on click); tooltip-in-button pattern already used elsewhere.

## Verification

1. `cargo check` (repo root or server/, wherever Cargo.toml lives).
2. `bun run build` from repo root (typecheck: tsc + vite build).
3. Manual: `bun run develop:server` + `bun run dev`, open `/metrics` - three colored badges per card with tooltips; badge sums ≤ former attempt totals (unmoderated excluded).

---

# Priority moderations: users page list + landing card count

## Context

Moderations whose `feedback` matches `Question type <object_id> not found in generated exam.` indicate broken generated exams and need priority attention. Currently no way to see these without manual searching. Add:
1. Global "Priority" section on `/users` page (below search results, always visible, all users).
2. Priority moderation count on "User Management" landing card.

Per user answers: list is **global, always shown**; count goes on **User Management card**; match is **substring** (`feedback` contains `not found in generated exam`).

## Server changes

### 1. `server/routes/moderations.rs` - two new handlers

Shared constant:
```rust
const PRIORITY_FEEDBACK_PATTERN: &str = "not found in generated exam";
```

**`get_priority_moderations`** - mirrors `get_moderations` (moderations.rs:29): uses `database_environment(&server_state, &exam_creator_user)` (current env, matching what `/users` search shows), filter:
```rust
doc! {"feedback": {"$regex": PRIORITY_FEEDBACK_PATTERN}}
```
sorted by `submissionDate` desc, returns `Json<Vec<prisma::ExamEnvironmentExamModeration>>`.

**`get_priority_moderations_count`** - mirrors `get_moderations_count` (moderations.rs:78): `count_documents` with same regex filter on both `state.staging_database` and `state.production_database`. Response:
```rust
#[derive(Serialize)]
pub struct GetPriorityModerationsCountResponse {
    pub staging: u64,
    pub production: u64,
}
```

### 2. `server/app.rs` - register routes (near line 222)

```rust
.route("/api/moderations/priority", get(routes::moderations::get_priority_moderations))
.route("/api/moderations/priority/count", get(routes::moderations::get_priority_moderations_count))
```

## Client changes

### 3. `client/utils/fetch.ts` - two fetch functions

Follow `getModerationsCount` pattern (fetch.ts:512): `authorizedFetch` + `deserializeToPrisma`, with `VITE_MOCK_DATA` branch.

- `getPriorityModerations(): Promise<ExamEnvironmentExamModeration[]>` → `/api/moderations/priority`. Mock: load `/mocks/moderations.json`, filter by `feedback?.includes("not found in generated exam")`.
- `getPriorityModerationsCount(): Promise<{ staging: number; production: number }>` → `/api/moderations/priority/count`. Mock: static numbers.

### 4. `client/pages/users.tsx` - priority section

New `useQuery` (`queryKey: ["priority-moderations"]`, `queryFn: getPriorityModerations`, retry false, no refetch-on-focus).

Render new `Box` section titled `Priority Moderations (<n>)` **after** the search-results block (outside the `search.isSuccess` conditional, so always visible). Each item reuses the existing moderation card markup (users.tsx:412-469): status badge (`moderationStatusPalette`), id, submitted/moderated dates, feedback text, "View Attempt" button navigating to `/attempts/$id`. Extract that markup into a local `ModerationCard` component used by both the search moderations list and the priority list to avoid duplication. Loading → `Spinner`, error → red text, empty → "No priority moderations."

### 5. New `client/components/users-landing-card.tsx` + `client/pages/landing.tsx`

Model on `AttemptsLandingCard` (client/components/attempt/landing-card.tsx): card titled "User Management", `UsersOnPageAvatars`, footer with `useQuery(["priorityModerationsCount"], getPriorityModerationsCount)` showing staging/production priority counts as badges (red palette, tooltip like ModerationSummary). Replace `LandingCard` usage for `/users` in landing.tsx:133 with new component.

### 6. `public/mocks/moderations.json`

Add one moderation with `"feedback": "Question type 65fa9d3f1234567890abcdef not found in generated exam."` so mock mode exercises the feature.

## Verification

- `cargo check` in `server/` (or workspace root).
- `bun run build` for client typecheck.
- Run with `VITE_MOCK_DATA=true`: landing card shows priority count; `/users` shows priority section before and after search; "View Attempt" navigates.
