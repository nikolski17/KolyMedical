// billing-module.mjs — Facturación Electrónica SUNAT, Cotizador y Sistema de Ticketera / PDF / WhatsApp
const STORAGE_INVOICES_KEY = 'koly_invoices_v1';
const STORAGE_CONFIG_KEY = 'koly_billing_config_v1';
const STORAGE_QUOTES_KEY = 'koly_quotes_v1';

// Estilos de impresión estrictos para impresoras térmicas (58mm / 80mm)
function ensureTicketeraPrintStyles() {
  if (document.getElementById('ticketera-print-css')) return;
  const style = document.createElement('style');
  style.id = 'ticketera-print-css';
  style.innerHTML = `
    @media print {
      body * {
        visibility: hidden !important;
      }
      #koly-ticket-modal,
      #koly-ticket-print-area,
      #koly-ticket-print-area * {
        visibility: visible !important;
      }
      #koly-ticket-modal {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
        z-index: 9999999 !important;
      }
      #koly-ticket-print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 4mm !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: 11px !important;
        box-shadow: none !important;
        border: none !important;
      }
      .ticket-no-print {
        display: none !important;
      }
      @page {
        size: 80mm auto;
        margin: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Modal y Visor del Ticket Térmico Pos / Impresión y Envío
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
  const isAnulada = inv.sunat_status === 'ANULADA';
  const discount = Number(inv.discount_amount || 0);
  const gross = Number(inv.gross_amount || (inv.total + discount));

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

        ${isAnulada ? `
          <div style="border:2px solid #ef4444; background:#fee2e2; color:#b91c1c; padding:6px; margin:8px 0; text-align:center; font-weight:800; font-size:12px;">
            *** COMPROBANTE ANULADO ***
            <div style="font-size:9.5px; font-weight:600; margin-top:2px;">Motivo: ${inv.void_reason || 'Sin especificar'}</div>
            <div style="font-size:9px; font-weight:400;">Fecha de anulación: ${inv.voided_at ? new Date(inv.voided_at).toLocaleString('es-PE') : '—'}</div>
          </div>
        ` : ''}

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
          ${discount > 0 ? `
            <div style="display:flex; justify-content:space-between;">
              <span>MONTO BRUTO:</span>
              <span>S/ ${gross.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:#b91c1c;">
              <span>DESCUENTO (${inv.promo_name || 'PROMO'}):</span>
              <span>-S/ ${discount.toFixed(2)}</span>
            </div>
          ` : ''}
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
            <span style="${isAnulada ? 'text-decoration:line-through; color:#ef4444;' : ''}">S/ ${Number(inv.total || 0).toFixed(2)}</span>
          </div>
        </div>

        <div style="border-top:1px dashed #000; margin-top:10px; padding-top:8px; text-align:center; font-size:9.5px;">
          <div>ESTADO: <strong style="${isAnulada ? 'color:#ef4444;' : ''}">${(inv.sunat_status || 'BETA').toUpperCase()}</strong></div>
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

  // Evento cerrar
  modal.querySelector('#btn-close-ticket-modal').onclick = () => {
    modal.style.display = 'none';
  };
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };

  // Acción 1: Imprimir en Ticketera
  modal.querySelector('#btn-print-pos-ticket').onclick = () => {
    window.print();
  };

  // Acción 2: Descargar en PDF
  modal.querySelector('#btn-download-pdf-ticket').onclick = () => {
    if (inv.pdf_url) {
      window.open(inv.pdf_url, '_blank');
    } else {
      window.print();
    }
  };

  // Acción 3: Enviar por WhatsApp
  modal.querySelector('#btn-send-wa-ticket').onclick = () => {
    const rawPhone = (inv.client_phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 9 ? `51${rawPhone}` : rawPhone;
    
    let promoText = discount > 0 ? `\n🎁 *Descuento Aplicado:* -S/ ${discount.toFixed(2)} (${inv.promo_name || 'Promoción'})` : '';
    let statusText = isAnulada ? `\n⚠️ *ESTADO:* ANULADA (Motivo: ${inv.void_reason || 'Sin motivo'})` : `\n✅ *ESTADO:* Emitido (${inv.sunat_status || 'BETA'})`;

    const text = encodeURIComponent(
      `Hola *${inv.client_name || 'Estimado paciente'}*, le saludamos de *${razonEmpresa}*.\n\n` +
      `Adjuntamos el detalle de su *${docTitle}*:\n` +
      `📄 *Comprobante:* ${docFullCode}\n` +
      `📅 *Fecha:* ${issueDate}\n` +
      `👤 *Cliente:* ${inv.client_name} (${inv.client_doc_type}: ${inv.client_doc_number})\n` +
      `🩺 *Concepto:* ${items.map(it => it.description).join(', ')}${promoText}\n` +
      `💰 *Total:* S/ ${Number(inv.total || 0).toFixed(2)}${statusText}\n\n` +
      `¡Muchas gracias por su confianza y preferencia!`
    );

    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };
}

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
          <label style="font-size:0.82rem; color:#94a3b8;">Tipo de Comprobante
            <select id="bill-type" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="BOLETA">Boleta de Venta (${config.serie_boleta})</option>
              <option value="FACTURA">Factura Electrónica (${config.serie_factura})</option>
            </select>
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">DNI / RUC del Cliente
            <input id="bill-client-doc" maxlength="11" placeholder="8 dígitos (DNI) u 11 (RUC)" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Paciente / Razón Social
            <input id="bill-client-name" placeholder="Nombre completo o empresa" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
        </div>

        <div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px;">
          <label style="font-size:0.82rem; color:#94a3b8;">Concepto / Detalle Clínico
            <input id="bill-item-desc" placeholder="Ej. Consulta Médica + FibroScan" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Monto Base / Bruto (S/)
            <input id="bill-amount" type="number" step="0.01" min="0" placeholder="0.00" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Afectación IGV
            <select id="bill-igv-mode" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="GRAVADO">Gravado (18%)</option>
              <option value="EXONERADO">Exonerado (0%)</option>
            </select>
          </label>
        </div>

        <!-- SECCIÓN DE PROMOCIÓN O DESCUENTO -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:rgba(255,255,255,0.02); padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.06);">
          <label style="font-size:0.82rem; color:#00d2c4; font-weight:600;">🎁 Aplicar Promoción o Descuento
            <select id="bill-promo-type" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(0,210,196,0.25);">
              <option value="NONE">Sin Promoción (0%)</option>
              <option value="PERCENT_10">Descuento Campaña (10%)</option>
              <option value="PERCENT_15">Descuento Especial (15%)</option>
              <option value="PERCENT_20">Descuento Fidelidad (20%)</option>
              <option value="FIXED">Monto Fijo Personalizado (S/)</option>
            </select>
          </label>
          <div id="bill-promo-custom-container" style="display:none;">
            <label style="font-size:0.82rem; color:#94a3b8;">Monto Descuento en Soles (S/)
              <input id="bill-promo-custom-val" type="number" step="0.5" min="0" placeholder="0.00" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
            </label>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08); flex-wrap:wrap; gap:10px;">
          <div id="bill-totals" style="font-size:0.95rem; color:#cbd5e1;">Total: <strong style="color:#10b981;">S/ 0.00</strong></div>
          <button type="button" id="btn-emit-doc" style="padding:10px 20px; border-radius:8px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer;">Emitir Comprobante</button>
        </div>

        <!-- Barra de acceso rápido post-emisión a Ticketera y WhatsApp -->
        <div id="bill-post-emit-actions" style="display:none; justify-content:space-between; align-items:center; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); padding:12px 16px; border-radius:10px; margin-top:8px; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="color:#10b981; font-weight:700;" id="bill-post-emit-msg">✓ Comprobante emitido con éxito.</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" id="btn-quick-open-ticket" style="padding:7px 14px; border-radius:6px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer;">Ver Ticketera</button>
            <button type="button" id="btn-quick-open-wa" style="padding:7px 14px; border-radius:6px; border:1px solid rgba(37,211,102,0.5); background:#128c7e; color:#fff; font-weight:700; cursor:pointer;">Enviar WhatsApp</button>
          </div>
        </div>
      </section>

      <!-- TAB 2: COTIZADOR DE ESTUDIOS -->
      ${canQuote ? `
      <section data-bill-panel="quotes" style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; display:none; gap:16px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <input id="quote-client-name" placeholder="Nombre del paciente para presupuesto" style="padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          <input id="quote-client-doc" placeholder="DNI / Cédula" style="padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
        </div>
        <input id="quote-search" placeholder="Buscar estudio, análisis clínico o ecografía..." style="width:100%; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
        <div id="quote-catalog-results" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px; max-height:220px; overflow-y:auto;"></div>
        <div style="background:#0b111e; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:14px;">
          <h4 style="margin:0 0 10px; font-size:0.9rem; color:#00d2c4;">Estudios Seleccionados en Presupuesto</h4>
          <div id="quote-cart-list" style="display:grid; gap:8px; font-size:0.85rem;"></div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08);">
            <strong id="quote-cart-total" style="font-size:1.05rem; color:#10b981;">Total: S/ 0.00</strong>
            <button type="button" id="btn-convert-quote-to-invoice" style="padding:8px 16px; border-radius:8px; border:none; background:#00d2c4; color:#0b111e; font-weight:700; cursor:pointer;">Facturar Presupuesto</button>
          </div>
        </div>
      </section>` : ''}

      <!-- TAB 3: HISTORIAL -->
      <section data-bill-panel="historial" style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; display:none; gap:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:1.1rem; color:#00d2c4;">Historial de Comprobantes Emitidos</h3>
          <span style="font-size:0.8rem; color:#94a3b8;">Registro auditado</span>
        </div>
        <div id="billing-history-list" style="display:grid; gap:10px;"></div>
      </section>

      <!-- TAB 4: CONFIGURACIÓN SUNAT -->
      <section data-bill-panel="config" style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; display:none; gap:14px;">
        <h3 style="margin:0; font-size:1.1rem; color:#00d2c4;">Configuración de Empresa & Credenciales SUNAT</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <label style="font-size:0.82rem; color:#94a3b8;">RUC Emisor
            <input id="cfg-ruc" value="${config.ruc}" placeholder="20608552191" maxlength="11" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Razón Social
            <input id="cfg-razon" value="${config.razon_social}" placeholder="KOLYMEDICAL S.A.C." style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.82rem; color:#94a3b8;">Ambiente
            <select id="cfg-env" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
              <option value="BETA" ${config.environment === 'BETA' ? 'selected' : ''}>BETA (Pruebas SUNAT)</option>
              <option value="PRODUCCION" ${config.environment === 'PRODUCCION' ? 'selected' : ''}>PRODUCCIÓN (Validez Legal)</option>
            </select>
          </label>
        </div>
        <div style="display:flex; justify-content:flex-end;">
          <button type="button" id="btn-save-cfg" style="padding:10px 20px; border-radius:8px; border:none; background:#00d2c4; color:#0b111e; font-weight:700; cursor:pointer;">Guardar Configuración</button>
        </div>
      </section>
    </div>
  `;

  // Control de pestañas
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

  // Cálculo de totales con Promociones / Descuentos
  const amountInput = container.querySelector('#bill-amount');
  const igvSelect = container.querySelector('#bill-igv-mode');
  const promoSelect = container.querySelector('#bill-promo-type');
  const promoCustomVal = container.querySelector('#bill-promo-custom-val');
  const promoContainer = container.querySelector('#bill-promo-custom-container');

  promoSelect.addEventListener('change', () => {
    promoContainer.style.display = promoSelect.value === 'FIXED' ? 'block' : 'none';
    updateTotals();
  });
  if (promoCustomVal) promoCustomVal.addEventListener('input', updateTotals);

  function calculateDiscount(gross) {
    const promo = promoSelect.value;
    if (promo === 'PERCENT_10') return +(gross * 0.10).toFixed(2);
    if (promo === 'PERCENT_15') return +(gross * 0.15).toFixed(2);
    if (promo === 'PERCENT_20') return +(gross * 0.20).toFixed(2);
    if (promo === 'FIXED') {
      const f = parseFloat(promoCustomVal.value) || 0;
      return Math.min(gross, f);
    }
    return 0;
  }

  const updateTotals = () => {
    const gross = parseFloat(amountInput.value) || 0;
    const discount = calculateDiscount(gross);
    const finalTotal = Math.max(0, +(gross - discount).toFixed(2));
    const isGravado = igvSelect.value === 'GRAVADO';
    const subtotal = isGravado ? +(finalTotal / 1.18).toFixed(2) : finalTotal;
    const igv = +(finalTotal - subtotal).toFixed(2);

    let promoHtml = discount > 0 ? `<span style="color:#f59e0b; margin-right:8px;">Descuento: -S/ ${discount.toFixed(2)}</span> | ` : '';

    container.querySelector('#bill-totals').innerHTML =
      `Bruto: S/ ${gross.toFixed(2)} | ${promoHtml}Subtotal: S/ ${subtotal.toFixed(2)} | IGV: S/ ${igv.toFixed(2)} | <strong style="color:#10b981; font-size:1.1rem;">Total a Pagar: S/ ${finalTotal.toFixed(2)}</strong>`;
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
    const gross = parseFloat(amountInput.value) || 0;

    if (docType === 'FACTURA' && docNum.length !== 11) return showToast('La Factura requiere RUC de 11 dígitos.');
    if (!clientName || !desc || gross <= 0) return showToast('Completa cliente, concepto y monto válido.');

    const discount = calculateDiscount(gross);
    const total = Math.max(0, +(gross - discount).toFixed(2));
    const isGravado = igvSelect.value === 'GRAVADO';
    const subtotal = isGravado ? +(total / 1.18).toFixed(2) : total;
    const igv = +(total - subtotal).toFixed(2);
    const series = docType === 'FACTURA' ? config.serie_factura : config.serie_boleta;
    const correlative = docType === 'FACTURA' ? config.correlativo_factura++ : config.correlativo_boleta++;

    const promoMap = {
      PERCENT_10: 'Campaña 10%',
      PERCENT_15: 'Especial 15%',
      PERCENT_20: 'Fidelidad 20%',
      FIXED: 'Monto Fijo S/'
    };
    const promoName = promoMap[promoSelect.value] || null;

    const payload = {
      doc_type: docType,
      series,
      correlative,
      client_doc_type: docNum.length === 11 ? 'RUC' : 'DNI',
      client_doc_number: docNum || '00000000',
      client_name: clientName,
      items: [{ description: desc, quantity: 1, total: gross }],
      gross_amount: gross,
      discount_amount: discount,
      promo_name: promoName,
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
        console.warn('[KolyTech] Local fallback for invoice insert:', err.message);
      }
    }

    lastEmittedInvoice = payload;
    showToast(`Comprobante ${series}-${String(correlative).padStart(6, '0')} emitido.`);

    // Mostrar barra rápida post-emisión
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
      environment: container.querySelector('#cfg-env').value
    };
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    container.querySelector('#billing-env-badge').textContent = config.environment;
    showToast('Configuración SUNAT guardada.');
  });

  function renderHistory() {
    const list = JSON.parse(localStorage.getItem(STORAGE_INVOICES_KEY) || '[]');
    const box = container.querySelector('#billing-history-list');
    
    if (!list.length) {
      box.innerHTML = '<span style="color:#64748b; padding:1.5rem; text-align:center;">Todavía no hay comprobantes registrados.</span>';
      return;
    }

    box.innerHTML = list.map((i, idx) => {
      const isAnulada = i.sunat_status === 'ANULADA';
      const statusBadge = isAnulada
        ? '<span style="font-size:0.75rem; padding:2px 8px; border-radius:12px; background:rgba(239,68,68,0.18); color:#ef4444; font-weight:800;">ANULADA</span>'
        : `<span style="font-size:0.75rem; padding:2px 8px; border-radius:12px; background:${i.sunat_status === 'ACEPTADO' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}; color:${i.sunat_status === 'ACEPTADO' ? '#10b981' : '#f59e0b'}; font-weight:600;">${i.sunat_status || 'BETA'}</span>`;

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:14px; border-radius:12px; background:#0b111e; border:1px solid ${isAnulada ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'};">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="color:${isAnulada ? '#ef4444' : '#00d2c4'}; font-size:1.05rem; ${isAnulada ? 'text-decoration:line-through;' : ''}">${i.series}-${String(i.correlative).padStart(6, '0')}</strong>
              <span style="font-size:0.75rem; padding:2px 8px; border-radius:12px; background:rgba(0,210,196,0.12); color:#00d2c4; font-weight:700;">${i.doc_type}</span>
              ${statusBadge}
            </div>
            <div style="font-size:0.92rem; color:#f8fafc; margin-top:4px;"><strong>${i.client_name}</strong> · ${i.client_doc_type || 'DOC'}: ${i.client_doc_number}</div>
            <div style="font-size:0.78rem; color:#94a3b8; margin-top:2px;">
              ${(i.items && i.items[0]?.description) || 'Consulta / Servicio'} · ${i.created_at ? new Date(i.created_at).toLocaleString('es-PE') : 'Hoy'}
              ${i.discount_amount ? ` · <span style="color:#f59e0b;">Descuento: -S/ ${Number(i.discount_amount).toFixed(2)} (${i.promo_name || 'Promo'})</span>` : ''}
            </div>
            ${isAnulada ? `<div style="font-size:0.75rem; color:#ef4444; margin-top:3px; font-weight:600;">Motivo anulación: ${i.void_reason || 'Sin motivo'} (${i.voided_at ? new Date(i.voided_at).toLocaleDateString('es-PE') : 'Hoy'})</div>` : ''}
          </div>

          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="font-size:1.15rem; font-weight:800; color:${isAnulada ? '#ef4444' : '#10b981'}; margin-right:6px; ${isAnulada ? 'text-decoration:line-through;' : ''}">
              S/ ${Number(i.total).toFixed(2)}
            </div>
            
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

            ${!isAnulada ? `
              <button type="button" class="btn-history-void" data-idx="${idx}" style="padding:6px 12px; border-radius:6px; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.1); color:#ef4444; font-size:0.8rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:5px;" title="Anular comprobante">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                Anular
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Eventos de botones
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

    // Acción Anular Comprobante
    box.querySelectorAll('.btn-history-void').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.idx);
        const inv = list[idx];
        const docCode = `${inv.series}-${String(inv.correlative).padStart(6, '0')}`;
        
        const reason = prompt(
          `¿Estás seguro de anular el comprobante ${docCode} emitido a ${inv.client_name}?\n\nIngresa el motivo de anulación (ej. Error en digitación, Cancelación de servicio o Devolución):`,
          'Error en digitación'
        );
        if (!reason || !reason.trim()) return;

        inv.sunat_status = 'ANULADA';
        inv.void_reason = reason.trim();
        inv.voided_at = new Date().toISOString();

        list[idx] = inv;
        localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(list));

        if (supabaseClient) {
          try {
            await supabaseClient.from('koly_invoices').update({
              sunat_status: 'ANULADA',
              sunat_response: { void_reason: inv.void_reason, voided_at: inv.voided_at }
            }).eq('series', inv.series).eq('correlative', inv.correlative);
          } catch (e) {
            console.warn('[Billing] Supabase void update fallback:', e.message);
          }
        }

        showToast(`Comprobante ${docCode} anulado.`);
        renderHistory();
      });
    });
  }
}
