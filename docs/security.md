# Security

## Threat model (summary)

| Asset / entry point | Threat | Mitigation |
|---|---|---|
| Code execution | sandbox escape, network abuse, fork bombs, resource exhaustion | Docker per run: `--network none`, `--read-only`, tmpfs `/tmp` (noexec), `--cap-drop ALL`, `--security-opt no-new-privileges`, `--user 65534`, `--pids-limit`, `--memory`/`--memory-swap`, `--cpus`, wall-clock timeout with `docker kill`, output caps; container removed after each run |
| Source code input | oversized or malformed payloads | 64 KB limit and shape checks (`public class Main`, no `package`) → `REJECTED`. There is deliberately no API denylist (it is trivially bypassed); the container is the security boundary |
| AI output | prompt injection, malicious code, invalid traces | output parsed as strict JSON; schema + adapter whitelist validated by `ResponseValidator`; code only runs in the sandbox; generated text is rendered as text (never `dangerouslySetInnerHTML`) |
| Uploads | malicious files, zip bombs, huge images | 5 MB limit, extension + magic-byte checks, PDF page cap, OCR timeout, files are never persisted |
| Auth | credential stuffing, token theft | BCrypt (cost 11), constant-cost login for unknown emails, gateway rate limits on `/auth/**`, generic login errors, 15-min access JWT kept in memory only, rotating refresh token in an httpOnly SameSite=Strict cookie scoped to `/api/v1/auth`, refresh-token reuse revokes all sessions |
| Service-to-service | spoofed internal calls | `/internal/**` requires `X-Internal-Token` (constant-time compare); the gateway never routes `/internal` and strips the header from client requests |
| Data access | IDOR | each service scopes reads by `CurrentUser.id()`; foreign resources return 404 |
| Browser | XSS, clickjacking | nginx CSP (`default-src 'self'`; Monaco workers allowed via `worker-src blob:`), `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy` |
| Secrets | leakage | all secrets come from environment variables; `.env` is git-ignored; `.env.example` has placeholders only; services refuse to start if `JWT_SECRET` is shorter than 32 bytes |

## Known limitations

- The execution service needs access to the Docker socket to start sandboxes. In production, prefer a dedicated sandbox host, rootless Docker, or gVisor (`--runtime runsc`), and do not co-locate it with other services.
- `EXECUTION_SANDBOX=local` (LocalProcessSandbox) runs code as a plain child process. It is for local development only and labels every result `local-unsafe-dev`.
- The Docker sandbox was implemented and unit-tested for its command line, but **was not run end-to-end in the build environment** (no Docker daemon was available). See the verification report.
- No CSRF token: the refresh cookie is `SameSite=Strict` and path-scoped, and all other endpoints use bearer tokens.
- Nothing stops you deploying with the example `JWT_SECRET`/`INTERNAL_TOKEN` values — change them.
- No account lockout or email verification yet. Rate limiting is per IP.

## Reporting

Please open a private security advisory on GitHub rather than a public issue.
