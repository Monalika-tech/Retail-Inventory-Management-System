-- ============================================================================
-- PROJECT: Retail Store Inventory and Supplier Management System
-- MODULE: oracle_01_schema.sql (Oracle SQL / PL/SQL DDL)
-- COMPATIBILITY: Oracle Database 12c / 18c / 19c / 21c / 23c
-- ============================================================================

-- Teardown existing tables in reverse dependency order
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE StockLogs CASCADE CONSTRAINTS PURGE';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE Products CASCADE CONSTRAINTS PURGE';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE Categories CASCADE CONSTRAINTS PURGE';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE Suppliers CASCADE CONSTRAINTS PURGE';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

-- ----------------------------------------------------------------------------
-- 1. Suppliers Table
-- ----------------------------------------------------------------------------
CREATE TABLE Suppliers (
    SupplierID      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    SupplierName    VARCHAR2(100) NOT NULL,
    ContactPerson   VARCHAR2(100) NOT NULL,
    Phone           VARCHAR2(25)  NOT NULL,
    City            VARCHAR2(50)  NOT NULL,
    CreatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_supplier_phone UNIQUE (Phone)
);

-- ----------------------------------------------------------------------------
-- 2. Categories Table
-- ----------------------------------------------------------------------------
CREATE TABLE Categories (
    CategoryID      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    CategoryName    VARCHAR2(50)  NOT NULL,
    Description     VARCHAR2(255) NULL,
    CONSTRAINT uq_category_name UNIQUE (CategoryName)
);

-- ----------------------------------------------------------------------------
-- 3. Products Table
-- ----------------------------------------------------------------------------
CREATE TABLE Products (
    ProductID       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ProductName     VARCHAR2(120)  NOT NULL,
    CategoryID      NUMBER         NOT NULL,
    SupplierID      NUMBER         NOT NULL,
    UnitPrice       NUMBER(10, 2)  NOT NULL,
    StockQuantity   NUMBER(10)     DEFAULT 0 NOT NULL,
    CreatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Business Rule Constraints
    CONSTRAINT chk_unit_price CHECK (UnitPrice > 0),
    CONSTRAINT chk_stock_quantity CHECK (StockQuantity >= 0),

    -- Referential Integrity Constraints
    CONSTRAINT fk_products_categories
        FOREIGN KEY (CategoryID) REFERENCES Categories (CategoryID),

    CONSTRAINT fk_products_suppliers
        FOREIGN KEY (SupplierID) REFERENCES Suppliers (SupplierID)
);

-- ----------------------------------------------------------------------------
-- 4. StockLogs Table (Audit Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE StockLogs (
    LogID           NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ProductID       NUMBER         NOT NULL,
    QuantityChanged NUMBER(10)     NOT NULL,
    ChangeType      VARCHAR2(15)   NOT NULL,
    LogDate         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Audit Data Validation
    CONSTRAINT chk_quantity_changed CHECK (QuantityChanged > 0),
    CONSTRAINT chk_change_type CHECK (ChangeType IN ('IN', 'OUT', 'ADJUSTMENT')),

    -- Cascading Delete: Deleting a product automatically purges child stock logs
    CONSTRAINT fk_stocklogs_products
        FOREIGN KEY (ProductID) REFERENCES Products (ProductID)
        ON DELETE CASCADE
);
