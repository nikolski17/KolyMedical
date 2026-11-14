import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');

test('la página demo está aislada y no persiste datos del navegador', () => {
  const html = read('kolytechdemo.html');
  const js = read('kolytechdemo.js');

  assert.match(html, /MODO DEMOSTRACIÓN/i);
  assert.match(html, /no se guardan? datos|no guarda datos/i);
  assert.match(html, /data-demo-form/);
  assert.match(html, /FIRMA DE PRUEBA/);
  assert.match(html, /NO VÁLIDA/i);
  assert.doesNotMatch(html, /app\.js|supabase-js/i);

  assert.doesNotMatch(js, /createClient|\.from\s*\(|localStorage|sessionStorage|indexedDB/i);
  assert.match(js, /demo-calendar-sync/);
  assert.match(js, /crypto\.randomUUID|demo-/i);
  assert.match(js, /signature-demo/);
  assert.match(js, /FIRMA DE PRUEBA|NO VÁLIDA/i);
});

test('la función demo lee la conexión del centro y no persiste citas clínicas', () => {
  const fn = read('supabase/functions/demo-calendar-sync/index.ts');

  assert.match(fn, /calendar\.googleapis\.com|www\.googleapis\.com/i);
  assert.match(fn, /GOOGLE_CLIENT_ID/);
  assert.match(fn, /GOOGLE_CLIENT_SECRET/);
  assert.match(fn, /center_calendar_connections|loadCenterCalendarConnection/);
  assert.match(fn, /CENTER_CALENDAR_TOKEN_ENCRYPTION_KEY/);
  assert.match(fn, /DEMO_CENTER_ID/);
  assert.doesNotMatch(fn, /GOOGLE_REFRESH_TOKEN/);
  assert.match(fn, /kolytechdemo\.kolymedical\.lat/);
  assert.match(fn, /Access-Control-Allow-Origin/);
  assert.match(fn, /429/);
  assert.doesNotMatch(fn, /\.from\s*\([^)]*\)\s*\.\s*(insert|upsert|update|delete)\s*\(/i);
  assert.doesNotMatch(fn, /firma.*real|privateKey|PRIVATE_KEY/i);
});

test('la demo tiene cabeceras de no indexación y no almacenamiento', () => {
  const vercel = read('vercel.json');
  assert.match(vercel, /kolytechdemo/);
  assert.match(vercel, /no-store/);
  assert.match(vercel, /noindex, nofollow, noarchive/);
});

