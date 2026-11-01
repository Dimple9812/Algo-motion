create table code_execution_jobs (
    id             uuid primary key,
    user_id        uuid,
    origin         varchar(20)  not null check (origin in ('API', 'AI_SOLUTION')),
    origin_ref     varchar(80),
    problem_slug   varchar(80),
    language       varchar(10)  not null default 'java',
    source_code    text         not null check (octet_length(source_code) <= 65536),
    tests          jsonb        not null,
    status         varchar(20)  not null check (status in ('QUEUED', 'RUNNING', 'COMPLETED', 'COMPILATION_ERROR', 'FAILED', 'TIMEOUT', 'REJECTED')),
    sandbox        varchar(30)  not null,
    compile_output text,
    stderr         text,
    message        varchar(500),
    runtime_ms     int,
    passed         int          not null default 0,
    total          int          not null default 0,
    created_at     timestamptz  not null default now(),
    started_at     timestamptz,
    finished_at    timestamptz,
    version        bigint       not null default 0
);
create index idx_exec_user_created on code_execution_jobs (user_id, created_at desc);
create index idx_exec_status on code_execution_jobs (status) where status in ('QUEUED', 'RUNNING');

create table code_execution_results (
    id       uuid primary key,
    job_id   uuid    not null references code_execution_jobs (id) on delete cascade,
    idx      int     not null,
    input    text    not null,
    expected text    not null,
    actual   text    not null,
    passed   boolean not null,
    time_ms  int     not null,
    error    text,
    unique (job_id, idx)
);

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
