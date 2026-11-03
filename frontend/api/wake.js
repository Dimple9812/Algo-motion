// Vercel function: GET /api/wake
// The hosted demo runs each backend service on Render's free tier, where services sleep after 15 minutes idle.
// Render's edge challenges requests from one Render service to another *sleeping* one, so the gateway cannot wake
// them. A request from outside Render can, so this function pings every service's health endpoint in parallel
// and reports which are up. Calling it repeatedly while services start is cheap: each call is one short GET per service.
const DEFAULT_SERVICES = {
  gateway: 'https://algomotion-gateway.onrender.com',
  catalog: 'https://algomotion-catalog.onrender.com',
  users: 'https://algomotion-users.onrender.com',
  ai: 'https://algomotion-ai.onrender.com',
  execution: 'https://algomotion-exec.onrender.com',
  visualization: 'https://algomotion-viz.onrender.com',
};

function services() {
  try {
    return process.env.WAKE_SERVICES ? JSON.parse(process.env.WAKE_SERVICES) : DEFAULT_SERVICES;
  } catch {
    return DEFAULT_SERVICES;
  }
}

async function probe(base) {
  try {
    const r = await fetch(`${base}/actuator/health`, {
      headers: { accept: 'application/json', 'user-agent': 'algomotion-wake/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return 'STARTING';
    const body = await r.json().catch(() => null);
    return body && body.status === 'UP' ? 'UP' : 'STARTING';
  } catch {
    // Timed out or connection held while the instance boots: the request itself triggered the wake-up.
    return 'STARTING';
  }
}

export default async function handler(req, res) {
  const entries = Object.entries(services());
  const results = await Promise.all(entries.map(async ([name, url]) => [name, await probe(url)]));
  const status = Object.fromEntries(results);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ services: status, allUp: results.every(([, s]) => s === 'UP') });
}
