/**
 * @param {string} baseUrl
 * @param {Record<string, string|number|undefined>} params
 */
export function buildWfsGetFeatureUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * @param {string} url
 * @param {string} cacheKey
 */
export async function fetchWithCache(url, cacheKey) {
  const fs = await import('fs/promises');
  const path = await import('path');
  const { EXTERNAL_CACHE_DIR } = await import('./config.js');

  const file = path.join(EXTERNAL_CACHE_DIR, cacheKey);
  try {
    const cached = await fs.readFile(file, 'utf8');
    if (cached.trim()) return cached;
  } catch {
    // miss
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': 'antberg-stuttgart-external/1.0' },
    signal: AbortSignal.timeout(180_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text, 'utf8');
  return text;
}
