export const endpoints = {
  fetchTables: '/api/fetch-tables',
  previewMigration: '/api/preview-migration',
  migrate: '/api/migrate',
  storeCredentials: '/api/store-credentials',
  getCredentials: '/api/get-credentials',
};

export async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} - ${text}`);
  }
  return res.json();
}
