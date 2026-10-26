document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('admin-app');
    const content = document.getElementById('admin-content');
    const title = document.getElementById('admin-page-title');
    const sidebar = document.getElementById('admin-sidebar');
    const scrim = document.getElementById('admin-sidebar-scrim');
    const toast = document.getElementById('admin-toast');
    const modal = document.getElementById('admin-modal');
    const productForm = document.getElementById('product-form');
    const productFormError = document.getElementById('product-form-error');
    const pageNames = {
        dashboard: 'Dashboard',
        products: 'Products',
        inventory: 'Inventory',
        orders: 'Orders',
        analytics: 'Analytics'
    };
    const pageSize = 8;
    const filters = {
        products: { query: '', category: 'all', sort: 'name-asc', page: 1 },
        inventory: { query: '', stock: 'all', sort: 'name-asc', page: 1 },
        orders: { query: '', status: 'all', payment: 'all', from: '', to: '', page: 1 }
    };
    let activePage = 'dashboard';
    let toastTimer;
    let lastFocusedElement;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    function safeImageUrl(value) {
        try {
            const parsed = new URL(value, window.location.origin);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
        } catch {
            return '';
        }
    }

    function getProducts() {
        return AdminService.getProducts();
    }

    function getOrders() {
        return AdminService.getOrders();
    }

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Unknown date';
        return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    }

    function dayKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function getLastSevenDays(orders) {
        const dates = [];
        for (let offset = 6; offset >= 0; offset -= 1) {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - offset);
            dates.push({
                key: dayKey(date),
                label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
                count: orders.filter(order => {
                    const orderDate = new Date(order.date);
                    return !Number.isNaN(orderDate.getTime()) && dayKey(orderDate) === dayKey(date);
                }).length
            });
        }
        return dates;
    }

    function statusClass(status) {
        return String(status || 'pending').toLowerCase().replace(/[^a-z-]/g, '');
    }

    function paymentStatus(order) {
        return order.paymentStatus === 'paid' && order.paymentConfirmed === true
            ? 'Paid'
            : order.paymentStatus === 'refunded' && order.paymentConfirmed === true
                ? 'Refunded'
                : 'Unconfirmed';
    }

    function paymentBadge(order) {
        const status = paymentStatus(order);
        const tone = status === 'Paid' ? 'is-success' : status === 'Refunded' ? 'is-info' : 'is-warning';
        return `<span class="admin-badge ${tone}">${status}</span>`;
    }

    function orderStatusBadge(status) {
        const safeStatus = escapeHtml(status || 'pending');
        const tones = { delivered: 'is-success', pending: 'is-warning', confirmed: 'is-info', cancelled: 'is-danger' };
        return `<span class="admin-badge ${tones[status] || ''}">${safeStatus}</span>`;
    }

    function notify(message) {
        toast.textContent = message;
        toast.hidden = false;
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
    }

    function showLoadError(error) {
        content.innerHTML = `<section class="admin-panel"><div class="admin-empty-state"><strong>Could not load admin data</strong><p>${escapeHtml(error.message || 'Please reload and try again.')}</p></div></section>`;
    }

    function statCard(label, value, note, icon) {
        return `<article class="admin-stat-card"><div class="admin-stat-top"><span>${label}</span><span class="admin-stat-icon">${icon}</span></div><div class="admin-stat-value">${value}</div><div class="admin-stat-note">${note}</div></article>`;
    }

    const icons = {
        products: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>',
        orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v17H5z"/><path d="M9 4V2h6v2M8 9h8M8 13h8"/></svg>',
        customers: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4.5a4 4 0 0 1 0 7.5M18 15a5 5 0 0 1 3 4.5V21"/></svg>',
        revenue: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
    };

    function renderOrderRows(orders, emptyTitle = 'No orders recorded yet', emptyDescription = 'New demo checkout orders will appear here.') {
        if (!orders.length) {
            return `<tr><td colspan="7"><div class="admin-empty-state"><strong>${escapeHtml(emptyTitle)}</strong><p>${escapeHtml(emptyDescription)}</p></div></td></tr>`;
        }
        return orders.map(order => {
            const id = escapeHtml(order.orderId || '—');
            const customer = escapeHtml(order.customerName || 'Guest');
            const email = escapeHtml(order.email || 'No email');
            const date = escapeHtml(formatDate(order.date));
            const total = formatCurrency(Number(order.total) || 0);
            const status = String(order.status || 'pending');
            return `<tr>
                <td><strong>${id}</strong></td>
                <td>${customer}<br><small>${email}</small></td>
                <td>${date}</td>
                <td>${paymentBadge(order)}</td>
                <td>${total}</td>
                ${includeStatus
                    ? `<td><select class="admin-order-status-select" aria-label="Fulfilment status for ${id}" data-order-status="${escapeHtml(order.orderId || '')}">
                        ${['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(option => `<option value="${option}" ${status === option ? 'selected' : ''}>${option[0].toUpperCase()}${option.slice(1)}</option>`).join('')}
                    </select></td>`
                    : `<td>${orderStatusBadge(status)}</td>`}
                <td><button class="admin-row-button" type="button" data-order-details="${escapeHtml(order.orderId || '')}">View</button></td>
            </tr>`;
        }).join('');
    }

    function renderRecentOrders(orders) {
        return `<section class="admin-panel">
            <div class="admin-panel-header"><div><h2>Recent orders</h2><p>Latest orders saved in this browser</p></div><a class="admin-text-link" href="#orders">All orders</a></div>
            <div class="admin-table-wrap"><table class="admin-table">
                <thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>PAYMENT</th><th>TOTAL</th><th>STATUS</th><th></th></tr></thead>
                <tbody>${renderOrderRows(orders.slice(0, 5))}</tbody>
            </table></div>
        </section>`;
    }

    function renderStatusRows(orders) {
        const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        const counts = Object.fromEntries(statuses.map(status => [status, 0]));
        orders.forEach(order => {
            const status = statusClass(order.status);
            if (Object.hasOwn(counts, status)) counts[status] += 1;
        });
        return statuses.map(status => `<div class="admin-status-row"><span class="admin-status-dot status-${status}"></span><span>${status[0].toUpperCase()}${status.slice(1)}</span><strong>${counts[status]}</strong></div>`).join('');
    }

    function renderStatusDistribution(orders) {
        return `<section class="admin-panel">
            <div class="admin-panel-header"><div><h2>Order status</h2><p>Fulfilment status breakdown</p></div></div>
            <div class="admin-status-list">${renderStatusRows(orders)}</div>
        </section>`;
    }

    function renderOrdersChart(orders) {
        const days = getLastSevenDays(orders);
        const max = Math.max(1, ...days.map(day => day.count));
        if (!orders.length) {
            return `<div class="admin-chart-empty">Order-volume trends will appear after demo orders are placed.</div>`;
        }
        return `<div class="admin-chart" role="img" aria-label="Daily order volume over the last seven days">${days.map((day, index) => {
            const height = Math.max(day.count > 0 ? 8 : 2, Math.round(day.count / max * 100));
            return `<div class="admin-chart-column"><span class="admin-chart-bar-wrap"><span class="admin-chart-bar ${index === days.length - 1 ? 'is-today' : ''}" style="height:${height}%"></span></span><span class="admin-chart-label">${day.label}</span></div>`;
        }).join('')}</div>`;
    }

    function getBestSellers(orders) {
        const quantities = new Map();
        orders.forEach(order => (Array.isArray(order.items) ? order.items : []).forEach(item => {
            const id = String(item.id ?? item.name ?? '');
            const current = quantities.get(id) || { name: item.name || 'Product', quantity: 0 };
            current.quantity += Number(item.quantity) || 0;
            quantities.set(id, current);
        }));
        return [...quantities.values()].sort((first, second) => second.quantity - first.quantity).slice(0, 5);
    }

    function renderBestSellers(orders) {
        const bestSellers = getBestSellers(orders);
        const rows = bestSellers.length
            ? bestSellers.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td></tr>`).join('')
            : `<tr><td colspan="3"><div class="admin-empty-state"><strong>Not enough order data yet</strong><p>Best sellers are based on recorded order items.</p></div></td></tr>`;
        return `<section class="admin-panel">
            <div class="admin-panel-header"><div><h2>Best-selling products</h2><p>Units in recorded demo orders</p></div></div>
            <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>#</th><th>PRODUCT</th><th>UNITS</th></tr></thead><tbody>${rows}</tbody></table></div>
        </section>`;
    }

    function renderDashboard() {
        const productsList = getProducts();
        const orders = getOrders().sort((first, second) => new Date(second.date) - new Date(first.date));
        const customers = new Set(orders.map(order => String(order.email || '').trim().toLowerCase()).filter(Boolean));
        const pending = orders.filter(order => !order.status || order.status === 'pending').length;
        updatePendingOrderCount(pending);
        const notice = `<div class="admin-notice"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><span><strong>Demo mode.</strong> Products and orders are saved only in this browser. Customer count reflects order contacts, and revenue is unavailable because no payment provider confirms payments.</span></div>`;
        content.innerHTML = `
            <div class="admin-page-heading"><div><p class="admin-eyebrow">OVERVIEW</p><h1>Dashboard</h1><p>Store activity at a glance.</p></div></div>
            ${notice}
            <div class="admin-stats-grid admin-dashboard-stats">
                ${statCard('Total products', productsList.length, 'Products in this browser catalog', icons.products)}
                ${statCard('Total orders', orders.length, 'Demo orders recorded', icons.orders)}
                ${statCard('Pending orders', pending, 'Awaiting fulfilment update', icons.orders)}
                ${statCard('Customers', customers.size, 'Distinct order contacts only', icons.customers)}
                ${statCard('Confirmed revenue', '—', 'Unavailable · no payment integration', icons.revenue)}
            </div>
            <div class="admin-dashboard-grid">
                <section class="admin-panel"><div class="admin-panel-header"><div><h2>Order volume</h2><p>Recorded orders over the last seven days</p></div></div>${renderOrdersChart(orders)}</section>
                ${renderStatusDistribution(orders)}
            </div>
            <div class="admin-lower-grid">
                ${renderRecentOrders(orders)}
                <div class="admin-dashboard-side">
                    ${renderBestSellers(orders)}
                    <section class="admin-panel" style="margin-top:16px"><div class="admin-panel-header"><div><h2>Quick actions</h2><p>Common store tasks</p></div></div>
                        <div class="admin-quick-actions">
                            <button class="admin-quick-action" type="button" data-add-product><span aria-hidden="true">+</span><span><strong>Add a product</strong><small>Create a catalog item</small></span></button>
                            <a class="admin-quick-action" href="#orders"><span aria-hidden="true">→</span><span><strong>View orders</strong><small>Review fulfilment status</small></span></a>
                        </div>
                    </section>
                </div>
            </div>`;
    }

    function renderProductFilters() {
        const filter = filters.products;
        const productsList = getProducts();
        const categories = [...new Set(productsList.map(product => product.category).filter(Boolean))].sort();
        const query = filter.query.toLowerCase();
        const matched = productsList.filter(product => {
            const text = `${product.name} ${product.category} ${product.description}`.toLowerCase();
            return text.includes(query) && (filter.category === 'all' || product.category === filter.category);
        });
        const sorters = {
            'name-asc': (a, b) => a.name.localeCompare(b.name),
            'name-desc': (a, b) => b.name.localeCompare(a.name),
            'price-asc': (a, b) => a.price - b.price,
            'price-desc': (a, b) => b.price - a.price,
            'stock-asc': (a, b) => a.stock - b.stock
        };
        matched.sort(sorters[filter.sort] || sorters['name-asc']);
        return { categories, matched };
    }

    function productTableRows(list) {
        if (!list.length) return `<tr><td colspan="6"><div class="admin-empty-state"><strong>No products found</strong><p>Try a different search or add a new product.</p></div></td></tr>`;
        return list.map(product => {
            const image = safeImageUrl(product.image);
            const stock = Number(product.stock) || 0;
            const status = stock > 0 ? '<span class="admin-badge is-success">In stock</span>' : '<span class="admin-badge is-danger">Out of stock</span>';
            return `<tr>
                <td><div class="admin-product-cell">${image ? `<img class="admin-product-thumb" src="${escapeHtml(image)}" alt="" loading="lazy">` : '<span class="admin-product-thumb" aria-hidden="true"></span>'}<span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.description || '')}</small></span></div></td>
                <td>${escapeHtml(product.category || 'Uncategorized')}</td>
                <td>${formatCurrency(Number(product.price) || 0)}${product.oldPrice ? `<br><small>Was ${formatCurrency(Number(product.oldPrice))}</small>` : ''}</td>
                <td>${stock}</td><td>${status}</td>
                <td><div class="admin-row-actions"><button class="admin-row-button" type="button" data-edit-product="${escapeHtml(product.id)}">Edit</button><button class="admin-row-button danger" type="button" data-delete-product="${escapeHtml(product.id)}">Delete</button></div></td>
            </tr>`;
        }).join('');
    }

    function paginationMarkup(total, page) {
        const pages = Math.max(1, Math.ceil(total / pageSize));
        const start = total ? (page - 1) * pageSize + 1 : 0;
        const end = Math.min(page * pageSize, total);
        return `<div class="admin-table-footer"><span>Showing ${start}–${end} of ${total}</span><div class="admin-pagination"><button type="button" data-page="${Math.max(1, page - 1)}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">‹</button><span>${page} / ${pages}</span><button type="button" data-page="${Math.min(pages, page + 1)}" ${page >= pages ? 'disabled' : ''} aria-label="Next page">›</button></div></div>`;
    }

    function renderProductsPage() {
        const filter = filters.products;
        const { categories, matched } = renderProductFilters();
        const pages = Math.max(1, Math.ceil(matched.length / pageSize));
        filter.page = Math.min(filter.page, pages);
        const pageItems = matched.slice((filter.page - 1) * pageSize, filter.page * pageSize);
        content.innerHTML = `
            <div class="admin-page-heading"><div><p class="admin-eyebrow">CATALOG</p><h1>Products</h1><p>Manage the products shown in the Aura storefront.</p></div><button class="admin-button admin-button-primary" type="button" data-add-product>+ Add product</button></div>
            <div class="admin-notice"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><span>Catalog updates are saved in this browser only. Connect a product API and database before using this panel for live store operations.</span></div>
            <section class="admin-panel">
                <div class="admin-toolbar">
                    <label class="admin-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input id="products-search" type="search" placeholder="Search name, description or category" value="${escapeHtml(filter.query)}" aria-label="Search products"></label>
                    <select id="products-category" aria-label="Filter by category"><option value="all">All categories</option>${categories.map(category => `<option value="${escapeHtml(category)}" ${filter.category === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}</select>
                    <select id="products-sort" aria-label="Sort products"><option value="name-asc" ${filter.sort === 'name-asc' ? 'selected' : ''}>Name A–Z</option><option value="name-desc" ${filter.sort === 'name-desc' ? 'selected' : ''}>Name Z–A</option><option value="price-asc" ${filter.sort === 'price-asc' ? 'selected' : ''}>Price: low to high</option><option value="price-desc" ${filter.sort === 'price-desc' ? 'selected' : ''}>Price: high to low</option><option value="stock-asc" ${filter.sort === 'stock-asc' ? 'selected' : ''}>Lowest stock</option></select>
                </div>
                <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>AVAILABILITY</th><th>ACTIONS</th></tr></thead><tbody>${productTableRows(pageItems)}</tbody></table></div>
                ${paginationMarkup(matched.length, filter.page)}
            </section>`;
    }

    function renderInventoryPage() {
        const filter = filters.inventory;
        const productsList = getProducts();
        const query = filter.query.toLowerCase();
        const matched = productsList.filter(product => {
            const stock = Number(product.stock) || 0;
            const matchesStock = filter.stock === 'all'
                || (filter.stock === 'low' && stock > 0 && stock <= 10)
                || (filter.stock === 'out' && stock === 0);
            return matchesStock && `${product.name} ${product.category}`.toLowerCase().includes(query);
        }).sort((first, second) => filter.sort === 'stock-asc'
            ? first.stock - second.stock
            : first.name.localeCompare(second.name));
        const pages = Math.max(1, Math.ceil(matched.length / pageSize));
        filter.page = Math.min(filter.page, pages);
        const pageItems = matched.slice((filter.page - 1) * pageSize, filter.page * pageSize);
        const lowStock = productsList.filter(product => Number(product.stock) > 0 && Number(product.stock) <= 10).length;
        const outOfStock = productsList.filter(product => Number(product.stock) === 0).length;
        const rows = pageItems.length ? pageItems.map(product => {
            const stock = Number(product.stock) || 0;
            const tone = stock === 0 ? 'is-danger' : stock <= 10 ? 'is-warning' : 'is-success';
            const label = stock === 0 ? 'Out of stock' : stock <= 10 ? 'Low stock' : 'In stock';
            const bar = Math.min(100, stock);
            return `<tr><td><div class="admin-product-cell"><span class="admin-product-thumb" aria-hidden="true"></span><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category || 'Uncategorized')}</small></span></div></td>
                <td><form class="admin-row-actions" data-stock-form="${escapeHtml(product.id)}"><input class="admin-inline-input" aria-label="New stock quantity for ${escapeHtml(product.name)}" name="stock" type="number" min="0" step="1" value="${stock}" required><button class="admin-row-button" type="submit">Update</button></form></td>
                <td><div class="admin-stock-meter"><span class="admin-stock-track"><span class="admin-stock-fill ${stock === 0 ? 'is-empty' : stock <= 10 ? 'is-low' : ''}" style="display:block;width:${bar}%"></span></span><span>${stock} units</span></div></td><td><span class="admin-badge ${tone}">${label}</span></td></tr>`;
        }).join('') : `<tr><td colspan="4"><div class="admin-empty-state"><strong>No inventory items found</strong><p>Try adjusting the search or stock filter.</p></div></td></tr>`;
        content.innerHTML = `
            <div class="admin-page-heading"><div><p class="admin-eyebrow">STOCK CONTROL</p><h1>Inventory</h1><p>Stock levels stay linked to the browser-stored product catalog.</p></div></div>
            <div class="admin-stats-grid">${statCard('Low-stock alerts', lowStock, 'Items with 1–10 units remaining', icons.products)}${statCard('Out of stock', outOfStock, 'Products with no units available', icons.products)}${statCard('Catalog items', productsList.length, 'Total tracked products', icons.products)}${statCard('Data storage', 'Browser', 'Not shared across devices', icons.revenue)}</div>
            <section class="admin-panel">
                <div class="admin-toolbar"><label class="admin-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input id="inventory-search" type="search" placeholder="Search products" value="${escapeHtml(filter.query)}" aria-label="Search inventory"></label>
                    <select id="inventory-stock-filter" aria-label="Filter inventory by stock"><option value="all" ${filter.stock === 'all' ? 'selected' : ''}>All stock levels</option><option value="low" ${filter.stock === 'low' ? 'selected' : ''}>Low stock (1–10)</option><option value="out" ${filter.stock === 'out' ? 'selected' : ''}>Out of stock</option></select>
                    <select id="inventory-sort" aria-label="Sort inventory"><option value="name-asc" ${filter.sort === 'name-asc' ? 'selected' : ''}>Product name</option><option value="stock-asc" ${filter.sort === 'stock-asc' ? 'selected' : ''}>Lowest quantity</option></select></div>
                <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>PRODUCT</th><th>UPDATE QUANTITY</th><th>STOCK LEVEL</th><th>STATUS</th></tr></thead><tbody>${rows}</tbody></table></div>
                ${paginationMarkup(matched.length, filter.page)}
            </section>`;
    }

    function renderOrdersPage() {
        const filter = filters.orders;
        const allOrders = getOrders().sort((first, second) => new Date(second.date) - new Date(first.date));
        updatePendingOrderCount(allOrders.filter(order => !order.status || order.status === 'pending').length);
        const query = filter.query.toLowerCase();
        const matched = allOrders.filter(order => {
            const payment = paymentStatus(order).toLowerCase();
            const date = new Date(order.date);
            const dateString = Number.isNaN(date.getTime()) ? '' : dayKey(date);
            return `${order.orderId || ''} ${order.customerName || ''} ${order.email || ''}`.toLowerCase().includes(query)
                && (filter.status === 'all' || (order.status || 'pending') === filter.status)
                && (filter.payment === 'all' || payment === filter.payment)
                && (!filter.from || dateString >= filter.from)
                && (!filter.to || dateString <= filter.to);
        });
        const pages = Math.max(1, Math.ceil(matched.length / pageSize));
        filter.page = Math.min(filter.page, pages);
        const pageItems = matched.slice((filter.page - 1) * pageSize, filter.page * pageSize);
        content.innerHTML = `
            <div class="admin-page-heading"><div><p class="admin-eyebrow">FULFILMENT</p><h1>Orders</h1><p>Review order details and update fulfilment status.</p></div></div>
            <div class="admin-notice"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><span>Orders are demo records stored in this browser. Payment status is not editable and stays unconfirmed unless a payment provider supplies verified data.</span></div>
            <section class="admin-panel">
                <div class="admin-toolbar"><label class="admin-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input id="orders-search" type="search" placeholder="Search order ID or customer" value="${escapeHtml(filter.query)}" aria-label="Search orders"></label>
                    <select id="orders-status" aria-label="Filter by fulfilment status"><option value="all">All fulfilment statuses</option>${['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(status => `<option value="${status}" ${filter.status === status ? 'selected' : ''}>${status[0].toUpperCase()}${status.slice(1)}</option>`).join('')}</select>
                    <select id="orders-payment" aria-label="Filter by payment status"><option value="all">All payment states</option><option value="unconfirmed" ${filter.payment === 'unconfirmed' ? 'selected' : ''}>Unconfirmed</option><option value="paid" ${filter.payment === 'paid' ? 'selected' : ''}>Paid (verified)</option><option value="refunded" ${filter.payment === 'refunded' ? 'selected' : ''}>Refunded (verified)</option></select>
                    <input id="orders-from" type="date" aria-label="From date" value="${escapeHtml(filter.from)}"><input id="orders-to" type="date" aria-label="To date" value="${escapeHtml(filter.to)}"></div>
                <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>PAYMENT</th><th>TOTAL</th><th>FULFILMENT</th><th></th></tr></thead><tbody>${renderOrderRows(pageItems, allOrders.length ? 'No orders match these filters' : 'No orders recorded yet', allOrders.length ? 'Try changing your search or filters.' : 'New demo checkout orders will appear here.')}</tbody></table></div>
                ${paginationMarkup(matched.length, filter.page)}
            </section>`;
    }

    function renderAnalyticsPage() {
        const orders = getOrders();
        const productsList = getProducts();
        const bestSellers = getBestSellers(orders);
        const soldProductRows = bestSellers.length
            ? bestSellers.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td></tr>`).join('')
            : `<tr><td colspan="2"><div class="admin-empty-state"><strong>No sales data yet</strong><p>Product ranking is based on recorded order items.</p></div></td></tr>`;
        const lowStock = productsList.filter(product => Number(product.stock) > 0 && Number(product.stock) <= 10).length;
        const outOfStock = productsList.filter(product => Number(product.stock) === 0).length;
        content.innerHTML = `
            <div class="admin-page-heading"><div><p class="admin-eyebrow">STORE PERFORMANCE</p><h1>Analytics</h1><p>Metrics are calculated from demo records stored in this browser.</p></div></div>
            <div class="admin-notice"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><span>Revenue is not shown because this project has no payment integration to confirm successful transactions. Order totals are not treated as paid sales.</span></div>
            <div class="admin-stats-grid">${statCard('Orders recorded', orders.length, 'All demo orders in this browser', icons.orders)}${statCard('Products sold', orders.reduce((sum, order) => sum + (Array.isArray(order.items) ? order.items.reduce((quantity, item) => quantity + (Number(item.quantity) || 0), 0) : 0), 0), 'Units in recorded order items', icons.products)}${statCard('Low-stock items', lowStock, '1–10 units remaining', icons.products)}${statCard('Out of stock', outOfStock, 'Products at zero quantity', icons.products)}</div>
            <div class="admin-analytics-grid">
                <section class="admin-panel"><div class="admin-panel-header"><div><h2>Orders over time</h2><p>Daily order count · last seven days</p></div></div>${renderOrdersChart(orders)}</section>
                <section class="admin-panel"><div class="admin-panel-header"><div><h2>Order status breakdown</h2><p>Fulfilment stages</p></div></div><div class="admin-status-list">${renderStatusRows(orders)}</div></section>
                <section class="admin-panel"><div class="admin-panel-header"><div><h2>Best-selling products</h2><p>Based on recorded item quantities</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>PRODUCT</th><th>UNITS</th></tr></thead><tbody>${soldProductRows}</tbody></table></div></section>
                <section class="admin-panel"><div class="admin-panel-header"><div><h2>Inventory performance</h2><p>Current stock status from the catalog</p></div><a class="admin-text-link" href="#inventory">Manage inventory</a></div><div class="admin-status-list"><div class="admin-status-row"><span class="admin-status-dot status-delivered"></span><span>In stock</span><strong>${productsList.filter(product => Number(product.stock) > 10).length}</strong></div><div class="admin-status-row"><span class="admin-status-dot status-pending"></span><span>Low stock</span><strong>${lowStock}</strong></div><div class="admin-status-row"><span class="admin-status-dot status-cancelled"></span><span>Out of stock</span><strong>${outOfStock}</strong></div></div></section>
            </div>`;
    }

    function renderPage() {
        activePage = (window.location.hash.slice(1) || 'dashboard').toLowerCase();
        if (!Object.hasOwn(pageNames, activePage)) {
            window.location.hash = 'dashboard';
            return;
        }
        title.textContent = pageNames[activePage];
        document.title = `${pageNames[activePage]} | Aura Admin`;
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            const current = link.dataset.page === activePage;
            link.classList.toggle('active', current);
            if (current) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        try {
            if (activePage === 'dashboard') renderDashboard();
            if (activePage === 'products') renderProductsPage();
            if (activePage === 'inventory') renderInventoryPage();
            if (activePage === 'orders') renderOrdersPage();
            if (activePage === 'analytics') renderAnalyticsPage();
        } catch (error) {
            showLoadError(error);
        }
        content.focus({ preventScroll: true });
        closeMobileMenu();
    }

    function openProductModal(product) {
        lastFocusedElement = document.activeElement;
        productFormError.hidden = true;
        productForm.reset();
        const idInput = productForm.elements.namedItem('id');
        document.getElementById('admin-modal-title').textContent = product ? 'Edit product' : 'Add product';
        if (product) {
            idInput.value = product.id;
            productForm.elements.namedItem('name').value = product.name || '';
            productForm.elements.namedItem('description').value = product.description || '';
            productForm.elements.namedItem('price').value = product.price ?? '';
            productForm.elements.namedItem('category').value = product.category || '';
            productForm.elements.namedItem('stock').value = product.stock ?? 0;
            productForm.elements.namedItem('oldPrice').value = product.oldPrice ?? '';
            productForm.elements.namedItem('image').value = product.image || '';
        }
        const categories = [...new Set(getProducts().map(item => item.category).filter(Boolean))];
        document.getElementById('product-categories').innerHTML = categories.map(category => `<option value="${escapeHtml(category)}"></option>`).join('');
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        productForm.elements.namedItem('name').focus();
    }

    function closeModal() {
        modal.hidden = true;
        document.body.style.overflow = '';
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
    }

    function editProduct(id) {
        const product = getProducts().find(item => String(item.id) === String(id));
        if (product) openProductModal(product);
    }

    function saveProduct(event) {
        event.preventDefault();
        productFormError.hidden = true;
        if (!productForm.reportValidity()) return;
        const formData = new FormData(productForm);
        const name = String(formData.get('name')).trim();
        const description = String(formData.get('description')).trim();
        const category = String(formData.get('category')).trim();
        const price = Number(formData.get('price'));
        const stock = Number(formData.get('stock'));
        const oldPriceValue = String(formData.get('oldPrice')).trim();
        const oldPrice = oldPriceValue ? Number(oldPriceValue) : null;
        const rawImage = String(formData.get('image')).trim();
        const image = safeImageUrl(rawImage);
        if (!name || !description || !category || !Number.isFinite(price) || price <= 0
            || !Number.isInteger(stock) || stock < 0
            || (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= price))
            || !image) {
            productFormError.textContent = oldPrice !== null && oldPrice <= price
                ? 'The previous price must be higher than the current price.'
                : 'Check the product details. Prices, stock, category and an http(s) image URL are required.';
            productFormError.hidden = false;
            return;
        }
        try {
            const list = getProducts();
            const idValue = formData.get('id');
            const product = {
                id: idValue ? Number(idValue) || idValue : Math.max(0, ...list.map(item => Number(item.id) || 0)) + 1,
                name,
                description,
                category,
                price,
                oldPrice,
                discount: oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0,
                image,
                stock,
                rating: 0,
                reviews: 0
            };
            const index = list.findIndex(item => String(item.id) === String(idValue));
            if (index >= 0) list[index] = { ...list[index], ...product };
            else list.unshift(product);
            AdminService.saveProducts(list);
            closeModal();
            renderPage();
            notify(index >= 0 ? 'Product updated in this browser.' : 'Product added to this browser catalog.');
        } catch (error) {
            productFormError.textContent = error.message || 'Could not save this product in browser storage.';
            productFormError.hidden = false;
        }
    }

    function deleteProduct(id) {
        const list = getProducts();
        const product = list.find(item => String(item.id) === String(id));
        if (!product || !window.confirm(`Delete "${product.name}" from this browser catalog?`)) return;
        try {
            AdminService.saveProducts(list.filter(item => String(item.id) !== String(id)));
            renderPage();
            notify('Product deleted from this browser catalog.');
        } catch (error) {
            notify(error.message || 'Could not delete this product.');
        }
    }

    function updateStock(form) {
        const id = form.dataset.stockForm;
        const value = new FormData(form).get('stock');
        const stock = Number(value);
        if (!Number.isInteger(stock) || stock < 0) {
            notify('Stock quantity must be a non-negative whole number.');
            return;
        }
        try {
            const list = getProducts();
            const product = list.find(item => String(item.id) === String(id));
            if (!product) throw new Error('Product not found in the catalog.');
            product.stock = stock;
            AdminService.saveProducts(list);
            renderPage();
            notify('Inventory quantity updated.');
        } catch (error) {
            notify(error.message || 'Could not update inventory.');
        }
    }

    function updateOrderStatus(orderId, status) {
        const allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!allowedStatuses.includes(status)) return;
        try {
            const orders = getOrders();
            const order = orders.find(item => String(item.orderId) === String(orderId));
            if (!order) throw new Error('Order not found.');
            order.status = status;
            AdminService.saveOrders(orders);
            notify(`Fulfilment status updated to ${status}.`);
            renderPage();
        } catch (error) {
            notify(error.message || 'Could not update fulfilment status.');
        }
    }

    function openOrderDetails(orderId) {
        const order = getOrders().find(item => String(item.orderId) === String(orderId));
        if (!order) return;
        lastFocusedElement = document.activeElement;
        document.getElementById('admin-detail-title').textContent = `Order ${order.orderId || ''}`;
        const items = Array.isArray(order.items) ? order.items : [];
        document.getElementById('admin-detail-content').innerHTML = `
            <div class="admin-order-detail-summary">
                <p><strong>Customer</strong><span>${escapeHtml(order.customerName || 'Guest')} · ${escapeHtml(order.email || 'No email')}</span></p>
                <p><strong>Placed</strong><span>${escapeHtml(formatDate(order.date))}</span></p>
                <p><strong>Fulfilment</strong><span>${orderStatusBadge(order.status || 'pending')}</span></p>
                <p><strong>Payment</strong><span>${paymentBadge(order)}</span></p>
                ${order.paymentMethod ? `<p><strong>Payment method</strong><span>${escapeHtml(order.paymentMethod)}</span></p>` : ''}
            </div>
            <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ITEM</th><th>QTY</th><th>UNIT PRICE</th><th>SUBTOTAL</th></tr></thead><tbody>${items.length ? items.map(item => `<tr><td>${escapeHtml(item.name || 'Product')}</td><td>${Number(item.quantity) || 0}</td><td>${formatCurrency(Number(item.price) || 0)}</td><td>${formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0))}</td></tr>`).join('') : '<tr><td colspan="4">No item details recorded.</td></tr>'}</tbody></table></div>
            <div class="admin-order-total"><span>Order total</span><strong>${formatCurrency(Number(order.total) || 0)}</strong></div>
            <p class="admin-order-demo-note">Demo order record · payment is not confirmed by a provider.</p>`;
        const detailModal = document.getElementById('admin-detail-modal');
        detailModal.hidden = false;
        document.body.style.overflow = 'hidden';
        document.getElementById('admin-detail-close').focus();
    }

    function closeDetails() {
        document.getElementById('admin-detail-modal').hidden = true;
        document.body.style.overflow = '';
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
    }

    function updatePendingOrderCount(count) {
        const indicator = document.getElementById('pending-order-count');
        indicator.textContent = count > 99 ? '99+' : String(count);
        indicator.hidden = count === 0;
    }

    function closeMobileMenu() {
        app.classList.remove('mobile-nav-open');
        scrim.hidden = true;
        const toggle = document.getElementById('admin-menu-toggle');
        const isMobile = window.matchMedia('(max-width: 760px)').matches;
        const collapsed = app.classList.contains('sidebar-collapsed');
        toggle.setAttribute('aria-expanded', String(!isMobile && !collapsed));
        toggle.setAttribute('aria-label', isMobile ? 'Open navigation' : collapsed ? 'Expand navigation' : 'Collapse navigation');
    }

    function updateSearch(input, key, group) {
        filters[group].query = input.value;
        filters[group].page = 1;
        const cursor = input.selectionStart;
        renderPage();
        const next = document.getElementById(key);
        if (next) {
            next.focus();
            next.setSelectionRange(cursor, cursor);
        }
    }

    async function start() {
        try {
            const response = await fetch('/api/admin/session', { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Could not verify your admin session.');
            const session = await response.json();
            if (!session.authenticated) {
                window.location.replace('/admin-login.html');
                return;
            }
            document.getElementById('admin-account-email').textContent = session.email || 'Signed in';
            renderPage();
        } catch (error) {
            showLoadError(new Error(`${error.message} Check that the Aura server is running.`));
        }
    }

    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.addEventListener('click', () => closeMobileMenu());
    });
    window.addEventListener('hashchange', renderPage);
    document.getElementById('admin-menu-toggle').addEventListener('click', event => {
        if (window.matchMedia('(max-width: 760px)').matches) {
            const isOpen = app.classList.toggle('mobile-nav-open');
            scrim.hidden = !isOpen;
            event.currentTarget.setAttribute('aria-expanded', String(isOpen));
            event.currentTarget.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
        } else {
            const isExpanded = app.classList.toggle('sidebar-collapsed') === false;
            event.currentTarget.setAttribute('aria-expanded', String(isExpanded));
            event.currentTarget.setAttribute('aria-label', isExpanded ? 'Collapse navigation' : 'Expand navigation');
        }
    });
    window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
        app.classList.remove('sidebar-collapsed');
        closeMobileMenu();
    });
    scrim.addEventListener('click', closeMobileMenu);
    document.getElementById('admin-logout').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/admin/session', { method: 'DELETE', credentials: 'same-origin' });
            if (!response.ok) throw new Error('Sign out failed. Please try again.');
            window.location.replace('/admin-login.html');
        } catch (error) {
            notify(error.message || 'Could not sign out.');
        }
    });

    document.getElementById('admin-modal-close').addEventListener('click', closeModal);
    document.getElementById('admin-modal-cancel').addEventListener('click', closeModal);
    document.getElementById('admin-modal').addEventListener('click', event => {
        if (event.target === modal) closeModal();
    });
    productForm.addEventListener('submit', saveProduct);
    document.getElementById('admin-detail-close').addEventListener('click', closeDetails);
    document.getElementById('admin-detail-modal').addEventListener('click', event => {
        if (event.target.id === 'admin-detail-modal') closeDetails();
    });
    document.addEventListener('keydown', event => {
        const openDialog = document.querySelector('.admin-modal-backdrop:not([hidden])');
        if (event.key === 'Escape' && openDialog) {
            if (openDialog === modal) closeModal();
            else closeDetails();
        }
        if (event.key !== 'Tab' || !openDialog) return;
        const focusable = [...openDialog.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]')];
        if (!focusable.length) return;
        if (event.shiftKey && document.activeElement === focusable[0]) {
            event.preventDefault();
            focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
            event.preventDefault();
            focusable[0].focus();
        }
    });

    content.addEventListener('click', event => {
        const addButton = event.target.closest('[data-add-product]');
        if (addButton) return openProductModal();
        const editButton = event.target.closest('[data-edit-product]');
        if (editButton) return editProduct(editButton.dataset.editProduct);
        const deleteButton = event.target.closest('[data-delete-product]');
        if (deleteButton) return deleteProduct(deleteButton.dataset.deleteProduct);
        const orderButton = event.target.closest('[data-order-details]');
        if (orderButton) return openOrderDetails(orderButton.dataset.orderDetails);
        const pageButton = event.target.closest('[data-page]');
        if (pageButton && !pageButton.disabled) {
            filters[activePage].page = Number(pageButton.dataset.page);
            renderPage();
        }
    });

    content.addEventListener('submit', event => {
        const stockForm = event.target.closest('[data-stock-form]');
        if (stockForm) {
            event.preventDefault();
            updateStock(stockForm);
        }
    });

    content.addEventListener('change', event => {
        const target = event.target;
        if (target.id === 'products-category') {
            filters.products.category = target.value;
            filters.products.page = 1;
            renderPage();
        } else if (target.id === 'products-sort') {
            filters.products.sort = target.value;
            renderPage();
        } else if (target.id === 'inventory-stock-filter') {
            filters.inventory.stock = target.value;
            filters.inventory.page = 1;
            renderPage();
        } else if (target.id === 'inventory-sort') {
            filters.inventory.sort = target.value;
            renderPage();
        } else if (target.id === 'orders-status') {
            filters.orders.status = target.value;
            filters.orders.page = 1;
            renderPage();
        } else if (target.id === 'orders-payment') {
            filters.orders.payment = target.value;
            filters.orders.page = 1;
            renderPage();
        } else if (target.id === 'orders-from' || target.id === 'orders-to') {
            filters.orders[target.id === 'orders-from' ? 'from' : 'to'] = target.value;
            filters.orders.page = 1;
            renderPage();
        } else if (target.matches('[data-order-status]')) {
            updateOrderStatus(target.dataset.orderStatus, target.value);
        }
    });

    content.addEventListener('input', event => {
        const target = event.target;
        if (target.id === 'products-search') updateSearch(target, target.id, 'products');
        if (target.id === 'inventory-search') updateSearch(target, target.id, 'inventory');
        if (target.id === 'orders-search') updateSearch(target, target.id, 'orders');
    });

    start();
});
