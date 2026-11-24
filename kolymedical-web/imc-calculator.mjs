// imc-calculator.mjs
let imcModalElement = null;

function ensureImcModal() {
  if (imcModalElement && document.body.contains(imcModalElement)) {
    return imcModalElement;
  }

  let modal = document.getElementById('koly-imc-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'koly-imc-modal';
    modal.style.cssText = `
      display: none; position: fixed; inset: 0; z-index: 99999;
      background: rgba(11, 17, 30, 0.85); backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      align-items: center; justify-content: center; padding: 1rem;
    `;
    modal.innerHTML = `
      <div style="background:#11192c; border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:24px; width:100%; max-width:390px; color:#f8fafc; font-family:inherit; box-shadow:0 20px 50px rgba(0,0,0,0.6);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="margin:0; font-size:1.15rem; color:#00d2c4; font-weight:700; display:flex; align-items:center; gap:8px;">
            <span>Calculadora IMC</span>
          </h3>
          <button type="button" id="imc-close-btn" style="background:none; border:none; color:#94a3b8; font-size:1.6rem; cursor:pointer; line-height:1; padding:0 4px;" title="Cerrar">&times;</button>
        </div>
        <div style="display:grid; gap:14px;">
          <label style="font-size:0.85rem; color:#cbd5e1; display:block;">
            Peso del Paciente (kg)
            <input type="number" id="imc-peso" step="0.1" min="1" placeholder="Ej. 72.5"
              style="width:100%; box-sizing:border-box; margin-top:6px; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); background:#0b111e; color:#fff; font-size:1rem; outline:none;">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1; display:block;">
            Talla / Altura (cm)
            <input type="number" id="imc-talla" step="0.1" min="30" placeholder="Ej. 170"
              style="width:100%; box-sizing:border-box; margin-top:6px; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); background:#0b111e; color:#fff; font-size:1rem; outline:none;">
          </label>
          <div id="imc-resultado" style="margin-top:6px; padding:16px; border-radius:10px; background:#0b111e; border:1px solid rgba(255,255,255,0.08); text-align:center;">
            <span style="color:#64748b; font-size:0.9rem;">Ingresa peso y talla para calcular</span>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
            <button type="button" id="imc-btn-limpiar" style="padding:6px 14px; border-radius:6px; border:1px solid rgba(255,255,255,0.12); background:none; color:#94a3b8; font-size:0.8rem; cursor:pointer;">Limpiar</button>
            <button type="button" id="imc-btn-cerrar" style="padding:6px 16px; border-radius:6px; border:none; background:#00d2c4; color:#0b111e; font-weight:700; font-size:0.8rem; cursor:pointer;">Listo</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const pesoInput = modal.querySelector('#imc-peso');
    const tallaInput = modal.querySelector('#imc-talla');
    const resultBox = modal.querySelector('#imc-resultado');
    const closeBtn = modal.querySelector('#imc-close-btn');
    const cerrarBtn = modal.querySelector('#imc-btn-cerrar');
    const limpiarBtn = modal.querySelector('#imc-btn-limpiar');

    const calcular = () => {
      const peso = parseFloat(pesoInput.value);
      const tallaCm = parseFloat(tallaInput.value);
      if (!peso || !tallaCm || tallaCm <= 0) {
        resultBox.innerHTML = `<span style="color:#64748b; font-size:0.9rem;">Ingresa peso y talla válidos</span>`;
        return;
      }
      const tallaM = tallaCm / 100;
      const imc = +(peso / (tallaM * tallaM)).toFixed(2);

      let categoria = 'Peso normal';
      let color = '#10b981';
      if (imc < 18.5) { categoria = 'Bajo peso'; color = '#38bdf8'; }
      else if (imc < 25) { categoria = 'Peso normal'; color = '#10b981'; }
      else if (imc < 30) { categoria = 'Sobrepeso'; color = '#f59e0b'; }
      else if (imc < 35) { categoria = 'Obesidad Grado I'; color = '#f97316'; }
      else if (imc < 40) { categoria = 'Obesidad Grado II'; color = '#ef4444'; }
      else { categoria = 'Obesidad Grado III (Mórbida)'; color = '#dc2626'; }

      resultBox.innerHTML = `
        <div style="font-size:2.2rem; font-weight:800; color:${color}; line-height:1;">${imc}</div>
        <div style="font-size:0.92rem; font-weight:600; color:#e2e8f0; margin-top:6px;">${categoria}</div>
      `;
    };

    const cerrarModal = () => { modal.style.display = 'none'; };

    closeBtn?.addEventListener('click', cerrarModal);
    cerrarBtn?.addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
    limpiarBtn?.addEventListener('click', () => {
      pesoInput.value = '';
      tallaInput.value = '';
      resultBox.innerHTML = `<span style="color:#64748b; font-size:0.9rem;">Ingresa peso y talla para calcular</span>`;
      pesoInput.focus();
    });

    pesoInput.addEventListener('input', calcular);
    tallaInput.addEventListener('input', calcular);
  }

  imcModalElement = modal;
  return modal;
}

export function openImcCalculator() {
  const modal = ensureImcModal();
  modal.style.display = 'flex';
  const pesoInput = modal.querySelector('#imc-peso');
  if (pesoInput) {
    setTimeout(() => pesoInput.focus(), 50);
  }
}

export function initImcCalculator(triggerSelector = '#btn-imc-calculator') {
  ensureImcModal();
  if (triggerSelector) {
    const trigger = document.querySelector(triggerSelector);
    if (trigger) {
      trigger.onclick = (e) => {
        e.preventDefault();
        openImcCalculator();
      };
    }
  }
}

// Delegación global: cualquier clic a elementos con ID o clase abre el modal
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btn-imc-calculator, #btn-quick-calc-trigger, .open-imc-modal, [data-action="imc-calculator"]');
    if (btn) {
      e.preventDefault();
      openImcCalculator();
    }
  });
}

// Exponer en window para interoperabilidad inmediata
if (typeof window !== 'undefined') {
  window.openImcCalculator = openImcCalculator;
  window.initImcCalculator = initImcCalculator;
}
