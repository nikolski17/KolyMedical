// imc-calculator.mjs
export function initImcCalculator(triggerSelector = '#btn-imc-calculator') {
  const trigger = document.querySelector(triggerSelector);
  if (!trigger) {
    console.warn(`[KolyTech] No se encontró el botón de IMC (${triggerSelector})`);
    return;
  }

  let modal = document.getElementById('koly-imc-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'koly-imc-modal';
    modal.style.cssText = `
      display: none; position: fixed; inset: 0; z-index: 9999;
      background: rgba(11, 17, 30, 0.82); backdrop-filter: blur(4px);
      align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
      <div style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:24px; width:100%; max-width:380px; color:#f8fafc; font-family:inherit;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="margin:0; font-size:1.1rem; color:#00d2c4;">Calculadora IMC</h3>
          <button type="button" id="imc-close-btn" style="background:none; border:none; color:#94a3b8; font-size:1.4rem; cursor:pointer;">&times;</button>
        </div>
        <div style="display:grid; gap:12px;">
          <label style="font-size:0.85rem; color:#cbd5e1;">
            Peso (kg)
            <input type="number" id="imc-peso" step="0.1" min="1" placeholder="Ej. 72.5"
              style="width:100%; margin-top:4px; padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:#0b111e; color:#fff;">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">
            Talla (cm)
            <input type="number" id="imc-talla" step="0.1" min="30" placeholder="Ej. 170"
              style="width:100%; margin-top:4px; padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:#0b111e; color:#fff;">
          </label>
          <div id="imc-resultado" style="margin-top:8px; padding:14px; border-radius:10px; background:#0b111e; border:1px solid rgba(255,255,255,0.08); text-align:center;">
            <span style="color:#64748b; font-size:0.9rem;">Ingresa peso y talla para calcular</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const pesoInput = modal.querySelector('#imc-peso');
  const tallaInput = modal.querySelector('#imc-talla');
  const resultBox = modal.querySelector('#imc-resultado');
  const closeBtn = modal.querySelector('#imc-close-btn');

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
    else { categoria = 'Obesidad Grado III'; color = '#dc2626'; }

    resultBox.innerHTML = `
      <div style="font-size:1.8rem; font-weight:700; color:${color};">${imc}</div>
      <div style="font-size:0.9rem; color:#e2e8f0; margin-top:4px;">${categoria}</div>
    `;
  };

  trigger.addEventListener('click', () => {
    modal.style.display = 'flex';
    pesoInput.focus();
  });
  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  pesoInput.addEventListener('input', calcular);
  tallaInput.addEventListener('input', calcular);
}
