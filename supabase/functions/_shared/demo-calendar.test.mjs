import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDemoCalendarEvent,
  loadCenterCalendarConnection,
  resolveDemoCenterId,
} from './demo-calendar.mjs';

const rootCenterId = '00000000-0000-4000-8000-000000000001';

test('la demo queda vinculada al centro KolyMedical salvo configuración explícita válida', () => {
  assert.equal(resolveDemoCenterId({}), rootCenterId);
  assert.equal(resolveDemoCenterId({ DEMO_CENTER_ID: rootCenterId }), rootCenterId);
  assert.throws(() => resolveDemoCenterId({ DEMO_CENTER_ID: 'otro-centro' }), /invalid_demo_center_id/);
});

test('la consulta de credenciales solo lee la conexión del centro solicitado', async () => {
  const calls = [];
  const connection = {
    google_email: 'kolymedical26@gmail.com',
    calendar_id: 'primary',
    refresh_token_ciphertext: 'ciphertext',
    refresh_token_iv: 'iv',
  };
  const query = {
    select(columns) { calls.push(['select', columns]); return this; },
    eq(column, value) { calls.push(['eq', column, value]); return this; },
    async maybeSingle() { calls.push(['maybeSingle']); return { data: connection, error: null }; },
  };
  const admin = { from(table) { calls.push(['from', table]); return query; } };

  assert.equal(await loadCenterCalendarConnection(admin, rootCenterId), connection);
  assert.deepEqual(calls, [
    ['from', 'center_calendar_connections'],
    ['select', 'google_email,calendar_id,refresh_token_ciphertext,refresh_token_iv'],
    ['eq', 'center_id', rootCenterId],
    ['maybeSingle'],
  ]);
});

test('la demo falla cerrada si el centro no tiene Calendar conectado', async () => {
  const query = {
    select() { return this; },
    eq() { return this; },
    async maybeSingle() { return { data: null, error: null }; },
  };
  const admin = { from() { return query; } };
  await assert.rejects(loadCenterCalendarConnection(admin, rootCenterId), /calendar_not_connected/);
});

test('el evento de demo no incorpora el nombre ni el teléfono del paciente', () => {
  const event = buildDemoCalendarEvent({
    patientName: 'Paciente de prueba',
    patientPhone: '999999999',
    service: 'Consulta de Medicina Regenerativa',
    date: '2026-10-01',
    time: '10:30',
    modality: 'Virtual',
  });

  assert.equal(event.summary, '[DEMO KolyTech] Consulta de Medicina Regenerativa');
  assert.equal(event.start.timeZone, 'America/Lima');
  assert.equal(event.end.dateTime, '2026-10-01T16:00:00.000Z');
  assert.doesNotMatch(JSON.stringify(event), /Paciente de prueba|999999999/);
});

