// Global Utility Functions

// Toast Notification
function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    container.appendChild(toast);

    // Remove toast after animation completes (3 seconds)
    setTimeout(() => {
        if (toast.parentNode === container) {
            container.removeChild(toast);
        }
    }, 3000);
}

// Cart LocalStorage Utilities
function getCart() {
    const cartStr = localStorage.getItem('aura_cart');
    return cartStr ? JSON.parse(cartStr) : [];
}

function saveCart(cart) {
    localStorage.setItem('aura_cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(productId, quantity = 1) {
    // Find product data
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return;

    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }

    saveCart(cart);
    showToast(`${product.name} added to cart!`);
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const countElements = document.querySelectorAll('.cart-count');
    countElements.forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

// Check Login State
function isLoggedIn() {
    return localStorage.getItem('aura_user') !== null;
}

// Mobile Menu Toggle
function initMobileMenu() {
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    initMobileMenu();
    
    // Auth UI Update
    const loginLink = document.getElementById('nav-login');
    if (loginLink && isLoggedIn()) {
        const user = JSON.parse(localStorage.getItem('aura_user'));
        loginLink.innerHTML = `<i class="fas fa-user"></i> ${user.name.split(' ')[0]}`;
        loginLink.href = "#"; // Could point to a profile page
        
        // Add logout option
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm("Do you want to logout?")) {
                localStorage.removeItem('aura_user');
                window.location.reload();
            }
        });
    }
});
