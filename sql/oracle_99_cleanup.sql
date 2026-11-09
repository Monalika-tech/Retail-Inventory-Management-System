-- ============================================================================
-- PROJECT: Retail Store Inventory and Supplier Management System
-- MODULE: oracle_99_cleanup.sql
-- PURPOSE: Safe Oracle Database Teardown & Reset
-- COMPATIBILITY: Oracle Database 12c / 18c / 19c / 21c / 23c
-- ============================================================================

-- Drop PL/SQL packages, procedures, triggers
DROP PACKAGE pkg_inventory_mgmt;
DROP PROCEDURE sp_procure_reorder;
DROP TRIGGER trg_sync_product_stock;

-- Drop views
DROP VIEW vw_reorder_report;

-- Drop tables in reverse foreign key dependency order
DROP TABLE StockLogs CASCADE CONSTRAINTS PURGE;
DROP TABLE Products CASCADE CONSTRAINTS PURGE;
DROP TABLE Categories CASCADE CONSTRAINTS PURGE;
DROP TABLE Suppliers CASCADE CONSTRAINTS PURGE;
