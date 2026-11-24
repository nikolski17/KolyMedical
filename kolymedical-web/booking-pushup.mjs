// booking-pushup.mjs
const APPOINTMENTS_KEY = 'koly_appointments_offline_v1';

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'koly-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

export function buildCalendarTitle(appointment) {
  const prefix = appointment.modality === 'Virtual' ? 'CONSULTA VIRTUAL' : 'CITA PRESENCIAL';
  return `${prefix} - ${(appointment.service || 'CONSULTA').toUpperCase()} - ${(appointment.patient_name || '').toUpperCase()}`;
}

export function initPushupBooking(supabaseClient = null, onSaved = null) {
  let backdrop = document.getElementById('booking-pushup-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'booking-pushup-backdrop';
    backdrop.style.cssText = 'display:none; position:fixed; inset:0; z-index:99998; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px);';
    backdrop.innerHTML = `
      <div id="booking-pushup-panel" style="position:fixed; bottom:0; left:50%; transform:translate(-50%, 100%); transition:transform 0.25s cubic-bezier(0.22,1,0.36,1); width:100%; max-width:640px; background:#11192c; border-top-left-radius:20px; border-top-right-radius:20px; border:1px solid rgba(255,255,255,0.1); padding:24px; box-shadow:0 -10px 40px rgba(0,0,0,0.6); max-height:90vh; overflow-y:auto; color:#f8fafc;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="margin:0; font-size:1.2rem; color:#00d2c4;">Nueva Cita Médica</h3>
          <button type="button" id="btn-close-pushup-booking" style="background:none; border:none; color:#94a3b8; font-size:1.6rem; cursor:pointer; line-height:1;">&times;</button>
        </div>
        <form id="pushup-booking-form" style="display:grid; gap:12px;">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
            <label style="font-size:0.8rem; color:#94a3b8;">Paciente
              <input name="patient_name" required placeholder="Nombre completo" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#f8fafc; border:1px solid rgba(255,255,255,0.12);">
            </label>
            <label style="font-size:0.8rem; color:#94a3b8;">DNI / Cédula
              <input name="patient_dni" required maxlength="12" placeholder="Ej. 71234567" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#f8fafc; border:1px solid rgba(255,255,255,0.12);">
            </label>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
            <label style="font-size:0.8rem; color:#94a3b8;">Teléfono / WhatsApp
              <input name="patient_phone" required placeholder="Ej. 987654321" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#f8fafc; border:1px solid rgba(255,255,255,0.12);">
            </label>
            <label style="font-size:0.8rem; color:#94a3b8;">Especialidad / Servicio
              <input name="service" required placeholder="Ej. Medicina Regenerativa" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#f8fafc; border:1px solid rgba(255,255,255,0.12);">
            </label>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px;">
            <label style="font-size:0.8rem; color:#94a3b8;">Fecha
              <input name="date" type="date" required style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#f8fafc; border:1px solid rgba(255,255,255,0.12);">
            </label>
            <label style="font-size:0.8rem; color:#94a3b8;">Hora
              <input name="time" type="time" required style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#f8fafc; border:1px solid rgba(255,255,255,0.12);">
            </label>
            <label style="font-size:0.8rem; color:#94a3b8;">Modalidad
              <select name="modality" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#f8fafc; border:1px solid rgba(255,255,255,0.12);">
                <option value="Presencial">Presencial</option>
                <option value="Virtual">Virtual (Google Meet)</option>
              </select>
            </label>
          </div>
          <div style="display:grid; grid-template-columns:1fr 2fr; gap:12px;">
            <label style="font-size:0.8rem; color:#94a3b8;">Canalizador
              <input name="lead_source" placeholder="Ej. Brayan" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#f8fafc; border:1px solid rgba(255,255,255,0.12);">
            </label>
            <label style="font-size:0.8rem; color:#94a3b8;">Motivo Clínico
              <input name="motive" placeholder="Motivo de la consulta" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#f8fafc; border:1px solid rgba(255,255,255,0.12);">
            </label>
          </div>
          <button type="submit" style="margin-top:8px; padding:12px; border-radius:10px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer;">
            Confirmar y Agendar Cita
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);
  }

  const panel = backdrop.querySelector('#booking-pushup-panel');
  const form = backdrop.querySelector('#pushup-booking-form');

  const open = () => {
    backdrop.style.display = 'block';
    requestAnimationFrame(() => { panel.style.transform = 'translate(-50%, 0)'; });
  };
  const close = () => {
    panel.style.transform = 'translate(-50%, 100%)';
    setTimeout(() => { backdrop.style.display = 'none'; }, 240);
  };

  document.querySelectorAll('#btn-trigger-pushup-booking').forEach(btn => {
    btn.addEventListener('click', open);
  });
  backdrop.querySelector('#btn-close-pushup-booking').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const appointment = {
      ...data,
      status: 'CONFIRMADA',
      created_at: new Date().toISOString()
    };

    const cached = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
    cached.unshift(appointment);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(cached));

    if (supabaseClient) {
      const { error } = await supabaseClient.from('koly_appointments').insert(appointment);
      if (error) console.warn('[KolyTech] Guardado offline en LocalStorage:', error.message);
    }

    form.reset();
    close();
    showToast(`Cita agendada: ${buildCalendarTitle(appointment)}`);
    if (typeof onSaved === 'function') onSaved(appointment);
  });
}
