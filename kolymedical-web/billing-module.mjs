// billing-module.mjs
const STORAGE_CONFIG_KEY = 'koly_billing_config_v1';
const STORAGE_INVOICES_KEY = 'koly_invoices_v1';

export function initBillingModule(containerId = 'view-billing', supabaseClient = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let config = JSON.parse(localStorage.getItem(STORAGE_CONFIG_KEY) || 'null') || {
    ruc: '',
    razon_social: 'KOLYMEDICAL',
    direccion_fiscal: '',
    provider: 'PSE_API',
    environment: 'BETA',
    serie_boleta: 'B001',
    correlativo_boleta: 1,
    serie_factura: 'F001',
    correlativo_factura: 1,
    igv_rate: 18
  };

  container.innerHTML = `
    <div style="display:grid; gap:20px; color:#f8fafc;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="margin:0; font-size:1.35rem;">Facturación Electrónica (SUNAT)</h2>
          <p style="margin:4px 0 0; color:#94a3b8; font-size:0.88rem;">
            Modo actual: <strong id="billing-env-badge" style="color:#00d2c4;">${config.environment}</strong>
          </p>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" id="tab-emitir" style="padding:8px 16px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#00d2c4; color:#0b111e; font-weight:600; cursor:pointer;">Emitir Comprobante</button>
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

        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08);">
          <div id="bill-totals" style="font-size:0.95rem; color:#cbd5e1;">Total: <strong style="color:#10b981;">S/ 0.00</strong></div>
          <button type="button" id="btn-emit-doc" style="padding:10px 20px; border-radius:8px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer;">Emitir Comprobante</button>
        </div>
        <div id="bill-status-msg" style="font-size:0.88rem; color:#94a3b8;"></div>
      </section>

      <!-- PANEL CONFIGURACION SUNAT -->
      <section id="panel-config" style="display:none; background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; gap:14px;">
        <p style="margin:0; font-size:0.85rem; color:#94a3b8;">
          El token de Nubefact y la URL del endpoint se configuran como secretos en Supabase Edge Functions (<code>NUBEFACT_API_URL</code> y <code>NUBEFACT_API_TOKEN</code>), nunca en el cliente.
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <label style="font-size:0.85rem; color:#cbd5e1;">RUC Emisor
            <input id="cfg-ruc" value="${config.ruc}" maxlength="11" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Razón Social
            <input id="cfg-razon" value="${config.razon_social}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Proveedor
            <select id="cfg-provider" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="PSE_API" ${config.provider === 'PSE_API' ? 'selected' : ''}>PSE por API (Nubefact)</option>
              <option value="SOLO_INTERNO" ${config.provider === 'SOLO_INTERNO' ? 'selected' : ''}>Solo Comprobante Interno</option>
            </select>
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Ambiente
            <select id="cfg-env" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="BETA" ${config.environment === 'BETA' ? 'selected' : ''}>BETA (Pruebas)</option>
              <option value="PRODUCCION" ${config.environment === 'PRODUCCION' ? 'selected' : ''}>PRODUCCIÓN (SUNAT Real)</option>
            </select>
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Serie Boleta
            <input id="cfg-serie-b" value="${config.serie_boleta}" maxlength="4" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.85rem; color:#cbd5e1;">Serie Factura
            <input id="cfg-serie-f" value="${config.serie_factura}" maxlength="4" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
        </div>
        <button type="button" id="btn-save-cfg" style="justify-self:start; padding:10px 18px; border-radius:8px; border:none; background:#00d2c4; color:#0b111e; font-weight:700; cursor:pointer;">Guardar Configuración</button>
      </section>
    </div>
  `;

  const tabEmitir = container.querySelector('#tab-emitir');
  const tabConfig = container.querySelector('#tab-config');
  const panelEmitir = container.querySelector('#panel-emitir');
  const panelConfig = container.querySelector('#panel-config');
  const statusMsg = container.querySelector('#bill-status-msg');

  tabEmitir.addEventListener('click', () => {
    panelEmitir.style.display = 'grid';
    panelConfig.style.display = 'none';
    tabEmitir.style.background = '#00d2c4'; tabEmitir.style.color = '#0b111e';
    tabConfig.style.background = '#11192c'; tabConfig.style.color = '#cbd5e1';
  });

  tabConfig.addEventListener('click', () => {
    panelEmitir.style.display = 'none';
    panelConfig.style.display = 'grid';
    tabConfig.style.background = '#00d2c4'; tabConfig.style.color = '#0b111e';
    tabEmitir.style.background = '#11192c'; tabEmitir.style.color = '#cbd5e1';
  });

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
    container.querySelector('#billing-env-badge').textContent = config.environment;

    if (supabaseClient) {
      await supabaseClient.from('koly_billing_config').upsert(config);
    }
    statusMsg.textContent = 'Configuración guardada correctamente.';
  });

  container.querySelector('#btn-emit-doc').addEventListener('click', async () => {
    const docType = container.querySelector('#bill-type').value;
    const docNum = container.querySelector('#bill-client-doc').value.trim();
    const clientName = container.querySelector('#bill-client-name').value.trim();
    const desc = container.querySelector('#bill-item-desc').value.trim();
    const total = parseFloat(amountInput.value) || 0;
    const isGravado = igvSelect.value === 'GRAVADO';

    if (docType === 'FACTURA' && docNum.length !== 11) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = 'Error: Para Factura necesitas un RUC válido de 11 dígitos.';
      return;
    }
    if (!clientName || !desc || total <= 0) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = 'Error: Completa cliente, concepto y monto válido.';
      return;
    }

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
      is_gravado: isGravado,
      items: [{ description: desc, quantity: 1, subtotal, igv, total }],
      subtotal,
      igv,
      total
    };

    statusMsg.style.color = '#00d2c4';
    statusMsg.textContent = 'Procesando comprobante...';

    // Si hay Supabase y el proveedor es PSE_API, invocar Edge Function
    if (supabaseClient && config.provider === 'PSE_API') {
      try {
        const { data, error } = await supabaseClient.functions.invoke('emit-sunat-nubefact', {
          body: payload
        });

        if (error) {
          statusMsg.style.color = '#ef4444';
          statusMsg.textContent = `Error al conectar con SUNAT/Nubefact: ${error.message}`;
          return;
        }

        statusMsg.style.color = '#10b981';
        statusMsg.innerHTML = `Comprobante ${series}-${String(correlative).padStart(6, '0')} emitido. ${
          data?.enlace_del_pdf ? `<a href="${data.enlace_del_pdf}" target="_blank" style="color:#00d2c4; text-decoration:underline;">Descargar PDF</a>` : ''
        }`;
      } catch (err) {
        statusMsg.style.color = '#ef4444';
        statusMsg.textContent = `Error en llamada a función: ${err.message}`;
      }
    } else {
      // Modo offline / interno
      const saved = JSON.parse(localStorage.getItem(STORAGE_INVOICES_KEY) || '[]');
      saved.unshift({ ...payload, sunat_status: 'BETA' });
      localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(saved));
      statusMsg.style.color = '#10b981';
      statusMsg.textContent = `Comprobante interno ${series}-${String(correlative).padStart(6, '0')} guardado localmente.`;
    }

    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  });
}
