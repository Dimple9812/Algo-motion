create table users (
    id            uuid primary key,
    email         varchar(254) not null,
    password_hash varchar(100) not null,
    display_name  varchar(40)  not null,
    created_at    timestamptz  not null default now(),
    version       bigint       not null default 0
);
create unique index uq_users_email on users (lower(email));

create table refresh_tokens (
    id         uuid primary key,
    user_id    uuid        not null references users (id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);
create index idx_refresh_user on refresh_tokens (user_id);

create table user_preferences (
    user_id      uuid primary key references users (id) on delete cascade,
    mode         varchar(12) not null default 'playful' check (mode in ('playful', 'technical')),
    gamification boolean     not null default true,
    motion       varchar(8)  not null default 'system' check (motion in ('system', 'reduce', 'full')),
    updated_at   timestamptz not null default now()
);

create table bookmarks (
    user_id      uuid        not null references users (id) on delete cascade,
    problem_slug varchar(80) not null,
    created_at   timestamptz not null default now(),
    primary key (user_id, problem_slug)
);

-- XP ledger. (user_id, event_key) is unique, so repeating an achievement never awards XP twice.
create table learning_events (
    id         uuid primary key,
    user_id    uuid        not null references users (id) on delete cascade,
    event_key  varchar(120) not null,
    kind       varchar(16) not null check (kind in ('VISUALIZATION', 'PREDICTION', 'CHALLENGE', 'PROBLEM', 'PATH')),
    topic      varchar(40) not null,
    xp         int         not null check (xp between 0 and 100),
    created_at timestamptz not null default now(),
    unique (user_id, event_key)
);

create table user_problem_progress (
    user_id      uuid        not null references users (id) on delete cascade,
    problem_slug varchar(80) not null,
    solved_at    timestamptz not null default now(),
    primary key (user_id, problem_slug)
);

create table user_achievements (
    user_id     uuid        not null references users (id) on delete cascade,
    badge_id    varchar(40) not null,
    unlocked_at timestamptz not null default now(),
    primary key (user_id, badge_id)
);

-- Saved visualization / solution sessions. Payloads are small references (algorithm + input, or a solution id),
-- never full traces: traces are regenerated deterministically from the input.
create table saved_sessions (
    id         uuid primary key,
    user_id    uuid         not null references users (id) on delete cascade,
    type       varchar(16)  not null check (type in ('VISUALIZATION', 'SOLUTION')),
    title      varchar(120) not null,
    reference  varchar(80)  not null,
    payload    jsonb        not null check (octet_length(payload::text) <= 16384),
    created_at timestamptz  not null default now()
);
create index idx_sessions_user_created on saved_sessions (user_id, created_at desc);
