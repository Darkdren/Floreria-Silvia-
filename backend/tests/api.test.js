const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const request = require('supertest');

const { initializeDatabase } = require('../src/db');
const { createApp } = require('../src/app');

async function runTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floreria-test-'));
  const dbPath = path.join(tempDir, 'test.sqlite');

  const db = await initializeDatabase(dbPath);

  const config = {
    rootDir: path.resolve(__dirname, '..', '..'),
    allowedOrigins: ['http://localhost:3000'],
    whatsappPhone: '51936625197',
    orderRateLimitMax: 3,
    orderRateLimitWindowMs: 60 * 1000
  };

  const app = createApp({ db, config });

  try {
    const catalogResponse = await request(app).get('/api/catalog').expect(200);
    assert.ok(Array.isArray(catalogResponse.body.macroCategories));
    assert.ok(catalogResponse.body.macroCategories.length > 0);

    const firstMacroCategory = catalogResponse.body.macroCategories[0];
    assert.ok(Array.isArray(firstMacroCategory.subcategories));
    assert.ok(firstMacroCategory.subcategories.length > 0);

    const firstSubcategory = firstMacroCategory.subcategories[0];
    assert.ok(Array.isArray(firstSubcategory.products));
    assert.ok(firstSubcategory.products.length > 0);

    const firstProduct = firstSubcategory.products[0];

    const recommendationsResponse = await request(app)
      .get('/api/recommendations')
      .query({ budget: 120, occasion: 'aniversario' })
      .expect(200);

    assert.ok(Array.isArray(recommendationsResponse.body.recommendations));
    assert.ok(recommendationsResponse.body.recommendations.length > 0);
    assert.ok(recommendationsResponse.body.recommendations.length <= 3);
    assert.ok(recommendationsResponse.body.recommendations[0].subtotal <= 120);

    await request(app).post('/api/orders').send({}).expect(400);

    const validOrderPayload = {
      customerName: 'Cliente Prueba',
      phone: '999888777',
      deliveryDate: '2026-03-20',
      district: 'Ancon',
      address: 'Av. Principal 123',
      note: 'Sin claveles',
      source: 'web',
      items: [{ productId: firstProduct.id, qty: 2 }]
    };

    const createdOrderResponse = await request(app)
      .post('/api/orders')
      .send(validOrderPayload)
      .expect(201);

    assert.ok(Number.isInteger(createdOrderResponse.body.orderId));
    assert.ok(createdOrderResponse.body.total > 0);
    assert.ok(createdOrderResponse.body.whatsappUrl.includes('wa.me/'));

    await request(app).post('/api/orders').send(validOrderPayload).expect(201);
    await request(app).post('/api/orders').send(validOrderPayload).expect(429);

    const orderCount = await db.get('SELECT COUNT(*) AS total FROM orders');
    assert.ok(orderCount.total >= 2);

    // eslint-disable-next-line no-console
    console.log('All API tests passed.');
  } finally {
    await db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runTests().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('API tests failed:', error);
  process.exit(1);
});


