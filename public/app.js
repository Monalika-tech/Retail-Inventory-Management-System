/**
 * ============================================================================
 * Retail Store Inventory and Supplier Management System
 * Frontend Client Application Controller
 * ============================================================================
 */

let allProducts = [];
let allCategories = [];
let allSuppliers = [];
let isLowStockOnly = false;
let activePOProduct = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupKeyboardShortcuts();
  loadAllData();
});

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      const search = document.getElementById('global-search-input');
      if (search) search.focus();
    }
  });
}

// ----------------------------------------------------------------------------
// DATA FETCHING & STATE
// ----------------------------------------------------------------------------
async function loadAllData() {
  await Promise.all([
    loadDashboard(),
    loadCategories(),
    loadSuppliers(),
    loadProducts(),
    loadReorderReport(),
    loadStockLogs(),
  ]);
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard/metrics');
    const data = await res.json();

    document.getElementById('metric-valuation').textContent = `$${Number(data.valuation).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('metric-products').textContent = `${data.totalProducts} Items`;
    document.getElementById('metric-suppliers').textContent = `${data.activeSuppliers} / ${data.totalSuppliers} Active`;
    
    const inactive = data.totalSuppliers - data.activeSuppliers;
    document.getElementById('metric-suppliers-sub').textContent = inactive > 0 ? `${inactive} Inactive (0 SKUs)` : 'All suppliers active';

    document.getElementById('metric-lowstock').textContent = `${data.lowStockCount} SKUs < 15`;
    document.getElementById('metric-critical').textContent = `${data.criticalCount} Critical (< 10 units)`;

    document.getElementById('badge-products-count').textContent = data.totalProducts;
    document.getElementById('badge-reorders-count').textContent = data.lowStockCount;

    // Movement trends
    loadMovementTrends();
    loadReorderTicker();
  } catch (err) {
    showToast('Failed to load dashboard metrics', 'error');
  }
}

async function loadMovementTrends() {
  try {
    const res = await fetch('/api/dashboard/movements');
    const rows = await res.json();
    const container = document.getElementById('dashboard-movement-bars');
    if (!container) return;

    if (rows.length === 0) {
      container.innerHTML = '<div class="text-xs text-slate-400 py-3">No stock movement logs recorded yet.</div>';
      return;
    }

    container.innerHTML = rows.slice(0, 5).map(row => {
      const total = row.TotalReceived + row.TotalDispatched || 1;
      const inPct = Math.round((row.TotalReceived / total) * 100);
      const outPct = 100 - inPct;

      return `
        <div>
          <div class="flex justify-between text-xs mb-1 font-medium text-slate-700">
            <span class="truncate max-w-[280px]">${row.ProductName} <span class="text-slate-400">(${row.CategoryName})</span></span>
            <span class="font-mono text-slate-500">${row.TotalReceived} IN / ${row.TotalDispatched} OUT</span>
          </div>
          <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
            <div class="bg-emerald-500 h-full rounded-l-full" style="width: ${inPct}%" title="${row.TotalReceived} Restocked ('IN')"></div>
            <div class="bg-rose-500 h-full rounded-r-full" style="width: ${outPct}%" title="${row.TotalDispatched} Dispatched ('OUT')"></div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadReorderTicker() {
  try {
    const res = await fetch('/api/reorders');
    const rows = await res.json();
    const container = document.getElementById('dashboard-reorder-ticker');
    if (!container) return;

    if (rows.length === 0) {
      container.innerHTML = '<div class="text-xs text-emerald-600 font-semibold py-2">✓ All inventory levels are above safety stock!</div>';
      return;
    }

    container.innerHTML = rows.slice(0, 3).map(r => `
      <div class="p-2.5 rounded-lg border ${r.StockQuantity < 10 ? 'border-rose-100 bg-rose-50/40' : 'border-amber-100 bg-amber-50/40'} flex items-center justify-between">
        <div class="truncate mr-2">
          <div class="text-xs font-bold text-slate-900 truncate">${r.ProductName}</div>
          <div class="text-[11px] text-slate-500 truncate">${r.SupplierName} • ${r.SupplierCity}</div>
        </div>
        <div class="text-right shrink-0">
          <span class="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${r.StockQuantity < 10 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}">
            ${r.StockQuantity} Left
          </span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadCategories() {
  const res = await fetch('/api/categories');
  allCategories = await res.json();

  // Populate category dropdown filters
  const filter = document.getElementById('product-category-filter');
  const addSelect = document.getElementById('add-prod-category');
  if (filter) {
    filter.innerHTML = '<option value="">All Categories</option>' + 
      allCategories.map(c => `<option value="${c.CategoryID}">${c.CategoryName}</option>`).join('');
  }
  if (addSelect) {
    addSelect.innerHTML = allCategories.map(c => `<option value="${c.CategoryID}">${c.CategoryName}</option>`).join('');
  }

  // Populate Categories view grid
  const grid = document.getElementById('categories-grid');
  if (grid) {
    grid.innerHTML = allCategories.map(c => `
      <div class="bg-white rounded-xl p-5 border ${c.ActiveProductsCount === 0 ? 'border-dashed border-amber-300 bg-amber-50/10' : 'border-slate-200'} shadow-sm">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900">${c.CategoryName}</h3>
          <span class="text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${c.ActiveProductsCount === 0 ? 'bg-amber-100 text-amber-800' : 'bg-indigo-50 text-indigo-700'}">
            ${c.ActiveProductsCount} SKUs
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-2">${c.Description || 'No description provided.'}</p>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Aggregate Stock: <strong class="font-mono text-slate-900">${c.TotalStockCount} units</strong></span>
          ${c.ActiveProductsCount === 0 ? '<span class="text-amber-600 font-semibold text-[11px]">Query #6B Gap</span>' : ''}
        </div>
      </div>
    `).join('');
  }
}

async function loadSuppliers() {
  const res = await fetch('/api/suppliers');
  allSuppliers = await res.json();

  // Populate supplier dropdown filters
  const filter = document.getElementById('product-supplier-filter');
  const addSelect = document.getElementById('add-prod-supplier');
  if (filter) {
    filter.innerHTML = '<option value="">All Suppliers</option>' + 
      allSuppliers.map(s => `<option value="${s.SupplierID}">${s.SupplierName}</option>`).join('');
  }
  if (addSelect) {
    addSelect.innerHTML = allSuppliers.map(s => `<option value="${s.SupplierID}">${s.SupplierName}</option>`).join('');
  }

  // Populate Suppliers view grid
  const grid = document.getElementById('suppliers-grid');
  if (grid) {
    grid.innerHTML = allSuppliers.map(s => `
      <div class="bg-white rounded-xl p-5 border ${s.ActiveProductsCount === 0 ? 'border-dashed border-amber-300 bg-amber-50/10' : 'border-slate-200'} shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900 truncate">${s.SupplierName}</h3>
            <span class="text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${s.ActiveProductsCount === 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}">
              ${s.ActiveProductsCount > 0 ? `${s.ActiveProductsCount} Active SKUs` : 'Zero SKUs'}
            </span>
          </div>
          <div class="mt-3 space-y-1 text-xs text-slate-600">
            <div>Contact: <span class="font-medium text-slate-800">${s.ContactPerson}</span></div>
            <div>Phone: <a href="tel:${s.Phone}" class="text-indigo-600 font-mono hover:underline">${s.Phone}</a></div>
            <div>Location: <span class="text-slate-700">${s.City}</span></div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Supplied: <strong>${s.TotalUnitsSupplied} units</strong></span>
          <span>$${Number(s.TotalSuppliedValuation).toLocaleString('en-US')}</span>
        </div>
      </div>
    `).join('');
  }
}

async function loadProducts() {
  const res = await fetch('/api/products');
  allProducts = await res.json();
  renderProductsTable(allProducts);

  // Update log movement product dropdown
  const logSelect = document.getElementById('log-prod-id');
  if (logSelect) {
    logSelect.innerHTML = allProducts.map(p => `
      <option value="${p.ProductID}">#PRD-${p.ProductID}: ${p.ProductName} (Current Stock: ${p.StockQuantity})</option>
    `).join('');
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('products-table-body');
  const countLabel = document.getElementById('product-count-label');
  if (!tbody) return;

  if (countLabel) countLabel.textContent = `Showing ${products.length} products`;

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-slate-400">No products match current filter criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => {
    let statusPill = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">OPTIMAL</span>';
    let rowBg = '';

    if (p.StockQuantity < 10) {
      statusPill = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">CRITICAL</span>';
      rowBg = 'bg-rose-50/20';
    } else if (p.StockQuantity < 15) {
      statusPill = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">LOW STOCK</span>';
      rowBg = 'bg-amber-50/15';
    }

    return `
      <tr class="hover:bg-slate-50/70 transition ${rowBg}">
        <td class="py-3 px-4 font-mono font-medium text-slate-500">PRD-${String(p.ProductID).padStart(3, '0')}</td>
        <td class="py-3 px-4 font-semibold text-slate-900">${p.ProductName}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">${p.CategoryName}</span></td>
        <td class="py-3 px-4 text-slate-600">${p.SupplierName} <span class="text-slate-400 font-mono">(${p.SupplierCity})</span></td>
        <td class="py-3 px-4 text-right font-mono font-semibold text-slate-900">$${Number(p.UnitPrice).toFixed(2)}</td>
        <td class="py-3 px-4 text-center font-mono font-bold ${p.StockQuantity < 15 ? 'text-amber-700' : 'text-slate-800'}">${p.StockQuantity} units</td>
        <td class="py-3 px-4 text-center">${statusPill}</td>
        <td class="py-3 px-4 text-right space-x-1">
          <button onclick="openEditProductModal(${p.ProductID})" class="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100" title="Edit Product">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onclick="promptDeleteProduct(${p.ProductID}, '${escapeHtml(p.ProductName)}')" class="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100" title="Delete Product (Cascading Delete)">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterProductsTable() {
  const search = document.getElementById('product-search-input')?.value.toLowerCase() || '';
  const cat = document.getElementById('product-category-filter')?.value;
  const sup = document.getElementById('product-supplier-filter')?.value;

  let filtered = allProducts.filter(p => {
    const matchSearch = p.ProductName.toLowerCase().includes(search) || 
                        p.CategoryName.toLowerCase().includes(search) ||
                        p.SupplierName.toLowerCase().includes(search);
    const matchCat = cat ? String(p.CategoryID) === cat : true;
    const matchSup = sup ? String(p.SupplierID) === sup : true;
    const matchLow = isLowStockOnly ? p.StockQuantity < 15 : true;
    return matchSearch && matchCat && matchSup && matchLow;
  });

  renderProductsTable(filtered);
}

function toggleLowStockFilter() {
  isLowStockOnly = !isLowStockOnly;
  const btn = document.getElementById('product-lowstock-toggle');
  if (isLowStockOnly) {
    btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white shadow-sm';
    btn.textContent = 'Showing Low Stock (< 15) ✓';
  } else {
    btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition';
    btn.textContent = 'Show Low Stock (< 15) Only';
  }
  filterProductsTable();
}

function handleGlobalSearch(term) {
  const clean = term.trim().toLowerCase();
  if (clean.length > 0) {
    switchTab('products');
    const input = document.getElementById('product-search-input');
    if (input) {
      input.value = clean;
      filterProductsTable();
    }
  }
}

// ----------------------------------------------------------------------------
// VIEW 3: REORDER REPORT (vw_reorder_report)
// ----------------------------------------------------------------------------
async function loadReorderReport() {
  try {
    const res = await fetch('/api/reorders');
    const rows = await res.json();
    const tbody = document.getElementById('reorder-table-body');
    if (!tbody) return;

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-emerald-600 font-semibold">✓ Outstanding inventory health: Zero items under 15 units!</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr class="hover:bg-slate-50/70 transition ${r.StockQuantity < 10 ? 'bg-rose-50/20' : 'bg-amber-50/15'}">
        <td class="py-3 px-4 font-mono font-medium text-slate-500">PRD-${String(r.ProductID).padStart(3, '0')}</td>
        <td class="py-3 px-4 font-semibold text-slate-900">${r.ProductName}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">${r.CategoryName}</span></td>
        <td class="py-3 px-4 text-center font-mono font-bold ${r.StockQuantity < 10 ? 'text-rose-700' : 'text-amber-700'}">${r.StockQuantity} units</td>
        <td class="py-3 px-4 font-medium text-slate-800">${r.SupplierName}</td>
        <td class="py-3 px-4 text-slate-600">${r.ContactPerson}</td>
        <td class="py-3 px-4">
          <a href="tel:${r.SupplierPhone}" class="text-indigo-600 font-mono hover:underline flex items-center gap-1">
            📞 ${r.SupplierPhone}
          </a>
          <span class="text-[11px] text-slate-400 font-mono">${r.SupplierCity}</span>
        </td>
        <td class="py-3 px-4 text-right">
          <button onclick="openReorderPOModal(${r.ProductID})" class="px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition">
            Generate PO
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function openReorderPOModal(productId) {
  const product = allProducts.find(p => p.ProductID === productId);
  if (!product) return;

  activePOProduct = product;
  document.getElementById('po-product-name').textContent = product.ProductName;
  document.getElementById('po-supplier-details').textContent = `Supplier: ${product.SupplierName} • ${product.SupplierCity}`;
  document.getElementById('po-stock-status').textContent = `Current Stock: ${product.StockQuantity} units (Safety Deficit: ${15 - product.StockQuantity} units)`;
  document.getElementById('po-order-quantity').value = Math.max(25, 30 - product.StockQuantity);

  openModal('modal-reorder-po');
}

async function confirmReorderPO() {
  const qty = Number(document.getElementById('po-order-quantity').value);
  if (!activePOProduct || qty <= 0) return;

  // Record stock movement 'IN'
  try {
    const res = await fetch('/api/stock-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ProductID: activePOProduct.ProductID,
        QuantityChanged: qty,
        ChangeType: 'IN',
      }),
    });

    if (!res.ok) throw new Error('Failed to record restock PO');

    closeModal('modal-reorder-po');
    showToast(`Purchase order authorized! Restocked ${qty} units for ${activePOProduct.ProductName}.`, 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------------------------------
// VIEW 4: STOCK AUDIT LOGS
// ----------------------------------------------------------------------------
async function loadStockLogs() {
  try {
    const res = await fetch('/api/stock-logs');
    const logs = await res.json();
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400">No stock movement transactions logged yet.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => {
      let badge = '';
      if (l.ChangeType === 'IN') {
        badge = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">↑ Restock (IN)</span>';
      } else if (l.ChangeType === 'OUT') {
        badge = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">↓ Dispatch (OUT)</span>';
      } else {
        badge = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">⇄ Audit Adjust</span>';
      }

      return `
        <tr class="hover:bg-slate-50/70 transition">
          <td class="py-3 px-4 font-mono font-medium text-slate-500">#LOG-${String(l.LogID).padStart(4, '0')}</td>
          <td class="py-3 px-4 font-mono text-slate-600">${l.LogDate}</td>
          <td class="py-3 px-4 font-semibold text-slate-900">${l.ProductName}</td>
          <td class="py-3 px-4 text-slate-600">${l.CategoryName}</td>
          <td class="py-3 px-4 text-center">${badge}</td>
          <td class="py-3 px-4 text-right font-mono font-bold ${l.ChangeType === 'IN' ? 'text-emerald-600' : 'text-rose-600'}">
            ${l.ChangeType === 'IN' ? '+' : '-'}${l.QuantityChanged} units
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------------------------------
// CRUD ACTIONS: PRODUCTS
// ----------------------------------------------------------------------------
function openAddProductModal() {
  document.getElementById('form-add-product').reset();
  openModal('modal-add-product');
}

async function submitAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById('add-prod-name').value.trim();
  const cat = document.getElementById('add-prod-category').value;
  const sup = document.getElementById('add-prod-supplier').value;
  const price = document.getElementById('add-prod-price').value;
  const stock = document.getElementById('add-prod-stock').value;

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ProductName: name,
        CategoryID: cat,
        SupplierID: sup,
        UnitPrice: price,
        StockQuantity: stock,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add product');

    closeModal('modal-add-product');
    showToast(`Product "${name}" created successfully with ID #${data.productID}!`, 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openEditProductModal(id) {
  const p = allProducts.find(item => item.ProductID === id);
  if (!p) return;

  document.getElementById('edit-prod-id').value = p.ProductID;
  document.getElementById('edit-prod-name').value = p.ProductName;
  document.getElementById('edit-prod-price').value = p.UnitPrice;
  document.getElementById('edit-prod-stock').value = p.StockQuantity;

  openModal('modal-edit-product');
}

async function submitEditProduct(e) {
  e.preventDefault();
  const id = document.getElementById('edit-prod-id').value;
  const name = document.getElementById('edit-prod-name').value.trim();
  const price = document.getElementById('edit-prod-price').value;
  const stock = document.getElementById('edit-prod-stock').value;

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ProductName: name,
        UnitPrice: price,
        StockQuantity: stock,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update product');

    closeModal('modal-edit-product');
    showToast(`Product #${id} updated successfully!`, 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function promptDeleteProduct(id, name) {
  const confirmed = confirm(
    `CASCADING DELETE VERIFICATION:\n\n` +
    `Are you sure you want to permanently delete product "${name}" (ID #${id})?\n\n` +
    `Database Rule: Deleting this product will automatically trigger ON DELETE CASCADE to remove all linked audit records from StockLogs!`
  );

  if (!confirmed) return;

  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete product');

    showToast(data.message, 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------------------------------
// STOCK MOVEMENT
// ----------------------------------------------------------------------------
function openLogMovementModal() {
  document.getElementById('form-log-movement').reset();
  openModal('modal-log-movement');
}

async function submitStockMovement(e) {
  e.preventDefault();
  const prodId = document.getElementById('log-prod-id').value;
  const type = document.getElementById('log-change-type').value;
  const qty = document.getElementById('log-quantity').value;

  try {
    const res = await fetch('/api/stock-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ProductID: prodId,
        QuantityChanged: qty,
        ChangeType: type,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to log stock movement');

    closeModal('modal-log-movement');
    showToast(`Stock transaction recorded! Product inventory adjusted to ${data.updatedStock} units.`, 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------------------------------
// VIEW 7: ACADEMIC SQL QUERY EXPLORER
// ----------------------------------------------------------------------------
async function executeAcademicQuery(queryId) {
  try {
    // Highlight selected button
    document.querySelectorAll('.query-select-btn').forEach(b => b.classList.remove('border-indigo-600', 'bg-indigo-50/40'));

    const res = await fetch(`/api/queries?id=${queryId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('query-active-title').textContent = data.title;
    document.getElementById('query-active-desc').textContent = data.description;
    document.getElementById('query-active-sql').textContent = data.sql;

    const resultsContainer = document.getElementById('query-active-results');
    const rows = data.results;

    if (!rows || rows.length === 0) {
      resultsContainer.innerHTML = '<div class="p-6 text-center text-xs text-slate-400">Query returned 0 rows.</div>';
      return;
    }

    const headers = Object.keys(rows[0]);
    const theadHtml = headers.map(h => `<th class="py-2.5 px-3 bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border-b border-slate-200 text-left uppercase">${h}</th>`).join('');
    
    const tbodyHtml = rows.map(r => `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        ${headers.map(h => `<td class="py-2 px-3 text-xs font-mono text-slate-800">${r[h] !== null ? r[h] : '<span class="text-slate-400">NULL</span>'}</td>`).join('')}
      </tr>
    `).join('');

    resultsContainer.innerHTML = `
      <table class="w-full text-left border-collapse">
        <thead><tr>${theadHtml}</tr></thead>
        <tbody>${tbodyHtml}</tbody>
      </table>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------------------------------
// DATABASE RESET
// ----------------------------------------------------------------------------
async function resetDatabasePrompt() {
  const confirmed = confirm(
    'RESTORE FACTORY 3NF DATASET?\n\n' +
    'This will wipe all changes, re-execute the schema definition, and re-populate the standard 14 products, 6 suppliers, 6 categories, and 18 stock logs.'
  );

  if (!confirmed) return;

  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Database reset successfully to factory state!', 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------------------------------
// TAB NAVIGATION & UTILITIES
// ----------------------------------------------------------------------------
function switchTab(tabId) {
  const tabs = ['dashboard', 'products', 'reorders', 'logs', 'suppliers', 'categories', 'queries'];
  
  tabs.forEach(t => {
    const section = document.getElementById(`view-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    
    if (section) section.classList.add('hidden');
    if (navBtn) {
      navBtn.classList.remove('bg-indigo-600/15', 'text-indigo-400', 'border', 'border-indigo-500/20');
      navBtn.classList.add('text-slate-400');
    }
  });

  const activeSection = document.getElementById(`view-${tabId}`);
  const activeNav = document.getElementById(`nav-${tabId}`);

  if (activeSection) activeSection.classList.remove('hidden');
  if (activeNav) {
    activeNav.classList.remove('text-slate-400');
    activeNav.classList.add('bg-indigo-600/15', 'text-indigo-400', 'border', 'border-indigo-500/20');
  }

  // Auto execute query 1 if opening queries tab
  if (tabId === 'queries') {
    executeAcademicQuery('1');
  }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-rose-600' : type === 'success' ? 'bg-emerald-600' : 'bg-indigo-600';

  toast.className = `${bg} text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center justify-between gap-3 pointer-events-auto transition transform translate-y-2 opacity-0 duration-200`;
  toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white">✕</button>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
