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
  cartSidebar: document.getElementById('cartSidebar'),
  cartSidebarOverlay: document.getElementById('cartSidebarOverlay'),
  cartItemsList: document.getElementById('cartItemsList'),
  cartSidebarTotal: document.getElementById('cartSidebarTotal'),
  closeCartSidebarBtn: document.getElementById('closeCartSidebarBtn'),
  cartBtnProceedCheckout: document.getElementById('cartBtnProceedCheckout'),
  cartBtnClear: document.getElementById('cartBtnClear'),
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
    typeof forceOpen === 'boolean' ? forceOpen : dom.sidebar.classList.contains('-translate-x-full');

  if (shouldOpen) {
    dom.sidebar.classList.remove('-translate-x-full');
    dom.sidebar.classList.add('translate-x-0');
    dom.sidebarOverlay.classList.remove('opacity-0', 'invisible');
    dom.sidebarOverlay.classList.add('opacity-100', 'visible');
  } else {
    dom.sidebar.classList.remove('translate-x-0');
    dom.sidebar.classList.add('-translate-x-full');
    dom.sidebarOverlay.classList.remove('opacity-100', 'visible');
    dom.sidebarOverlay.classList.add('opacity-0', 'invisible');
  }

  dom.sidebar.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
}

function toggleSearch() {
  const isHidden = dom.searchContainer.classList.contains('hidden');
  if (isHidden) {
    dom.searchContainer.classList.remove('hidden');
    dom.searchContainer.classList.add('block');
    dom.searchInput.focus();
  } else {
    dom.searchContainer.classList.remove('block');
    dom.searchContainer.classList.add('hidden');
  }
}

function openLightbox(imageUrl) {
  dom.lightboxImg.src = imageUrl;
  dom.lightboxOverlay.classList.remove('hidden');
  dom.lightboxOverlay.classList.add('flex');
  dom.lightboxOverlay.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  dom.lightboxOverlay.classList.remove('flex');
  dom.lightboxOverlay.classList.add('hidden');
  dom.lightboxOverlay.setAttribute('aria-hidden', 'true');
}

function toggleCartSidebar(forceOpen) {
  const shouldOpen =
    typeof forceOpen === 'boolean' ? forceOpen : dom.cartSidebar.classList.contains('translate-x-full');

  if (shouldOpen) {
    dom.cartSidebar.classList.remove('translate-x-full');
    dom.cartSidebar.classList.add('translate-x-0');
    dom.cartSidebarOverlay.classList.remove('opacity-0', 'invisible');
    dom.cartSidebarOverlay.classList.add('opacity-100', 'visible');
  } else {
    dom.cartSidebar.classList.remove('translate-x-0');
    dom.cartSidebar.classList.add('translate-x-full');
    dom.cartSidebarOverlay.classList.remove('opacity-100', 'visible');
    dom.cartSidebarOverlay.classList.add('opacity-0', 'invisible');
  }

  dom.cartSidebar.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
}

function renderCartItems() {
  if (state.cart.length === 0) {
    dom.cartItemsList.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center text-gray-400">
        <i class="fa-solid fa-basket-shopping text-6xl mb-4 text-gray-200"></i>
        <p class="text-lg font-medium">Tu carrito esta vacio</p>
        <p class="text-sm font-light mt-2">¡Agrega algunos productos hermosos!</p>
      </div>
    `;
    return;
  }

  dom.cartItemsList.innerHTML = state.cart.map(item => {
    const product = state.productMap.get(item.id);
    const imageSrc = product ? product.image : '';
    return `
      <div class="flex items-center gap-4 p-4 border border-floreria-muted rounded-2xl mb-4 hover:border-floreria-rose transition-colors bg-white shadow-sm">
        <div class="w-20 h-24 flex-shrink-0 bg-floreria-cream rounded-xl overflow-hidden shadow-sm">
          <img src="${imageSrc}" alt="${item.name}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-title font-bold text-floreria-dark text-base leading-tight truncate mb-1">${item.name}</h4>
          <div class="text-floreria-rose font-bold text-sm mb-3">${formatMoney(item.price)}</div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 bg-floreria-cream rounded-full px-2 py-1 border border-floreria-muted">
              <button class="w-6 h-6 rounded-full flex items-center justify-center text-floreria-dark hover:bg-white hover:text-floreria-rose transition-colors" data-action="decrease-qty" data-id="${item.id}">-</button>
              <span class="text-sm font-bold w-4 text-center text-floreria-dark">${item.qty}</span>
              <button class="w-6 h-6 rounded-full flex items-center justify-center text-floreria-dark hover:bg-white hover:text-floreria-rose transition-colors" data-action="increase-qty" data-id="${item.id}">+</button>
            </div>
            <button class="text-gray-400 hover:text-red-500 transition-colors" data-action="remove-item" data-id="${item.id}">
              <i class="fa-regular fa-trash-can text-lg"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateCartItemQty(id, delta) {
  const item = state.cart.find(i => i.id === Number(id));
  if (item) {
    const newQty = item.qty + delta;
    if (newQty > 0) {
      item.qty = newQty;
    }
    updateCartUI();
  }
}

function removeCartItem(id) {
  state.cart = state.cart.filter(i => i.id !== Number(id));
  updateCartUI();
}

function updateCartUI() {
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  dom.cartCount.textContent = `${count} items`;
  dom.cartTotal.textContent = formatMoney(total);
  dom.cartSidebarTotal.textContent = formatMoney(total);

  const isVisible = state.cart.length > 0;
  dom.cartBar.classList.toggle('translate-y-0', isVisible);
  dom.cartBar.classList.toggle('translate-y-full', !isVisible);
  dom.wspBtn.classList.toggle('-translate-y-24', isVisible);

  if (!isVisible) {
    toggleCartSidebar(false);
  }

  renderCartItems();
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

  dom.catalogContainer.querySelectorAll('.subcategory-shell').forEach((subcat) => {
    const hasVisible = Array.from(subcat.querySelectorAll('.prod-card')).some(card => card.style.display !== 'none');
    subcat.style.display = hasVisible ? '' : 'none';
  });

  dom.catalogContainer.querySelectorAll('.macro-section').forEach((macro) => {
    const hasVisible = Array.from(macro.querySelectorAll('.subcategory-shell')).some(subcat => subcat.style.display !== 'none');
    macro.style.display = hasVisible ? '' : 'none';
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
  const badge = options.badge || '';
  const delay = Math.min((options.index || 0) * 55, 380);

  return `
    <article class="prod-card opacity-0 translate-y-6 animate-[fadeUp_0.8s_cubic-bezier(0.2,0.8,0.2,1)_forwards] flex flex-col group cursor-pointer" data-search="${searchTerms}" style="animation-delay: ${delay}ms;">
      <div class="prod-image-wrap relative w-full aspect-[3/4] overflow-hidden rounded-2xl bg-floreria-muted shadow-sm mb-4">
        <img src="${product.image}" class="prod-img w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105" alt="${product.name}" loading="lazy" data-action="open-lightbox" data-img="${product.image}">
        ${badge ? `<span class="product-pill absolute top-4 left-4 inline-block px-3 py-1 bg-white/90 backdrop-blur-sm text-floreria-dark text-xs font-bold tracking-widest uppercase rounded-full shadow-sm z-10">${badge}</span>` : ''}
      </div>
      <div class="prod-meta flex flex-col gap-1 px-1">
        <div class="prod-name font-title font-semibold text-lg text-floreria-dark leading-snug">${product.name}</div>
        <div class="prod-price-row flex justify-between items-center mt-1">
          <span class="prod-price text-floreria-dark font-medium text-base">${formatMoney(product.price)}</span>
          <button type="button" class="btn-add-minimal inline-flex items-center gap-1.5 bg-white text-floreria-dark border border-floreria-muted px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 group-hover:bg-floreria-rose group-hover:text-white group-hover:border-floreria-rose shadow-sm group-hover:shadow-md" data-action="add-product" data-product-id="${product.id}">
            <i class="fa-solid fa-plus text-[10px]"></i> Añadir
          </button>
        </div>
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

  const badges = ['Recomendado', 'Top ventas', 'Nuevo', 'Popular', 'Destacado'];

  state.macroCategories.forEach((macro) => {
    const macroSlug = `macro-${macro.slug}`;

    menuHTML += `<a class="sidebar-macro-label block py-2 px-6 mt-4 font-title text-floreria-dark font-bold text-lg" href="#${macroSlug}">${macro.name}</a>`;

    const subcategoryHTML = macro.subcategories
      .map((subcategory) => {
        const products = Array.isArray(subcategory.products) ? subcategory.products : [];
        if (products.length === 0) {
          return '';
        }

        menuHTML += `<a class="sidebar-sub-link block py-2.5 px-6 ml-4 text-floreria-dark/80 hover:text-floreria-rose hover:bg-floreria-cream transition-colors text-sm" href="#${subcategory.slug}">${subcategory.name}</a>`;

        const allCards = products
          .map((product, productIndex) => {
            state.productMap.set(product.id, product);
            const searchTerms = `${product.name.toLowerCase()} ${String(product.price)} ${subcategory.name.toLowerCase()} ${macro.name.toLowerCase()}`;

            return buildProductCard(product, searchTerms, {
              badge: badges[productIndex % badges.length],
              index: categoryVisualIndex * 3 + productIndex
            });
          })
          .join('');

        const rendered = `
          <section class="subcategory-shell opacity-0 translate-y-6 animate-[fadeUp_0.8s_cubic-bezier(0.2,0.8,0.2,1)_forwards] mb-24" id="${subcategory.slug}" style="animation-delay:${Math.min(categoryVisualIndex * 80, 400)}ms;">
            <div class="cat-highlight relative w-full rounded-3xl overflow-hidden mb-12 aspect-[21/9] md:aspect-[24/7] bg-floreria-dark group">
              <img src="${subcategory.image}" alt="${subcategory.name}" loading="lazy" class="w-full h-full object-cover opacity-60 transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105 group-hover:opacity-50">
              <div class="cat-highlight-overlay absolute inset-0 flex flex-col justify-center items-center text-center p-8 bg-gradient-to-t from-black/80 via-transparent to-black/20 text-white">
                <span class="cat-kicker text-floreria-rose font-bold text-xs tracking-[0.2em] uppercase mb-3 drop-shadow-md">${macro.name}</span>
                <h2 class="font-title text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">${subcategory.name}</h2>
                <p class="max-w-2xl text-white/90 font-light text-base md:text-lg drop-shadow">${subcategory.description}</p>
              </div>
            </div>
            <div class="prod-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-x-8 md:gap-y-12">
              ${allCards}
            </div>
          </section>
        `;

        categoryVisualIndex += 1;
        return rendered;
      })
      .join('');

    catalogHTML += `
      <section class="macro-section mb-32" id="${macroSlug}">
        <div class="macro-header opacity-0 translate-y-6 animate-[fadeUp_0.8s_cubic-bezier(0.2,0.8,0.2,1)_forwards] mb-12 border-b border-floreria-muted pb-6" style="animation-delay:${Math.min(categoryVisualIndex * 60, 300)}ms;">
          <h2 class="font-title text-4xl md:text-5xl text-floreria-dark font-bold mb-3">${macro.name}</h2>
          <p class="text-floreria-dark/60 font-light text-lg tracking-wide uppercase">${macro.description || 'Seleccion de subcategorias para esta linea.'}</p>
        </div>
        ${subcategoryHTML}
      </section>
    `;
  });

  if (!catalogHTML) {
    catalogHTML = '<div class="loading-box">No hay categorias disponibles.</div>';
  }

  menuHTML += '<a class="sidebar-macro-label block py-2 px-6 mt-4 font-title text-floreria-dark font-bold text-lg" href="#budget-lab">Creador por presupuesto</a>';
  menuHTML += '<a class="sidebar-macro-label block py-2 px-6 mt-4 font-title text-floreria-dark font-bold text-lg" href="#arma-pedido">Arma tu pedido</a>';
  menuHTML += '<a class="sidebar-macro-label block py-2 px-6 mt-4 font-title text-floreria-dark font-bold text-lg" href="#visitanos">Visítanos</a>';

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
    html += `
      <article class="reco-card bg-floreria-cream p-6 md:p-8 rounded-2xl border border-floreria-muted hover:border-floreria-rose transition-all flex flex-col justify-between group">
        <div>
          <div class="reco-head flex justify-between items-start mb-4">
            <h3 class="reco-title font-title text-xl md:text-2xl text-floreria-dark font-bold leading-tight flex-1 pr-4">${recommendation.title}</h3>
            <div class="reco-price text-floreria-rose font-bold text-xl">${formatMoney(recommendation.subtotal)}</div>
          </div>
          <p class="reco-reason text-floreria-dark/70 font-light text-sm italic mb-6">"${recommendation.reason}"</p>
          <ul class="reco-items space-y-2 mb-8 border-t border-floreria-muted pt-6">
            ${recommendation.items.map((item) => `
              <li class="flex justify-between items-center text-sm font-light text-floreria-dark">
                <span><span class="font-bold text-floreria-rose mr-1">${item.qty}x</span> ${item.name}</span>
                <span class="text-floreria-dark/60">${formatMoney(item.lineTotal)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <button type="button" class="btn-add w-full py-4 bg-white border-2 border-floreria-rose text-floreria-rose rounded-xl font-bold text-sm tracking-wider uppercase group-hover:bg-floreria-rose group-hover:text-white transition-colors" data-action="add-recommendation" data-reco-id="${recommendation.id}">Añadir combo al carrito</button>
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

  toggleCartSidebar(false);
  setOrderStatus('', '');
  dom.orderModal.classList.remove('hidden');
  dom.orderModal.classList.add('flex');
  dom.orderModal.setAttribute('aria-hidden', 'false');
}

function closeOrderModal() {
  dom.orderModal.classList.remove('flex');
  dom.orderModal.classList.add('hidden');
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

  dom.openCheckoutBtn.addEventListener('click', () => toggleCartSidebar(true));
  dom.closeCartSidebarBtn.addEventListener('click', () => toggleCartSidebar(false));
  dom.cartSidebarOverlay.addEventListener('click', () => toggleCartSidebar(false));
  dom.cartBtnProceedCheckout.addEventListener('click', openOrderModal);
  dom.cartBtnClear.addEventListener('click', clearCart);

  dom.cartItemsList.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');

    if (action === 'increase-qty') {
      updateCartItemQty(id, 1);
    } else if (action === 'decrease-qty') {
      updateCartItemQty(id, -1);
    } else if (action === 'remove-item') {
      removeCartItem(id);
    }
  });

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
    toggleCartSidebar(false);
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
