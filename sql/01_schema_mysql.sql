-- ============================================================================
-- PROJECT: Retail Store Inventory and Supplier Management System
-- MODULE: 01_schema_mysql.sql (DDL)
-- COMPATIBILITY: MySQL 8.0+ (InnoDB Engine)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS retail_inventory_db;
USE retail_inventory_db;

-- Teardown dependent tables in reverse foreign key order
DROP TABLE IF EXISTS StockLogs;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Suppliers;

-- ----------------------------------------------------------------------------
-- 1. Suppliers Table
-- ----------------------------------------------------------------------------
CREATE TABLE Suppliers (
    SupplierID      INT AUTO_INCREMENT PRIMARY KEY,
    SupplierName    VARCHAR(100) NOT NULL,
    ContactPerson   VARCHAR(100) NOT NULL,
    Phone           VARCHAR(25)  NOT NULL UNIQUE,
    City            VARCHAR(50)  NOT NULL,
    CreatedAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. Categories Table
-- ----------------------------------------------------------------------------
CREATE TABLE Categories (
    CategoryID      INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName    VARCHAR(50)  NOT NULL UNIQUE,
    Description     VARCHAR(255) NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. Products Table
-- ----------------------------------------------------------------------------
CREATE TABLE Products (
    ProductID       INT AUTO_INCREMENT PRIMARY KEY,
    ProductName     VARCHAR(120)   NOT NULL,
    CategoryID      INT            NOT NULL,
    SupplierID      INT            NOT NULL,
    UnitPrice       DECIMAL(10, 2) NOT NULL,
    StockQuantity   INT            NOT NULL DEFAULT 0,
    CreatedAt       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Data Integrity Constraints
    CONSTRAINT chk_unit_price CHECK (UnitPrice > 0),
    CONSTRAINT chk_stock_quantity CHECK (StockQuantity >= 0),

    -- Foreign Key Constraints
    CONSTRAINT fk_products_categories
        FOREIGN KEY (CategoryID) REFERENCES Categories (CategoryID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_products_suppliers
        FOREIGN KEY (SupplierID) REFERENCES Suppliers (SupplierID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. StockLogs Table (Audit Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE StockLogs (
    LogID           INT AUTO_INCREMENT PRIMARY KEY,
    ProductID       INT          NOT NULL,
    QuantityChanged INT          NOT NULL,
    ChangeType      VARCHAR(15)  NOT NULL,
    LogDate         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Business Rules
    CONSTRAINT chk_quantity_changed CHECK (QuantityChanged > 0),
    CONSTRAINT chk_change_type CHECK (ChangeType IN ('IN', 'OUT', 'ADJUSTMENT')),

    -- Cascading Delete: Deleting a product automatically cleans its audit history
    CONSTRAINT fk_stocklogs_products
        FOREIGN KEY (ProductID) REFERENCES Products (ProductID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;
