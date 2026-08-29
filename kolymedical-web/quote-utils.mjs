const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function calculateQuoteLine(input = {}) {
  const quantity = Math.max(1, Math.min(99, Number.parseInt(input.quantity, 10) || 1));
  const unitPrice = Math.max(0, roundMoney(input.unitPrice || 0));
  const subtotal = roundMoney(quantity * unitPrice);
  const discount = Math.max(0, Math.min(subtotal, roundMoney(input.discount || 0)));
  return { quantity, unitPrice, discount, subtotal, total: roundMoney(subtotal - discount) };
}

export function calculateQuoteTotals(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { currency: 'PEN', subtotal: 0, discountTotal: 0, total: 0 };
  }

  const currencies = new Set(items.map((item) => String(item.currency || 'PEN').toUpperCase()));
  if (currencies.size !== 1) throw new Error('Todos los conceptos deben usar la misma moneda.');

  return items.reduce((totals, item) => {
    const line = calculateQuoteLine(item);
    totals.subtotal = roundMoney(totals.subtotal + line.subtotal);
    totals.discountTotal = roundMoney(totals.discountTotal + line.discount);
    totals.total = roundMoney(totals.total + line.total);
    return totals;
  }, { currency: [...currencies][0], subtotal: 0, discountTotal: 0, total: 0 });
}

export function createQuoteSnapshot(catalogItem, overrides = {}) {
  const source = catalogItem || {};
  const line = calculateQuoteLine({
    quantity: overrides.quantity,
    unitPrice: overrides.unitPrice ?? source.permanent_price,
    discount: overrides.discount,
  });

  return Object.freeze({
    catalogItemId: source.id || null,
    code: String(source.code || ''),
    description: String(overrides.description || source.name || ''),
    providerName: String(source.provider_name || ''),
    currency: String(source.currency || 'PEN').toUpperCase(),
    ...line,
  });
}

export function quoteExpiresAt(createdAt = new Date()) {
  const expires = new Date(createdAt);
  expires.setUTCDate(expires.getUTCDate() + 7);
  return expires;
}

