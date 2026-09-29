const DEFAULT_DEMO_CENTER_ID = '00000000-0000-4000-8000-000000000001';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveDemoCenterId(env = {}) {
  const centerId = String(env.DEMO_CENTER_ID ?? DEFAULT_DEMO_CENTER_ID).trim();
  if (!UUID_PATTERN.test(centerId)) throw new Error('invalid_demo_center_id');
  return centerId;
}

export async function loadCenterCalendarConnection(admin, centerId) {
  if (!UUID_PATTERN.test(String(centerId ?? ''))) throw new Error('invalid_demo_center_id');
  const { data, error } = await admin.from('center_calendar_connections')
    .select('google_email,calendar_id,refresh_token_ciphertext,refresh_token_iv')
    .eq('center_id', centerId)
    .maybeSingle();
  if (error) throw new Error('center_calendar_lookup_failed');
  if (!data) throw new Error('center_calendar_not_connected');
  return data;
}

export function buildDemoCalendarEvent(appointment) {
  const start = new Date(`${appointment.date}T${appointment.time}:00-05:00`);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    summary: `[DEMO KolyTech] ${appointment.service}`,
    description: 'Evento de demostración de KolyTech. No se guardó una cita en la base clínica.',
    location: appointment.modality,
    start: { dateTime: start.toISOString(), timeZone: 'America/Lima' },
    end: { dateTime: end.toISOString(), timeZone: 'America/Lima' },
  };
}

