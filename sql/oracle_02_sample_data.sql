-- ============================================================================
-- PROJECT: Retail Store Inventory and Supplier Management System
-- MODULE: oracle_02_sample_data.sql (Oracle DML)
-- COMPATIBILITY: Oracle Database 12c / 18c / 19c / 21c / 23c
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Suppliers (6 records across diverse cities)
-- ----------------------------------------------------------------------------
INSERT INTO Suppliers (SupplierName, ContactPerson, Phone, City) VALUES
('Apex Electronics Dist.',    'Marcus Vance',    '+1-408-555-0110', 'San Jose');
INSERT INTO Suppliers (SupplierName, ContactPerson, Phone, City) VALUES
('Valley Harvest Organics',  'Clara Higgins',   '+1-503-555-0142', 'Portland');
INSERT INTO Suppliers (SupplierName, ContactPerson, Phone, City) VALUES
('Metro Style Apparels',      'Derrick Cole',    '+1-212-555-0198', 'New York');
INSERT INTO Suppliers (SupplierName, ContactPerson, Phone, City) VALUES
('Summit Home Appliances',    'Eleanor Wright',  '+1-312-555-0177', 'Chicago');
INSERT INTO Suppliers (SupplierName, ContactPerson, Phone, City) VALUES
('Beacon Stationery Co.',     'Julian Patel',    '+1-617-555-0133', 'Boston');
INSERT INTO Suppliers (SupplierName, ContactPerson, Phone, City) VALUES
('Northern Logistics Corp',   'Astrid Lindholm', '+1-612-555-0155', 'Minneapolis'); 
-- Note: Supplier 6 has zero products assigned to test LEFT JOIN queries.

-- ----------------------------------------------------------------------------
-- 2. Categories (6 records)
-- ----------------------------------------------------------------------------
INSERT INTO Categories (CategoryName, Description) VALUES
('Electronics',      'Consumer gadgets, computer hardware, and accessories');
INSERT INTO Categories (CategoryName, Description) VALUES
('Groceries',        'Packaged organic food, beverages, and pantry staples');
INSERT INTO Categories (CategoryName, Description) VALUES
('Apparel',          'Men and women casual wear, outerwear, and accessories');
INSERT INTO Categories (CategoryName, Description) VALUES
('Home Appliances',  'Small to medium kitchen appliances and room utilities');
INSERT INTO Categories (CategoryName, Description) VALUES
('Stationery',       'Office supplies, paper goods, and writing instruments');
INSERT INTO Categories (CategoryName, Description) VALUES
('Sporting Goods',   'Fitness equipment, athletic apparel, and outdoor gear');
-- Note: Category 6 has zero products assigned to test LEFT JOIN queries.

-- ----------------------------------------------------------------------------
-- 3. Products (14 records)
-- ----------------------------------------------------------------------------
-- Electronics (Supplier 1)
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('ANC Wireless Headphones',      1, 1, 129.99, 24);
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Ergonomic Mechanical Keyboard', 1, 1,  89.50,  7);  -- Low Stock (< 10)
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Ultra-Wide 34-Inch Monitor',   1, 1, 449.00,  3);  -- Critical Stock (< 10)

-- Groceries (Supplier 2)
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Organic Cold-Pressed Olive Oil', 2, 2,  18.75, 45);
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Artisan Roast Coffee Beans',     2, 2,  14.50, 11); -- Low Stock (< 15)
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Raw Unfiltered Honey 1kg',       2, 2,  12.25,  6);  -- Critical Stock (< 10)

-- Apparel (Supplier 3)
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Classic Cotton Crewneck Tee',  3, 3,  19.99, 65);
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Slim-Fit Stretch Denim Jeans', 3, 3,  58.00, 18);
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Merino Wool Winter Scarf',     3, 3,  28.50,  5);  -- Critical Stock (< 10)

-- Home Appliances (Supplier 4)
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Digital Convection Air Fryer', 4, 4, 119.99, 16);
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Cordless Stick Vacuum Cleaner',4, 4, 199.50,  4);  -- Critical Stock (< 10)
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Variable Temp Electric Kettle',4, 4,  42.00, 22);

-- Stationery (Supplier 5)
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Hardcover Dotted Journal',     5, 5,  13.50, 50);
INSERT INTO Products (ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
('Archival Fine-Liner Pen Set',  5, 5,  11.25,  8);  -- Low Stock (< 10)

-- ----------------------------------------------------------------------------
-- 4. StockLogs (18 records)
-- ----------------------------------------------------------------------------
-- Inbound Shipments ('IN')
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(1,  30, 'IN', TO_TIMESTAMP('2026-09-01 08:30:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(2,  15, 'IN', TO_TIMESTAMP('2026-09-01 09:15:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(3,   8, 'IN', TO_TIMESTAMP('2026-09-02 10:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(4,  60, 'IN', TO_TIMESTAMP('2026-09-03 11:20:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(5,  25, 'IN', TO_TIMESTAMP('2026-09-03 13:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(6,  16, 'IN', TO_TIMESTAMP('2026-09-04 14:10:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(7,  90, 'IN', TO_TIMESTAMP('2026-09-05 09:45:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(8,  30, 'IN', TO_TIMESTAMP('2026-09-05 11:30:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(9,  15, 'IN', TO_TIMESTAMP('2026-09-06 15:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(10, 20, 'IN', TO_TIMESTAMP('2026-09-07 10:15:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(11, 10, 'IN', TO_TIMESTAMP('2026-09-07 14:40:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(12, 30, 'IN', TO_TIMESTAMP('2026-09-08 12:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(13, 65, 'IN', TO_TIMESTAMP('2026-09-09 08:50:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(14, 20, 'IN', TO_TIMESTAMP('2026-09-09 16:30:00', 'YYYY-MM-DD HH24:MI:SS'));

-- Outbound Dispatches ('OUT')
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(1,   6, 'OUT', TO_TIMESTAMP('2026-09-15 14:20:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(2,   8, 'OUT', TO_TIMESTAMP('2026-09-16 11:05:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(3,   5, 'OUT', TO_TIMESTAMP('2026-09-18 17:35:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
(11,  6, 'OUT', TO_TIMESTAMP('2026-09-20 16:10:00', 'YYYY-MM-DD HH24:MI:SS'));

COMMIT;
