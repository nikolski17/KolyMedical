import { calculateQuoteTotals, createQuoteSnapshot, quoteExpiresAt } from './quote-utils.mjs';

let context;
let initialized = false;
let catalog = [];
let catalogWithCosts = [];
let quoteLines = [];
let patientSearchTimer;

const byId = (id) => document.getElementById(id);
const text = (value) => String(value ?? '').trim();
const safeUpper = (value) => text(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const money = (value, currency = 'PEN') => new Intl.NumberFormat('es-PE', {
  style: 'currency', currency: currency === 'USD' ? 'USD' : 'PEN', minimumFractionDigits: 2,
}).format(Number(value) || 0);

function setLoading(button, loading, label) {
  if (!button) return;
  if (loading) button.dataset.originalLabel = button.textContent;
  button.disabled = loading;
  button.textContent = loading ? label : (button.dataset.originalLabel || button.textContent);
}

function quoteNumber() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(-4).padStart(4, '0');
  return `COT-${date}-${suffix}`;
}

function quotePatientMode() {
  return document.querySelector('input[name="quote-patient-mode"]:checked')?.value || 'registered';
}

function applyPatientMode() {
  const registered = quotePatientMode() === 'registered';
  byId('quote-patient-search').disabled = !registered;
  byId('quote-patient-name').readOnly = registered;
  byId('quote-patient-dni').readOnly = registered;
  if (!registered) {
    byId('quote-patient-record-id').value = '';
    byId('quote-patient-name').value = '';
    byId('quote-patient-dni').value = '';
    byId('quote-patient-results').hidden = true;
    byId('quote-patient-name').focus();
  } else {
    byId('quote-patient-name').value = '';
    byId('quote-patient-dni').value = '';
    byId('quote-patient-search').focus();
  }
}

async function searchPatients() {
  const query = text(byId('quote-patient-search').value);
  const results = byId('quote-patient-results');
  if (query.length < 3) { results.hidden = true; results.replaceChildren(); return; }
  const { data, error } = await context.client.rpc('search_quote_patients', { p_query: query });
  if (error) { results.hidden = true; console.error('Búsqueda limitada de pacientes:', error); return; }
  results.replaceChildren();
  (data || []).forEach((patient) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quote-search-result';
    const strong = document.createElement('strong');
    strong.textContent = patient.patient_name || 'Paciente';
    const info = document.createElement('span');
    info.textContent = `DNI: ${patient.dni || 'sin documento'}`;
    button.append(strong, info);
    button.addEventListener('click', () => {
      byId('quote-patient-record-id').value = patient.record_id || '';
      byId('quote-patient-name').value = patient.patient_name || '';
      byId('quote-patient-dni').value = patient.dni || '';
      byId('quote-patient-search').value = patient.patient_name || '';
      results.hidden = true;
    });
    results.appendChild(button);
  });
  if (!results.childElementCount) {
    const empty = document.createElement('div');
    empty.className = 'quote-search-result';
    empty.textContent = 'No se encontraron coincidencias. Puedes usar la opción “Solo para esta cotización”.';
    results.appendChild(empty);
  }
  results.hidden = false;
}

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
}

function fillSelect(select, values, firstLabel) {
  const current = select.value;
  select.replaceChildren(new Option(firstLabel, ''));
  uniqueOptions(values).forEach((value) => select.add(new Option(value, value)));
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function catalogDescription(item) {
  return [item.name, item.variant].filter(Boolean).join(' — ');
}

function renderCatalogPicker() {
  const results = byId('quote-catalog-results');
  if (!results) return;
  const query = text(byId('quote-catalog-search').value).toLocaleLowerCase('es');
  const provider = byId('quote-provider-filter').value;
  const category = byId('quote-category-filter').value;
  const filtered = catalog.filter((item) => {
    const haystack = `${item.code} ${item.name} ${item.variant} ${item.provider_name} ${item.category}`.toLocaleLowerCase('es');
    return (!query || haystack.includes(query)) && (!provider || item.provider_name === provider) && (!category || item.category === category);
  }).slice(0, 18);

  results.replaceChildren();
  filtered.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quote-catalog-card';
    const title = document.createElement('strong'); title.textContent = catalogDescription(item);
    const meta = document.createElement('span'); meta.textContent = `${item.code} · ${item.provider_name} · ${item.category}`;
    const price = document.createElement('em'); price.textContent = money(item.permanent_price, item.currency);
    button.append(title, meta, price);
    if (item.requires_confirmation) {
      const warning = document.createElement('span'); warning.className = 'requires-confirmation'; warning.textContent = 'Confirmar vigencia con el proveedor'; button.appendChild(warning);
    }
    button.addEventListener('click', () => addCatalogItem(item));
    results.appendChild(button);
  });
  if (!filtered.length) {
    const empty = document.createElement('span'); empty.className = 'quote-loading'; empty.textContent = 'No se encontraron conceptos con esos filtros.'; results.appendChild(empty);
  }
}

function addCatalogItem(item) {
  if (quoteLines.length && quoteLines[0].currency !== item.currency) {
    alert('Una cotización debe usar una sola moneda. Crea otra cotización para conceptos en una moneda diferente.');
    return;
  }
  if (item.requires_confirmation && !confirm('Este precio está marcado para confirmar vigencia con el proveedor. ¿Deseas agregarlo de todas maneras?')) return;
  quoteLines.push({ ...createQuoteSnapshot(item, { quantity: 1, discount: 0 }) });
  renderQuoteLines();
}

function updateQuoteLine(index, field, value) {
  if (!quoteLines[index]) return;
  const item = quoteLines[index];
  if (field === 'description') item.description = text(value).slice(0, 240);
  else item[field] = Number(value) || 0;
  const updated = createQuoteSnapshot({
    id: item.catalogItemId, code: item.code, name: item.description,
    provider_name: item.providerName, currency: item.currency, permanent_price: item.unitPrice,
  }, { description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount });
  quoteLines[index] = { ...updated };
  renderQuoteLines();
}

function renderQuoteLines() {
  const body = byId('quote-lines-body');
  body.replaceChildren();
  if (!quoteLines.length) {
    const row = body.insertRow(); row.className = 'quote-empty-row';
    const cell = row.insertCell(); cell.colSpan = 7; cell.textContent = 'Busca y agrega uno o más conceptos.';
  }
  quoteLines.forEach((item, index) => {
    const row = body.insertRow();
    const descriptionCell = row.insertCell();
    const description = document.createElement('input'); description.className = 'quote-description-input'; description.value = item.description; description.maxLength = 240;
    description.addEventListener('change', (event) => updateQuoteLine(index, 'description', event.target.value)); descriptionCell.appendChild(description);
    row.insertCell().textContent = item.currency;
    for (const [field, min, step] of [['quantity', 1, 1], ['unitPrice', 0, .01], ['discount', 0, .01]]) {
      const cell = row.insertCell(); const input = document.createElement('input'); input.type = 'number'; input.min = String(min); input.max = field === 'quantity' ? '99' : '10000000'; input.step = String(step); input.value = item[field];
      input.setAttribute('aria-label', field); input.addEventListener('change', (event) => updateQuoteLine(index, field, event.target.value)); cell.appendChild(input);
    }
    const total = row.insertCell(); total.className = 'catalog-price'; total.textContent = money(item.total, item.currency);
    const actions = row.insertCell(); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'quote-remove-line'; remove.title = 'Quitar concepto'; remove.textContent = '×'; remove.addEventListener('click', () => { quoteLines.splice(index, 1); renderQuoteLines(); }); actions.appendChild(remove);
  });
  renderTotals();
}

function renderTotals() {
  const totals = calculateQuoteTotals(quoteLines);
  byId('quote-subtotal').textContent = money(totals.subtotal, totals.currency);
  byId('quote-discount-total').textContent = money(totals.discountTotal, totals.currency);
  byId('quote-total').textContent = money(totals.total, totals.currency);
}

function resetQuote() {
  quoteLines = [];
  byId('quote-patient-search').value = '';
  byId('quote-patient-name').value = '';
  byId('quote-patient-dni').value = '';
  byId('quote-patient-record-id').value = '';
  byId('quote-observations').value = '';
  renderQuoteLines();
}

async function loadCatalog() {
  const { data, error } = await context.client.from('quotation_catalog')
    .select('id,code,provider_code,provider_name,item_type,category_code,category,name,variant,currency,permanent_price,material_or_term,notes,requires_confirmation,active,updated_at')
    .eq('active', true).order('provider_name').order('category').order('name').limit(1000);
  if (error) throw error;
  catalog = data || [];
  fillSelect(byId('quote-provider-filter'), catalog.map((item) => item.provider_name), 'Todas');
  fillSelect(byId('quote-category-filter'), catalog.map((item) => item.category), 'Todas');
  renderCatalogPicker();
}

async function loadRecentQuotes() {
  const list = byId('quotes-recent-list');
  const { data, error } = await context.client.from('quotations').select('*').order('created_at', { ascending: false }).limit(25);
  list.replaceChildren();
  if (error) { const msg = document.createElement('div'); msg.className = 'quote-loading'; msg.textContent = 'No se pudieron cargar las cotizaciones recientes.'; list.appendChild(msg); return; }
  (data || []).forEach((quote) => {
    const card = document.createElement('article'); card.className = 'quote-recent-item';
    const header = document.createElement('header'); const number = document.createElement('strong'); number.textContent = quote.quote_number; const total = document.createElement('strong'); total.textContent = money(quote.total, quote.currency); header.append(number, total);
    const patient = document.createElement('p'); patient.textContent = `${quote.patient_name} · DNI ${quote.patient_dni}`;
    const footer = document.createElement('footer'); const expires = document.createElement('span'); expires.textContent = `Vence ${new Date(quote.expires_at).toLocaleDateString('es-PE')}`; const pdf = document.createElement('button'); pdf.type = 'button'; pdf.textContent = 'Descargar PDF'; pdf.addEventListener('click', () => generateQuotePDF(quote)); footer.append(expires, pdf);
    card.append(header, patient, footer); list.appendChild(card);
  });
  if (!list.childElementCount) { const empty = document.createElement('div'); empty.className = 'quote-loading'; empty.textContent = 'Todavía no hay cotizaciones vigentes.'; list.appendChild(empty); }
}

function currentQuotePayload() {
  const patientName = text(byId('quote-patient-name').value);
  const patientDni = text(byId('quote-patient-dni').value).replace(/\D/g, '');
  if (patientName.length < 2) throw new Error('Ingresa el nombre del paciente.');
  if (!/^\d{8,12}$/.test(patientDni)) throw new Error('Ingresa un DNI o documento de 8 a 12 dígitos.');
  if (!quoteLines.length) throw new Error('Agrega al menos un estudio, procedimiento o consulta.');
  const totals = calculateQuoteTotals(quoteLines);
  const user = context.getCurrentUser();
  return {
    quote_number: quoteNumber(), patient_name: patientName, patient_dni: patientDni,
    source_record_id: text(byId('quote-patient-record-id').value) || null,
    currency: totals.currency, items: quoteLines.map((item) => ({ ...item })),
    subtotal: totals.subtotal, discount_total: totals.discountTotal, total: totals.total,
    observations: text(byId('quote-observations').value).slice(0, 1000),
    adviser_name: text(user?.fullname || user?.username || 'KolyMedical'),
    created_at: new Date().toISOString(), expires_at: quoteExpiresAt(new Date()).toISOString(),
  };
}

async function saveAndDownloadQuote() {
  const button = byId('btn-quote-pdf');
  try {
    const payload = currentQuotePayload();
    setLoading(button, true, 'Preparando PDF…');
    const { data, error } = await context.client.from('quotations').insert(payload).select().single();
    if (error) throw error;
    await generateQuotePDF(data);
    resetQuote();
    await loadRecentQuotes();
  } catch (error) {
    console.error('Cotización:', error);
    alert(error?.message || 'No se pudo preparar la cotización.');
  } finally { setLoading(button, false); }
}

async function generateQuotePDF(quote) {
  if (!window.PDFLib) throw new Error('La herramienta de PDF no está disponible.');
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const primary = rgb(.239, .353, .451), accent = rgb(0, .659, .588), dark = rgb(.16, .2, .23), muted = rgb(.42, .48, .52), lineColor = rgb(.84, .88, .89);
  const size = [595.28, 841.89], margin = 44, width = size[0];
  let page, y;
  const safe = context.pdfSafe;
  const wrap = (value, usedFont, fontSize, maxWidth) => context.wrapText(safe(value), usedFont, fontSize, maxWidth);

  const header = async (continued = false) => {
    page = doc.addPage(size); y = size[1] - 45;
    const logoBytes = await context.getLogoBytes();
    if (logoBytes) { try { const logo = await doc.embedPng(logoBytes); const lw = 205, lh = logo.height / logo.width * lw; page.drawImage(logo, { x: margin, y: size[1] - 35 - lh, width: lw, height: lh }); } catch {} }
    page.drawText(continued ? 'COTIZACION - CONTINUACION' : 'COTIZACION', { x: width - margin - 190, y: size[1] - 54, size: 15, font: bold, color: primary });
    page.drawText(safe(quote.quote_number), { x: width - margin - 190, y: size[1] - 70, size: 9, font, color: muted });
    y = size[1] - 94; page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1.4, color: accent }); y -= 25;
  };

  await header(false);
  const issued = new Date(quote.created_at || Date.now());
  const expires = new Date(quote.expires_at || quoteExpiresAt(issued));
  const fields = [
    ['PACIENTE', quote.patient_name], ['DNI / DOCUMENTO', quote.patient_dni],
    ['FECHA DE EMISION', issued.toLocaleDateString('es-PE')], ['VALIDO HASTA', expires.toLocaleDateString('es-PE')],
  ];
  fields.forEach(([label, value], index) => { const col = index % 2, row = Math.floor(index / 2); const x = margin + col * 255, yy = y - row * 31; page.drawText(label, { x, y: yy, size: 7.5, font: bold, color: muted }); page.drawText(safe(value), { x, y: yy - 13, size: 10, font, color: dark }); });
  y -= 78;

  const drawTableHeader = () => {
    page.drawRectangle({ x: margin, y: y - 18, width: width - margin * 2, height: 22, color: primary });
    [['DESCRIPCION', margin + 7], ['CANT.', 350], ['P. UNIT.', 397], ['DESC.', 456], ['IMPORTE', 505]].forEach(([label, x]) => page.drawText(label, { x, y: y - 11, size: 7, font: bold, color: rgb(1,1,1) })); y -= 27;
  };
  drawTableHeader();
  for (const item of quote.items || []) {
    const descriptionLines = wrap(item.description || item.name || '', font, 8, 286).slice(0, 3);
    const rowHeight = Math.max(26, descriptionLines.length * 11 + 9);
    if (y - rowHeight < 145) { await header(true); drawTableHeader(); }
    descriptionLines.forEach((line, index) => page.drawText(line, { x: margin + 7, y: y - 10 - index * 10, size: 8, font, color: dark }));
    const values = [String(item.quantity || 1), money(item.unitPrice, quote.currency), money(item.discount, quote.currency), money(item.total, quote.currency)];
    [350, 397, 456, 505].forEach((x, index) => page.drawText(safe(values[index]), { x, y: y - 10, size: 7.4, font, color: dark, maxWidth: index === 0 ? 35 : 55 }));
    y -= rowHeight; page.drawLine({ start: { x: margin, y: y + 3 }, end: { x: width - margin, y: y + 3 }, thickness: .45, color: lineColor });
  }

  if (y < 215) await header(true);
  const totalsX = 355;
  [['SUBTOTAL', quote.subtotal], ['DESCUENTO', quote.discount_total], ['TOTAL', quote.total]].forEach(([label, value], index) => { const yy = y - index * 23; page.drawText(label, { x: totalsX, y: yy, size: index === 2 ? 10 : 8, font: bold, color: index === 2 ? primary : muted }); page.drawText(safe(money(value, quote.currency)), { x: 470, y: yy, size: index === 2 ? 11 : 8, font: bold, color: index === 2 ? accent : dark }); });
  y -= 82;
  if (quote.observations) { page.drawText('OBSERVACIONES', { x: margin, y, size: 8, font: bold, color: primary }); y -= 14; wrap(quote.observations, font, 8, width - margin * 2).slice(0, 5).forEach((line) => { page.drawText(line, { x: margin, y, size: 8, font, color: muted }); y -= 11; }); }
  page.drawText(`Asesor(a): ${safe(quote.adviser_name)}`, { x: margin, y: 102, size: 8, font: bold, color: primary });
  const notice = 'Cotizacion informativa valida por 7 dias. No constituye una orden medica.';
  page.drawText(notice, { x: width / 2 - font.widthOfTextAtSize(notice, 7.5) / 2, y: 72, size: 7.5, font, color: muted });
  page.drawLine({ start: { x: margin, y: 60 }, end: { x: width - margin, y: 60 }, thickness: 1, color: accent });
  const footer = 'KolyMedical  |  WhatsApp +51 987 346 934  |  kolymedical.lat';
  page.drawText(footer, { x: width / 2 - font.widthOfTextAtSize(footer, 7.5) / 2, y: 45, size: 7.5, font, color: primary });

  const bytes = await doc.save();
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a'); link.href = url; link.download = `${quote.quote_number}_${text(quote.patient_name).replace(/[^a-z0-9]+/gi, '_')}.pdf`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function loadAdminCatalog() {
  const [itemsResult, costsResult] = await Promise.all([
    context.client.from('quotation_catalog').select('*').order('provider_name').order('category').order('name').limit(1000),
    context.client.from('supplier_costs').select('catalog_item_id,supplier_cost,pricing_factor').limit(1000),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (costsResult.error) throw costsResult.error;
  const costs = new Map((costsResult.data || []).map((item) => [item.catalog_item_id, item]));
  catalogWithCosts = (itemsResult.data || []).map((item) => ({ ...item, ...(costs.get(item.id) || {}) }));
  fillSelect(byId('catalog-admin-provider'), catalogWithCosts.map((item) => item.provider_name), 'Todas las empresas');
  fillSelect(byId('catalog-admin-category'), catalogWithCosts.map((item) => item.category), 'Todas las categorías');
  renderAdminCatalog();
}

function renderAdminCatalog() {
  const body = byId('catalog-admin-body'); if (!body) return;
  const query = text(byId('catalog-admin-search').value).toLocaleLowerCase('es');
  const provider = byId('catalog-admin-provider').value, category = byId('catalog-admin-category').value;
  const filtered = catalogWithCosts.filter((item) => `${item.code} ${item.name} ${item.variant} ${item.provider_name}`.toLocaleLowerCase('es').includes(query) && (!provider || item.provider_name === provider) && (!category || item.category === category));
  byId('catalog-count-badge').textContent = `${filtered.length} conceptos`;
  body.replaceChildren();
  filtered.forEach((item) => {
    const row = body.insertRow();
    row.insertCell().textContent = item.code;
    const providerCell = row.insertCell(); providerCell.textContent = `${item.provider_name} · ${item.category}`;
    const description = row.insertCell(); description.textContent = catalogDescription(item);
    const supplier = row.insertCell(); supplier.className = 'catalog-price'; supplier.textContent = item.supplier_cost == null ? '—' : money(item.supplier_cost, item.currency);
    const price = row.insertCell(); price.className = 'catalog-price'; price.textContent = money(item.permanent_price, item.currency);
    const status = row.insertCell(); status.textContent = item.active ? (item.requires_confirmation ? 'Confirmar vigencia' : 'Activo') : 'Inactivo'; if (item.requires_confirmation) status.className = 'catalog-review';
    const action = row.insertCell(); const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn btn-secondary'; edit.style.padding = '.35rem .55rem'; edit.textContent = 'Editar'; edit.addEventListener('click', () => editCatalogItem(item)); action.appendChild(edit);
  });
}

function editCatalogItem(item) {
  const values = {
    'catalog-item-id': item.id, 'catalog-code': item.code, 'catalog-provider-code': item.provider_code,
    'catalog-provider-name': item.provider_name, 'catalog-item-type': item.item_type,
    'catalog-category-code': item.category_code, 'catalog-category': item.category,
    'catalog-name': item.name, 'catalog-variant': item.variant, 'catalog-currency': item.currency,
    'catalog-supplier-cost': item.supplier_cost ?? '', 'catalog-permanent-price': item.permanent_price,
    'catalog-term': item.material_or_term, 'catalog-notes': item.notes,
  };
  Object.entries(values).forEach(([id, value]) => { byId(id).value = value ?? ''; });
  byId('catalog-requires-confirmation').checked = Boolean(item.requires_confirmation);
  byId('catalog-active').checked = Boolean(item.active);
  byId('catalog-form-title').textContent = `Editar ${item.code}`;
  byId('catalog-code').readOnly = true;
  byId('catalog-admin-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetCatalogForm() {
  byId('catalog-admin-form').reset(); byId('catalog-item-id').value = ''; byId('catalog-active').checked = true; byId('catalog-code').readOnly = false; byId('catalog-form-title').textContent = 'Agregar estudio';
}

async function saveCatalogItem(event) {
  event.preventDefault();
  const id = text(byId('catalog-item-id').value);
  const code = text(byId('catalog-code').value).toUpperCase();
  if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}-\d{3}$/.test(code)) { alert('El código debe tener el formato EMP-CAT-001.'); return; }
  const item = {
    code, provider_code: safeUpper(byId('catalog-provider-code').value), provider_name: text(byId('catalog-provider-name').value),
    item_type: text(byId('catalog-item-type').value), category_code: safeUpper(byId('catalog-category-code').value),
    category: text(byId('catalog-category').value), name: text(byId('catalog-name').value), variant: text(byId('catalog-variant').value),
    currency: byId('catalog-currency').value, permanent_price: Number(byId('catalog-permanent-price').value),
    material_or_term: text(byId('catalog-term').value), notes: text(byId('catalog-notes').value),
    source_label: id ? undefined : 'Ingreso manual del administrador',
    requires_confirmation: byId('catalog-requires-confirmation').checked, active: byId('catalog-active').checked,
  };
  Object.keys(item).forEach((key) => item[key] === undefined && delete item[key]);
  let saved, error;
  if (id) ({ data: saved, error } = await context.client.from('quotation_catalog').update(item).eq('id', id).select().single());
  else ({ data: saved, error } = await context.client.from('quotation_catalog').insert(item).select().single());
  if (error) { console.error(error); alert(error.message || 'No se pudo guardar el concepto.'); return; }
  const supplierValue = text(byId('catalog-supplier-cost').value);
  const supplierCost = supplierValue === '' ? null : Number(supplierValue);
  const costResult = await context.client.from('supplier_costs').upsert({ catalog_item_id: saved.id, supplier_cost: supplierCost, pricing_factor: supplierCost > 0 ? saved.permanent_price / supplierCost : null }, { onConflict: 'catalog_item_id' });
  if (costResult.error) { console.error(costResult.error); alert('El precio se guardó, pero no se pudo actualizar el costo del proveedor.'); return; }
  resetCatalogForm(); await loadAdminCatalog(); await loadCatalog();
}

function bindEvents() {
  document.querySelectorAll('input[name="quote-patient-mode"]').forEach((input) => input.addEventListener('change', applyPatientMode));
  byId('quote-patient-search').addEventListener('input', () => { clearTimeout(patientSearchTimer); patientSearchTimer = setTimeout(searchPatients, 280); });
  ['quote-catalog-search', 'quote-provider-filter', 'quote-category-filter'].forEach((id) => byId(id).addEventListener(id.includes('search') ? 'input' : 'change', renderCatalogPicker));
  byId('btn-quote-reset').addEventListener('click', resetQuote);
  byId('btn-quote-pdf').addEventListener('click', saveAndDownloadQuote);
  ['catalog-admin-search', 'catalog-admin-provider', 'catalog-admin-category'].forEach((id) => byId(id).addEventListener(id.includes('search') ? 'input' : 'change', renderAdminCatalog));
  byId('catalog-admin-form').addEventListener('submit', saveCatalogItem);
  byId('btn-catalog-cancel').addEventListener('click', resetCatalogForm);
}

export async function initializeQuotationModule(nextContext) {
  context = nextContext;
  if (!context?.client) throw new Error('No hay conexión segura disponible para cotizaciones.');
  if (!initialized) { bindEvents(); applyPatientMode(); renderQuoteLines(); initialized = true; }
}

export async function renderQuotes() {
  await Promise.all([loadCatalog(), loadRecentQuotes()]);
}

export async function renderCostCatalog() {
  const role = context.getCurrentUser()?.role;
  if (role !== 'Administrador') throw new Error('Solo el administrador puede modificar precios permanentes.');
  await loadAdminCatalog();
}

