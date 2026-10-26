document.addEventListener('DOMContentLoaded', () => {
    
    // Check if cart is empty on checkout page load
    if (window.location.pathname.includes('checkout.html')) {
        const cart = getCart();
        if (cart.length === 0) {
            window.location.href = 'cart.html';
            return;
        }

        renderCheckoutSummary();
        initPaymentToggle();
        
        // Handle form submission
        const form = document.getElementById('checkout-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handlePlaceOrder();
        });

        // Handle shipping change
        const shippingRadios = document.querySelectorAll('input[name="shipping"]');
        shippingRadios.forEach(radio => {
            radio.addEventListener('change', renderCheckoutSummary);
        });
    }

    // Success Page Logic
    if (window.location.pathname.includes('order-success.html')) {
        renderOrderSuccess();
    }

});

function renderCheckoutSummary() {
    const cart = getCart();
    const itemsContainer = document.getElementById('checkout-items');
    itemsContainer.innerHTML = '';

    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        itemsContainer.innerHTML += `
            <div class="checkout-item">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="checkout-item-img">
                <div class="checkout-item-info">
                    <div class="checkout-item-name">${escapeHtml(item.name)}</div>
                    <div class="checkout-item-meta">Qty: ${item.quantity}</div>
                </div>
                <div class="checkout-item-price">${formatCurrency(itemTotal)}</div>
            </div>
        `;
    });

    // Get selected shipping
    const shippingMethod = document.querySelector('input[name="shipping"]:checked').value;
    let shippingCost = shippingMethod === 'express' ? 25.00 : 10.00;
    
    // Free standard shipping over 100
    if (shippingMethod === 'standard' && subtotal > 100) {
        shippingCost = 0;
    }

    // Discount
    const discount = subtotal > 200 ? subtotal * 0.05 : 0;
    const total = subtotal + shippingCost - discount;

    document.getElementById('checkout-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('checkout-shipping').textContent = shippingCost === 0 ? 'Free' : formatCurrency(shippingCost);
    document.getElementById('checkout-discount').textContent = `-${formatCurrency(discount)}`;
    document.getElementById('checkout-total').textContent = formatCurrency(total);
}

function initPaymentToggle() {
    const paymentRadios = document.querySelectorAll('input[name="payment"]');
    const cardDetails = document.getElementById('card-details');

    paymentRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'card') {
                cardDetails.style.display = 'block';
            } else {
                cardDetails.style.display = 'none';
            }
        });
    });
}

function handlePlaceOrder() {
    const cart = getCart();
    
    // Generate Fake Order ID
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    
    // Calculate final total to save
    const shippingMethod = document.querySelector('input[name="shipping"]:checked').value;
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let shippingCost = shippingMethod === 'express' ? 25.00 : (subtotal > 100 ? 0 : 10.00);
    const discount = subtotal > 200 ? subtotal * 0.05 : 0;
    const total = subtotal + shippingCost - discount;

    const orderData = {
        orderId: orderId,
        date: new Date().toISOString(),
        items: cart,
        total: total,
        customerName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: document.querySelector('input[name="payment"]:checked').value
    };

    try {
        // These browser-stored records are demo data, not confirmed payment data.
        const storedOrders = localStorage.getItem('aura_orders');
        const orders = storedOrders ? JSON.parse(storedOrders) : [];
        if (!Array.isArray(orders)) throw new Error('Saved order history is not a list.');
        orders.unshift(orderData);
        localStorage.setItem('aura_orders', JSON.stringify(orders));
        localStorage.setItem('aura_last_order', JSON.stringify(orderData));
    } catch (error) {
        console.error('Unable to save the demo order:', error);
        showToast('We could not save this demo order in your browser. Please check browser storage and try again.');
        return;
    }
    
    // Clear cart
    localStorage.removeItem('aura_cart');
    
    // Redirect
    window.location.href = 'order-success.html';
}

function renderOrderSuccess() {
    const orderDataStr = localStorage.getItem('aura_last_order');
    if (!orderDataStr) {
        window.location.href = 'index.html';
        return;
    }

    const orderData = JSON.parse(orderDataStr);
    
    const container = document.getElementById('success-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; max-width: 600px; margin: 0 auto; padding: var(--spacing-xxl) 0;">
                <div style="width: 80px; height: 80px; background-color: var(--success); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--spacing-lg);">
                    <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h1 style="margin-bottom: var(--spacing-sm);">Order Placed Successfully!</h1>
                <p style="color: var(--muted); margin-bottom: var(--spacing-xl);">Thank you for shopping with Aura, ${escapeHtml(orderData.customerName.split(' ')[0])}. Your order has been received.</p>
                
                <div style="background-color: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--spacing-lg); text-align: left; margin-bottom: var(--spacing-xl);">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: var(--spacing-md); margin-bottom: var(--spacing-md);">
                        <div>
                            <span style="color: var(--muted); display: block; font-size: 0.9rem;">Order Number</span>
                            <strong style="font-size: 1.1rem;">${escapeHtml(orderData.orderId)}</strong>
                        </div>
                        <div style="text-align: right;">
                            <span style="color: var(--muted); display: block; font-size: 0.9rem;">Order Total</span>
                            <strong style="font-size: 1.1rem;">${formatCurrency(orderData.total)}</strong>
                        </div>
                    </div>
                    
                    <h3 style="font-size: 1rem; margin-bottom: var(--spacing-md);">Items Ordered:</h3>
                    <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px;">
                        ${orderData.items.map(item => `
                            <li style="display: flex; justify-content: space-between; font-size: 0.95rem;">
                                <span>${Number(item.quantity) || 0}x ${escapeHtml(item.name)}</span>
                                <span>${formatCurrency(item.price * item.quantity)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div style="display: flex; gap: var(--spacing-md); justify-content: center;">
                    <a href="products.html" class="btn btn-primary">Continue Shopping</a>
                    <a href="index.html" class="btn btn-outline">Back to Home</a>
                </div>
            </div>
        `;
    }
}
