// billing-module.mjs
const STORAGE_CONFIG_KEY = 'koly_billing_config_v1';
const STORAGE_INVOICES_KEY = 'koly_invoices_v1';
const STORAGE_QUOTES_KEY = 'koly_quotes_v1';

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'koly-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 220); }, 3200);
}

export async function initBillingModule(optionsOrContainerId = 'view-billing', maybeSupabase = null, maybeUser = null) {
  let containerId = 'view-billing';
  let supabaseClient = null;
  let currentUser = { role: 'Administrador' };

  if (typeof optionsOrContainerId === 'object' && optionsOrContainerId !== null) {
    containerId = optionsOrContainerId.containerId || 'view-billing';
    supabaseClient = optionsOrContainerId.supabaseClient || null;
    currentUser = optionsOrContainerId.currentUser || (typeof window !== 'undefined' && typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : { role: 'Administrador' });
  } else {
    containerId = optionsOrContainerId || 'view-billing';
    supabaseClient = maybeSupabase;
    currentUser = maybeUser || (typeof window !== 'undefined' && typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : { role: 'Administrador' });
  }
  const container = document.getElementById(containerId);
  if (!container) return;

  const canQuote = ['Administrador', 'Comercial'].includes(currentUser?.role);

  let config = JSON.parse(localStorage.getItem(STORAGE_CONFIG_KEY) || 'null') || {
    ruc: '',
    razon_social: 'KOLYMEDICAL',
    provider: 'PSE_API',
    environment: 'BETA',
    serie_boleta: 'B001',
    correlativo_boleta: 1,
    serie_factura: 'F001',
    correlativo_factura: 1
  };

  let catalogItems = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('quotation_catalog').select('*').limit(300);
      if (!error && data) catalogItems = data;
    } catch (err) {
      console.warn('[KolyTech] Fallback catalog load:', err);
    }
  }

  let quoteCart = [];

  container.innerHTML = `
    <div style="display:grid; gap:20px; color:#f8fafc;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="margin:0; font-size:1.35rem;">Facturación Electrónica & Cotizaciones</h2>
          <p style="margin:4px 0 0; color:#94a3b8; font-size:0.85rem;">
            Ambiente SUNAT: <strong id="billing-env-badge" style="color:#00d2c4;">${config.environment}</strong>
          </p>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          <button type="button" data-bill-tab="emitir" class="bill-tab-btn" style="padding:8px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#00d2c4; color:#0b111e; font-weight:700; cursor:pointer;">Emitir Comprobante</button>
          ${canQuote ? `<button type="button" data-bill-tab="quotes" class="bill-tab-btn" style="padding:8px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#11192c; color:#cbd5e1; cursor:pointer;">Cotizador de Estudios</button>` : ''}
          <button type="button" data-bill-tab="historial" class="bill-tab-btn" style="padding:8px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#11192c; color:#cbd5e1; cursor:pointer;">Historial</button>
          <button type="button" data-bill-tab="config" class="bill-tab-btn" style="padding:8px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#11192c; color:#cbd5e1; cursor:pointer;">Configurar SUNAT</button>
        </div>
      </div>

      <!-- TAB 1: EMITIR -->
      <section data-bill-panel="emitir" style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; display:grid; gap:14px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:12px;">
          <label style="font-size:0.82rem; color:#94a3b8;">Tipo
            <select id="bill-type" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="BOLETA">Boleta de Venta (${config.serie_boleta})</option>
              <option value="FACTURA">Factura Electrónica (${config.serie_factura})</option>
            </select>
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">DNI / RUC
            <input id="bill-client-doc" maxlength="11" placeholder="8 (DNI) u 11 (RUC)" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Paciente / Razón Social
            <input id="bill-client-name" placeholder="Nombre o empresa" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
        </div>
        <div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px;">
          <label style="font-size:0.82rem; color:#94a3b8;">Concepto / Detalle
            <input id="bill-item-desc" placeholder="Ej. Consulta + FibroScan" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Total (S/)
            <input id="bill-amount" type="number" step="0.01" min="0" placeholder="0.00" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">IGV
            <select id="bill-igv-mode" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="GRAVADO">Gravado (18%)</option>
              <option value="EXONERADO">Exonerado (0%)</option>
            </select>
          </label>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08);">
          <div id="bill-totals" style="font-size:0.95rem; color:#cbd5e1;">Total: <strong style="color:#10b981;">S/ 0.00</strong></div>
          <button type="button" id="btn-emit-doc" style="padding:10px 20px; border-radius:8px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer;">Registrar / Emitir</button>
        </div>
      </section>

      <!-- TAB 2: COTIZADOR (SOLO ADMIN / COMERCIAL) -->
      ${canQuote ? `
      <section data-bill-panel="quotes" style="display:none; background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; gap:14px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <input id="quote-client-name" placeholder="Nombre del paciente" style="padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          <input id="quote-client-doc" maxlength="11" placeholder="DNI / RUC" style="padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          <input id="quote-search" placeholder="Buscar estudio o procedimiento..." style="padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
        </div>
        <div id="quote-catalog-results" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px; max-height:220px; overflow-y:auto;"></div>
        <div style="background:#0b111e; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:14px;">
          <div style="font-size:0.85rem; color:#94a3b8; margin-bottom:8px;">Resumen del Presupuesto</div>
          <div id="quote-cart-list" style="display:grid; gap:6px; font-size:0.9rem;"></div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08);">
            <strong id="quote-cart-total" style="color:#00d2c4;">Total: S/ 0.00</strong>
            <button type="button" id="btn-convert-quote-to-invoice" style="padding:9px 16px; border-radius:8px; border:none; background:#00d2c4; color:#0b111e; font-weight:700; cursor:pointer;">Convertir a Boleta / Factura</button>
          </div>
        </div>
      </section>` : ''}

      <!-- TAB 3: HISTORIAL -->
      <section data-bill-panel="historial" style="display:none; background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px;">
        <div id="billing-history-list" style="display:grid; gap:10px;"></div>
      </section>

      <!-- TAB 4: CONFIGURACION SUNAT -->
      <section data-bill-panel="config" style="display:none; background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; gap:14px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <label style="font-size:0.82rem; color:#94a3b8;">RUC Emisor
            <input id="cfg-ruc" value="${config.ruc}" maxlength="11" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Razón Social
            <input id="cfg-razon" value="${config.razon_social}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Ambiente
            <select id="cfg-env" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="BETA" ${config.environment === 'BETA' ? 'selected' : ''}>BETA (Pruebas)</option>
              <option value="PRODUCCION" ${config.environment === 'PRODUCCION' ? 'selected' : ''}>PRODUCCIÓN</option>
            </select>
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Serie Boleta
            <input id="cfg-serie-b" value="${config.serie_boleta}" maxlength="4" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Serie Factura
            <input id="cfg-serie-f" value="${config.serie_factura}" maxlength="4" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
        </div>
        <button type="button" id="btn-save-cfg" style="justify-self:start; padding:10px 18px; border-radius:8px; border:none; background:#00d2c4; color:#0b111e; font-weight:700; cursor:pointer;">Guardar Configuración</button>
      </section>
    </div>
  `;

  // Cambio de pestañas
  const switchTab = (target) => {
    container.querySelectorAll('.bill-tab-btn').forEach(btn => {
      const active = btn.dataset.billTab === target;
      btn.style.background = active ? '#00d2c4' : '#11192c';
      btn.style.color = active ? '#0b111e' : '#cbd5e1';
      btn.style.fontWeight = active ? '700' : '500';
    });
    container.querySelectorAll('[data-bill-panel]').forEach(panel => {
      panel.style.display = panel.dataset.billPanel === target ? 'grid' : 'none';
    });
    if (target === 'historial') renderHistory();
  };

  container.querySelectorAll('.bill-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.billTab));
  });

  // Cálculo de totales
  const amountInput = container.querySelector('#bill-amount');
  const igvSelect = container.querySelector('#bill-igv-mode');
  const updateTotals = () => {
    const total = parseFloat(amountInput.value) || 0;
    const isGravado = igvSelect.value === 'GRAVADO';
    const subtotal = isGravado ? +(total / 1.18).toFixed(2) : total;
    const igv = +(total - subtotal).toFixed(2);
    container.querySelector('#bill-totals').innerHTML =
      `Subtotal: S/ ${subtotal.toFixed(2)} | IGV: S/ ${igv.toFixed(2)} | <strong style="color:#10b981;">Total: S/ ${total.toFixed(2)}</strong>`;
  };
  amountInput.addEventListener('input', updateTotals);
  igvSelect.addEventListener('change', updateTotals);

  // Lógica del Cotizador (si aplica rol)
  if (canQuote) {
    const searchInput = container.querySelector('#quote-search');
    const resultsBox = container.querySelector('#quote-catalog-results');
    const cartBox = container.querySelector('#quote-cart-list');
    const cartTotalEl = container.querySelector('#quote-cart-total');

    const renderCart = () => {
      const total = quoteCart.reduce((s, i) => s + Number(i.price || 0), 0);
      cartTotalEl.textContent = `Total: S/ ${total.toFixed(2)}`;
      cartBox.innerHTML = quoteCart.length
        ? quoteCart.map((i, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span>${i.name} — S/ ${Number(i.price).toFixed(2)}</span>
              <button type="button" data-remove-idx="${idx}" style="background:none; border:none; color:#ef4444; cursor:pointer;">Quitar</button>
            </div>`).join('')
        : '<span style="color:#64748b;">Aún no agregas estudios al presupuesto.</span>';
    };

    const renderCatalog = (term = '') => {
      const q = term.toLowerCase();
      const filtered = catalogItems.filter(i => (i.name || i.nombre || '').toLowerCase().includes(q)).slice(0, 12);
      resultsBox.innerHTML = filtered.length
        ? filtered.map(i => {
            const name = i.name || i.nombre || 'Estudio';
            const price = Number(i.price || i.precio || 0);
            return `
              <button type="button" class="quote-catalog-card" data-add-name="${name.replace(/"/g, '&quot;')}" data-add-price="${price}"
                style="text-align:left; padding:10px; border-radius:8px; background:#0b111e; border:1px solid rgba(255,255,255,0.08); color:#f8fafc; cursor:pointer;">
                <div style="font-size:0.82rem; font-weight:600;">${name}</div>
                <div style="font-size:0.8rem; color:#00d2c4; margin-top:4px;">S/ ${price.toFixed(2)}</div>
              </button>`;
          }).join('')
        : '<span style="color:#64748b; font-size:0.85rem;">Sin resultados en catálogo.</span>';
    };

    searchInput.addEventListener('input', (e) => renderCatalog(e.target.value));
    resultsBox.addEventListener('click', (e) => {
      const card = e.target.closest('[data-add-name]');
      if (!card) return;
      quoteCart.push({ name: card.dataset.addName, price: Number(card.dataset.addPrice) });
      renderCart();
    });
    cartBox.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-idx]');
      if (!btn) return;
      quoteCart.splice(Number(btn.dataset.removeIdx), 1);
      renderCart();
    });

    // Conversión 1 clic: Cotización -> Comprobante
    container.querySelector('#btn-convert-quote-to-invoice').addEventListener('click', () => {
      if (!quoteCart.length) return showToast('Agrega al menos un estudio para convertir.');
      const total = quoteCart.reduce((s, i) => s + i.price, 0);
      const summary = quoteCart.map(i => i.name).join(' + ');
      const quoteRecord = {
        client_name: container.querySelector('#quote-client-name').value.trim(),
        client_doc: container.querySelector('#quote-client-doc').value.trim(),
        summary,
        total,
        created_at: new Date().toISOString()
      };
      const savedQuotes = JSON.parse(localStorage.getItem(STORAGE_QUOTES_KEY) || '[]');
      savedQuotes.unshift(quoteRecord);
      localStorage.setItem(STORAGE_QUOTES_KEY, JSON.stringify(savedQuotes));

      container.querySelector('#bill-client-name').value = quoteRecord.client_name;
      container.querySelector('#bill-client-doc').value = quoteRecord.client_doc;
      container.querySelector('#bill-item-desc').value = summary;
      amountInput.value = total.toFixed(2);
      updateTotals();
      switchTab('emitir');
      showToast('Cotización transferida al facturador.');
    });

    renderCatalog();
    renderCart();
  }

  // Emitir comprobante
  container.querySelector('#btn-emit-doc').addEventListener('click', async () => {
    const docType = container.querySelector('#bill-type').value;
    const docNum = container.querySelector('#bill-client-doc').value.trim();
    const clientName = container.querySelector('#bill-client-name').value.trim();
    const desc = container.querySelector('#bill-item-desc').value.trim();
    const total = parseFloat(amountInput.value) || 0;

    if (docType === 'FACTURA' && docNum.length !== 11) return showToast('La Factura requiere RUC de 11 dígitos.');
    if (!clientName || !desc || total <= 0) return showToast('Completa cliente, concepto y monto válido.');

    const isGravado = igvSelect.value === 'GRAVADO';
    const subtotal = isGravado ? +(total / 1.18).toFixed(2) : total;
    const igv = +(total - subtotal).toFixed(2);
    const series = docType === 'FACTURA' ? config.serie_factura : config.serie_boleta;
    const correlative = docType === 'FACTURA' ? config.correlativo_factura++ : config.correlativo_boleta++;

    const payload = {
      doc_type: docType,
      series,
      correlative,
      client_doc_type: docNum.length === 11 ? 'RUC' : 'DNI',
      client_doc_number: docNum || '00000000',
      client_name: clientName,
      items: [{ description: desc, quantity: 1, total }],
      subtotal,
      igv,
      total,
      sunat_status: config.environment === 'BETA' ? 'BETA' : 'PENDIENTE',
      created_at: new Date().toISOString()
    };

    const list = JSON.parse(localStorage.getItem(STORAGE_INVOICES_KEY) || '[]');
    list.unshift(payload);
    localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(list));
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));

    if (supabaseClient) {
      try {
        await supabaseClient.from('koly_invoices').insert(payload);
      } catch (err) {
        console.warn('[KolyTech] Local fallback for invoice:', err);
      }
    }
    showToast(`Comprobante ${series}-${String(correlative).padStart(6, '0')} emitido (${payload.sunat_status}).`);
  });

  // Guardar configuración
  container.querySelector('#btn-save-cfg').addEventListener('click', async () => {
    config = {
      ...config,
      ruc: container.querySelector('#cfg-ruc').value.trim(),
      razon_social: container.querySelector('#cfg-razon').value.trim(),
      environment: container.querySelector('#cfg-env').value,
      serie_boleta: container.querySelector('#cfg-serie-b').value.trim().toUpperCase(),
      serie_factura: container.querySelector('#cfg-serie-f').value.trim().toUpperCase()
    };
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    container.querySelector('#billing-env-badge').textContent = config.environment;
    if (supabaseClient) {
      try {
        await supabaseClient.from('koly_billing_config').upsert(config);
      } catch (err) {
        console.warn('[KolyTech] Local fallback for billing config:', err);
      }
    }
    showToast('Configuración SUNAT guardada.');
  });

  function renderHistory() {
    const list = JSON.parse(localStorage.getItem(STORAGE_INVOICES_KEY) || '[]');
    const box = container.querySelector('#billing-history-list');
    box.innerHTML = list.length
      ? list.map(i => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-radius:10px; background:#0b111e; border:1px solid rgba(255,255,255,0.08);">
            <div>
              <strong>${i.series}-${String(i.correlative).padStart(6, '0')}</strong> · ${i.client_name}
              <div style="font-size:0.8rem; color:#94a3b8;">${i.doc_type} · Estado: ${i.sunat_status}</div>
            </div>
            <strong style="color:#10b981;">S/ ${Number(i.total).toFixed(2)}</strong>
          </div>`).join('')
      : '<span style="color:#64748b;">Todavía no hay comprobantes registrados.</span>';
  }
}
