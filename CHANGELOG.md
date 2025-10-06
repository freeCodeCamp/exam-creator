# Changelog

## [Unreleased]

## [2.0.4] - 2025-10-04

### Fixed

- server: fix prisma deserialization ident name `ExamEnvironmentExamConfig` -> `ExamEnvironmentConfig`

## [2.0.3] - 2025-10-04

### Fixed

- server: handle `f64` in `ExamEnvironmentExamConfig`

## [2.0.2] - 2025-10-04

### Fixed

- server: deserialize `ExamCreatorExam` from BSON document manually in try_into

## [2.0.1] - 2025-10-04

### Fixed

- server: deserialize `ExamCreatorExam` from BSON document

## [2.0.0] - 2025-10-04

### Added

- server: `PUT /api/exams/{exam_id}/seed/production`
- client: seed exam to production modal and button
- client: exam seed location badges
- server: `GET /api/exams`
  - `{ exam: ExamCreatorExam, databaseEnvironments: ("Staging" | "Production")[] }[]`
- client: attempt moderation approve/deny
- client: tooltips for more information
- server: `PATCH /api/attempts/{attempt_id}/moderation`
  - body: `{ attemptId: string, status: "Approved" | "Denied" }`
- client: filter moderation records by status

### Fixed

- i64 vs f64 vs Int / Int64 / Double
- server: attempt construction `id` from `examId` to `attemptId`
- client: total number of exam questions calculation
- server: deserialization of `startTimeInMS` and `submissionTimeInMS` to f64

### Changed

- use `DateTime` fields
- use `totalTimeInS` and `retakeTimeInS`
- client: remove database status component from unrelated pages

## [1.5.0] - 2025-09-23

### Added

- client: exam name and passing percent to moderation card
- client: sql syntax highlighting
  - Enable all languages

## [1.4.1] - 2025-09-22

### Fixed

- server: database environment can be unset

## [1.4.0] - 2025-09-22

### Added

- client: database environment setting
- server: `PUT /api/users/session/settings`

### Fixed

- client: toast when exam is saved to temp collection

## [1.3.1] - 2025-09-21

### Fixed

- server: seed exam challenge map to staging

## [1.3.0] - 2025-09-21

### Added

- client: seed exams to staging and production db
- server: `PUT /api/exams/{exam_id}/seed/staging`

## [1.2.0] - 2025-09-20

### Added

- client: attempt moderation viewing
- server: `GET /api/attempts`

## [1.1.0] - 2025-09-19

### Added

- server: `GET|PUT /api/exam-challenges/{exam_id}`
- client: exam-challenge map input fields

### Refactored

- server: split into modules (9861dcc)

## [1.0.0] - 2025-08-08

### Added

- client: question number table (06161d4)
- export & selection for exams (feat 0.8.0 -> carried forward)

### Fixed

- client: prevent deprecated badge from overflowing card (2725c6c)
- client: adjust prism imports to use script (e153c24)

### Changed

- Dependencies updated for 1.0.0 release (27b4616)

## [0.8.0] - 2025-07-25

### Added

- exam selection and export (9efb889)

### Fixed

- github info name optional (0.7.2 -> see below) ensured forward compatibility

### Breaking Changes

None new in this version (see 0.7.x).

## [0.7.2] - 2025-07-24

### Fixed

- allow github info name to be optional (ee9c8c3)

### Breaking Changes

None in this patch release.

## [0.7.0 - 0.7.1]\* - 2025-07-01 to 2025-07-23

(\*Exact sub-version tags not recorded in commit messages; grouped for clarity.)

### Added

- attempt moderation workflow (fc3c0fa, b9bc1fb)
- client: prerequisites input (b53e9aa)
- client: deprecated controls (3e8681a)
- client: improved audio controls (bd0a287)
- server: structured error handling with `thiserror`, timeout & body size limits (4af6043)

### Fixed

- server: 404 route handling (e912c24)
- client: content overflow issues (878d2fe)
- client: logout flow (df9ddf0)
- client: add content type header (7055561)
- server: improve checks & handle SIGINT, CORS (98bb8f8)

### Breaking Changes

- server: session `expires_at` type adjusted for DB TTL (00c7a46)
- auth: addressed auth errors (6b1d134)
- prerequisites: deserialization added; new errors; prisma update (7b438e1)

### Developer Experience / Chore

- remove unused code (a281e33)
- exams projection & improved logs (569cac1)
- env var messaging improvements (641e6b2)
- mock auth improvements & parity (df8235a, 9852959)
- additional logging (6c4782c, b0d5871, 59afb01)
- add more docs (468a65c)
- CI / GitHub workflow tweaks (79dfebe)
- container image & build tweaks (4713a42, 716fae0, e519ed4, b14c4ec, 64804b6, c02ced9)
- CORS simplification & sample.env fix (4200d12)
- image cleanup automation (189cf6c)

### Initial

- Minimum viable product commit (1fd231d)
