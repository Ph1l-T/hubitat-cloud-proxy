export default async function handler(req, res) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(204).end();
if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

const base = process.env.HUBITAT_BASE;
const token = process.env.HUBITAT_TOKEN;
if (!base || !token) return res.status(500).json({ error: 'missing_env' });

const segments = Array.isArray(req.query.segments) ? req.query.segments : (req.query.segments ? [req.query.segments] : []);
const tail = '/' + segments.join('/'); // ex.: /devices/13
const target = new URL(base + tail);

for (const [k, v] of Object.entries(req.query)) {
if (k !== 'segments') target.searchParams.set(k, String(v));
}
target.searchParams.set('access_token', token);

try {
const upstream = await fetch(target.toString(), { method: 'GET', headers: { 'user-agent': 'Dashboard-Proxy' } });
const buf = Buffer.from(await upstream.arrayBuffer());
res.status(upstream.status);
res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
res.setHeader('Cache-Control', 'no-cache');
return res.send(buf);
} catch (e) {
return res.status(502).json({ error: 'upstream_error', message: e.message });
}
}
"@ | Set-Content -Path api\hubitat[...segments].js -Encoding UTF8`