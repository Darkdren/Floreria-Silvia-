const OCCASION_REASON = {
  aniversario: 'Seleccion orientada a un detalle romantico y elegante.',
  cumpleanos: 'Combinacion alegre para celebrar una fecha especial.',
  agradecimiento: 'Arreglo equilibrado para expresar gratitud.',
  sorpresa: 'Mix versatil para sorprender con buen impacto visual.'
};

function buildRecommendations(products, budget, occasion) {
  const safeBudget = Number(budget);
  if (!Number.isFinite(safeBudget) || safeBudget <= 0) {
    return [];
  }

  const sortedProducts = [...products]
    .filter((product) => product.active)
    .sort((a, b) => a.price - b.price);

  if (sortedProducts.length === 0) {
    return [];
  }

  const candidates = [];
  const minValue = safeBudget * 0.55;

  for (let i = 0; i < sortedProducts.length; i += 1) {
    const single = sortedProducts[i];
    if (single.price <= safeBudget) {
      candidates.push({
        items: [{ product: single, qty: 1 }],
        subtotal: single.price
      });
    }

    for (let j = i + 1; j < sortedProducts.length; j += 1) {
      const first = sortedProducts[i];
      const second = sortedProducts[j];
      const subtotal = first.price + second.price;
      if (subtotal > safeBudget) {
        break;
      }

      if (subtotal >= minValue) {
        candidates.push({
          items: [
            { product: first, qty: 1 },
            { product: second, qty: 1 }
          ],
          subtotal
        });
      }
    }
  }

  if (candidates.length === 0) {
    const cheapest = sortedProducts[0];
    if (!cheapest || cheapest.price > safeBudget) {
      return [];
    }

    return [
      {
        id: 'combo-1',
        title: 'Combo inicial',
        reason: OCCASION_REASON[occasion] || OCCASION_REASON.sorpresa,
        subtotal: cheapest.price,
        items: [
          {
            productId: cheapest.id,
            name: cheapest.name,
            qty: 1,
            unitPrice: cheapest.price,
            lineTotal: cheapest.price,
            category: cheapest.category,
            image: cheapest.image
          }
        ]
      }
    ];
  }

  candidates.sort((a, b) => {
    const diffA = Math.abs(safeBudget - a.subtotal);
    const diffB = Math.abs(safeBudget - b.subtotal);
    if (diffA !== diffB) {
      return diffA - diffB;
    }

    if (b.items.length !== a.items.length) {
      return b.items.length - a.items.length;
    }

    return b.subtotal - a.subtotal;
  });

  const selected = [];
  const signatures = new Set();

  for (let index = 0; index < candidates.length && selected.length < 3; index += 1) {
    const candidate = candidates[index];
    const signature = candidate.items
      .map((entry) => entry.product.id)
      .sort((a, b) => a - b)
      .join('-');

    if (signatures.has(signature)) {
      continue;
    }

    signatures.add(signature);
    selected.push(candidate);
  }

  const reason = OCCASION_REASON[occasion] || OCCASION_REASON.sorpresa;

  return selected.map((candidate, index) => {
    const title = `Combo sugerido ${index + 1}`;
    const items = candidate.items.map((entry) => {
      const lineTotal = entry.product.price * entry.qty;
      return {
        productId: entry.product.id,
        name: entry.product.name,
        qty: entry.qty,
        unitPrice: entry.product.price,
        lineTotal,
        category: entry.product.category,
        image: entry.product.image
      };
    });

    return {
      id: `combo-${index + 1}`,
      title,
      reason,
      subtotal: Number(candidate.subtotal.toFixed(2)),
      items
    };
  });
}

module.exports = {
  buildRecommendations
};


