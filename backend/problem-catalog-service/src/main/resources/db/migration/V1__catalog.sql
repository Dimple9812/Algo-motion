create table problems (
    id                      uuid primary key,
    slug                    varchar(80)  not null unique,
    title                   varchar(160) not null,
    topic                   varchar(40)  not null,
    difficulty              varchar(10)  not null check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
    visualization_supported boolean      not null default false,
    statement               text         not null,
    input_format            text         not null,
    output_format           text         not null,
    starter_code            text         not null,
    source                  varchar(200) not null,
    details                 jsonb        not null,
    content_hash            varchar(64)  not null,
    version                 bigint       not null default 0,
    created_at              timestamptz  not null default now(),
    updated_at              timestamptz  not null default now()
);
create index idx_problems_topic_difficulty on problems (topic, difficulty);
create index idx_problems_title_lower on problems (lower(title));

-- pattern tags ("two pointers", "hash map", ...) used for search and filtering
create table problem_topics (
    problem_id uuid        not null references problems (id) on delete cascade,
    tag        varchar(60) not null,
    primary key (problem_id, tag)
);
create index idx_problem_topics_tag on problem_topics (lower(tag));

create table problem_test_cases (
    id         uuid primary key,
    problem_id uuid    not null references problems (id) on delete cascade,
    ordinal    int     not null,
    input      text    not null,
    expected   text    not null,
    is_sample  boolean not null,
    unique (problem_id, ordinal)
);

create table problem_solutions (
    id         uuid primary key,
    problem_id uuid        not null references problems (id) on delete cascade,
    kind       varchar(20) not null check (kind in ('BRUTE_FORCE', 'OPTIMIZED')),
    payload    jsonb       not null,
    unique (problem_id, kind)
);
