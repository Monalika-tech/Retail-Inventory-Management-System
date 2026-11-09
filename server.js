/**
 * ============================================================================
 * Retail Store Inventory and Supplier Management System
 * Production Backend Server (Node.js + Native SQLite Engine)
 * Zero external npm dependencies required! Runs natively on Node 22+
 * ============================================================================
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'inventory.db');
const SQL_INIT_PATH = path.join(__dirname, 'sql', 'schema_sqlite.sql');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize SQLite database with foreign keys enabled
let db;

function initDatabase() {
  console.log(`[Database] Initializing SQLite database at ${DB_PATH}...`);
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');

  // Check if tables exist, if not, execute schema_sqlite.sql
  try {
    const checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Products'").all();
    if (checkTable.length === 0) {
      console.log('[Database] First-time setup detected. Seeding schema and sample data...');
      const sqlContent = fs.readFileSync(SQL_INIT_PATH, 'utf-8');
      db.exec(sqlContent);
      console.log('[Database] Schema and 3NF seed data populated successfully.');
    } else {
      console.log('[Database] Database tables and constraints verified.');
    }
  } catch (err) {
    console.error('[Database Error]', err.message);
    const sqlContent = fs.readFileSync(SQL_INIT_PATH, 'utf-8');
    db.exec(sqlContent);
  }
}

// Helper: send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

// Helper: parse JSON request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Helper: serve static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function serveStatic(req, res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// Start HTTP Server
initDatabase();

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // --------------------------------------------------------------------------
  // API ROUTING
  // --------------------------------------------------------------------------
  try {
    // 1. Dashboard Metrics
    if (pathname === '/api/dashboard/metrics' && method === 'GET') {
      const valRow = db.prepare('SELECT ROUND(COALESCE(SUM(UnitPrice * StockQuantity), 0), 2) AS valuation FROM Products').get();
      const prdRow = db.prepare('SELECT COUNT(*) AS totalProducts FROM Products').get();
      const supRow = db.prepare('SELECT COUNT(DISTINCT SupplierID) AS activeSuppliers, (SELECT COUNT(*) FROM Suppliers) AS totalSuppliers FROM Products').get();
      const lowRow = db.prepare('SELECT COUNT(*) AS lowStockCount, COALESCE(SUM(CASE WHEN StockQuantity < 10 THEN 1 ELSE 0 END), 0) AS criticalCount FROM Products WHERE StockQuantity < 15').get();

      return sendJson(res, 200, {
        valuation: valRow.valuation || 0,
        totalProducts: prdRow.totalProducts || 0,
        activeSuppliers: supRow.activeSuppliers || 0,
        totalSuppliers: supRow.totalSuppliers || 0,
        lowStockCount: lowRow.lowStockCount || 0,
        criticalCount: lowRow.criticalCount || 0,
      });
    }

    // 2. Dashboard Movement Trends
    if (pathname === '/api/dashboard/movements' && method === 'GET') {
      const sql = `
        SELECT 
            p.ProductID,
            p.ProductName,
            c.CategoryName,
            p.StockQuantity AS CurrentInventory,
            COALESCE(SUM(CASE WHEN sl.ChangeType = 'IN' THEN sl.QuantityChanged ELSE 0 END), 0) AS TotalReceived,
            COALESCE(SUM(CASE WHEN sl.ChangeType = 'OUT' THEN sl.QuantityChanged ELSE 0 END), 0) AS TotalDispatched
        FROM Products p
        INNER JOIN Categories c ON p.CategoryID = c.CategoryID
        LEFT JOIN StockLogs sl ON p.ProductID = sl.ProductID
        GROUP BY p.ProductID, p.ProductName, c.CategoryName, p.StockQuantity
        ORDER BY TotalDispatched DESC, p.ProductID ASC;
      `;
      const rows = db.prepare(sql).all();
      return sendJson(res, 200, rows);
    }

    // 3. Products List & Search
    if (pathname === '/api/products' && method === 'GET') {
      const categoryId = parsedUrl.searchParams.get('category');
      const supplierId = parsedUrl.searchParams.get('supplier');
      const lowStock = parsedUrl.searchParams.get('lowStock');
      const search = parsedUrl.searchParams.get('search');

      let sql = `
        SELECT 
            p.ProductID,
            p.ProductName,
            c.CategoryID,
            c.CategoryName,
            s.SupplierID,
            s.SupplierName,
            s.City AS SupplierCity,
            p.UnitPrice,
            p.StockQuantity,
            ROUND(p.UnitPrice * p.StockQuantity, 2) AS TotalValuation
        FROM Products p
        INNER JOIN Categories c ON p.CategoryID = c.CategoryID
        INNER JOIN Suppliers s  ON p.SupplierID = s.SupplierID
        WHERE 1=1
      `;
      const params = [];

      if (categoryId) {
        sql += ' AND p.CategoryID = ?';
        params.push(categoryId);
      }
      if (supplierId) {
        sql += ' AND p.SupplierID = ?';
        params.push(supplierId);
      }
      if (lowStock === 'true') {
        sql += ' AND p.StockQuantity < 15';
      }
      if (search) {
        sql += ' AND (p.ProductName LIKE ? OR c.CategoryName LIKE ? OR s.SupplierName LIKE ?)';
        const query = `%${search}%`;
        params.push(query, query, query);
      }

      sql += ' ORDER BY p.ProductID ASC;';
      const rows = db.prepare(sql).all(...params);
      return sendJson(res, 200, rows);
    }

    // 4. Create Product
    if (pathname === '/api/products' && method === 'POST') {
      const data = await parseBody(req);
      if (!data.ProductName || !data.CategoryID || !data.SupplierID || data.UnitPrice === undefined) {
        return sendJson(res, 400, { error: 'ProductName, CategoryID, SupplierID, and UnitPrice are required.' });
      }
      if (Number(data.UnitPrice) <= 0) {
        return sendJson(res, 400, { error: 'UnitPrice must be strictly greater than 0.' });
      }
      if (Number(data.StockQuantity) < 0) {
        return sendJson(res, 400, { error: 'StockQuantity cannot be negative.' });
      }

      const stmt = db.prepare(`
        INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        data.ProductName,
        Number(data.CategoryID),
        Number(data.SupplierID),
        Number(data.UnitPrice),
        Number(data.StockQuantity) || 0
      );

      return sendJson(res, 201, { success: true, productID: Number(result.lastInsertRowid) });
    }

    // 5. Update Product
    if (pathname.startsWith('/api/products/') && method === 'PUT') {
      const id = pathname.split('/')[3];
      const data = await parseBody(req);

      if (data.UnitPrice !== undefined && Number(data.UnitPrice) <= 0) {
        return sendJson(res, 400, { error: 'UnitPrice must be greater than 0.' });
      }
      if (data.StockQuantity !== undefined && Number(data.StockQuantity) < 0) {
        return sendJson(res, 400, { error: 'StockQuantity cannot be negative.' });
      }

      const stmt = db.prepare(`
        UPDATE Products
        SET ProductName = COALESCE(?, ProductName),
            CategoryID = COALESCE(?, CategoryID),
            SupplierID = COALESCE(?, SupplierID),
            UnitPrice = COALESCE(?, UnitPrice),
            StockQuantity = COALESCE(?, StockQuantity)
        WHERE ProductID = ?
      `);
      stmt.run(
        data.ProductName || null,
        data.CategoryID ? Number(data.CategoryID) : null,
        data.SupplierID ? Number(data.SupplierID) : null,
        data.UnitPrice ? Number(data.UnitPrice) : null,
        data.StockQuantity !== undefined ? Number(data.StockQuantity) : null,
        id
      );

      return sendJson(res, 200, { success: true });
    }

    // 6. Delete Product (Demonstrates Cascading Delete)
    if (pathname.startsWith('/api/products/') && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const checkLogs = db.prepare('SELECT COUNT(*) AS count FROM StockLogs WHERE ProductID = ?').get(id);
      const childCount = checkLogs.count;

      const stmt = db.prepare('DELETE FROM Products WHERE ProductID = ?');
      stmt.run(id);

      return sendJson(res, 200, {
        success: true,
        message: `Product ${id} deleted successfully. ${childCount} related stock log entries were removed via ON DELETE CASCADE.`,
        deletedChildLogs: childCount,
      });
    }

    // 7. Reorder Report View (vw_reorder_report)
    if (pathname === '/api/reorders' && method === 'GET') {
      const rows = db.prepare('SELECT * FROM vw_reorder_report ORDER BY StockQuantity ASC').all();
      return sendJson(res, 200, rows);
    }

    // 8. Stock Movement Logs
    if (pathname === '/api/stock-logs' && method === 'GET') {
      const sql = `
        SELECT 
            sl.LogID,
            sl.ProductID,
            p.ProductName,
            c.CategoryName,
            sl.QuantityChanged,
            sl.ChangeType,
            sl.LogDate
        FROM StockLogs sl
        INNER JOIN Products p ON sl.ProductID = p.ProductID
        INNER JOIN Categories c ON p.CategoryID = c.CategoryID
        ORDER BY sl.LogDate DESC, sl.LogID DESC
      `;
      const rows = db.prepare(sql).all();
      return sendJson(res, 200, rows);
    }

    // 9. Log New Stock Movement (Atomically adjusts Product stock)
    if (pathname === '/api/stock-logs' && method === 'POST') {
      const data = await parseBody(req);
      const productID = Number(data.ProductID);
      const quantity = Number(data.QuantityChanged);
      const changeType = data.ChangeType;

      if (!productID || !quantity || quantity <= 0 || !['IN', 'OUT', 'ADJUSTMENT'].includes(changeType)) {
        return sendJson(res, 400, { error: "Valid ProductID, positive QuantityChanged, and ChangeType ('IN', 'OUT', 'ADJUSTMENT') required." });
      }

      // Check current product stock
      const product = db.prepare('SELECT StockQuantity FROM Products WHERE ProductID = ?').get(productID);
      if (!product) {
        return sendJson(res, 404, { error: 'Target product not found.' });
      }

      let newStock = product.StockQuantity;
      if (changeType === 'IN') {
        newStock += quantity;
      } else if (changeType === 'OUT') {
        if (product.StockQuantity < quantity) {
          return sendJson(res, 400, { error: `Insufficient stock! On-hand: ${product.StockQuantity}, Requested: ${quantity}` });
        }
        newStock -= quantity;
      } else if (changeType === 'ADJUSTMENT') {
        newStock = quantity; // Absolute adjustment
      }

      // Execute transactionally
      db.exec('BEGIN TRANSACTION;');
      try {
        db.prepare('INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType) VALUES (?, ?, ?)').run(productID, quantity, changeType);
        db.prepare('UPDATE Products SET StockQuantity = ? WHERE ProductID = ?').run(newStock, productID);
        db.exec('COMMIT;');
      } catch (e) {
        db.exec('ROLLBACK;');
        throw e;
      }

      return sendJson(res, 201, { success: true, updatedStock: newStock });
    }

    // 10. Suppliers List
    if (pathname === '/api/suppliers' && method === 'GET') {
      const sql = `
        SELECT 
            s.SupplierID,
            s.SupplierName,
            s.ContactPerson,
            s.Phone,
            s.City,
            COUNT(p.ProductID) AS ActiveProductsCount,
            COALESCE(SUM(p.StockQuantity), 0) AS TotalUnitsSupplied,
            ROUND(COALESCE(SUM(p.UnitPrice * p.StockQuantity), 0), 2) AS TotalSuppliedValuation
        FROM Suppliers s
        LEFT JOIN Products p ON s.SupplierID = p.SupplierID
        GROUP BY s.SupplierID, s.SupplierName, s.ContactPerson, s.Phone, s.City
        ORDER BY s.SupplierID ASC;
      `;
      const rows = db.prepare(sql).all();
      return sendJson(res, 200, rows);
    }

    // 11. Create Supplier
    if (pathname === '/api/suppliers' && method === 'POST') {
      const data = await parseBody(req);
      if (!data.SupplierName || !data.ContactPerson || !data.Phone || !data.City) {
        return sendJson(res, 400, { error: 'SupplierName, ContactPerson, Phone, and City are mandatory.' });
      }
      const stmt = db.prepare('INSERT INTO Suppliers (SupplierName, ContactPerson, Phone, City) VALUES (?, ?, ?, ?)');
      const resRow = stmt.run(data.SupplierName, data.ContactPerson, data.Phone, data.City);
      return sendJson(res, 201, { success: true, supplierID: Number(resRow.lastInsertRowid) });
    }

    // 12. Categories List
    if (pathname === '/api/categories' && method === 'GET') {
      const sql = `
        SELECT 
            c.CategoryID,
            c.CategoryName,
            c.Description,
            COUNT(p.ProductID) AS ActiveProductsCount,
            COALESCE(SUM(p.StockQuantity), 0) AS TotalStockCount
        FROM Categories c
        LEFT JOIN Products p ON c.CategoryID = p.CategoryID
        GROUP BY c.CategoryID, c.CategoryName, c.Description
        ORDER BY c.CategoryID ASC;
      `;
      const rows = db.prepare(sql).all();
      return sendJson(res, 200, rows);
    }

    // 13. Create Category
    if (pathname === '/api/categories' && method === 'POST') {
      const data = await parseBody(req);
      if (!data.CategoryName) {
        return sendJson(res, 400, { error: 'CategoryName is mandatory.' });
      }
      const stmt = db.prepare('INSERT INTO Categories (CategoryName, Description) VALUES (?, ?)');
      const resRow = stmt.run(data.CategoryName, data.Description || null);
      return sendJson(res, 201, { success: true, categoryID: Number(resRow.lastInsertRowid) });
    }

    // 14. Academic Queries Live Runner
    if (pathname === '/api/queries' && method === 'GET') {
      const queryId = parsedUrl.searchParams.get('id');

      const queries = {
        '1': {
          title: 'Query 1: Multi-Table INNER JOIN (Full Catalog)',
          description: 'Comprehensive view linking Products, Categories, and Suppliers with location and stock.',
          sql: `SELECT p.ProductID, p.ProductName, c.CategoryName, s.SupplierName, s.City AS SupplierCity, p.UnitPrice, p.StockQuantity
FROM Products p
INNER JOIN Categories c ON p.CategoryID = c.CategoryID
INNER JOIN Suppliers s  ON p.SupplierID = s.SupplierID
ORDER BY c.CategoryName ASC, p.ProductName ASC;`,
        },
        '2': {
          title: 'Query 2: Low-Stock Alert using GROUP BY and HAVING',
          description: 'Detects categories where total aggregate stock is critically low (< 35 units).',
          sql: `SELECT c.CategoryID, c.CategoryName, COUNT(p.ProductID) AS TotalProductsTracked, SUM(p.StockQuantity) AS TotalCategoryUnits, ROUND(AVG(p.StockQuantity), 1) AS AverageUnitsPerProduct
FROM Categories c
INNER JOIN Products p ON c.CategoryID = p.CategoryID
GROUP BY c.CategoryID, c.CategoryName
HAVING SUM(p.StockQuantity) < 35
ORDER BY TotalCategoryUnits ASC;`,
        },
        '3A': {
          title: 'Query 3A: Products Priced Above Store Average',
          description: 'Uncorrelated subquery computing products priced higher than store-wide average.',
          sql: `SELECT ProductID, ProductName, UnitPrice, (SELECT ROUND(AVG(UnitPrice), 2) FROM Products) AS StoreAveragePrice, ROUND(UnitPrice - (SELECT AVG(UnitPrice) FROM Products), 2) AS PriceDelta
FROM Products
WHERE UnitPrice > (SELECT AVG(UnitPrice) FROM Products)
ORDER BY UnitPrice DESC;`,
        },
        '3B': {
          title: 'Query 3B: Flagship Product in Each Category (Correlated Subquery)',
          description: 'Finds the highest-priced item within every category using a correlated subquery.',
          sql: `SELECT p1.CategoryID, c.CategoryName, p1.ProductID, p1.ProductName, p1.UnitPrice
FROM Products p1
INNER JOIN Categories c ON p1.CategoryID = c.CategoryID
WHERE p1.UnitPrice = (SELECT MAX(p2.UnitPrice) FROM Products p2 WHERE p2.CategoryID = p1.CategoryID)
ORDER BY p1.UnitPrice DESC;`,
        },
        '4': {
          title: 'Query 4: Aggregate Financial Valuation by Category & Supplier',
          description: 'Liquid value calculation (UnitPrice * StockQuantity) grouped by vendor and department.',
          sql: `SELECT c.CategoryName, s.SupplierName, COUNT(p.ProductID) AS ActiveSKUs, SUM(p.StockQuantity) AS TotalOnHandUnits, ROUND(SUM(p.UnitPrice * p.StockQuantity), 2) AS TotalInventoryValuation
FROM Products p
INNER JOIN Categories c ON p.CategoryID = c.CategoryID
INNER JOIN Suppliers s  ON p.SupplierID = s.SupplierID
GROUP BY c.CategoryName, s.SupplierName
ORDER BY TotalInventoryValuation DESC;`,
        },
        '5': {
          title: "Query 5: Stock Movement Summary ('IN' vs 'OUT' via CASE WHEN)",
          description: 'Conditional aggregation comparing inbound shipments versus sales dispatches.',
          sql: `SELECT p.ProductID, p.ProductName, p.StockQuantity AS CurrentInventory, COALESCE(SUM(CASE WHEN sl.ChangeType = 'IN' THEN sl.QuantityChanged ELSE 0 END), 0) AS TotalReceived, COALESCE(SUM(CASE WHEN sl.ChangeType = 'OUT' THEN sl.QuantityChanged ELSE 0 END), 0) AS TotalDispatched
FROM Products p
LEFT JOIN StockLogs sl ON p.ProductID = sl.ProductID
GROUP BY p.ProductID, p.ProductName, p.StockQuantity
ORDER BY TotalDispatched DESC, p.ProductID ASC;`,
        },
        '6A': {
          title: 'Query 6A: Suppliers with Zero Active Products (LEFT JOIN)',
          description: 'Gap analysis identifying vendors currently underutilized.',
          sql: `SELECT s.SupplierID, s.SupplierName, s.ContactPerson, s.Phone, s.City
FROM Suppliers s
LEFT JOIN Products p ON s.SupplierID = p.SupplierID
WHERE p.ProductID IS NULL;`,
        },
        '6B': {
          title: 'Query 6B: Categories with Zero Active Products (LEFT JOIN)',
          description: 'Gap analysis identifying departments with no products assigned.',
          sql: `SELECT c.CategoryID, c.CategoryName, c.Description
FROM Categories c
LEFT JOIN Products p ON c.CategoryID = p.CategoryID
WHERE p.ProductID IS NULL;`,
        },
        '7': {
          title: 'Query 7: View Execution (vw_reorder_report)',
          description: 'Queries the database view for immediate procurement action (stock < 15).',
          sql: `SELECT * FROM vw_reorder_report ORDER BY StockQuantity ASC;`,
        },
      };

      if (!queryId) {
        return sendJson(res, 200, Object.keys(queries).map(id => ({ id, title: queries[id].title, description: queries[id].description })));
      }

      if (!queries[queryId]) {
        return sendJson(res, 404, { error: 'Query not found' });
      }

      const q = queries[queryId];
      const results = db.prepare(q.sql).all();
      return sendJson(res, 200, { ...q, results });
    }

    // 15. Reset Database
    if (pathname === '/api/reset' && method === 'POST') {
      const sqlContent = fs.readFileSync(SQL_INIT_PATH, 'utf-8');
      db.exec(sqlContent);
      return sendJson(res, 200, { success: true, message: 'Database reset to factory 3NF sample dataset.' });
    }

    // ------------------------------------------------------------------------
    // STATIC ASSETS
    // ------------------------------------------------------------------------
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    return serveStatic(req, res, filePath);

  } catch (err) {
    console.error('[Internal Error]', err);
    return sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` Retail Store Inventory and Supplier Management System`);
  console.log(` Ready at: http://localhost:${PORT}`);
  console.log(` Database: SQLite Native Engine (3NF Foreign Keys Enabled)`);
  console.log(`================================================================`);
});
