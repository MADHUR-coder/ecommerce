document.addEventListener('DOMContentLoaded', () => {
    
    const container = document.getElementById('product-container');
    const breadcrumb = document.getElementById('breadcrumb');
    
    // Get Product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        showError("Product not found. Please return to the shop.");
        return;
    }

    // Find Product
    const product = products.find(p => p.id === parseInt(productId));

    if (!product) {
        showError("Product not found. It may have been removed.");
        return;
    }

    // Render Breadcrumb
    breadcrumb.innerHTML = `
        <a href="index.html">Home</a>
        <span class="separator">/</span>
        <a href="products.html">Shop</a>
        <span class="separator">/</span>
        <a href="products.html?category=${product.category}">${product.category}</a>
        <span class="separator">/</span>
        <span style="color: var(--text);">${product.name}</span>
    `;

    // Render Product Details
    const oldPriceHtml = product.oldPrice 
        ? `<div class="pd-old-price">${formatCurrency(product.oldPrice)}</div>`
        : '';
        
    const discountHtml = product.discount > 0 
        ? `<div class="pd-discount">${product.discount}% OFF</div>` 
        : '';

    let stockStatus = '';
    if (product.stock > 10) {
        stockStatus = `<div class="pd-stock"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> In Stock (${product.stock})</div>`;
    } else if (product.stock > 0) {
        stockStatus = `<div class="pd-stock low"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Low Stock (${product.stock})</div>`;
    } else {
        stockStatus = `<div class="pd-stock out"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Out of Stock</div>`;
    }

    container.innerHTML = `
        <!-- Left: Image Gallery -->
        <div class="product-gallery">
            <div class="main-image-container">
                <img src="${product.image}" alt="${product.name}" class="main-image" id="main-image">
            </div>
            <!-- Thumbnails (Using the same image multiple times for demo) -->
            <div class="thumbnail-list">
                <img src="${product.image}" class="thumbnail active" onclick="changeImage(this)">
                <img src="${product.image}" class="thumbnail" onclick="changeImage(this)" style="filter: grayscale(100%);">
                <img src="${product.image}" class="thumbnail" onclick="changeImage(this)" style="filter: sepia(100%);">
            </div>
        </div>

        <!-- Right: Product Info -->
        <div class="product-info-section">
            <div class="pd-category">${product.category}</div>
            <h1 class="pd-title">${product.name}</h1>
            
            <div class="pd-rating">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                ${product.rating} 
                <span class="pd-reviews">(${product.reviews} reviews)</span>
            </div>

            <div class="pd-price-container">
                <div class="pd-price">${formatCurrency(product.price)}</div>
                ${oldPriceHtml}
                ${discountHtml}
            </div>

            <p class="pd-description">${product.description}</p>
            
            ${stockStatus}

            <div class="pd-actions">
                <div class="qty-selector">
                    <button class="qty-btn" onclick="updateQty(-1)">-</button>
                    <input type="number" id="qty-input" class="qty-input" value="1" min="1" max="${product.stock}">
                    <button class="qty-btn" onclick="updateQty(1)">+</button>
                </div>
                <button class="btn btn-primary add-to-cart-btn" onclick="handleAddToCart(${product.id})" ${product.stock === 0 ? 'disabled' : ''}>
                    Add to Cart
                </button>
                <button class="wishlist-btn" aria-label="Add to wishlist" onclick="showToast('Added to wishlist!')">
                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>
            </div>

            <div class="pd-meta">
                <div>SKU: <span>AUR-${product.id.toString().padStart(4, '0')}</span></div>
                <div>Category: <span>${product.category}</span></div>
                <div>Tags: <span>Premium, Modern, ${product.category}</span></div>
            </div>
        </div>
    `;

    // Render Related Products
    renderRelatedProducts(product);
});

function showError(msg) {
    document.getElementById('product-container').innerHTML = `
        <div class="error-state">
            <h2>Oops!</h2>
            <p>${msg}</p>
            <a href="products.html" class="btn btn-primary" style="margin-top: 20px;">Back to Shop</a>
        </div>
    `;
}

function updateQty(change) {
    const input = document.getElementById('qty-input');
    let newVal = parseInt(input.value) + change;
    if (newVal >= 1 && newVal <= parseInt(input.max)) {
        input.value = newVal;
    }
}

function handleAddToCart(id) {
    const qty = parseInt(document.getElementById('qty-input').value);
    addToCart(id, qty);
}

function changeImage(thumbElement) {
    // Update main image src
    document.getElementById('main-image').src = thumbElement.src;
    document.getElementById('main-image').style.filter = thumbElement.style.filter;
    
    // Update active class
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    thumbElement.classList.add('active');
}

function renderRelatedProducts(currentProduct) {
    const grid = document.getElementById('related-products');
    
    // Get 4 products from same category or random
    let related = products.filter(p => p.category === currentProduct.category && p.id !== currentProduct.id);
    
    if (related.length < 4) {
        const others = products.filter(p => p.id !== currentProduct.id && !related.includes(p));
        related = [...related, ...others].slice(0, 4);
    } else {
        related = related.slice(0, 4);
    }

    grid.innerHTML = '';
    
    related.forEach(product => {
        const oldPriceHtml = product.oldPrice 
            ? `<span class="product-old-price">${formatCurrency(product.oldPrice)}</span>`
            : '';

        grid.innerHTML += `
            <div class="product-card">
                <a href="product.html?id=${product.id}">
                    <img src="${product.image}" alt="${product.name}" class="product-image">
                </a>
                <div class="product-info">
                    <span class="product-category">${product.category}</span>
                    <a href="product.html?id=${product.id}" class="product-name">${product.name}</a>
                    <div class="product-price-row">
                        <span class="product-price">${formatCurrency(product.price)}</span>
                        ${oldPriceHtml}
                    </div>
                </div>
            </div>
        `;
    });
}
