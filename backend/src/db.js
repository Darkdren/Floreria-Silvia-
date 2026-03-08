const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const { createSeedData, LEGACY_CATEGORY_MACRO_SLUG } = require('./seedData');

const DEFAULT_MACRO_SLUG = 'flores-principales';

function ensureDbDirectory(dbPath) {
  const directory = path.dirname(dbPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function openDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(db);
    });
  });
}

function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function runQuery(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
}

function getQuery(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params || [], (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function allQuery(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params || [], (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

async function createSchema(db) {
  await runQuery(
    db,
    `CREATE TABLE IF NOT EXISTS macro_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await runQuery(
    db,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      macro_category_id INTEGER,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(macro_category_id) REFERENCES macro_categories(id)
    )`
  );

  await runQuery(
    db,
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )`
  );

  await runQuery(
    db,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      district TEXT NOT NULL,
      address TEXT NOT NULL,
      note TEXT,
      source TEXT NOT NULL,
      total REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await runQuery(
    db,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`
  );

  await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
  await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)');
}

async function ensureMacroColumn(db) {
  const columns = await allQuery(db, 'PRAGMA table_info(categories)');
  const hasMacroColumn = columns.some((column) => column.name === 'macro_category_id');

  if (!hasMacroColumn) {
    await runQuery(db, 'ALTER TABLE categories ADD COLUMN macro_category_id INTEGER');
  }

  await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_categories_macro ON categories(macro_category_id)');
}

async function upsertMacroCatalog(db, macroSeeds) {
  for (let index = 0; index < macroSeeds.length; index += 1) {
    const macro = macroSeeds[index];

    await runQuery(
      db,
      'INSERT OR IGNORE INTO macro_categories (slug, name, description, active) VALUES (?, ?, ?, 1)',
      [macro.slug, macro.name, macro.description]
    );

    await runQuery(
      db,
      'UPDATE macro_categories SET name = ?, description = ?, active = 1 WHERE slug = ?',
      [macro.name, macro.description, macro.slug]
    );
  }
}

async function getMacroIdMap(db) {
  const rows = await allQuery(db, 'SELECT id, slug FROM macro_categories');
  const map = new Map();

  rows.forEach((row) => {
    map.set(row.slug, row.id);
  });

  return map;
}

async function assignExistingCategoriesToMacros(db, macroIdMap) {
  const mappingEntries = Object.entries(LEGACY_CATEGORY_MACRO_SLUG);

  for (let index = 0; index < mappingEntries.length; index += 1) {
    const [categorySlug, macroSlug] = mappingEntries[index];
    const macroId = macroIdMap.get(macroSlug);

    if (!macroId) {
      continue;
    }

    await runQuery(
      db,
      `UPDATE categories
       SET macro_category_id = ?
       WHERE slug = ?
       AND (macro_category_id IS NULL OR macro_category_id = 0)`,
      [macroId, categorySlug]
    );
  }

  const defaultMacroId =
    macroIdMap.get(DEFAULT_MACRO_SLUG) || Array.from(macroIdMap.values())[0] || null;

  if (defaultMacroId) {
    await runQuery(
      db,
      'UPDATE categories SET macro_category_id = ? WHERE macro_category_id IS NULL OR macro_category_id = 0',
      [defaultMacroId]
    );
  }
}

async function seedFreshCatalog(db, macroSeeds, macroIdMap) {
  for (let macroIndex = 0; macroIndex < macroSeeds.length; macroIndex += 1) {
    const macro = macroSeeds[macroIndex];
    const macroId = macroIdMap.get(macro.slug);

    if (!macroId) {
      continue;
    }

    for (let categoryIndex = 0; categoryIndex < macro.subcategories.length; categoryIndex += 1) {
      const category = macro.subcategories[categoryIndex];
      const insertCategoryResult = await runQuery(
        db,
        `INSERT INTO categories (
          macro_category_id,
          slug,
          name,
          description,
          image,
          active
        ) VALUES (?, ?, ?, ?, ?, 1)`,
        [macroId, category.slug, category.name, category.description, category.image]
      );

      const categoryId = insertCategoryResult.lastID;

      for (let productIndex = 0; productIndex < category.products.length; productIndex += 1) {
        const product = category.products[productIndex];
        await runQuery(
          db,
          'INSERT INTO products (category_id, sku, name, price, image, active) VALUES (?, ?, ?, ?, ?, 1)',
          [categoryId, product.sku, product.name, product.price, product.image]
        );
      }
    }
  }
}

async function seedDatabase(db) {
  const macroSeeds = createSeedData();
  await upsertMacroCatalog(db, macroSeeds);

  const macroIdMap = await getMacroIdMap(db);

  const countRow = await getQuery(db, 'SELECT COUNT(*) AS total FROM categories');
  if (countRow && countRow.total > 0) {
    await assignExistingCategoriesToMacros(db, macroIdMap);
    return;
  }

  await seedFreshCatalog(db, macroSeeds, macroIdMap);
}

async function initializeDatabase(dbPath) {
  ensureDbDirectory(dbPath);
  const db = await openDatabase(dbPath);

  await runQuery(db, 'PRAGMA foreign_keys = ON');
  await createSchema(db);
  await ensureMacroColumn(db);
  await seedDatabase(db);

  return {
    path: dbPath,
    run(sql, params) {
      return runQuery(db, sql, params);
    },
    get(sql, params) {
      return getQuery(db, sql, params);
    },
    all(sql, params) {
      return allQuery(db, sql, params);
    },
    close() {
      return closeDatabase(db);
    }
  };
}

module.exports = {
  initializeDatabase
};
