// admin-boot.mjs — Bootloader modular para KolyMedical Admin
import { initImcCalculator } from './imc-calculator.mjs?v=20261124g';
import { initPushupBooking } from './booking-pushup.mjs?v=20261124g';
import { initBillingModule } from './billing-module.mjs?v=20261124g';
import { initAnalyticsDashboard } from './analytics-module.mjs?v=20261124g';
import { initProfileModule } from './profile-module.mjs?v=20261124g';

let imcInitialized = false;

export function bootModules(authenticatedUser = null) {
  if (!imcInitialized) {
    try {
      initImcCalculator('#btn-imc-calculator');
      imcInitialized = true;
    } catch (err) {
      console.warn('[KolyTech] IMC init error:', err);
    }
  }

  const user = authenticatedUser || (typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : null);
  if (!user || !user.role) {
    // No inicializar módulos protegidos si aún no hay sesión autenticada
    return;
  }

  const sb = window.supabaseClient || null;

  try {
    initPushupBooking(sb, () => typeof window.loadAppointments === 'function' && window.loadAppointments());
  } catch (err) {
    console.warn('[KolyTech] Pushup booking init error:', err);
  }

  try {
    const billP = initBillingModule('view-billing', sb, user);
    if (billP && typeof billP.catch === 'function') {
      billP.catch(err => console.warn('[KolyTech] Billing module async error:', err));
    }
  } catch (err) {
    console.warn('[KolyTech] Billing init error:', err);
  }

  try {
    initAnalyticsDashboard('view-analytics', sb);
  } catch (err) {
    console.warn('[KolyTech] Analytics init error:', err);
  }

  try {
    initProfileModule('view-profile', sb);
  } catch (err) {
    console.warn('[KolyTech] Profile init error:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootModules());
} else {
  bootModules();
}

window.bootModules = bootModules;
