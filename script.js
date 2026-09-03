'use strict';
/* ==========================================================================
   0. GLOBAL SAFETY NET
   Registered first, before anything else runs. If any later code throws —
   a bad API response shape, a typo, anything — this guarantees the page
   shows a visible error instead of silently staying blank. Check the
   browser console for the full stack trace whenever this fires.
   ========================================================================== */
function showFatalError(message) {
  const tableBody = document.getElementById('tableBody');
  const errorState = document.getElementById('errorState');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const pagination = document.getElementById('pagination');

  if (tableBody) tableBody.innerHTML = '';
  if (loadingState) loadingState.hidden = true;
  if (emptyState) emptyState.hidden = true;
  if (pagination) pagination.hidden = true;

  if (errorState) {
    errorState.hidden = false;
    const title = errorState.querySelector('.table-state-title');
    if (title) {
      title.textContent = message
        ? `Something went wrong: ${message}`
        : 'Unable to load inventory.';
    }
  }
}

window.addEventListener('error', (e) => {
  console.error('Unhandled error:', e.error || e.message);
  showFatalError(e.error?.message || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  showFatalError(e.reason?.message || String(e.reason));
});

/* ==========================================================================
   1. API CONFIGURATION — the only place API URLs live.
   Change API_BASE_URL to point at your Java backend.
   ========================================================================== */
const API_BASE_URL = 'http://localhost:8080/api';

const ENDPOINTS = {
  products: () => `${API_BASE_URL}/products`,
  product: (id) => `${API_BASE_URL}/products/${id}`,
  // Set this to a real endpoint (e.g. `${API_BASE_URL}/products/batch`) if
  // your backend supports true bulk delete. Leave null to use the safe
  // fallback (sequential DELETE calls) in deleteProducts() below.
  productsBatch: null
};

/* ==========================================================================
   2. DATA ADAPTER
   ========================================================================== */
function normalizeProduct(raw) {
  return {
    id: raw.id ?? raw.productId ?? raw._id,
    name: raw.name ?? raw.productName ?? '',
    price: Number(raw.price ?? raw.productPrice ?? 0),
    stock: Number(raw.stockCount ?? raw.stock ?? 0), // Reads stockCount from Java
    imageUrl: raw.imageUrl ?? '',
    category: raw.description ?? raw.category ?? ''  // Maps Java description to the Category UI
  };
}

function denormalizeProduct(product) {
  // Shape sent TO the Java API when you save/add a product
  return {
    name: product.name,
    price: product.price,
    stockCount: product.stock,     // Sends stock back to Java as stockCount
    imageUrl: product.imageUrl || null,
    description: product.category || null // Sends category back to Java as description
  };
}

// Some APIs wrap list responses, e.g. { data: [...] } or { products: [...] }.
function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

/* ==========================================================================
   3. LOW-LEVEL API HELPERS
   ========================================================================== */
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// A wrapper around fetch() that automatically attaches the JWT token and handles errors.
async function apiRequest(url, options = {}) {
  let response;
  
  // 1. Grab the VIP token you saved during login
  const token = localStorage.getItem('jwt_token');

  try {
    response = await fetch(url, {
      ...options,
      headers: { 
        'Content-Type': 'application/json',
        // 2. Attach the token so the Java security bouncer lets you through!
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (networkErr) {
    throw new ApiError('Unable to connect to the inventory server.', 0);
  }

  if (!response.ok) {
    const messages = {
      400: 'Some of the provided product information is invalid.',
      401: 'Unauthorized: Please log in again.', // Added this to help catch token issues
      403: 'Access denied: Your token is missing or invalid.', // Added this too!
      404: 'Product not found.',
      500: 'The server encountered an error. Please try again.'
    };
    throw new ApiError(messages[response.status] || 'Something went wrong. Please try again.', response.status);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
// this will fetch the products from java backend. If any Changes are made, getProduct will be called to fetch the updated list of products and helps to show the stock value Arrows.  
async function getProducts() {
  const payload = await apiRequest(ENDPOINTS.products(), { method: 'GET' });
  const productsList = extractList(payload).map(normalizeProduct);

  // Automatically update metric cards and trend arrows whenever products are fetched
  if (typeof updateInventoryMetrics === 'function') {
    updateInventoryMetrics(productsList);
  }

  return productsList;
}

async function createProduct(product) {
  const payload = await apiRequest(ENDPOINTS.products(), {
    method: 'POST',
    body: JSON.stringify(denormalizeProduct(product))
  });
  return payload ? normalizeProduct(payload) : null;
}

async function updateProduct(id, product) {
  const payload = await apiRequest(ENDPOINTS.product(id), {
    method: 'PUT',
    body: JSON.stringify(denormalizeProduct(product))
  });
  return payload ? normalizeProduct(payload) : null;
}

async function deleteProduct(id) {
  return apiRequest(ENDPOINTS.product(id), { method: 'DELETE' });
}

// Bulk delete: uses a real batch endpoint if configured, otherwise falls
// back to sequential single-deletes (safest default for an unknown API).
async function deleteProducts(ids) {
  if (ENDPOINTS.productsBatch) {
    return apiRequest(ENDPOINTS.productsBatch, {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    });
  }
  for (const id of ids) {
    await deleteProduct(id);
  }
  return null;
}

/* ==========================================================================
   4. STATE
   ========================================================================== */
const state = {
  products: [],
  loadStatus: 'loading', // 'loading' | 'success' | 'error'
  searchQuery: '',
  sortBy: 'name-asc',
  currentPage: 1,
  pageSize: 5,
  selectedIds: new Set(),
  pendingDeleteIds: null
};

/* ==========================================================================
   5. UTILITIES
   ========================================================================== */
const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
function formatINR(value) {
  return inrFormatter.format(Number(value) || 0);
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function stockClass(stock) {
  if (stock > 20) return 'stock-high';
  if (stock >= 10) return 'stock-medium';
  return 'stock-low';
}

/* ==========================================================================
   6. DOM REFERENCES
   ========================================================================== */
const el = {
  search: document.getElementById('globalSearch'),
  sortSelect: document.getElementById('sortSelect'),

  metricTotalProducts: document.getElementById('metricTotalProducts'),
  metricTotalValue: document.getElementById('metricTotalValue'),
  metricLowStock: document.getElementById('metricLowStock'),

  addProductBtn: document.getElementById('addProductBtn'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),

  bulkBar: document.getElementById('bulkBar'),
  bulkCount: document.getElementById('bulkCount'),
  batchDeleteBtn: document.getElementById('batchDeleteBtn'),
  selectAllCheckbox: document.getElementById('selectAllCheckbox'),

  tableBody: document.getElementById('tableBody'),
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  emptyState: document.getElementById('emptyState'),
  retryBtn: document.getElementById('retryBtn'),

  paginationSummary: document.getElementById('paginationSummary'),
  pager: document.getElementById('pager'),

  productModalBackdrop: document.getElementById('productModalBackdrop'),
  productForm: document.getElementById('productForm'),
  productModalTitle: document.getElementById('productModalTitle'),
  productModalSubtitle: document.getElementById('productModalSubtitle'),
  productId: document.getElementById('productId'),
  productName: document.getElementById('productName'),
  productPrice: document.getElementById('productPrice'),
  productStock: document.getElementById('productStock'),
  productImageUrl: document.getElementById('productImageUrl'),
  productCategory: document.getElementById('productCategory'),
  closeProductModal: document.getElementById('closeProductModal'),
  cancelProductBtn: document.getElementById('cancelProductBtn'),
  saveProductBtn: document.getElementById('saveProductBtn'),

  deleteModalBackdrop: document.getElementById('deleteModalBackdrop'),
  deleteModalTitle: document.getElementById('deleteModalTitle'),
  deleteModalMessage: document.getElementById('deleteModalMessage'),
  closeDeleteModal: document.getElementById('closeDeleteModal'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

  toastContainer: document.getElementById('toastContainer')
};

/* ==========================================================================
   7. DERIVED DATA (search + sort + paginate)
   ========================================================================== */
function getVisibleProducts() {
  let list = state.products;

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    list = list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      String(p.id).toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  const [field, dir] = state.sortBy.split('-');
  const sorted = [...list].sort((a, b) => {
    let cmp = 0;
    if (field === 'name') cmp = a.name.localeCompare(b.name);
    if (field === 'price') cmp = a.price - b.price;
    if (field === 'stock') cmp = a.stock - b.stock;
    return dir === 'desc' ? -cmp : cmp;
  });

  return sorted;
}

function getPageSlice(list) {
  const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  const start = (state.currentPage - 1) * state.pageSize;
  return {
    pageItems: list.slice(start, start + state.pageSize),
    totalItems: list.length,
    totalPages,
    start
  };
}

/* ==========================================================================
   8. RENDERING
   ========================================================================== */
function renderMetrics() {
  const total = state.products.length;
  const totalValue = state.products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStock = state.products.filter((p) => p.stock < 10).length;

  el.metricTotalProducts.textContent = total.toLocaleString('en-IN');
  el.metricTotalValue.textContent = formatINR(totalValue);
  el.metricLowStock.textContent = lowStock.toLocaleString('en-IN');
}

function productThumbHtml(product) {
  if (product.imageUrl) {
    return `<div class="product-thumb"><img src="${escapeHtml(product.imageUrl)}" alt="" onerror="this.parentElement.innerHTML=window.__fallbackIcon;"></div>`;
  }
  return `<div class="product-thumb">${FALLBACK_ICON}</div>`;
}

const FALLBACK_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 7 L12 12 L21 7" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
window.__fallbackIcon = FALLBACK_ICON;

function renderRow(product) {
  const tr = document.createElement('tr');
  tr.dataset.id = product.id;

  const sClass = stockClass(product.stock);
  const isChecked = state.selectedIds.has(product.id);

  tr.innerHTML = `
    <td class="col-checkbox">
      <input type="checkbox" class="row-checkbox" aria-label="Select product ${escapeHtml(product.name)}" ${isChecked ? 'checked' : ''}>
    </td>
    <td class="product-id">#${escapeHtml(product.id)}</td>
    <td>${productThumbHtml(product)}</td>
    <td class="product-name-cell">
      <div class="p-name">${escapeHtml(product.name)}</div>
      <div class="p-category">${escapeHtml(product.category || '—')}</div>
    </td>
    <td class="price-cell">${formatINR(product.price)}</td>
    <td>
      <span class="stock-badge ${sClass}"><span class="stock-dot"></span>${product.stock}</span>
    </td>
    <td class="col-actions">
      <div class="row-actions">
        <button class="row-action-btn" data-action="edit" aria-label="Edit product">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 15v5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </button>
        <button class="row-action-btn danger" data-action="delete" aria-label="Delete product">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13h6l1-13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </td>
  `;
  return tr;
}

function renderTable() {
  [el.loadingState, el.errorState, el.emptyState].forEach((n) => (n.hidden = true));
  el.tableBody.innerHTML = '';
  document.querySelector('.pagination').hidden = false;

  if (state.loadStatus === 'loading') {
    el.loadingState.hidden = false;
    document.querySelector('.pagination').hidden = true;
    return;
  }
  if (state.loadStatus === 'error') {
    el.errorState.hidden = false;
    document.querySelector('.pagination').hidden = true;
    return;
  }

  const visible = getVisibleProducts();

  if (visible.length === 0) {
    el.emptyState.hidden = false;
    document.querySelector('.pagination').hidden = true;
    renderMetrics();
    return;
  }

  const { pageItems, totalItems, totalPages, start } = getPageSlice(visible);
  pageItems.forEach((p) => el.tableBody.appendChild(renderRow(p)));

  renderPagination(totalItems, totalPages, start, pageItems.length);
  renderMetrics();
  updateBulkBar();
  syncSelectAllCheckbox(pageItems);
}

function renderPagination(totalItems, totalPages, start, pageCount) {
  const from = totalItems === 0 ? 0 : start + 1;
  const to = start + pageCount;
  el.paginationSummary.textContent = `Showing ${from} to ${to} of ${totalItems.toLocaleString('en-IN')} products`;

  el.pager.innerHTML = '';

  const makeBtn = (label, page, opts = {}) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (opts.active) btn.classList.add('is-active');
    if (opts.disabled) btn.disabled = true;
    if (opts.ariaLabel) btn.setAttribute('aria-label', opts.ariaLabel);
    btn.addEventListener('click', () => {
      state.currentPage = page;
      renderTable();
    });
    return btn;
  };

  el.pager.appendChild(makeBtn('Previous', state.currentPage - 1, {
    disabled: state.currentPage <= 1,
    ariaLabel: 'Previous page'
  }));

  const pages = paginationRange(state.currentPage, totalPages);
  pages.forEach((p) => {
    if (p === '...') {
      const span = document.createElement('span');
      span.className = 'ellipsis';
      span.textContent = '…';
      el.pager.appendChild(span);
    } else {
      el.pager.appendChild(makeBtn(String(p), p, { active: p === state.currentPage }));
    }
  });

  el.pager.appendChild(makeBtn('Next', state.currentPage + 1, {
    disabled: state.currentPage >= totalPages,
    ariaLabel: 'Next page'
  }));
}

function paginationRange(current, total) {
  const delta = 1;
  const range = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    } else if (range[range.length - 1] !== '...') {
      range.push('...');
    }
  }
  return range;
}

/* ==========================================================================
   9. BULK SELECTION
   ========================================================================== */
function updateBulkBar() {
  const count = state.selectedIds.size;
  el.bulkBar.hidden = count === 0;
  el.bulkCount.textContent = `${count} selected`;
}

function syncSelectAllCheckbox(pageItems) {
  if (pageItems.length === 0) {
    el.selectAllCheckbox.checked = false;
    el.selectAllCheckbox.indeterminate = false;
    return;
  }
  const selectedOnPage = pageItems.filter((p) => state.selectedIds.has(p.id)).length;
  el.selectAllCheckbox.checked = selectedOnPage === pageItems.length;
  el.selectAllCheckbox.indeterminate = selectedOnPage > 0 && selectedOnPage < pageItems.length;
}

el.tableBody.addEventListener('change', (e) => {
  if (!e.target.classList.contains('row-checkbox')) return;
  const tr = e.target.closest('tr');
  const id = coerceId(tr.dataset.id);
  if (e.target.checked) state.selectedIds.add(id);
  else state.selectedIds.delete(id);
  updateBulkBar();
  syncSelectAllCheckbox(getPageSlice(getVisibleProducts()).pageItems);
});

el.selectAllCheckbox.addEventListener('change', (e) => {
  const pageItems = getPageSlice(getVisibleProducts()).pageItems;
  pageItems.forEach((p) => {
    if (e.target.checked) state.selectedIds.add(p.id);
    else state.selectedIds.delete(p.id);
  });
  renderTable();
});

function coerceId(rawId) {
  const num = Number(rawId);
  return Number.isNaN(num) ? rawId : num;
}

/* ==========================================================================
   10. ROW ACTIONS (edit / delete)
   ========================================================================== */
el.tableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('.row-action-btn');
  if (!btn) return;
  e.stopPropagation();
  const tr = btn.closest('tr');
  const id = coerceId(tr.dataset.id);
  const product = state.products.find((p) => p.id === id);
  if (!product) return;

  if (btn.dataset.action === 'edit') openProductModal(product);
  if (btn.dataset.action === 'delete') openDeleteModal([id], product.name);
});

/* ==========================================================================
   11. SEARCH + SORT
   ========================================================================== */
const handleSearchInput = debounce((value) => {
  state.searchQuery = value;
  state.currentPage = 1;
  renderTable();
}, 250);

el.search.addEventListener('input', (e) => handleSearchInput(e.target.value));

el.sortSelect.addEventListener('change', (e) => {
  state.sortBy = e.target.value;
  state.currentPage = 1;
  renderTable();
});

document.addEventListener('keydown', (e) => {
  const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
  if (isCmdK) {
    e.preventDefault();
    el.search.focus();
  }
  if (e.key === 'Escape') {
    if (!el.productModalBackdrop.hidden) closeProductModal();
    if (!el.deleteModalBackdrop.hidden) closeDeleteModal();
  }
});

/* ==========================================================================
   12. PRODUCT MODAL (add / edit)
   ========================================================================== */
function openProductModal(product) {
  el.productForm.reset();
  clearFieldErrors();

  if (product) {
    el.productModalTitle.textContent = 'Edit Product';
    el.productModalSubtitle.textContent = 'Update the details for this product';
    el.saveProductBtn.querySelector('.btn-label').textContent = 'Update Product';
    el.productId.value = product.id;
    el.productName.value = product.name;
    el.productPrice.value = product.price;
    el.productStock.value = product.stock;
    el.productImageUrl.value = product.imageUrl || '';
    el.productCategory.value = product.category || '';
  } else {
    el.productModalTitle.textContent = 'Add New Product';
    el.productModalSubtitle.textContent = 'Fill in the details to add a new product';
    el.saveProductBtn.querySelector('.btn-label').textContent = 'Save Product';
    el.productId.value = '';
  }

  showModal(el.productModalBackdrop);
  setTimeout(() => el.productName.focus(), 50);
}

function closeProductModal() {
  hideModal(el.productModalBackdrop);
}

el.addProductBtn.addEventListener('click', () => openProductModal(null));
el.emptyAddBtn.addEventListener('click', () => openProductModal(null));
el.closeProductModal.addEventListener('click', closeProductModal);
el.cancelProductBtn.addEventListener('click', closeProductModal);
el.productModalBackdrop.addEventListener('click', (e) => {
  if (e.target === el.productModalBackdrop) closeProductModal();
});

function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach((n) => (n.textContent = ''));
  document.querySelectorAll('.form-field input').forEach((n) => n.classList.remove('has-error'));
}

function setFieldError(input, errorEl, message) {
  input.classList.add('has-error');
  errorEl.textContent = message;
}

function validateProductForm() {
  clearFieldErrors();
  let valid = true;

  const name = el.productName.value.trim();
  if (!name) {
    setFieldError(el.productName, document.getElementById('err-productName'), 'Product name is required.');
    valid = false;
  }

  const price = parseFloat(el.productPrice.value);
  if (el.productPrice.value.trim() === '' || Number.isNaN(price)) {
    setFieldError(el.productPrice, document.getElementById('err-productPrice'), 'Price is required.');
    valid = false;
  } else if (price <= 0) {
    setFieldError(el.productPrice, document.getElementById('err-productPrice'), 'Price must be greater than 0.');
    valid = false;
  }

  const stockRaw = el.productStock.value;
  const stock = Number(stockRaw);
  if (stockRaw.trim() === '' || !Number.isInteger(stock)) {
    setFieldError(el.productStock, document.getElementById('err-productStock'), 'Stock count must be a whole number.');
    valid = false;
  } else if (stock < 0) {
    setFieldError(el.productStock, document.getElementById('err-productStock'), 'Stock count cannot be negative.');
    valid = false;
  }

  return valid;
}

function setSaveButtonLoading(isLoading, label) {
  el.saveProductBtn.disabled = isLoading;
  el.saveProductBtn.querySelector('.btn-label').innerHTML = isLoading
    ? `<span class="btn-spinner" aria-hidden="true"></span> ${label}`
    : label;
}

el.productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateProductForm()) return;

  const isEdit = Boolean(el.productId.value);
  const productData = {
    name: el.productName.value.trim(),
    price: parseFloat(el.productPrice.value),
    stock: parseInt(el.productStock.value, 10),
    imageUrl: el.productImageUrl.value.trim(),
    category: el.productCategory.value.trim()
  };

  setSaveButtonLoading(true, isEdit ? 'Updating...' : 'Saving...');

  try {
    if (isEdit) {
      await updateProduct(coerceId(el.productId.value), productData);
      showToast('success', 'Product Updated Successfully', 'The product details have been updated.');
    } else {
      await createProduct(productData);
      showToast('success', 'Product Added Successfully', 'The product has been added to inventory.');
    }
    closeProductModal();
    await loadProducts();
  } catch (err) {
    showToast('error', 'Something went wrong', err.message);
  } finally {
    setSaveButtonLoading(false, isEdit ? 'Update Product' : 'Save Product');
  }
});

/* ==========================================================================
   13. DELETE MODAL (single + bulk)
   ========================================================================== */
function openDeleteModal(ids, singleName) {
  state.pendingDeleteIds = ids;

  if (ids.length > 1) {
    el.deleteModalTitle.textContent = `Delete ${ids.length} Products?`;
    el.deleteModalMessage.textContent = `This will permanently remove ${ids.length} products from inventory.`;
    el.confirmDeleteBtn.querySelector('.btn-label').textContent = 'Delete Products';
  } else {
    el.deleteModalTitle.textContent = 'Delete Product?';
    el.deleteModalMessage.textContent = 'Are you sure you want to delete this product? This action cannot be undone.';
    el.confirmDeleteBtn.querySelector('.btn-label').textContent = 'Delete Product';
  }

  showModal(el.deleteModalBackdrop);
}

function closeDeleteModal() {
  hideModal(el.deleteModalBackdrop);
  state.pendingDeleteIds = null;
}

el.closeDeleteModal.addEventListener('click', closeDeleteModal);
el.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
el.deleteModalBackdrop.addEventListener('click', (e) => {
  if (e.target === el.deleteModalBackdrop) closeDeleteModal();
});

el.batchDeleteBtn.addEventListener('click', () => {
  openDeleteModal([...state.selectedIds]);
});

el.confirmDeleteBtn.addEventListener('click', async () => {
  const ids = state.pendingDeleteIds;
  if (!ids || ids.length === 0) return;

  const isBulk = ids.length > 1;
  const label = el.confirmDeleteBtn.querySelector('.btn-label');
  const originalLabel = label.textContent;
  el.confirmDeleteBtn.disabled = true;
  label.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> Deleting...`;

  try {
    if (isBulk) {
      await deleteProducts(ids);
      ids.forEach((id) => state.selectedIds.delete(id));
      showToast('success', 'Products Deleted Successfully', `${ids.length} products were removed from inventory.`);
    } else {
      await deleteProduct(ids[0]);
      showToast('success', 'Product Deleted Successfully', 'The product has been removed from inventory.');
    }
    closeDeleteModal();
    await loadProducts();
  } catch (err) {
    showToast('error', 'Delete failed', err.message);
  } finally {
    el.confirmDeleteBtn.disabled = false;
    label.textContent = originalLabel;
  }
});

/* ==========================================================================
   14. MODAL OPEN/CLOSE HELPERS (animation)
   ========================================================================== */
function showModal(backdrop) {
  backdrop.hidden = false;
  requestAnimationFrame(() => backdrop.classList.add('is-open'));
}

function hideModal(backdrop) {
  backdrop.classList.remove('is-open');
  setTimeout(() => {
    backdrop.hidden = true;
  }, 200);
}

/* ==========================================================================
   15. TOASTS
   ========================================================================== */
const TOAST_ICONS = {
  success: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="m8 12.5 2.5 2.5L16 9.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  error: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16.2" r="1" fill="currentColor"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 3 2 20h20L12 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16.8" r=".9" fill="currentColor"/></svg>`
};

function showToast(type, title, message) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.success}</span>
    <div>
      <p class="toast-title">${escapeHtml(title)}</p>
      ${message ? `<p class="toast-body">${escapeHtml(message)}</p>` : ''}
    </div>
  `;
  el.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

/* ==========================================================================
   16. DATA LOADING
   ========================================================================== */
async function loadProducts() {
  state.loadStatus = 'loading';
  renderTable();
  try {
    state.products = await getProducts();
    state.loadStatus = 'success';
  } catch (err) {
    state.loadStatus = 'error';
    showToast('error', 'Unable to load inventory', err.message);
  }
  renderTable();
}

el.retryBtn.addEventListener('click', loadProducts);

/* ==========================================================================
   17. INIT
   Note: the sidebar open/close toggle for mobile lives in shell.js, shared
   across every page.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', loadProducts);

// --- GLOBAL UNIVERSAL SEARCH ENGINE ---
    const globalSearchInput = document.getElementById('globalSearch');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            // Target every table row across the entire DOM
            const allRows = document.querySelectorAll('tbody tr');

            allRows.forEach(row => {
                const table = row.closest('table');
                if (!table) return;

                // 1. Check if the table itself is visible
                const isTableVisible = window.getComputedStyle(table).display !== 'none';

                // 2. Check if any parent wrapper container is hidden (display: none)
                let isContainerVisible = true;
                let parent = table.parentElement;
                while (parent && parent !== document.body) {
                    if (window.getComputedStyle(parent).display === 'none') {
                        isContainerVisible = false;
                        break;
                    }
                    parent = parent.parentElement;
                }

                // 3. Only filter rows belonging to the table currently visible to the user
                if (isTableVisible && isContainerVisible) {
                    const rowText = row.textContent.toLowerCase();
                    if (query === '' || rowText.includes(query)) {
                        row.style.display = ''; // Show matching row
                    } else {
                        row.style.display = 'none'; // Hide non-matching row
                    }
                }
            });
        });
    }