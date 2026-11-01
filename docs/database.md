# Database design

One PostgreSQL instance, **one schema per service**, each with its own Flyway history. No service reads another service's schema.

| Schema | Owner | Tables |
|---|---|---|
| `users` | user-progress-service | `users`, `refresh_tokens`, `user_preferences`, `bookmarks`, `learning_events`, `user_problem_progress`, `user_achievements`, `saved_sessions` |
| `catalog` | problem-catalog-service | `problems`, `problem_topics`, `problem_test_cases`, `problem_solutions` |
| `solutions` | ai-solution-service | `solution_sessions`, `solution_approaches`, `outbox_events`, `processed_events` |
| `execution` | code-execution-service | `code_execution_jobs`, `code_execution_results`, `outbox_events`, `processed_events` |

## Notable constraints

- `users.email` is unique case-insensitively (`unique index on lower(email)`).
- `refresh_tokens.token_hash` is unique; only SHA-256 hashes are stored.
- `learning_events (user_id, event_key)` is unique, so XP can never be awarded twice for the same achievement (anti-farming).
- `saved_sessions.payload` is capped with `check (octet_length(payload::text) <= 16384)`; `solution_approaches.payload ≤ 200 KB`; `code_execution_jobs.source_code ≤ 64 KB`; `solution_sessions.problem_text ≤ 8000`.
- Enum-like columns use `check (... in (...))`.
- Optimistic locking (`version` columns) on `users`, `problems`, `solution_sessions`, `code_execution_jobs`.
- Partial indexes: pending outbox rows, active execution jobs.

## Storing traces

Traces are **not persisted**. They are deterministic functions of (algorithm, input), so saved sessions store only those (a few hundred bytes) and the trace is regenerated on open. This avoids large, unbounded JSON rows.

## Cross-service references

`bookmarks.problem_slug`, `user_problem_progress.problem_slug` and `solution_approaches.execution_id` refer to data owned by other services. They are validated through internal APIs when written, and are deliberately not foreign keys.

## Production notes

- Use a separate database user per service with privileges on its own schema only (the Compose file uses one user for simplicity).
- The catalog seeder upserts by slug when a problem's content hash changes. Deleting problems from `content/` does not delete rows; remove them with a migration.
