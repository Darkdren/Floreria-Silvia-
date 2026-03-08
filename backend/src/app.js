const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { buildRecommendations } = require('./recommendations');
const { validateOrderPayload } = require('./validation');

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

function normalizeItems(items) {
  const grouped = new Map();

  items.forEach((item) => {
    const currentQty = grouped.get(item.productId) || 0;
    grouped.set(item.productId, currentQty + item.qty);
  });

  return Array.from(grouped.entries()).map(([productId, qty]) => ({
    productId,
    qty
  }));
}

function buildWhatsappMessage(orderId, payload, items, total) {
  const lines = [];
  lines.push(`Hola Floreria Silvia, deseo confirmar mi pedido #${orderId}.`);
  lines.push('');
  lines.push(`Cliente: ${payload.customerName}`);
  lines.push(`Telefono: ${payload.phone}`);
  lines.push(`Entrega: ${payload.deliveryDate}`);
  lines.push(`Distrito: ${payload.district}`);
  lines.push(`Direccion: ${payload.address}`);

  if (payload.note) {
    lines.push(`Dedicatoria: ${payload.note}`);
  }

  lines.push('');
  lines.push('Detalle:');

  items.forEach((item) => {
    lines.push(`- ${item.qty}x ${item.name} (S/ ${toMoney(item.lineTotal).toFixed(2)})`);
  });

  lines.push('');
  lines.push(`Total: S/ ${toMoney(total).toFixed(2)}`);

  return lines.join('\n');
}

function createCorsOptions(allowedOrigins) {
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    }
  };
}

function createApp({ db, config }) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );
  app.use(cors(createCorsOptions(config.allowedOrigins)));
  app.use(express.json({ limit: '250kb' }));

  const orderLimiter = rateLimit({
    windowMs: config.orderRateLimitWindowMs,
    max: config.orderRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many order attempts. Please try again later.'
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'floreria-api'
    });
  });

  app.get('/api/catalog', async (req, res, next) => {
    try {
      const macroRows = await db.all(
        `SELECT id, slug, name, description, active
         FROM macro_categories
         WHERE active = 1
         ORDER BY id ASC`
      );

      const categoryRows = await db.all(
        `SELECT c.id,
                c.slug,
                c.name,
                c.description,
                c.image,
                c.active,
                c.macro_category_id AS macroCategoryId,
                m.slug AS macroSlug,
                m.name AS macroName
         FROM categories c
         LEFT JOIN macro_categories m ON m.id = c.macro_category_id
         WHERE c.active = 1
         ORDER BY COALESCE(m.id, 99999), c.id ASC`
      );

      const productRows = await db.all(
        `SELECT p.id,
                p.sku,
                p.name,
                p.price,
                p.image,
                p.active,
                c.id AS categoryId,
                c.slug AS categorySlug,
                c.name AS categoryName,
                c.macro_category_id AS macroCategoryId,
                m.slug AS macroSlug,
                m.name AS macroName
         FROM products p
         INNER JOIN categories c ON c.id = p.category_id
         LEFT JOIN macro_categories m ON m.id = c.macro_category_id
         WHERE p.active = 1 AND c.active = 1
         ORDER BY COALESCE(m.id, 99999), c.id ASC, p.id ASC`
      );

      const macroMap = new Map();
      const categoryMap = new Map();

      macroRows.forEach((row) => {
        macroMap.set(row.id, {
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          active: Boolean(row.active),
          subcategories: []
        });
      });

      categoryRows.forEach((row) => {
        const macroKey = row.macroCategoryId || 0;

        if (!macroMap.has(macroKey)) {
          macroMap.set(macroKey, {
            id: macroKey,
            slug: row.macroSlug || 'catalogo-general',
            name: row.macroName || 'Catalogo General',
            description: row.macroName
              ? 'Categorias agrupadas por tipo de producto.'
              : 'Categorias sin macrocategoria asignada.',
            active: true,
            subcategories: []
          });
        }

        const macro = macroMap.get(macroKey);

        const category = {
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          image: row.image,
          active: Boolean(row.active),
          macroCategoryId: macro.id,
          macroCategorySlug: macro.slug,
          macroCategoryName: macro.name,
          products: []
        };

        macro.subcategories.push(category);
        categoryMap.set(row.id, category);
      });

      productRows.forEach((row) => {
        const category = categoryMap.get(row.categoryId);
        if (!category) {
          return;
        }

        category.products.push({
          id: row.id,
          sku: row.sku,
          name: row.name,
          price: toMoney(row.price),
          image: row.image,
          category: row.categorySlug,
          categoryName: row.categoryName,
          macroCategoryId: row.macroCategoryId || 0,
          macroCategorySlug: row.macroSlug || 'catalogo-general',
          macroCategoryName: row.macroName || 'Catalogo General',
          active: Boolean(row.active)
        });
      });

      const macroCategories = Array.from(macroMap.values()).filter(
        (macro) => macro.subcategories.length > 0
      );

      const categories = [];
      macroCategories.forEach((macro) => {
        macro.subcategories.forEach((subcategory) => {
          categories.push(subcategory);
        });
      });

      res.json({
        macroCategories,
        categories,
        totalMacroCategories: macroCategories.length,
        totalSubcategories: categories.length,
        totalProducts: productRows.length
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/recommendations', async (req, res, next) => {
    try {
      const budget = Number(req.query.budget);
      const occasion = String(req.query.occasion || 'sorpresa').toLowerCase();

      if (!Number.isFinite(budget) || budget <= 0) {
        res.status(400).json({
          error: 'budget debe ser un numero mayor a 0.'
        });
        return;
      }

      const products = await db.all(
        `SELECT p.id, p.name, p.price, p.image, p.active,
                c.slug AS categorySlug, c.name AS category
         FROM products p
         INNER JOIN categories c ON c.id = p.category_id
         WHERE p.active = 1 AND c.active = 1
         ORDER BY p.price ASC`
      );

      const normalizedProducts = products.map((product) => ({
        id: product.id,
        name: product.name,
        price: toMoney(product.price),
        image: product.image,
        active: Boolean(product.active),
        categorySlug: product.categorySlug,
        category: product.category
      }));

      const recommendations = buildRecommendations(normalizedProducts, budget, occasion);

      res.json({
        budget: toMoney(budget),
        occasion,
        recommendations
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/orders', orderLimiter, async (req, res, next) => {
    try {
      const validation = validateOrderPayload(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Validation failed.',
          details: validation.errors
        });
        return;
      }

      const payload = validation.value;
      const mergedItems = normalizeItems(payload.items);
      const productIds = mergedItems.map((item) => item.productId);

      const placeholders = productIds.map(() => '?').join(',');
      const products = await db.all(
        `SELECT p.id, p.name, p.price, c.name AS category
         FROM products p
         INNER JOIN categories c ON c.id = p.category_id
         WHERE p.active = 1 AND c.active = 1
         AND p.id IN (${placeholders})`,
        productIds
      );

      if (products.length !== productIds.length) {
        res.status(400).json({
          error: 'One or more products are invalid or inactive.'
        });
        return;
      }

      const productMap = new Map();
      products.forEach((product) => {
        productMap.set(product.id, {
          id: product.id,
          name: product.name,
          price: toMoney(product.price),
          category: product.category
        });
      });

      const orderItems = mergedItems.map((item) => {
        const product = productMap.get(item.productId);
        const lineTotal = toMoney(product.price * item.qty);
        return {
          productId: product.id,
          name: product.name,
          qty: item.qty,
          unitPrice: product.price,
          lineTotal
        };
      });

      const total = toMoney(orderItems.reduce((sum, item) => sum + item.lineTotal, 0));
      const createdAt = new Date().toISOString();

      await db.run('BEGIN TRANSACTION');

      let orderId;
      try {
        const orderResult = await db.run(
          `INSERT INTO orders (
            customer_name,
            phone,
            delivery_date,
            district,
            address,
            note,
            source,
            total,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            payload.customerName,
            payload.phone,
            payload.deliveryDate,
            payload.district,
            payload.address,
            payload.note,
            payload.source,
            total,
            createdAt
          ]
        );

        orderId = orderResult.lastID;

        for (let index = 0; index < orderItems.length; index += 1) {
          const item = orderItems[index];
          await db.run(
            `INSERT INTO order_items (
              order_id,
              product_id,
              product_name,
              unit_price,
              quantity,
              line_total,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orderId, item.productId, item.name, item.unitPrice, item.qty, item.lineTotal, createdAt]
          );
        }

        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

      const whatsappMessage = buildWhatsappMessage(orderId, payload, orderItems, total);
      const whatsappUrl = `https://wa.me/${config.whatsappPhone}?text=${encodeURIComponent(
        whatsappMessage
      )}`;

      res.status(201).json({
        orderId,
        total,
        createdAt,
        whatsappUrl
      });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'Route not found.'
    });
  });

  app.use(express.static(path.resolve(config.rootDir, 'frontend')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(config.rootDir, 'frontend', 'index.html'));
  });

  app.use((error, req, res, next) => {
    if (error && error.message === 'Not allowed by CORS') {
      res.status(403).json({
        error: 'Origin not allowed.'
      });
      return;
    }

    const statusCode = error && error.statusCode ? error.statusCode : 500;
    const message = statusCode >= 500 ? 'Internal server error.' : error.message;

    if (statusCode >= 500) {
      // eslint-disable-next-line no-console
      console.error(error);
    }

    res.status(statusCode).json({
      error: message
    });
  });

  return app;
}

module.exports = {
  createApp
};
