export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const base = process.env.HUBITAT_BASE;
  const token = process.env.HUBITAT_TOKEN;
  if (!base || !token) return res.status(500).json({ error: 'missing_env' });

  // Build target URL
  const segments = Array.isArray(req.query.segments)
    ? req.query.segments
    : (req.query.segments ? [req.query.segments] : []);
  const tail = segments.length ? '/' + segments.join('/') : '';
  const target = new URL(base.replace(/\/$/, '') + tail);

  // Copy query params except the catch-all param itself
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'segments') continue;
    if (Array.isArray(v)) {
      v.forEach((vv) => target.searchParams.append(k, String(vv)));
    } else {
      target.searchParams.set(k, String(v));
    }
  }
  target.searchParams.set('access_token', token);

  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET',
      headers: {
        'user-agent': 'Hubitat-Cloud-Proxy',
        accept: req.headers['accept'] || '*/*',
      },
    });

    const body = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);

    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    const cc = upstream.headers.get('cache-control');
    res.setHeader('Cache-Control', cc || 'no-cache');

    return res.send(body);
  } catch (e) {
    return res.status(502).json({ error: 'upstream_error', message: e?.message || String(e) });
  }
}
