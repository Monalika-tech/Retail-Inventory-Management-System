-- ============================================================================
-- PROJECT: Retail Store Inventory and Supplier Management System
-- MODULE: 99_cleanup_mysql.sql
-- PURPOSE: Safe Database Reset & Teardown
-- ============================================================================

USE retail_inventory_db;

-- Drop views first
DROP VIEW IF EXISTS vw_inventory_valuation_summary;
DROP VIEW IF EXISTS vw_reorder_report;

-- Drop dependent tables with foreign keys
DROP TABLE IF EXISTS StockLogs;
DROP TABLE IF EXISTS Products;

-- Drop parent tables
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Suppliers;

-- Optional: Drop entire schema
-- DROP DATABASE IF EXISTS retail_inventory_db;
