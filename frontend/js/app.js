const WHATSAPP_PHONE = '51936625197';

const state = {
  macroCategories: [],
  productMap: new Map(),
  cart: [],
  recommendations: new Map()
};

let catalogObserver = null;

const dom = {
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  sidebarMenuContent: document.getElementById('sidebarMenuContent'),
  openSidebarBtn: document.getElementById('openSidebarBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  searchToggleBtn: document.getElementById('searchToggleBtn'),
  searchContainer: document.getElementById('searchContainer'),
  searchInput: document.getElementById('searchInput'),
  catalogContainer: document.getElementById('catalogContainer'),
  recommendationsList: document.getElementById('recommendationsList'),
  budgetSelect: document.getElementById('budgetSelect'),
  occasionSelect: document.getElementById('occasionSelect'),
  getRecommendationsBtn: document.getElementById('getRecommendationsBtn'),
  customOrderWspBtn: document.getElementById('customOrderWspBtn'),
  wspBtn: document.getElementById('wspBtn'),
  lightboxOverlay: document.getElementById('lightboxOverlay'),
  lightboxImg: document.getElementById('lightboxImg'),
  lightboxClose: document.getElementById('lightboxClose'),
  cartBar: document.getElementById('cartBar'),
  cartCount: document.getElementById('cartCount'),
  cartTotal: document.getElementById('cartTotal'),
  openCheckoutBtn: document.getElementById('openCheckoutBtn'),
  orderModal: document.getElementById('orderModal'),
  closeOrderModalBtn: document.getElementById('closeOrderModalBtn'),
  cancelOrderBtn: document.getElementById('cancelOrderBtn'),
  orderForm: document.getElementById('orderForm'),
  orderStatus: document.getElementById('orderStatus'),
  submitOrderBtn: document.getElementById('submitOrderBtn')
};

function formatMoney(value) {
  return `S/ ${Number(value).toFixed(2)}`;
}

function getTodayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function setOrderStatus(message, kind) {
  dom.orderStatus.textContent = message || '';
  dom.orderStatus.classList.remove('error', 'success');

  if (kind) {
    dom.orderStatus.classList.add(kind);
  }
}

function toggleSidebar(forceOpen) {
  const shouldOpen =
    typeof forceOpen === 'boolean' ? forceOpen : !dom.sidebar.classList.contains('active');

  dom.sidebar.classList.toggle('active', shouldOpen);
  dom.sidebarOverlay.classList.toggle('active', shouldOpen);
  dom.sidebar.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
}

function toggleSearch() {
  const isActive = dom.searchContainer.classList.toggle('active');
  if (isActive) {
    dom.searchInput.focus();
  }
}

function openLightbox(imageUrl) {
  dom.lightboxImg.src = imageUrl;
  dom.lightboxOverlay.classList.add('active');
  dom.lightboxOverlay.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  dom.lightboxOverlay.classList.remove('active');
  dom.lightboxOverlay.setAttribute('aria-hidden', 'true');
}

function updateCartUI() {
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  dom.cartCount.textContent = `${count} items`;
  dom.cartTotal.textContent = formatMoney(total);

  const isVisible = state.cart.length > 0;
  dom.cartBar.classList.toggle('visible', isVisible);
  dom.wspBtn.classList.toggle('shift-up', isVisible);
}

function addProductToCart(productId, qty) {
  const product = state.productMap.get(Number(productId));
  if (!product) {
    return;
  }

  const quantity = Number(qty) || 1;
  const existing = state.cart.find((item) => item.id === product.id);

  if (existing) {
    existing.qty += quantity;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: quantity
    });
  }

  updateCartUI();
}

function clearCart() {
  state.cart = [];
  updateCartUI();
}

function filterProducts() {
  const term = dom.searchInput.value.toLowerCase().trim();

  dom.catalogContainer.querySelectorAll('.prod-card').forEach((card) => {
    const searchSource = card.getAttribute('data-search') || '';
    const matches = term.length === 0 || searchSource.includes(term);
    card.style.display = matches ? '' : 'none';
  });
}

function normalizeMacroCategories(payload) {
  if (Array.isArray(payload.macroCategories) && payload.macroCategories.length > 0) {
    return payload.macroCategories;
  }

  if (Array.isArray(payload.categories) && payload.categories.length > 0) {
    return [
      {
        id: 0,
        slug: 'catalogo-general',
        name: 'Catalogo General',
        description: 'Catalogo sin agrupacion por macrocategoria.',
        subcategories: payload.categories
      }
    ];
  }

  return [];
}

function buildProductCard(product, searchTerms, options) {
  const featured = Boolean(options && options.featured);
  const cardClass = featured ? 'prod-card prod-featured reveal-up' : 'prod-card prod-compact reveal-up';
  const badge = featured ? 'Recomendado' : options.badge;
  const delay = Math.min((options.index || 0) * 70, 560);

  return `
    <article class="${cardClass}" data-search="${searchTerms}" style="--reveal-delay: ${delay}ms;">
      <div class="prod-image-wrap">
        <img src="${product.image}" class="prod-img" alt="${product.name}" loading="lazy" data-action="open-lightbox" data-img="${product.image}">
        <span class="product-pill">${badge}</span>
      </div>
      <div class="prod-meta">
        <div class="prod-name">${product.name}</div>
        <div class="prod-price">${formatMoney(product.price)}</div>
      </div>
      <div class="card-controls">
        <button type="button" class="btn-add" data-action="add-product" data-product-id="${product.id}">Anadir al carrito</button>
      </div>
    </article>
  `;
}

function initCatalogObserver() {
  if (catalogObserver) {
    catalogObserver.disconnect();
  }

  const targets = dom.catalogContainer.querySelectorAll('.reveal-up');
  if (targets.length === 0) {
    return;
  }

  catalogObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -5% 0px'
    }
  );

  targets.forEach((element) => {
    catalogObserver.observe(element);
  });
}

function renderCatalog() {
  let menuHTML = '';
  let catalogHTML = '';
  let categoryVisualIndex = 0;

  state.productMap = new Map();

  state.macroCategories.forEach((macro) => {
    const macroSlug = `macro-${macro.slug}`;

    menuHTML += `<a class="sidebar-macro-label" href="#${macroSlug}">${macro.name}</a>`;

    const subcategoryHTML = macro.subcategories
      .map((subcategory) => {
        const products = Array.isArray(subcategory.products) ? subcategory.products : [];
        if (products.length === 0) {
          return '';
        }

        const featuredProduct = products[0];
        const compactProducts = products.slice(1);
        const layoutClass = categoryVisualIndex % 2 === 0 ? 'mosaic-left' : 'mosaic-right';

        menuHTML += `<a class="sidebar-sub-link" href="#${subcategory.slug}">${subcategory.name}</a>`;

        const featuredSearch = `${featuredProduct.name.toLowerCase()} ${String(featuredProduct.price)} ${subcategory.name.toLowerCase()} ${macro.name.toLowerCase()}`;
        state.productMap.set(featuredProduct.id, featuredProduct);

        const featuredCard = buildProductCard(featuredProduct, featuredSearch, {
          featured: true,
          badge: 'Recomendado',
          index: categoryVisualIndex * 2
        });

        const compactCards = compactProducts
          .map((product, productIndex) => {
            state.productMap.set(product.id, product);
            const searchTerms = `${product.name.toLowerCase()} ${String(product.price)} ${subcategory.name.toLowerCase()} ${macro.name.toLowerCase()}`;

            return buildProductCard(product, searchTerms, {
              featured: false,
              badge: productIndex % 2 === 0 ? 'Top ventas' : 'Nuevo',
              index: categoryVisualIndex * 2 + productIndex + 1
            });
          })
          .join('');

        const rendered = `
          <section class="cat-section subcategory-shell ${layoutClass} reveal-up" id="${subcategory.slug}" style="--reveal-delay:${Math.min(categoryVisualIndex * 110, 600)}ms;">
            <div class="cat-highlight">
              <img src="${subcategory.image}" alt="${subcategory.name}" loading="lazy">
              <div class="cat-highlight-overlay">
                <span class="cat-kicker">${macro.name}</span>
                <h2>${subcategory.name}</h2>
                <p>${subcategory.description}</p>
              </div>
            </div>

            <div class="product-mosaic ${layoutClass}">
              ${featuredCard}
              <div class="prod-grid">
                ${compactCards}
              </div>
            </div>
          </section>
        `;

        categoryVisualIndex += 1;
        return rendered;
      })
      .join('');

    catalogHTML += `
      <section class="macro-section" id="${macroSlug}">
        <div class="macro-header reveal-up" style="--reveal-delay:${Math.min(categoryVisualIndex * 80, 420)}ms;">
          <h2>${macro.name}</h2>
          <p>${macro.description || 'Seleccion de subcategorias para esta linea.'}</p>
        </div>
        ${subcategoryHTML}
      </section>
    `;
  });

  if (!catalogHTML) {
    catalogHTML = '<div class="loading-box">No hay categorias disponibles.</div>';
  }

  menuHTML += '<a href="#budget-lab">Creador por presupuesto</a>';
  menuHTML += '<a href="#arma-pedido">Arma tu pedido</a>';
  menuHTML += '<a href="#visitanos">Visitanos</a>';

  dom.sidebarMenuContent.innerHTML = menuHTML;
  dom.catalogContainer.innerHTML = catalogHTML;

  initCatalogObserver();
}

function renderRecommendations(recommendations) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    dom.recommendationsList.innerHTML =
      '<div class="loading-box">No encontramos combinaciones para ese monto.</div>';
    return;
  }

  let html = '';

  recommendations.forEach((recommendation) => {
    const itemsHTML = recommendation.items
      .map((item) => `<li>${item.qty}x ${item.name} (${formatMoney(item.lineTotal)})</li>`)
      .join('');

    html += `
      <article class="reco-card">
        <div class="reco-head">
          <h3 class="reco-title">${recommendation.title}</h3>
          <div class="reco-price">${formatMoney(recommendation.subtotal)}</div>
        </div>
        <p class="reco-reason">${recommendation.reason}</p>
        <ul class="reco-items">${itemsHTML}</ul>
        <button type="button" class="btn-add" data-action="add-recommendation" data-reco-id="${recommendation.id}">Agregar combo</button>
      </article>
    `;

    state.recommendations.set(recommendation.id, recommendation);
  });

  dom.recommendationsList.innerHTML = html;
}

async function apiGet(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'No fue posible completar la solicitud.');
  }

  return data;
}

async function apiPost(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    const detailText = Array.isArray(data.details) ? data.details.join(' ') : '';
    const message = detailText || data.error || 'No fue posible guardar el pedido.';
    throw new Error(message);
  }

  return data;
}

async function loadCatalog() {
  dom.catalogContainer.innerHTML = '<div class="loading-box">Cargando catalogo...</div>';

  const data = await apiGet('/api/catalog');
  state.macroCategories = normalizeMacroCategories(data);

  renderCatalog();
}

async function loadRecommendations() {
  state.recommendations = new Map();
  dom.recommendationsList.innerHTML = '<div class="loading-box">Buscando combinaciones...</div>';

  const budget = Number(dom.budgetSelect.value);
  const occasion = dom.occasionSelect.value;

  const data = await apiGet(
    `/api/recommendations?budget=${encodeURIComponent(budget)}&occasion=${encodeURIComponent(occasion)}`
  );

  renderRecommendations(data.recommendations);
}

function openOrderModal() {
  if (state.cart.length === 0) {
    return;
  }

  setOrderStatus('', '');
  dom.orderModal.classList.add('active');
  dom.orderModal.setAttribute('aria-hidden', 'false');
}

function closeOrderModal() {
  dom.orderModal.classList.remove('active');
  dom.orderModal.setAttribute('aria-hidden', 'true');
}

async function submitOrder(event) {
  event.preventDefault();

  if (state.cart.length === 0) {
    setOrderStatus('Tu carrito esta vacio.', 'error');
    return;
  }

  setOrderStatus('Guardando pedido...', '');
  dom.submitOrderBtn.disabled = true;

  const formData = new FormData(dom.orderForm);

  const payload = {
    customerName: String(formData.get('customerName') || '').trim(),
    phone: String(formData.get('phone') || '').trim(),
    deliveryDate: String(formData.get('deliveryDate') || '').trim(),
    district: String(formData.get('district') || '').trim(),
    address: String(formData.get('address') || '').trim(),
    note: String(formData.get('note') || '').trim(),
    source: 'web',
    items: state.cart.map((item) => ({
      productId: item.id,
      qty: item.qty
    }))
  };

  try {
    const response = await apiPost('/api/orders', payload);

    setOrderStatus(`Pedido #${response.orderId} registrado. Redirigiendo a WhatsApp...`, 'success');

    window.open(response.whatsappUrl, '_blank', 'noopener');

    clearCart();
    dom.orderForm.reset();

    setTimeout(() => {
      closeOrderModal();
      setOrderStatus('', '');
    }, 400);
  } catch (error) {
    setOrderStatus(error.message, 'error');
  } finally {
    dom.submitOrderBtn.disabled = false;
  }
}

function handleCatalogClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) {
    return;
  }

  const action = actionElement.getAttribute('data-action');

  if (action === 'add-product') {
    addProductToCart(actionElement.getAttribute('data-product-id'), 1);
    return;
  }

  if (action === 'open-lightbox') {
    openLightbox(actionElement.getAttribute('data-img'));
  }
}

function handleRecommendationClick(event) {
  const button = event.target.closest('[data-action="add-recommendation"]');
  if (!button) {
    return;
  }

  const recommendationId = button.getAttribute('data-reco-id');
  const recommendation = state.recommendations.get(recommendationId);
  if (!recommendation) {
    return;
  }

  recommendation.items.forEach((item) => {
    addProductToCart(item.productId, item.qty);
  });
}

function sendWspMessage(message) {
  const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

function initObserver() {
  const animElement = document.getElementById('stepsAnim');
  if (!animElement) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const steps = document.querySelectorAll('.step-card');
        const arrows = document.querySelectorAll('.step-arrow');

        steps.forEach((step, index) => {
          setTimeout(() => step.classList.add('visible'), index * 220);
        });

        arrows.forEach((arrow, index) => {
          setTimeout(() => arrow.classList.add('visible'), index * 220 + 110);
        });

        observer.disconnect();
      });
    },
    { threshold: 0.25 }
  );

  observer.observe(animElement);
}

function bindEvents() {
  dom.openSidebarBtn.addEventListener('click', () => toggleSidebar(true));
  dom.closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
  dom.sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

  dom.searchToggleBtn.addEventListener('click', toggleSearch);
  dom.searchInput.addEventListener('input', filterProducts);

  dom.sidebarMenuContent.addEventListener('click', (event) => {
    if (event.target.tagName === 'A') {
      toggleSidebar(false);
    }
  });

  dom.catalogContainer.addEventListener('click', handleCatalogClick);
  dom.recommendationsList.addEventListener('click', handleRecommendationClick);

  dom.getRecommendationsBtn.addEventListener('click', async () => {
    try {
      await loadRecommendations();
    } catch (error) {
      dom.recommendationsList.innerHTML = `<div class="loading-box">${error.message}</div>`;
    }
  });

  dom.openCheckoutBtn.addEventListener('click', openOrderModal);
  dom.closeOrderModalBtn.addEventListener('click', closeOrderModal);
  dom.cancelOrderBtn.addEventListener('click', closeOrderModal);
  dom.orderForm.addEventListener('submit', submitOrder);

  dom.orderModal.addEventListener('click', (event) => {
    if (event.target === dom.orderModal) {
      closeOrderModal();
    }
  });

  dom.lightboxClose.addEventListener('click', closeLightbox);
  dom.lightboxOverlay.addEventListener('click', (event) => {
    if (event.target === dom.lightboxOverlay) {
      closeLightbox();
    }
  });

  dom.customOrderWspBtn.addEventListener('click', () => {
    sendWspMessage(
      'Hola Floreria Silvia, quiero enviarles un ejemplo para armar mi arreglo personalizado.'
    );
  });

  dom.wspBtn.addEventListener('click', (event) => {
    event.preventDefault();
    sendWspMessage('Hola Floreria Silvia, deseo informacion general sobre sus productos.');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    toggleSidebar(false);
    closeLightbox();
    closeOrderModal();
  });
}

async function init() {
  bindEvents();
  updateCartUI();

  const deliveryDateInput = document.getElementById('deliveryDate');
  deliveryDateInput.min = getTodayISODate();

  try {
    await loadCatalog();
  } catch (error) {
    dom.catalogContainer.innerHTML = `<div class="loading-box">${error.message}</div>`;
    return;
  }

  try {
    await loadRecommendations();
  } catch (error) {
    dom.recommendationsList.innerHTML = `<div class="loading-box">${error.message}</div>`;
  }

  initObserver();
}

document.addEventListener('DOMContentLoaded', init);
