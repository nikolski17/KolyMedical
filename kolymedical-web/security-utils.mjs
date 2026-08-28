const HTML_ENTITIES = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
});

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}

export function normalizeUsername(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalized) ? normalized : '';
}

export function validatePasswordStrength(value) {
  const password = String(value ?? '');
  const checks = {
    length: password.length >= 8 && password.length <= 128,
    upper: /[A-ZÁÉÍÓÚÑ]/.test(password),
    lower: /[a-záéíóúñ]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(password),
    noWhitespaceEdges: password === password.trim()
  };
  return {
    valid: Object.values(checks).every(Boolean),
    checks,
    message: 'Usa entre 8 y 128 caracteres, con mayúscula, minúscula, número y símbolo.'
  };
}

function isPlainText(value, min, max) {
  const text = String(value ?? '').trim();
  return text.length >= min && text.length <= max && !/[<>\u0000-\u001F]/.test(text);
}

export function validatePublicAppointment(input) {
  const value = input && typeof input === 'object' ? input : {};
  const allowedModalities = new Set(['Presencial', 'Virtual', 'Domicilio', 'A Domicilio']);
  const age = Number(value.patientAge);
  const date = String(value.date ?? '');
  const time = String(value.time ?? '').trim();
  const valid =
    isPlainText(value.patientName, 2, 120) &&
    /^9\d{8}$/.test(String(value.patientPhone ?? '').replace(/\D/g, '')) &&
    (!value.patientDni || /^\d{8,12}$/.test(String(value.patientDni))) &&
    Number.isInteger(age) && age >= 0 && age <= 120 &&
    /^[a-z0-9_-]{2,64}$/i.test(String(value.serviceId ?? '')) &&
    (!value.specialistId || /^[a-z0-9_-]{2,64}$/i.test(String(value.specialistId))) &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    (/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || time.startsWith('Por coordinar')) &&
    allowedModalities.has(String(value.modality ?? '')) &&
    (!value.motivoConsulta || isPlainText(value.motivoConsulta, 1, 1000));

  return {
    valid,
    message: valid ? '' : 'Revisa los datos de la cita. Hay campos incompletos o con formato inválido.'
  };
}

const api = Object.freeze({
  escapeHtml,
  normalizeUsername,
  validatePasswordStrength,
  validatePublicAppointment
});

if (typeof globalThis !== 'undefined') {
  globalThis.KolySecurity = api;
}
