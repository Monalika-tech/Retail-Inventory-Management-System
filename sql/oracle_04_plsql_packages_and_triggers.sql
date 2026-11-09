-- ============================================================================
-- PROJECT: Retail Store Inventory and Supplier Management System
-- MODULE: oracle_04_plsql_packages_and_triggers.sql
-- PURPOSE: Advanced PL/SQL Automation (Triggers, Procedures, Packages)
-- COMPATIBILITY: Oracle Database 12c / 18c / 19c / 21c / 23c
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Database Trigger: trg_sync_product_stock
-- Automatically synchronizes on-hand Product stock when a StockLog is inserted.
-- Enforces business integrity: StockQuantity can never drop below zero.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_sync_product_stock
AFTER INSERT ON StockLogs
FOR EACH ROW
DECLARE
    v_current_stock NUMBER;
BEGIN
    SELECT StockQuantity INTO v_current_stock
    FROM Products
    WHERE ProductID = :NEW.ProductID;

    IF :NEW.ChangeType = 'IN' THEN
        UPDATE Products
        SET StockQuantity = StockQuantity + :NEW.QuantityChanged
        WHERE ProductID = :NEW.ProductID;

    ELSIF :NEW.ChangeType = 'OUT' THEN
        IF v_current_stock < :NEW.QuantityChanged THEN
            RAISE_APPLICATION_ERROR(-20001, 'Insufficient stock! Current: ' || v_current_stock || ', Requested: ' || :NEW.QuantityChanged);
        END IF;

        UPDATE Products
        SET StockQuantity = StockQuantity - :NEW.QuantityChanged
        WHERE ProductID = :NEW.ProductID;

    ELSIF :NEW.ChangeType = 'ADJUSTMENT' THEN
        UPDATE Products
        SET StockQuantity = :NEW.QuantityChanged
        WHERE ProductID = :NEW.ProductID;
    END IF;
END;
/

-- ----------------------------------------------------------------------------
-- 2. Stored Procedure: sp_procure_reorder
-- Scans low-stock items from vw_reorder_report and logs purchase order actions.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_procure_reorder (
    p_safety_threshold IN NUMBER DEFAULT 15,
    p_reorder_batch_size IN NUMBER DEFAULT 25
) AS
    CURSOR c_reorders IS
        SELECT ProductID, ProductName, StockQuantity, SupplierName, ContactPerson, SupplierPhone
        FROM vw_reorder_report
        WHERE StockQuantity < p_safety_threshold;

    v_orders_placed NUMBER := 0;
BEGIN
    DBMS_OUTPUT.PUT_LINE('==================================================');
    DBMS_OUTPUT.PUT_LINE('PROCUREMENT AUTOMATION RUNNER');
    DBMS_OUTPUT.PUT_LINE('==================================================');

    FOR r IN c_reorders LOOP
        DBMS_OUTPUT.PUT_LINE('Generating PO for: ' || r.ProductName || ' (Stock: ' || r.StockQuantity || ')');
        DBMS_OUTPUT.PUT_LINE('-> Supplier: ' || r.SupplierName || ' | Contact: ' || r.ContactPerson || ' | Tel: ' || r.SupplierPhone);
        DBMS_OUTPUT.PUT_LINE('-> Authorized Order Qty: ' || p_reorder_batch_size || ' units');
        DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');
        v_orders_placed := v_orders_placed + 1;
    END LOOP;

    DBMS_OUTPUT.PUT_LINE('Completed. Total Purchase Orders Dispatched: ' || v_orders_placed);
END;
/

-- ----------------------------------------------------------------------------
-- 3. PL/SQL Package Specification & Body: pkg_inventory_mgmt
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE pkg_inventory_mgmt AS
    FUNCTION fn_get_category_valuation(p_category_id IN NUMBER) RETURN NUMBER;
    PROCEDURE sp_log_shipment(p_product_id IN NUMBER, p_quantity IN NUMBER);
END pkg_inventory_mgmt;
/

CREATE OR REPLACE PACKAGE BODY pkg_inventory_mgmt AS

    -- Function: Calculates total inventory valuation for a category
    FUNCTION fn_get_category_valuation(p_category_id IN NUMBER) RETURN NUMBER IS
        v_total_valuation NUMBER(12, 2) := 0;
    BEGIN
        SELECT NVL(SUM(UnitPrice * StockQuantity), 0)
        INTO v_total_valuation
        FROM Products
        WHERE CategoryID = p_category_id;

        RETURN v_total_valuation;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;
    END fn_get_category_valuation;

    -- Procedure: Logs a verified inbound shipment
    PROCEDURE sp_log_shipment(p_product_id IN NUMBER, p_quantity IN NUMBER) IS
    BEGIN
        IF p_quantity <= 0 THEN
            RAISE_APPLICATION_ERROR(-20002, 'Quantity must be strictly positive.');
        END IF;

        INSERT INTO StockLogs (ProductID, QuantityChanged, ChangeType)
        VALUES (p_product_id, p_quantity, 'IN');

        COMMIT;
    END sp_log_shipment;

END pkg_inventory_mgmt;
/
