(() => {
  'use strict';

  const CALENDAR_FUNCTION_URL = 'https://tounxohlvyjcwcyeddlg.supabase.co/functions/v1/demo-calendar-sync';
  const ALLOWED_SERVICES = new Set([
    'Consulta de Medicina Regenerativa',
    'Consulta de Nutrición Clínica',
    'Consulta de Psicología Clínica',
    'Consulta de Hematología Clínica'
  ]);
  const ALLOWED_MODALITIES = new Set(['Presencial', 'Virtual']);
  const state = { appointments: [], document: {} };
  const byId = (id) => document.getElementById(id);
  const trim = (value) => String(value || '').trim();

  const demoState = {
    reset() {
      state.appointments = [];
      renderAppointments();
      resetDocumentForm();
      showStatus('', '');
    }
  };

  function showStatus(message, type) {
    const status = byId('demo-status');
    status.textContent = message;
    status.className = type ? `demo-status ${type}` : 'demo-status';
    status.hidden = !message;
  }

  function randomId() {
    if (globalThis.crypto?.randomUUID) return `demo-${globalThis.crypto.randomUUID()}`;
    return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function validAppointment(values) {
    if (values.patientName.length < 2 || values.patientName.length > 120) return 'Ingresa un nombre válido.';
    if (!/^9\d{8}$/.test(values.patientPhone)) return 'Ingresa un teléfono peruano de 9 dígitos que empiece en 9.';
    if (!ALLOWED_SERVICES.has(values.service)) return 'Selecciona un servicio válido.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) return 'Selecciona una fecha válida.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) return 'Selecciona una hora válida.';
    if (!ALLOWED_MODALITIES.has(values.modality)) return 'Selecciona una modalidad válida.';
    const scheduled = new Date(`${values.date}T${values.time}:00-05:00`);
    if (Number.isNaN(scheduled.getTime())) return 'La fecha y hora no son válidas.';
    if (scheduled.getTime() < Date.now() - 60_000) return 'Para la demo selecciona una fecha futura.';
    return '';
  }

  async function sendToCalendar(appointment) {
    const response = await fetch(CALENDAR_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment })
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) { payload = {}; }
    if (!response.ok) throw new Error(payload.error || 'No se pudo enviar la cita al calendario.');
    return payload;
  }

  async function handleAppointmentSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = {
      id: randomId(),
      patientName: trim(form.elements.patientName.value),
      patientPhone: trim(form.elements.patientPhone.value).replace(/\D/g, ''),
      service: trim(form.elements.service.value),
      date: trim(form.elements.date.value),
      time: trim(form.elements.time.value),
      modality: trim(form.elements.modality.value)
    };
    const validationError = validAppointment(values);
    if (validationError) { showStatus(validationError, 'error'); return; }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Enviando al calendario…';
    showStatus('Enviando un evento DEMO a Google Calendar. La demo no está guardando una cita en la base clínica.', 'success');
    try {
      const calendar = await sendToCalendar(values);
      state.appointments.push({ ...values, calendarEventId: calendar.calendarEventId || '' });
      renderAppointments();
      form.reset();
      byId('demo-modality').value = 'Presencial';
      showStatus('Cita DEMO enviada a Google Calendar y añadida solo a esta sesión temporal.', 'success');
    } catch (error) {
      showStatus(error.message || 'No se pudo enviar la cita al calendario. No se guardó en la demo.', 'error');
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Agregar a agenda y enviar al calendario <span aria-hidden="true">→</span>';
    }
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(date).replace('.', '').toUpperCase();
  }

  function renderAppointments() {
    const list = byId('demo-agenda-list');
    const empty = byId('demo-empty-state');
    const count = byId('demo-agenda-count');
    list.replaceChildren();
    empty.hidden = state.appointments.length > 0;
    count.textContent = `${state.appointments.length} ${state.appointments.length === 1 ? 'cita' : 'citas'}`;
    state.appointments.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'agenda-item';
      const date = document.createElement('div');
      date.className = 'agenda-date';
      date.textContent = formatDate(item.date);
      const info = document.createElement('div');
      info.className = 'agenda-info';
      const name = document.createElement('strong');
      name.textContent = item.patientName;
      const detail = document.createElement('span');
      detail.textContent = `${item.time} · ${item.service}`;
      info.append(name, detail);
      const modality = document.createElement('div');
      modality.className = 'agenda-mode';
      modality.textContent = item.modality;
      row.append(date, info, modality);
      list.append(row);
    });
  }

  function setDocumentDateIfEmpty() {
    const input = byId('demo-document-date');
    if (!input.value) input.value = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  }

  function updateDocumentTypeUi() {
    const isRecipe = byId('demo-document-type').value === 'receta';
    byId('demo-detail-label').textContent = isRecipe ? 'Medicamento e indicaciones' : 'Estudio e indicaciones';
    byId('demo-document-detail').placeholder = isRecipe
      ? 'Ej. Producto, dosis, frecuencia e indicaciones'
      : 'Ej. Estudio solicitado e indicaciones de preparación';
  }

  function readDocumentForm() {
    const form = byId('demo-document-form');
    return {
      type: form.elements.documentType.value,
      date: form.elements.documentDate.value,
      patient: trim(form.elements.documentPatient.value) || 'Paciente de demostración',
      diagnosis: trim(form.elements.diagnosis.value) || 'Motivo de atención de demostración',
      detail: trim(form.elements.detail.value) || 'Aquí aparecerán el medicamento, la dosis o las indicaciones de prueba.'
    };
  }

  function renderDocument() {
    const preview = byId('demo-document-preview');
    updateDocumentTypeUi();
    const data = readDocumentForm();
    state.document = data;
    preview.replaceChildren();
    const heading = document.createElement('div');
    heading.className = 'document-heading';
    const title = document.createElement('div');
    const titleStrong = document.createElement('strong');
    titleStrong.textContent = data.type === 'receta' ? 'Receta médica electrónica' : 'Orden médica digital';
    const subtitle = document.createElement('small');
    subtitle.textContent = 'KolyTech · Vista previa temporal';
    title.append(titleStrong, subtitle);
    const tag = document.createElement('span');
    tag.className = 'document-tag';
    tag.textContent = 'Demo';
    heading.append(title, tag);

    const meta = document.createElement('div');
    meta.className = 'document-meta';
    [['Paciente', data.patient], ['Fecha', data.date || 'Fecha de demostración'], ['Diagnóstico / motivo', data.diagnosis]].forEach(([label, value]) => {
      const cell = document.createElement('div');
      const labelNode = document.createElement('span');
      labelNode.textContent = label;
      const valueNode = document.createElement('strong');
      valueNode.textContent = value;
      cell.append(labelNode, valueNode);
      meta.append(cell);
    });

    const detailBox = document.createElement('div');
    detailBox.className = 'document-detail-box';
    const detailLabel = document.createElement('div');
    detailLabel.className = 'document-detail-label';
    detailLabel.textContent = data.type === 'receta' ? 'Medicamento e indicaciones' : 'Estudio / indicaciones';
    const detail = document.createElement('div');
    detail.className = 'document-detail';
    detail.textContent = data.detail;
    detailBox.append(detailLabel, detail);

    const signature = document.createElement('div');
    signature.className = 'signature-demo';
    const warning = document.createElement('strong');
    warning.textContent = 'FIRMA DE PRUEBA';
    const warningDetail = document.createElement('span');
    warningDetail.textContent = 'NO VÁLIDA PARA ATENCIÓN CLÍNICA';
    signature.append(warning, warningDetail);
    preview.append(heading, meta, detailBox, signature);
  }

  function resetDocumentForm() {
    const form = byId('demo-document-form');
    form.reset();
    setDocumentDateIfEmpty();
    renderDocument();
  }

  byId('demo-appointment-form').addEventListener('submit', handleAppointmentSubmit);
  byId('demo-document-form').addEventListener('input', renderDocument);
  byId('demo-document-type').addEventListener('change', renderDocument);
  byId('demo-print-document').addEventListener('click', () => window.print());
  byId('demo-reset').addEventListener('click', demoState.reset);
  setDocumentDateIfEmpty();
  renderAppointments();
  renderDocument();
  globalThis.demoKolyTech = demoState;
})();
