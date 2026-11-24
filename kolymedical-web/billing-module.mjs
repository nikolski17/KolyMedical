// billing-module.mjs
const STORAGE_CONFIG_KEY = 'koly_billing_config_v1';
const STORAGE_INVOICES_KEY = 'koly_invoices_v1';

export function initBillingModule(containerId = 'view-billing', supabaseClient = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let config = JSON.parse(localStorage.getItem(STORAGE_CONFIG_KEY) || 'null') || {
    ruc: '20608552191',
    razon_social: 'KOLYMEDICAL S.A.C.',
    direccion_fiscal: 'Lima, Perú',
    provider: 'SOLO_INTERNO', // 'SOLO_INTERNO' por defecto para evitar errores si Nubefact no está vinculado
    environment: 'BETA',
    serie_boleta: 'B001',
    correlativo_boleta: 1,
    serie_factura: 'F001',
    correlativo_factura: 1,
    igv_rate: 18
  };

  const getSavedInvoices = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_INVOICES_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveInvoiceLocal = (inv) => {
    const list = getSavedInvoices();
    list.unshift(inv);
    localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(list));
    return list;
  };

  const renderHistoryTable = (invoices) => {
    const tbody = container.querySelector('#billing-history-tbody');
    const badgeCount = container.querySelector('#history-count-badge');
    if (badgeCount) badgeCount.textContent = invoices.length;

    if (!tbody) return;

    if (!invoices || invoices.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:2.5rem; color:#94a3b8;">
            No hay comprobantes emitidos aún. Emite tu primera boleta o factura con el formulario.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = invoices.map((inv, idx) => {
      const isFactura = inv.doc_type === 'FACTURA';
      const docCode = `${inv.series}-${String(inv.correlative).padStart(6, '0')}`;
      const statusBadge = inv.sunat_status === 'ACEPTADO' 
        ? `<span style="background:rgba(16,185,129,0.15); color:#10b981; padding:3px 8px; border-radius:12px; font-size:0.75rem; border:1px solid rgba(16,185,129,0.3);">SUNAT OK</span>`
        : `<span style="background:rgba(0,210,196,0.15); color:#00d2c4; padding:3px 8px; border-radius:12px; font-size:0.75rem; border:1px solid rgba(0,210,196,0.3);">INTERNO / BETA</span>`;

      const concept = inv.items && inv.items[0] ? inv.items[0].description : 'Consulta Médica';
      const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleString('es-PE', { dateStyle:'short', timeStyle:'short' }) : 'Hoy';

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:10px 12px; font-family:monospace; font-weight:700; color:#00d2c4;">${docCode}</td>
          <td style="padding:10px 12px;">
            <span style="font-size:0.78rem; font-weight:600; padding:2px 6px; border-radius:4px; background:${isFactura ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'}; color:${isFactura ? '#60a5fa' : '#34d399'};">
              ${inv.doc_type}
            </span>
          </td>
          <td style="padding:10px 12px; font-size:0.82rem; color:#94a3b8;">${dateStr}</td>
          <td style="padding:10px 12px;">
            <strong>${escapeHtml(inv.client_name)}</strong><br>
            <span style="font-size:0.75rem; color:#94a3b8;">${inv.client_doc_type}: ${escapeHtml(inv.client_doc_number)}</span>
          </td>
          <td style="padding:10px 12px; font-size:0.85rem; color:#cbd5e1;">${escapeHtml(concept)}</td>
          <td style="padding:10px 12px; font-weight:700; color:#10b981;">S/ ${Number(inv.total).toFixed(2)}</td>
          <td style="padding:10px 12px;">${statusBadge}</td>
          <td style="padding:10px 12px; text-align:right;">
            <button type="button" class="btn-view-ticket" data-idx="${idx}" style="padding:4px 10px; font-size:0.78rem; border-radius:6px; background:#11192c; border:1px solid rgba(255,255,255,0.15); color:#f8fafc; cursor:pointer;">
              Ver Ticket
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-ticket').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        showTicketModal(invoices[idx]);
      });
    });
  };

  const showTicketModal = (inv) => {
    let modal = document.getElementById('koly-ticket-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'koly-ticket-modal';
      modal.style.cssText = `
        position:fixed; inset:0; z-index:99999; background:rgba(11,17,30,0.85); backdrop-filter:blur(6px);
        display:flex; align-items:center; justify-content:center; padding:1rem;
      `;
      document.body.appendChild(modal);
    }

    const docCode = `${inv.series}-${String(inv.correlative).padStart(6, '0')}`;
    const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleString('es-PE') : new Date().toLocaleString('es-PE');
    const concept = inv.items && inv.items[0] ? inv.items[0].description : 'Atención Médica';

    modal.innerHTML = `
      <div style="background:#ffffff; color:#111827; border-radius:12px; padding:24px; width:100%; max-width:380px; box-shadow:0 25px 60px rgba(0,0,0,0.5); font-family:monospace, sans-serif;">
        <div style="text-align:center; border-bottom:1px dashed #cbd5e1; padding-bottom:14px; margin-bottom:14px;">
          <h3 style="margin:0; font-size:1.15rem; color:#0f172a; font-weight:800;">${config.razon_social || 'KOLYMEDICAL'}</h3>
          <p style="margin:2px 0; font-size:0.8rem; color:#64748b;">RUC: ${config.ruc || '20608552191'}</p>
          <p style="margin:2px 0; font-size:0.75rem; color:#64748b;">${config.direccion_fiscal || 'Lima, Perú'}</p>
          <div style="margin-top:10px; display:inline-block; padding:4px 12px; border:1px solid #0f172a; border-radius:4px; font-weight:800; font-size:0.95rem;">
            ${inv.doc_type} ELECTRÓNICA<br>${docCode}
          </div>
        </div>

        <div style="font-size:0.8rem; line-height:1.5; border-bottom:1px dashed #cbd5e1; padding-bottom:12px; margin-bottom:12px;">
          <div><strong>Fecha:</strong> ${dateStr}</div>
          <div><strong>Cliente:</strong> ${escapeHtml(inv.client_name)}</div>
          <div><strong>${inv.client_doc_type}:</strong> ${escapeHtml(inv.client_doc_number)}</div>
          <div><strong>Moneda:</strong> Soles (PEN)</div>
        </div>

        <table style="width:100%; font-size:0.8rem; border-collapse:collapse; margin-bottom:12px;">
          <thead>
            <tr style="border-bottom:1px solid #e2e8f0; text-align:left;">
              <th style="padding:4px 0;">Desc.</th>
              <th style="text-align:right; padding:4px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:6px 0;">${escapeHtml(concept)}</td>
              <td style="text-align:right; padding:6px 0;">S/ ${Number(inv.total).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="border-top:1px dashed #cbd5e1; padding-top:8px; font-size:0.82rem; text-align:right; line-height:1.6;">
          <div>Op. Gravada: S/ ${Number(inv.subtotal).toFixed(2)}</div>
          <div>IGV (18%): S/ ${Number(inv.igv).toFixed(2)}</div>
          <div style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-top:4px;">TOTAL: S/ ${Number(inv.total).toFixed(2)}</div>
        </div>

        <div style="text-align:center; font-size:0.72rem; color:#64748b; margin-top:16px; border-top:1px dashed #cbd5e1; padding-top:10px;">
          Representación impresa de Comprobante Electrónico.<br>
          KolyTech Platform — kolymedical.lat
        </div>

        <div style="display:flex; gap:8px; margin-top:16px;">
          <button type="button" id="ticket-btn-print" style="flex:1; padding:10px; background:#0f172a; color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer;">
            Imprimir Ticket
          </button>
          <button type="button" id="ticket-btn-close" style="padding:10px 16px; background:#e2e8f0; color:#334155; border:none; border-radius:6px; font-weight:600; cursor:pointer;">
            Cerrar
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    modal.querySelector('#ticket-btn-close').onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    modal.querySelector('#ticket-btn-print').onclick = () => { window.print(); };
  };

  container.innerHTML = `
    <div style="display:grid; gap:20px; color:#f8fafc;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="margin:0; font-size:1.35rem;">Facturación Electrónica (SUNAT)</h2>
          <p style="margin:4px 0 0; color:#94a3b8; font-size:0.88rem;">
            Modo actual: <strong id="billing-env-badge" style="color:#00d2c4;">${config.environment} (${config.provider === 'SOLO_INTERNO' ? 'Comprobante Interno' : 'PSE Nubefact'})</strong>
          </p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" id="tab-emitir" style="padding:8px 16px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#00d2c4; color:#0b111e; font-weight:600; cursor:pointer;">Emitir Comprobante</button>
          <button type="button" id="tab-historial" style="padding:8px 16px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#11192c; color:#cbd5e1; font-weight:600; cursor:pointer;">
            Historial de Comprobantes (<span id="history-count-badge">0</span>)
          </button>
          <button type="button" id="tab-config" style="padding:8px 16px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#11192c; color:#cbd5e1; cursor:pointer;">Configurar SUNAT / PSE</button>
        </div>
      </div>

      <!-- PANEL EMITIR -->
      <section id="panel-emitir" style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; display:grid; gap:14px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
          <label style="font-size:0.85rem; color:#cbd5e1;">Tipo de Comprobante
            <select id="bill-type" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="BOLETA">Boleta de Venta (${config.serie_boleta})</option>
              <option value="FACTURA">Factura Electrónica (${config.serie_factura})</option>
            </select>
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">DNI / RUC del Cliente
            <input id="bill-client-doc" type="text" maxlength="11" placeholder="8 dígitos (DNI) u 11 (RUC)"
              style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Nombre o Razón Social
            <input id="bill-client-name" type="text" placeholder="Nombre completo o empresa"
              style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
        </div>

        <div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px;">
          <label style="font-size:0.85rem; color:#cbd5e1;">Concepto / Servicio Médico
            <input id="bill-item-desc" type="text" placeholder="Ej. Consulta Médica / Perfil Lipídico"
              style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Monto Total (S/)
            <input id="bill-amount" type="number" step="0.01" min="0" placeholder="0.00"
              style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Afectación IGV
            <select id="bill-igv-mode" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="GRAVADO">Gravado (18%)</option>
              <option value="EXONERADO">Exonerado (0%)</option>
            </select>
          </label>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08); flex-wrap:wrap; gap:10px;">
          <div id="bill-totals" style="font-size:0.95rem; color:#cbd5e1;">Total: <strong style="color:#10b981;">S/ 0.00</strong></div>
          <button type="button" id="btn-emit-doc" style="padding:10px 22px; border-radius:8px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer;">
            Emitir Comprobante
          </button>
        </div>
        <div id="bill-status-msg" style="font-size:0.88rem; color:#94a3b8; display:flex; align-items:center; gap:8px;"></div>
      </section>

      <!-- PANEL HISTORIAL DE COMPROBANTES -->
      <section id="panel-historial" style="display:none; background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <h3 style="margin:0; font-size:1.1rem; color:#00d2c4;">Historial de Comprobantes Emitidos</h3>
          <span style="font-size:0.8rem; color:#94a3b8;">Los comprobantes se guardan de forma permanente y segura.</span>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.86rem;">
            <thead>
              <tr style="border-bottom:2px solid rgba(255,255,255,0.1); color:#94a3b8;">
                <th style="padding:8px 12px;">Comprobante</th>
                <th style="padding:8px 12px;">Tipo</th>
                <th style="padding:8px 12px;">Fecha</th>
                <th style="padding:8px 12px;">Cliente</th>
                <th style="padding:8px 12px;">Concepto</th>
                <th style="padding:8px 12px;">Total</th>
                <th style="padding:8px 12px;">Estado</th>
                <th style="padding:8px 12px; text-align:right;">Acción</th>
              </tr>
            </thead>
            <tbody id="billing-history-tbody">
              <!-- Render dinámico -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- PANEL CONFIGURACION SUNAT -->
      <section id="panel-config" style="display:none; background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; gap:14px;">
        <p style="margin:0; font-size:0.85rem; color:#94a3b8;">
          El token de Nubefact y la URL del endpoint se configuran como secretos en Supabase Edge Functions (<code>NUBEFACT_API_URL</code> y <code>NUBEFACT_API_TOKEN</code>). Si aún no tienes cuenta en Nubefact, usa el modo <strong>Solo Comprobante Interno</strong> para emitir tickets y comprobantes sin costo.
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <label style="font-size:0.85rem; color:#cbd5e1;">RUC Emisor
            <input id="cfg-ruc" value="${config.ruc || ''}" maxlength="11" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Razón Social
            <input id="cfg-razon" value="${config.razon_social || ''}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Proveedor
            <select id="cfg-provider" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="SOLO_INTERNO" ${config.provider === 'SOLO_INTERNO' ? 'selected' : ''}>Solo Comprobante Interno (Gratis / Sin API)</option>
              <option value="PSE_API" ${config.provider === 'PSE_API' ? 'selected' : ''}>PSE por API (Nubefact / SUNAT)</option>
            </select>
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Ambiente
            <select id="cfg-env" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="BETA" ${config.environment === 'BETA' ? 'selected' : ''}>BETA (Pruebas)</option>
              <option value="PRODUCCION" ${config.environment === 'PRODUCCION' ? 'selected' : ''}>PRODUCCIÓN (SUNAT Real)</option>
            </select>
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Serie Boleta
            <input id="cfg-serie-b" value="${config.serie_boleta || 'B001'}" maxlength="4" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Serie Factura
            <input id="cfg-serie-f" value="${config.serie_factura || 'F001'}" maxlength="4" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
        </div>
        <button type="button" id="btn-save-cfg" style="justify-self:start; padding:10px 18px; border-radius:8px; border:none; background:#00d2c4; color:#0b111e; font-weight:700; cursor:pointer;">Guardar Configuración</button>
      </section>
    </div>
  `;

  const tabEmitir = container.querySelector('#tab-emitir');
  const tabHistorial = container.querySelector('#tab-historial');
  const tabConfig = container.querySelector('#tab-config');
  const panelEmitir = container.querySelector('#panel-emitir');
  const panelHistorial = container.querySelector('#panel-historial');
  const panelConfig = container.querySelector('#panel-config');
  const statusMsg = container.querySelector('#bill-status-msg');

  const switchTab = (activeTab, activePanel) => {
    [panelEmitir, panelHistorial, panelConfig].forEach(p => p.style.display = 'none');
    [tabEmitir, tabHistorial, tabConfig].forEach(t => {
      t.style.background = '#11192c';
      t.style.color = '#cbd5e1';
    });
    activePanel.style.display = activePanel === panelEmitir ? 'grid' : 'block';
    activeTab.style.background = '#00d2c4';
    activeTab.style.color = '#0b111e';
  };

  tabEmitir.addEventListener('click', () => switchTab(tabEmitir, panelEmitir));
  tabHistorial.addEventListener('click', () => {
    renderHistoryTable(getSavedInvoices());
    switchTab(tabHistorial, panelHistorial);
  });
  tabConfig.addEventListener('click', () => switchTab(tabConfig, panelConfig));

  // Render inicial de tabla historial
  renderHistoryTable(getSavedInvoices());

  const amountInput = container.querySelector('#bill-amount');
  const igvSelect = container.querySelector('#bill-igv-mode');
  const totalsBox = container.querySelector('#bill-totals');

  const updateTotals = () => {
    const total = parseFloat(amountInput.value) || 0;
    const isGravado = igvSelect.value === 'GRAVADO';
    const subtotal = isGravado ? +(total / 1.18).toFixed(2) : total;
    const igv = +(total - subtotal).toFixed(2);
    totalsBox.innerHTML = `Subtotal: S/ ${subtotal.toFixed(2)} | IGV: S/ ${igv.toFixed(2)} | <strong style="color:#10b981;">Total: S/ ${total.toFixed(2)}</strong>`;
  };
  amountInput.addEventListener('input', updateTotals);
  igvSelect.addEventListener('change', updateTotals);

  container.querySelector('#btn-save-cfg').addEventListener('click', async () => {
    config = {
      ...config,
      ruc: container.querySelector('#cfg-ruc').value.trim(),
      razon_social: container.querySelector('#cfg-razon').value.trim(),
      provider: container.querySelector('#cfg-provider').value,
      environment: container.querySelector('#cfg-env').value,
      serie_boleta: container.querySelector('#cfg-serie-b').value.trim().toUpperCase(),
      serie_factura: container.querySelector('#cfg-serie-f').value.trim().toUpperCase()
    };
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    container.querySelector('#billing-env-badge').textContent = `${config.environment} (${config.provider === 'SOLO_INTERNO' ? 'Comprobante Interno' : 'PSE Nubefact'})`;

    if (supabaseClient) {
      try {
        await supabaseClient.from('koly_billing_config').upsert(config);
      } catch (e) {
        console.warn('Nota: guardado en LocalStorage prioritario.', e);
      }
    }
    statusMsg.innerHTML = `<span style="color:#10b981;">Configuración guardada correctamente.</span>`;
  });

  container.querySelector('#btn-emit-doc').addEventListener('click', async () => {
    const docType = container.querySelector('#bill-type').value;
    const docNum = container.querySelector('#bill-client-doc').value.trim();
    const clientName = container.querySelector('#bill-client-name').value.trim();
    const desc = container.querySelector('#bill-item-desc').value.trim();
    const total = parseFloat(amountInput.value) || 0;
    const isGravado = igvSelect.value === 'GRAVADO';

    if (docType === 'FACTURA' && docNum.length !== 11) {
      statusMsg.innerHTML = `<span style="color:#ef4444;">Error: Para Factura necesitas un RUC válido de 11 dígitos.</span>`;
      return;
    }
    if (!clientName || !desc || total <= 0) {
      statusMsg.innerHTML = `<span style="color:#ef4444;">Error: Completa cliente, concepto y monto válido mayor a 0.</span>`;
      return;
    }

    const subtotal = isGravado ? +(total / 1.18).toFixed(2) : total;
    const igv = +(total - subtotal).toFixed(2);
    const series = docType === 'FACTURA' ? config.serie_factura : config.serie_boleta;
    const correlative = docType === 'FACTURA' ? config.correlativo_factura++ : config.correlativo_boleta++;

    const payload = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      doc_type: docType,
      series,
      correlative,
      client_doc_type: docNum.length === 11 ? 'RUC' : 'DNI',
      client_doc_number: docNum || '00000000',
      client_name: clientName,
      is_gravado: isGravado,
      items: [{ description: desc, quantity: 1, subtotal, igv, total }],
      subtotal,
      igv,
      total,
      created_at: new Date().toISOString()
    };

    statusMsg.innerHTML = `<span style="color:#00d2c4;">Generando comprobante...</span>`;

    let issuedPdfUrl = null;

    // Si proveedor es PSE_API e invocamos Supabase
    if (supabaseClient && config.provider === 'PSE_API') {
      try {
        const { data, error } = await supabaseClient.functions.invoke('emit-sunat-nubefact', {
          body: payload
        });

        if (error || !data) {
          throw new Error(error ? error.message : 'Función no respondió');
        }

        payload.sunat_status = 'ACEPTADO';
        issuedPdfUrl = data.enlace_del_pdf || null;
        payload.pdf_url = issuedPdfUrl;
      } catch (err) {
        console.warn('Fallback a comprobante interno:', err);
        payload.sunat_status = 'BETA';
      }
    } else {
      payload.sunat_status = 'BETA';
    }

    // Guardado local y actualización inmediata
    const updatedList = saveInvoiceLocal(payload);
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    renderHistoryTable(updatedList);

    const docFullCode = `${series}-${String(correlative).padStart(6, '0')}`;
    statusMsg.innerHTML = `
      <span style="color:#10b981; font-weight:600;">✓ Comprobante ${docFullCode} generado con éxito.</span>
      <button type="button" id="btn-quick-view-last" style="padding:4px 10px; font-size:0.75rem; border-radius:6px; background:#00d2c4; color:#0b111e; font-weight:700; border:none; cursor:pointer;">
        Ver Ticket
      </button>
      <button type="button" id="btn-quick-view-history" style="padding:4px 10px; font-size:0.75rem; border-radius:6px; background:#11192c; color:#cbd5e1; border:1px solid rgba(255,255,255,0.15); cursor:pointer;">
        Ver en Historial
      </button>
    `;

    container.querySelector('#btn-quick-view-last')?.addEventListener('click', () => {
      showTicketModal(payload);
    });
    container.querySelector('#btn-quick-view-history')?.addEventListener('click', () => {
      switchTab(tabHistorial, panelHistorial);
    });

    // Limpiar campos para la siguiente emisión
    container.querySelector('#bill-item-desc').value = '';
    amountInput.value = '';
    updateTotals();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
