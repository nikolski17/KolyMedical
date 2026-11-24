// billing-module.mjs — Facturación Electrónica SUNAT, Cotizador y Sistema de Ticketera / PDF / WhatsApp
const STORAGE_CONFIG_KEY = 'koly_billing_config_v1';
const STORAGE_INVOICES_KEY = 'koly_invoices_v1';
const STORAGE_QUOTES_KEY = 'koly_quotes_v1';

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'koly-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 220);
  }, 3200);
}

// Inyectar estilos para impresión en ticketera térmica (80mm / 58mm)
function ensureTicketeraPrintStyles() {
  if (document.getElementById('koly-ticketera-print-css')) return;
  const style = document.createElement('style');
  style.id = 'koly-ticketera-print-css';
  style.textContent = `
    @media print {
      body * {
        visibility: hidden !important;
      }
      #koly-ticket-modal, #koly-ticket-modal * {
        visibility: visible !important;
      }
      #koly-ticket-modal {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: auto !important;
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
      }
      #koly-ticket-print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 78mm !important;
        max-width: 80mm !important;
        background: #ffffff !important;
        color: #000000 !important;
        padding: 2mm 3mm !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: 11px !important;
        line-height: 1.25 !important;
      }
      .ticket-no-print {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function showTicketModal(inv, config = {}) {
  ensureTicketeraPrintStyles();
  let modal = document.getElementById('koly-ticket-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'koly-ticket-modal';
    modal.style.cssText = `
      position:fixed; inset:0; z-index:999999; background:rgba(0,0,0,0.85); backdrop-filter:blur(6px);
      display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto;
    `;
    document.body.appendChild(modal);
  }

  const docFullCode = `${inv.series || 'B001'}-${String(inv.correlative || 1).padStart(6, '0')}`;
  const docTitle = inv.doc_type === 'FACTURA' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
  const issueDate = inv.created_at ? new Date(inv.created_at).toLocaleString('es-PE') : new Date().toLocaleString('es-PE');
  const items = Array.isArray(inv.items) && inv.items.length ? inv.items : [{ description: 'Consulta / Servicio Médico', quantity: 1, total: inv.total || 0 }];
  const rucEmpresa = config.ruc || '20608552191';
  const razonEmpresa = config.razon_social || 'KOLYMEDICAL S.A.C.';
  const direccionEmpresa = config.direccion_fiscal || 'Av. Javier Prado Este / Lima - Perú';

  modal.innerHTML = `
    <div style="background:#11192c; border:1px solid rgba(255,255,255,0.15); border-radius:16px; padding:20px; width:100%; max-width:440px; box-shadow:0 25px 60px rgba(0,0,0,0.7); color:#f8fafc; font-family:system-ui, -apple-system, sans-serif;">
      
      <div class="ticket-no-print" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
        <span style="font-size:0.9rem; font-weight:700; color:#00d2c4;">Vista Previa de Ticketera (80mm)</span>
        <button type="button" id="btn-close-ticket-modal" style="background:none; border:none; color:#94a3b8; font-size:1.5rem; cursor:pointer; line-height:1;">&times;</button>
      </div>

      <!-- ÁREA IMPRIMIBLE DEL TICKET (FORMATO TICKET FÍSICO 80MM) -->
      <div id="koly-ticket-print-area" style="background:#ffffff; color:#000000; padding:18px 14px; border-radius:8px; font-family:'Courier New', Courier, monospace; font-size:11px; line-height:1.3; box-shadow:0 4px 14px rgba(0,0,0,0.25);">
        
        <div style="text-align:center; margin-bottom:10px;">
          <strong style="font-size:13px; letter-spacing:1px; display:block;">${razonEmpresa.toUpperCase()}</strong>
          <div>R.U.C.: ${rucEmpresa}</div>
          <div style="font-size:10px;">${direccionEmpresa}</div>
          <div style="font-size:10px;">TELÉFONO: (01) 987-654-321</div>
        </div>

        <div style="border-top:1px dashed #000; border-bottom:1px dashed #000; padding:6px 0; margin:8px 0; text-align:center;">
          <strong style="font-size:12px; display:block;">${docTitle}</strong>
          <strong style="font-size:13px;">${docFullCode}</strong>
        </div>

        <div style="margin-bottom:8px; font-size:10.5px;">
          <div><strong>FECHA EMISIÓN:</strong> ${issueDate}</div>
          <div><strong>CLIENTE:</strong> ${(inv.client_name || 'CLIENTE VARIOS').toUpperCase()}</div>
          <div><strong>${inv.client_doc_type || 'DOC'}:</strong> ${inv.client_doc_number || '—'}</div>
          <div><strong>MONEDA:</strong> SOLES (S/)</div>
        </div>

        <div style="border-top:1px solid #000; border-bottom:1px solid #000; padding:4px 0; margin-bottom:6px; display:flex; justify-content:space-between; font-weight:700; font-size:10px;">
          <span>DESCRIPCIÓN</span>
          <span>IMPORTE</span>
        </div>

        <div style="margin-bottom:8px;">
          ${items.map(it => `
            <div style="display:flex; justify-content:space-between; gap:6px; margin-bottom:3px; font-size:10.5px;">
              <span style="flex:1;">${it.quantity || 1}x ${it.description || 'Atención Médica'}</span>
              <strong style="white-space:nowrap;">S/ ${Number(it.total || 0).toFixed(2)}</strong>
            </div>
          `).join('')}
        </div>

        <div style="border-top:1px dashed #000; padding-top:6px; margin-top:6px; font-size:11px;">
          <div style="display:flex; justify-content:space-between;">
            <span>OP. GRAVADA:</span>
            <span>S/ ${Number(inv.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>I.G.V. (18%):</span>
            <span>S/ ${Number(inv.igv || 0).toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:800; border-top:1px solid #000; margin-top:4px; padding-top:4px;">
            <span>TOTAL A PAGAR:</span>
            <span>S/ ${Number(inv.total || 0).toFixed(2)}</span>
          </div>
        </div>

        <div style="border-top:1px dashed #000; margin-top:10px; padding-top:8px; text-align:center; font-size:9.5px;">
          <div>ESTADO: <strong>${(inv.sunat_status || 'BETA').toUpperCase()}</strong></div>
          <div style="margin-top:3px;">Representación impresa de la ${docTitle.toLowerCase()} emitida por KolyTech Platform.</div>
          <div style="margin-top:4px; font-weight:700;">¡Gracias por su preferencia!</div>
        </div>
      </div>

      <!-- BOTONES DE ACCIÓN (NO IMPRIMIBLES) -->
      <div class="ticket-no-print" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:16px;">
        <button type="button" id="btn-print-pos-ticket" style="padding:10px; border-radius:8px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimir Ticketera
        </button>

        <button type="button" id="btn-download-pdf-ticket" style="padding:10px; border-radius:8px; border:none; background:#00d2c4; color:#0b111e; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Descargar PDF
        </button>

        <button type="button" id="btn-send-wa-ticket" style="grid-column:1/-1; padding:10px; border-radius:8px; border:1px solid rgba(37,211,102,0.4); background:#128c7e; color:#ffffff; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z"/></svg>
          Enviar Comprobante por WhatsApp
        </button>
      </div>

    </div>
  `;

  modal.style.display = 'flex';

  modal.querySelector('#btn-close-ticket-modal').onclick = () => { modal.style.display = 'none'; };
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

  // Acción 1: Imprimir en Ticketera
  modal.querySelector('#btn-print-pos-ticket').onclick = () => {
    window.print();
  };

  // Acción 2: Descargar PDF
  modal.querySelector('#btn-download-pdf-ticket').onclick = () => {
    if (inv.pdf_url) {
      window.open(inv.pdf_url, '_blank');
    } else {
      // Si no hay enlace externo de Nubefact, lanzar ventana de impresión con opción de Guardar como PDF
      window.print();
    }
  };

  // Acción 3: Enviar por WhatsApp al paciente
  modal.querySelector('#btn-send-wa-ticket').onclick = () => {
    let phone = inv.client_phone || (inv.client_doc_number && inv.client_doc_number.length === 9 ? inv.client_doc_number : '');
    if (!phone) {
      phone = prompt('Ingresa el número de WhatsApp del paciente (ej. 987654321):', '');
    }
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
    const waText = encodeURIComponent(
      `*${razonEmpresa} — Comprobante Electrónico*\n\n` +
      `Estimado(a) *${inv.client_name || 'Paciente'}*,\n` +
      `Se ha emitido su *${docTitle}* con éxito:\n\n` +
      `📄 *Comprobante:* ${docFullCode}\n` +
      `📅 *Fecha:* ${issueDate}\n` +
      `💰 *Monto Total:* S/ ${Number(inv.total || 0).toFixed(2)}\n` +
      `📋 *Concepto:* ${items.map(i => i.description).join(', ')}\n` +
      `✅ *Estado:* ${inv.sunat_status || 'REGISTRADO'}\n\n` +
      (inv.pdf_url ? `Descargue su comprobante oficial aquí:\n${inv.pdf_url}\n\n` : '') +
      `_Gracias por atender su salud con nosotros._`
    );
    window.open(`https://wa.me/${fullPhone}?text=${waText}`, '_blank');
  };
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
    direccion_fiscal: 'Av. Javier Prado Este / Lima - Perú',
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
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08); flex-wrap:wrap; gap:10px;">
          <div id="bill-totals" style="font-size:0.95rem; color:#cbd5e1;">Total: <strong style="color:#10b981;">S/ 0.00</strong></div>
          <button type="button" id="btn-emit-doc" style="padding:10px 20px; border-radius:8px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer;">Registrar / Emitir</button>
        </div>
        <div id="bill-post-emit-actions" style="display:none; padding:12px; border-radius:10px; background:rgba(0,210,196,0.08); border:1px solid rgba(0,210,196,0.25); align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="color:#10b981; font-weight:600; font-size:0.9rem;" id="bill-post-emit-msg">Comprobante emitido con éxito.</div>
          <div style="display:flex; gap:8px;">
            <button type="button" id="btn-quick-open-ticket" style="padding:7px 14px; border-radius:6px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer;">Ver Ticketera</button>
            <button type="button" id="btn-quick-open-wa" style="padding:7px 14px; border-radius:6px; border:none; background:#128c7e; color:#fff; font-weight:700; cursor:pointer;">WhatsApp</button>
          </div>
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
        <div id="billing-history-list" style="display:grid; gap:12px;"></div>
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
          <label style="font-size:0.82rem; color:#94a3b8;">Dirección Fiscal
            <input id="cfg-dir" value="${config.direccion_fiscal || ''}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
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
  let lastEmittedInvoice = null;

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

    lastEmittedInvoice = payload;
    showToast(`Comprobante ${series}-${String(correlative).padStart(6, '0')} emitido (${payload.sunat_status}).`);

    // Mostrar barra rápida con acceso directo a Ticketera y WhatsApp
    const postEmitBox = container.querySelector('#bill-post-emit-actions');
    if (postEmitBox) {
      postEmitBox.style.display = 'flex';
      container.querySelector('#bill-post-emit-msg').textContent = `✓ ${docType} ${series}-${String(correlative).padStart(6, '0')} emitida con éxito.`;
      
      container.querySelector('#btn-quick-open-ticket').onclick = () => {
        showTicketModal(lastEmittedInvoice, config);
      };
      container.querySelector('#btn-quick-open-wa').onclick = () => {
        showTicketModal(lastEmittedInvoice, config);
        const waBtn = document.getElementById('btn-send-wa-ticket');
        if (waBtn) waBtn.click();
      };
    }
  });

  // Guardar configuración
  container.querySelector('#btn-save-cfg').addEventListener('click', async () => {
    config = {
      ...config,
      ruc: container.querySelector('#cfg-ruc').value.trim(),
      razon_social: container.querySelector('#cfg-razon').value.trim(),
      direccion_fiscal: container.querySelector('#cfg-dir')?.value.trim() || config.direccion_fiscal,
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
    
    if (!list.length) {
      box.innerHTML = '<span style="color:#64748b;">Todavía no hay comprobantes registrados.</span>';
      return;
    }

    box.innerHTML = list.map((i, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:14px; border-radius:12px; background:#0b111e; border:1px solid rgba(255,255,255,0.08);">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="color:#00d2c4; font-size:1.05rem;">${i.series}-${String(i.correlative).padStart(6, '0')}</strong>
            <span style="font-size:0.75rem; padding:2px 8px; border-radius:12px; background:rgba(0,210,196,0.12); color:#00d2c4; font-weight:700;">${i.doc_type}</span>
            <span style="font-size:0.75rem; padding:2px 8px; border-radius:12px; background:${i.sunat_status === 'ACEPTADO' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}; color:${i.sunat_status === 'ACEPTADO' ? '#10b981' : '#f59e0b'}; font-weight:600;">${i.sunat_status || 'BETA'}</span>
          </div>
          <div style="font-size:0.92rem; color:#f8fafc; margin-top:4px;"><strong>${i.client_name}</strong> · ${i.client_doc_type || 'DOC'}: ${i.client_doc_number}</div>
          <div style="font-size:0.78rem; color:#94a3b8; margin-top:2px;">
            ${(i.items && i.items[0]?.description) || 'Consulta / Servicio'} · ${i.created_at ? new Date(i.created_at).toLocaleString('es-PE') : 'Hoy'}
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="font-size:1.15rem; font-weight:800; color:#10b981; margin-right:6px;">S/ ${Number(i.total).toFixed(2)}</div>
          
          <button type="button" class="btn-history-ticket" data-idx="${idx}" style="padding:6px 12px; border-radius:6px; border:1px solid rgba(0,210,196,0.3); background:#11192c; color:#00d2c4; font-size:0.8rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Ticketera
          </button>

          <button type="button" class="btn-history-pdf" data-idx="${idx}" style="padding:6px 12px; border-radius:6px; border:1px solid rgba(56,189,248,0.3); background:#11192c; color:#38bdf8; font-size:0.8rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            PDF
          </button>

          <button type="button" class="btn-history-wa" data-idx="${idx}" style="padding:6px 12px; border-radius:6px; border:1px solid rgba(37,211,102,0.3); background:rgba(37,211,102,0.1); color:#25D366; font-size:0.8rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z"/></svg>
            WhatsApp
          </button>
        </div>
      </div>
    `).join('');

    // Eventos de botones en cada fila del historial
    box.querySelectorAll('.btn-history-ticket').forEach(btn => {
      btn.addEventListener('click', () => {
        const inv = list[Number(btn.dataset.idx)];
        showTicketModal(inv, config);
      });
    });

    box.querySelectorAll('.btn-history-pdf').forEach(btn => {
      btn.addEventListener('click', () => {
        const inv = list[Number(btn.dataset.idx)];
        showTicketModal(inv, config);
        const pdfBtn = document.getElementById('btn-download-pdf-ticket');
        if (pdfBtn) pdfBtn.click();
      });
    });

    box.querySelectorAll('.btn-history-wa').forEach(btn => {
      btn.addEventListener('click', () => {
        const inv = list[Number(btn.dataset.idx)];
        showTicketModal(inv, config);
        const waBtn = document.getElementById('btn-send-wa-ticket');
        if (waBtn) waBtn.click();
      });
    });
  }
}
