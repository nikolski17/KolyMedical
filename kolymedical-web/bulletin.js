import { submitBulletinLead } from './bulletin-leads.mjs?v=20260830b1';

const SUPABASE_URL = 'https://tounxohlvyjcwcyeddlg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdW54b2hsdnlqY3djeWVkZGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTMzNTAsImV4cCI6MjA5OTM2OTM1MH0.IZtNzjH7gF4fW27dGy1R6vy-uIEFV8iOwduXYRGY03M';
const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

document.querySelectorAll('.bulletin-interest-form').forEach((form) => {
  const status = form.querySelector('[data-form-status]');
  const success = form.querySelector('[data-form-success]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const value = Object.fromEntries([...form.querySelectorAll('[data-field]')].map((field) => [field.dataset.field.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), field.type === 'checkbox' ? field.checked : field.value]));
    button.disabled = true;
    status.textContent = 'Guardando tus datos de forma segura…';
    try {
      if (!client) throw new Error('No hay conexión disponible.');
      const result = await submitBulletinLead(client, value);
      if (typeof window.fbq === 'function') window.fbq('trackSingle', '1079137687941980', 'Lead');
      status.textContent = result.alreadyRegistered ? 'Ya tenemos una solicitud activa con este correo.' : 'Datos recibidos. Un asesor de KolyMedical podrá contactarte.';
      success.hidden = false;
      const message = encodeURIComponent(`Hola KolyMedical, soy Dr(a). ${result.value.firstNames} ${result.value.lastNames}, colegiatura ${result.value.medicalLicense}. Dejé mis datos en el boletín y deseo información del Workshop Médico de Terapia Celular.`);
      success.querySelector('[data-live-advisor]').href = `https://wa.me/51987346934?text=${message}`;
      form.querySelector('fieldset').disabled = true;
    } catch (error) {
      status.textContent = error.message || 'No se pudo enviar la información.';
      status.classList.add('is-error');
      button.disabled = false;
    }
  });
  form.querySelector('[data-close-form]').addEventListener('click', () => {
    form.reset();
    form.querySelector('fieldset').disabled = false;
    success.hidden = true;
    status.textContent = '';
    status.classList.remove('is-error');
    form.querySelector('button[type="submit"]').disabled = false;
  });
});
