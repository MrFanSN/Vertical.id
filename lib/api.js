// Klien API (browser). status 0 = jaringan gagal.
export async function api(path, { method = 'GET', body, code } = {}) {
  try {
    const res = await fetch(path, {
      method, cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(code ? { 'x-access-code': code } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, data };
  } catch { return { status: 0, data: null }; }
}
