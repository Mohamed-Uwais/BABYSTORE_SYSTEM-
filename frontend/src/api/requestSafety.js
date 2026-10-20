// Keep the key after a timeout so an explicit retry returns the committed order.
export function protectCheckout(client, checkoutPath) {
  const post = client.post.bind(client);
  let pending = null;
  let saved = null;
  const slot = `littora:checkout:${checkoutPath}`;
  client.post = (url, body, config = {}) => {
    if (url !== checkoutPath) return post(url, body, config);
    if (pending) return pending;
    const run = async () => {
      const data = body instanceof FormData
        ? [...body.entries()].map(([key, value]) => [key, value instanceof Blob ? [value.name, value.size, value.lastModified] : value])
        : body;
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
      const fingerprint = [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
      try { saved = JSON.parse(sessionStorage.getItem(slot)) || saved; } catch { /* memory fallback */ }
      if (!saved || saved.fingerprint !== fingerprint) saved = { fingerprint, key: crypto.randomUUID() };
      try { sessionStorage.setItem(slot, JSON.stringify(saved)); } catch { /* memory fallback */ }
      const response = await post(url, body, { ...config, headers: { ...config.headers, 'Idempotency-Key': saved.key } });
      saved = null;
      try { sessionStorage.removeItem(slot); } catch { /* storage unavailable */ }
      return response;
    };
    pending = run().finally(() => { pending = null; });
    return pending;
  };
}

// Share concurrent reads only; never cache successful data or share cancellable reads.
export function deduplicateReads(client, scope = () => null) {
  const get = client.get.bind(client);
  const pending = new Map();
  client.get = (url, config = {}) => {
    if (config.signal) return get(url, config);
    const key = JSON.stringify([scope(), url, config]);
    if (pending.has(key)) return pending.get(key);
    const request = get(url, config).finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  };
}
