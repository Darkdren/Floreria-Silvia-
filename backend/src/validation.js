function isNonEmptyString(value, minLength) {
  return typeof value === 'string' && value.trim().length >= minLength;
}

function normalizePhone(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .trim();
}

function validateOrderPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      errors: ['Payload invalido.']
    };
  }

  const customerName = String(payload.customerName || '').trim();
  const phone = normalizePhone(payload.phone);
  const deliveryDate = String(payload.deliveryDate || '').trim();
  const district = String(payload.district || '').trim();
  const address = String(payload.address || '').trim();
  const note = String(payload.note || '').trim();
  const source = String(payload.source || 'web').trim();
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!isNonEmptyString(customerName, 2)) {
    errors.push('customerName es obligatorio.');
  }

  if (!/^\+?[0-9]{7,15}$/.test(phone)) {
    errors.push('phone tiene formato invalido.');
  }

  const dateValue = new Date(deliveryDate);
  if (!deliveryDate || Number.isNaN(dateValue.getTime())) {
    errors.push('deliveryDate es invalida.');
  }

  if (!isNonEmptyString(district, 2)) {
    errors.push('district es obligatorio.');
  }

  if (!isNonEmptyString(address, 5)) {
    errors.push('address es obligatorio.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items debe contener al menos un producto.');
  }

  const normalizedItems = [];
  const itemErrors = [];

  items.forEach((item, index) => {
    const productId = Number(item && item.productId);
    const qty = Number(item && item.qty);

    if (!Number.isInteger(productId) || productId <= 0) {
      itemErrors.push(`items[${index}].productId es invalido.`);
      return;
    }

    if (!Number.isInteger(qty) || qty <= 0 || qty > 50) {
      itemErrors.push(`items[${index}].qty es invalido.`);
      return;
    }

    normalizedItems.push({ productId, qty });
  });

  errors.push(...itemErrors);

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      customerName,
      phone,
      deliveryDate,
      district,
      address,
      note,
      source,
      items: normalizedItems
    }
  };
}

module.exports = {
  validateOrderPayload
};
