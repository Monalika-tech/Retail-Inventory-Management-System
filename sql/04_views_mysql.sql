-- ============================================================================
-- PROJECT: Retail Store Inventory and Supplier Management System
-- MODULE: 04_views_mysql.sql
-- PURPOSE: Production Views & Materialized Reporting Helpers
-- ============================================================================

USE retail_inventory_db;

-- ----------------------------------------------------------------------------
-- VIEW: vw_reorder_report
-- Highlights inventory items requiring reordering (< 15 units)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_reorder_report AS
SELECT 
    p.ProductID,
    p.ProductName,
    c.CategoryID,
    c.CategoryName,
    p.StockQuantity,
    p.UnitPrice,
    ROUND(p.UnitPrice * p.StockQuantity, 2) AS LineItemValuation,
    s.SupplierID,
    s.SupplierName,
    s.ContactPerson,
    s.Phone AS SupplierPhone,
    s.City  AS SupplierCity
FROM Products p
INNER JOIN Categories c ON p.CategoryID = c.CategoryID
INNER JOIN Suppliers s  ON p.SupplierID = s.SupplierID
WHERE p.StockQuantity < 15;

-- ----------------------------------------------------------------------------
-- VIEW: vw_inventory_valuation_summary
-- Summarizes overall inventory health and financial metrics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_inventory_valuation_summary AS
SELECT 
    c.CategoryName,
    COUNT(p.ProductID) AS ProductCount,
    SUM(p.StockQuantity) AS TotalStock,
    ROUND(SUM(p.UnitPrice * p.StockQuantity), 2) AS TotalValuation,
    ROUND(AVG(p.UnitPrice), 2) AS AvgUnitPrice
FROM Categories c
LEFT JOIN Products p ON c.CategoryID = p.CategoryID
GROUP BY c.CategoryName;
