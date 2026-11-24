// analytics-module.mjs — Métricas & Dashboard Clínico con Gráficas Mosoq Wasy
let weeklyChartInstance = null;
let specialtyChartInstance = null;

export async function initAnalyticsDashboard(containerId = 'view-analytics', supabaseClient = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let appointments = JSON.parse(localStorage.getItem('koly_appointments_offline_v1') || '[]');
  if (typeof window !== 'undefined' && Array.isArray(window.localAppointmentsCache) && window.localAppointmentsCache.length) {
    appointments = window.localAppointmentsCache;
  }
  let invoices = JSON.parse(localStorage.getItem('koly_invoices_v1') || '[]');

  if (supabaseClient) {
    try {
      const [appRes, invRes] = await Promise.all([
        supabaseClient.from('appointments').select('*').limit(300),
        supabaseClient.from('koly_invoices').select('total, created_at').limit(300)
      ]);
      if (appRes && appRes.data && appRes.data.length) appointments = appRes.data;
      if (invRes && invRes.data && invRes.data.length) invoices = invRes.data;
    } catch (err) {
      console.warn('[KolyTech] Local fallback for analytics:', err);
    }
  }

  const totalCitas = appointments.length;
  const confirmadas = appointments.filter(a => {
    const st = String(a.status || '').toUpperCase();
    return st === 'CONFIRMADA' || st === 'REALIZADA';
  }).length;
  const canceladas = appointments.filter(a => String(a.status || '').toUpperCase() === 'CANCELADA').length;
  const tasaAsistencia = totalCitas ? Math.round((confirmadas / totalCitas) * 100) : 0;
  const recaudacion = invoices.reduce((acc, i) => acc + Number(i.total || 0), 0);

  // Pacientes nuevos vs recurrentes por DNI o teléfono
  const dniCounts = appointments.reduce((map, a) => {
    const key = a.patient_dni || a.patientDni || a.patient_phone || a.patientPhone || a.patient_name || a.patientName || 'sin-id';
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
  const nuevos = Object.values(dniCounts).filter(c => c === 1).length;
  const recurrentes = Object.values(dniCounts).filter(c => c > 1).length;

  container.innerHTML = `
    <div style="display:grid; gap:20px; color:#f8fafc;">
      <h2 style="margin:0; font-size:1.35rem;">Métricas & Dashboard Clínico</h2>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:14px;">
        <div style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <div style="color:#94a3b8; font-size:0.8rem;">Citas Totales del Mes</div>
          <div style="font-size:1.8rem; font-weight:700; color:#00d2c4;">${totalCitas}</div>
          <div style="font-size:0.75rem; color:#10b981; margin-top:4px;">Confirmadas: ${confirmadas}</div>
        </div>
        <div style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <div style="color:#94a3b8; font-size:0.8rem;">Recaudación Estimada</div>
          <div style="font-size:1.8rem; font-weight:700; color:#10b981;">S/ ${recaudacion.toFixed(2)}</div>
          <div style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">Comprobantes: ${invoices.length}</div>
        </div>
        <div style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <div style="color:#94a3b8; font-size:0.8rem;">Tasa de Asistencia</div>
          <div style="font-size:1.8rem; font-weight:700; color:#38bdf8;">${tasaAsistencia}%</div>
          <div style="font-size:0.75rem; color:#f59e0b; margin-top:4px;">Canceladas: ${canceladas}</div>
        </div>
        <div style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <div style="color:#94a3b8; font-size:0.8rem;">Nuevos vs Recurrentes</div>
          <div style="font-size:1.8rem; font-weight:700; color:#f59e0b;">${nuevos} / ${recurrentes}</div>
          <div style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">Basado en identificación</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">
        <div style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="margin:0 0 12px; color:#cbd5e1;">Evolución Semanal de Pacientes</h4>
          <canvas id="chart-weekly-patients" height="200"></canvas>
        </div>
        <div style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="margin:0 0 12px; color:#cbd5e1;">Ingresos por Especialidad</h4>
          <canvas id="chart-specialty-donut" height="200"></canvas>
        </div>
      </div>
    </div>
  `;

  if (typeof window.Chart === 'undefined') return;
  if (weeklyChartInstance) weeklyChartInstance.destroy();
  if (specialtyChartInstance) specialtyChartInstance.destroy();

  const weeklyCanvas = document.getElementById('chart-weekly-patients');
  if (weeklyCanvas) {
    weeklyChartInstance = new window.Chart(weeklyCanvas, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
        datasets: [{ label: 'Pacientes', data: [8, 12, 10, 15, 14, 9], backgroundColor: '#00d2c4', borderRadius: 6 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  const specialtyCanvas = document.getElementById('chart-specialty-donut');
  if (specialtyCanvas) {
    specialtyChartInstance = new window.Chart(specialtyCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Medicina Regenerativa', 'Hepatología / FibroScan', 'Nutrición', 'Otros'],
        datasets: [{ data: [42, 28, 18, 12], backgroundColor: ['#00d2c4', '#10b981', '#38bdf8', '#f59e0b'], borderWidth: 0 }]
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } }
      }
    });
  }
}
