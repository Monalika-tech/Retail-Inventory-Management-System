-- ============================================================================
-- PROJECT: Retail Store Inventory and Supplier Management System
-- MODULE: 03_analytical_queries_mysql.sql
-- PURPOSE: 8 Core & Advanced Analytical Business Queries
-- ============================================================================

USE retail_inventory_db;

-- ============================================================================
-- QUERY 1: Multi-Table INNER JOIN (Full Catalog Overview)
-- Joins Products, Categories, and Suppliers to display a complete catalog view.
-- ============================================================================
SELECT 
    p.ProductID,
    p.ProductName,
    c.CategoryName,
    s.SupplierName,
    s.City AS SupplierCity,
    p.UnitPrice,
    p.StockQuantity
FROM Products p
INNER JOIN Categories c ON p.CategoryID = c.CategoryID
INNER JOIN Suppliers s  ON p.SupplierID = s.SupplierID
ORDER BY c.CategoryName ASC, p.ProductName ASC;

-- ============================================================================
-- QUERY 2: Low-Stock Alert using GROUP BY and HAVING
-- Groups products by category and filters for categories where aggregate stock
-- is critically low (< 35 units total across the category).
-- ============================================================================
SELECT 
    c.CategoryID,
    c.CategoryName,
    COUNT(p.ProductID) AS TotalProductsTracked,
    SUM(p.StockQuantity) AS TotalCategoryUnits,
    ROUND(AVG(p.StockQuantity), 1) AS AverageUnitsPerProduct
FROM Categories c
INNER JOIN Products p ON c.CategoryID = p.CategoryID
GROUP BY c.CategoryID, c.CategoryName
HAVING SUM(p.StockQuantity) < 35
ORDER BY TotalCategoryUnits ASC;

-- ============================================================================
-- QUERY 3: Subqueries (Nested Queries)
-- ============================================================================

-- 3A. Uncorrelated Subquery: Products priced higher than the store average
SELECT 
    ProductID,
    ProductName,
    UnitPrice,
    (SELECT ROUND(AVG(UnitPrice), 2) FROM Products) AS OverallAveragePrice,
    ROUND(UnitPrice - (SELECT AVG(UnitPrice) FROM Products), 2) AS PriceDelta
FROM Products
WHERE UnitPrice > (SELECT AVG(UnitPrice) FROM Products)
ORDER BY UnitPrice DESC;

-- 3B. Correlated Subquery: Most expensive product within each category
SELECT 
    p1.CategoryID,
    c.CategoryName,
    p1.ProductID,
    p1.ProductName,
    p1.UnitPrice
FROM Products p1
INNER JOIN Categories c ON p1.CategoryID = c.CategoryID
WHERE p1.UnitPrice = (
    SELECT MAX(p2.UnitPrice)
    FROM Products p2
    WHERE p2.CategoryID = p1.CategoryID
)
ORDER BY p1.UnitPrice DESC;

-- ============================================================================
-- QUERY 4: Aggregate Financial Summary (Inventory Valuation)
-- Computes the total inventory liquid value (UnitPrice * StockQuantity)
-- broken down by Category and Supplier.
-- ============================================================================
SELECT 
    c.CategoryName,
    s.SupplierName,
    COUNT(p.ProductID) AS ActiveSKUs,
    SUM(p.StockQuantity) AS TotalOnHandUnits,
    ROUND(SUM(p.UnitPrice * p.StockQuantity), 2) AS TotalInventoryValuation
FROM Products p
INNER JOIN Categories c ON p.CategoryID = c.CategoryID
INNER JOIN Suppliers s  ON p.SupplierID = s.SupplierID
GROUP BY c.CategoryName, s.SupplierName
ORDER BY TotalInventoryValuation DESC;

-- ============================================================================
-- QUERY 5: Stock Movement Summary (Conditional Aggregation using CASE WHEN)
-- Analyzes stock turnover per item, calculating received vs dispatched totals.
-- ============================================================================
SELECT 
    p.ProductID,
    p.ProductName,
    p.StockQuantity AS CurrentInventory,
    COALESCE(SUM(CASE WHEN sl.ChangeType = 'IN'  THEN sl.QuantityChanged ELSE 0 END), 0) AS TotalUnitsReceived,
    COALESCE(SUM(CASE WHEN sl.ChangeType = 'OUT' THEN sl.QuantityChanged ELSE 0 END), 0) AS TotalUnitsDispatched
FROM Products p
LEFT JOIN StockLogs sl ON p.ProductID = sl.ProductID
GROUP BY p.ProductID, p.ProductName, p.StockQuantity
ORDER BY TotalUnitsDispatched DESC, p.ProductID ASC;

-- ============================================================================
-- QUERY 6: Left Join Gap Analysis (Zero-Product Detection)
-- ============================================================================

-- 6A. Suppliers with zero assigned active products
SELECT 
    s.SupplierID,
    s.SupplierName,
    s.ContactPerson,
    s.Phone,
    s.City
FROM Suppliers s
LEFT JOIN Products p ON s.SupplierID = p.SupplierID
WHERE p.ProductID IS NULL;

-- 6B. Categories with zero assigned active products
SELECT 
    c.CategoryID,
    c.CategoryName,
    c.Description
FROM Categories c
LEFT JOIN Products p ON c.CategoryID = p.CategoryID
WHERE p.ProductID IS NULL;

-- ============================================================================
-- QUERY 7: Database View Creation and Execution
-- View vw_reorder_report lists products needing reorder (< 15 units)
-- ============================================================================
CREATE OR REPLACE VIEW vw_reorder_report AS
SELECT 
    p.ProductID,
    p.ProductName,
    c.CategoryName,
    p.StockQuantity,
    s.SupplierName,
    s.ContactPerson,
    s.Phone AS SupplierPhone,
    s.City  AS SupplierCity
FROM Products p
INNER JOIN Categories c ON p.CategoryID = c.CategoryID
INNER JOIN Suppliers s  ON p.SupplierID = s.SupplierID
WHERE p.StockQuantity < 15;

-- Execution of the view
SELECT * FROM vw_reorder_report ORDER BY StockQuantity ASC;

-- ============================================================================
-- QUERY 8: Cascading Delete Demonstration
-- Deleting a product automatically cleans up dependent StockLogs rows.
-- ============================================================================

-- Review records before delete
SELECT '--- BEFORE DELETE (Child rows in StockLogs) ---' AS Step;
SELECT LogID, ProductID, QuantityChanged, ChangeType FROM StockLogs WHERE ProductID = 14;

-- Execute transactional delete demonstration
START TRANSACTION;

DELETE FROM Products WHERE ProductID = 14;

-- Verify child rows are gone
SELECT '--- AFTER DELETE (Should return 0 rows) ---' AS Step;
SELECT LogID, ProductID, QuantityChanged, ChangeType FROM StockLogs WHERE ProductID = 14;

-- Rollback to preserve test dataset
ROLLBACK;

SELECT '--- TRANSACTION ROLLED BACK (Dataset Preserved) ---' AS Status;
