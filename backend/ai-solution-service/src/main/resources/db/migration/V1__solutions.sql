create table solution_sessions (
    id           uuid primary key,
    user_id      uuid,
    problem_text text        not null check (length(problem_text) <= 8000),
    status       varchar(16) not null check (status in ('QUEUED', 'GENERATING', 'VALIDATING', 'TESTING', 'COMPLETED', 'FAILED')),
    provider     varchar(40) not null,
    topics       jsonb       not null default '[]',
    ambiguities  jsonb       not null default '[]',
    error        varchar(500),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    version      bigint      not null default 0
);
create index idx_solution_user on solution_sessions (user_id, created_at desc);

create table solution_approaches (
    id           uuid primary key,
    session_id   uuid        not null references solution_sessions (id) on delete cascade,
    ordinal      int         not null,
    payload      jsonb       not null check (octet_length(payload::text) <= 200000),
    verdict      varchar(20) not null check (verdict in ('GENERATED', 'SYNTAX_CHECKED', 'TESTS_PASSED', 'TESTS_FAILED', 'MANUAL_REVIEW')),
    execution_id uuid,
    execution    jsonb,
    unique (session_id, ordinal)
);
create index idx_approach_execution on solution_approaches (execution_id);

create table outbox_events (
    id           uuid primary key,
    topic        varchar(120) not null,
    message_key  varchar(120),
    payload      text         not null,
    created_at   timestamptz  not null default now(),
    published_at timestamptz
);
create index idx_outbox_pending on outbox_events (created_at) where published_at is null;

create table processed_events (
    event_id     uuid primary key,
    processed_at timestamptz not null default now()
);
