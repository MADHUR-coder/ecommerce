document.addEventListener('DOMContentLoaded', () => {
    
    // DOM Elements
    const grid = document.getElementById('products-grid');
    const countDisplay = document.getElementById('product-count');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const applyPriceBtn = document.getElementById('apply-price-btn');
    const sortSelect = document.getElementById('sort-select');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    // State
    let currentProducts = [...products];
    let filters = {
        search: '',
        category: 'All',
        minPrice: null,
        maxPrice: null,
        sort: 'featured'
    };

    // Initialize from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        filters.category = categoryParam;
        updateCategoryActiveState(categoryParam);
    }

    // Initial Render
    applyFiltersAndRender();

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        filters.search = e.target.value.toLowerCase();
        applyFiltersAndRender();
    });

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.dataset.category;
            filters.category = category;
            updateCategoryActiveState(category);
            applyFiltersAndRender();
        });
    });

    applyPriceBtn.addEventListener('click', () => {
        filters.minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
        filters.maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;
        applyFiltersAndRender();
    });

    sortSelect.addEventListener('change', (e) => {
        filters.sort = e.target.value;
        applyFiltersAndRender();
    });

    resetFiltersBtn.addEventListener('click', resetFilters);
    clearSearchBtn.addEventListener('click', resetFilters);

    // Functions
    function applyFiltersAndRender() {
        let filtered = [...products];

        // Search Filter
        if (filters.search) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(filters.search) || 
                p.description.toLowerCase().includes(filters.search)
            );
        }

        // Category Filter
        if (filters.category !== 'All') {
            filtered = filtered.filter(p => p.category === filters.category);
        }

        // Price Filter
        if (filters.minPrice !== null) {
            filtered = filtered.filter(p => p.price >= filters.minPrice);
        }
        if (filters.maxPrice !== null) {
            filtered = filtered.filter(p => p.price <= filters.maxPrice);
        }

        // Sorting
        switch (filters.sort) {
            case 'price-low':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'featured':
            default:
                // For featured, we just use default order (by id)
                filtered.sort((a, b) => a.id - b.id);
                break;
        }

        currentProducts = filtered;
        renderProducts(currentProducts);
    }

    function renderProducts(productsToRender) {
        grid.innerHTML = '';
        countDisplay.textContent = productsToRender.length;

        if (productsToRender.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';

        productsToRender.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const badgeHtml = product.discount > 0 
                ? `<div class="product-badge">-${product.discount}%</div>` 
                : '';
                
            const oldPriceHtml = product.oldPrice 
                ? `<span class="product-old-price">$${product.oldPrice.toFixed(2)}</span>` 
                : '';

            card.innerHTML = `
                ${badgeHtml}
                <div class="product-image-container">
                    <a href="product.html?id=${product.id}">
                        <img src="${product.image}" alt="${product.name}" class="product-image">
                    </a>
                    <div class="product-actions-overlay">
                        <button class="btn-icon" onclick="addToCart(${product.id})" aria-label="Add to cart">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        </button>
                        <button class="btn-icon" aria-label="Add to wishlist">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <span class="product-category">${product.category}</span>
                    <a href="product.html?id=${product.id}" class="product-name">${product.name}</a>
                    <div class="product-rating">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        ${product.rating}
                        <span class="product-reviews">(${product.reviews})</span>
                    </div>
                    <div class="product-price-row">
                        <span class="product-price">$${product.price.toFixed(2)}</span>
                        ${oldPriceHtml}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function updateCategoryActiveState(category) {
        categoryBtns.forEach(btn => {
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function resetFilters() {
        filters = {
            search: '',
            category: 'All',
            minPrice: null,
            maxPrice: null,
            sort: 'featured'
        };
        
        searchInput.value = '';
        minPriceInput.value = '';
        maxPriceInput.value = '';
        sortSelect.value = 'featured';
        updateCategoryActiveState('All');
        
        // Remove URL params if any
        window.history.replaceState({}, document.title, window.location.pathname);
        
        applyFiltersAndRender();
    }
});
