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

function initHeroSlider() {
    const slider = document.querySelector('[data-hero-slider]');
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll('.hero-slide'));
    const dots = Array.from(slider.querySelectorAll('[data-hero-slide]'));
    const previousButton = slider.querySelector('[data-hero-previous]');
    const nextButton = slider.querySelector('[data-hero-next]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeIndex = 0;
    let timer;

    const showSlide = (index) => {
        activeIndex = (index + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => {
            slide.hidden = slideIndex !== activeIndex;
        });
        dots.forEach((dot, dotIndex) => {
            dot.setAttribute('aria-current', String(dotIndex === activeIndex));
        });
    };

    const stopAutoplay = () => {
        window.clearInterval(timer);
        timer = undefined;
    };

    const startAutoplay = () => {
        if (reducedMotion || document.hidden || timer !== undefined) return;
        timer = window.setInterval(() => showSlide(activeIndex + 1), 5000);
    };

    previousButton.addEventListener('click', () => showSlide(activeIndex - 1));
    nextButton.addEventListener('click', () => showSlide(activeIndex + 1));
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showSlide(index));
    });

    slider.addEventListener('mouseenter', stopAutoplay);
    slider.addEventListener('mouseleave', startAutoplay);
    slider.addEventListener('focusin', stopAutoplay);
    slider.addEventListener('focusout', (event) => {
        if (!slider.contains(event.relatedTarget)) startAutoplay();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoplay();
        else startAutoplay();
    });

    startAutoplay();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    initMobileMenu();
    initHeroSlider();
    
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
