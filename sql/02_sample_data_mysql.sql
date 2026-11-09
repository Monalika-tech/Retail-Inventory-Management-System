-- ============================================================================
-- PROJECT: Retail Store Inventory and Supplier Management System
-- MODULE: 02_sample_data_mysql.sql (DML)
-- COMPATIBILITY: MySQL 8.0+
-- ============================================================================

USE retail_inventory_db;

-- ----------------------------------------------------------------------------
-- 1. Suppliers (6 records across diverse cities)
-- ----------------------------------------------------------------------------
INSERT INTO Suppliers (SupplierID, SupplierName, ContactPerson, Phone, City) VALUES
(1, 'Apex Electronics Dist.',    'Marcus Vance',    '+1-408-555-0110', 'San Jose'),
(2, 'Valley Harvest Organics',  'Clara Higgins',   '+1-503-555-0142', 'Portland'),
(3, 'Metro Style Apparels',      'Derrick Cole',    '+1-212-555-0198', 'New York'),
(4, 'Summit Home Appliances',    'Eleanor Wright',  '+1-312-555-0177', 'Chicago'),
(5, 'Beacon Stationery Co.',     'Julian Patel',    '+1-617-555-0133', 'Boston'),
(6, 'Northern Logistics Corp',   'Astrid Lindholm', '+1-612-555-0155', 'Minneapolis'); 
-- Note: Supplier 6 has zero products assigned to test LEFT JOIN queries.

-- ----------------------------------------------------------------------------
-- 2. Categories (6 records)
-- ----------------------------------------------------------------------------
INSERT INTO Categories (CategoryID, CategoryName, Description) VALUES
(1, 'Electronics',      'Consumer gadgets, computer hardware, and accessories'),
(2, 'Groceries',        'Packaged organic food, beverages, and pantry staples'),
(3, 'Apparel',          'Men and women casual wear, outerwear, and accessories'),
(4, 'Home Appliances',  'Small to medium kitchen appliances and room utilities'),
(5, 'Stationery',       'Office supplies, paper goods, and writing instruments'),
(6, 'Sporting Goods',   'Fitness equipment, athletic apparel, and outdoor gear');
-- Note: Category 6 has zero products assigned to test LEFT JOIN queries.

-- ----------------------------------------------------------------------------
-- 3. Products (14 records with varied pricing and stock levels)
-- ----------------------------------------------------------------------------
INSERT INTO Products (ProductID, ProductName, CategoryID, SupplierID, UnitPrice, StockQuantity) VALUES
-- Category 1: Electronics (Supplier 1)
(1,  'ANC Wireless Headphones',      1, 1, 129.99, 24),
(2,  'Ergonomic Mechanical Keyboard', 1, 1,  89.50,  7),  -- Low Stock (< 10)
(3,  'Ultra-Wide 34-Inch Monitor',   1, 1, 449.00,  3),  -- Critical Stock (< 10)

-- Category 2: Groceries (Supplier 2)
(4,  'Organic Cold-Pressed Olive Oil', 2, 2,  18.75, 45),
(5,  'Artisan Roast Coffee Beans',     2, 2,  14.50, 11), -- Low Stock (< 15)
(6,  'Raw Unfiltered Honey 1kg',       2, 2,  12.25,  6), -- Critical Stock (< 10)

-- Category 3: Apparel (Supplier 3)
(7,  'Classic Cotton Crewneck Tee',  3, 3,  19.99, 65),
(8,  'Slim-Fit Stretch Denim Jeans', 3, 3,  58.00, 18),
(9,  'Merino Wool Winter Scarf',     3, 3,  28.50,  5),  -- Critical Stock (< 10)

-- Category 4: Home Appliances (Supplier 4)
(10, 'Digital Convection Air Fryer', 4, 4, 119.99, 16),
(11, 'Cordless Stick Vacuum Cleaner',4, 4, 199.50,  4),  -- Critical Stock (< 10)
(12, 'Variable Temp Electric Kettle',4, 4,  42.00, 22),

-- Category 5: Stationery (Supplier 5)
(13, 'Hardcover Dotted Journal',     5, 5,  13.50, 50),
(14, 'Archival Fine-Liner Pen Set',  5, 5,  11.25,  8);  -- Low Stock (< 10)

-- ----------------------------------------------------------------------------
-- 4. StockLogs (18 records showing inbound, outbound, and adjustments)
-- ----------------------------------------------------------------------------
INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType, LogDate) VALUES
-- Restocks (IN)
(1,  30, 'IN',  '2026-09-01 08:30:00'),
(2,  15, 'IN',  '2026-09-01 09:15:00'),
(3,   8, 'IN',  '2026-09-02 10:00:00'),
(4,  60, 'IN',  '2026-09-03 11:20:00'),
(5,  25, 'IN',  '2026-09-03 13:00:00'),
(6,  16, 'IN',  '2026-09-04 14:10:00'),
(7,  90, 'IN',  '2026-09-05 09:45:00'),
(8,  30, 'IN',  '2026-09-05 11:30:00'),
(9,  15, 'IN',  '2026-09-06 15:00:00'),
(10, 20, 'IN',  '2026-09-07 10:15:00'),
(11, 10, 'IN',  '2026-09-07 14:40:00'),
(12, 30, 'IN',  '2026-09-08 12:00:00'),
(13, 65, 'IN',  '2026-09-09 08:50:00'),
(14, 20, 'IN',  '2026-09-09 16:30:00'),

-- Sales Dispatches (OUT)
(1,   6, 'OUT', '2026-09-15 14:20:00'),
(2,   8, 'OUT', '2026-09-16 11:05:00'),
(3,   5, 'OUT', '2026-09-18 17:35:00'),
(11,  6, 'OUT', '2026-09-20 16:10:00');
