document.addEventListener('DOMContentLoaded', () => {
    
    const cartContent = document.getElementById('cart-content');
    const emptyCart = document.getElementById('empty-cart');
    const cartItemsContainer = document.getElementById('cart-items');
    
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryShipping = document.getElementById('summary-shipping');
    const summaryDiscount = document.getElementById('summary-discount');
    const summaryTotal = document.getElementById('summary-total');

    renderCart();

    function renderCart() {
        const cart = getCart();

        if (cart.length === 0) {
            cartContent.style.display = 'none';
            emptyCart.style.display = 'block';
            return;
        }

        cartContent.style.display = 'grid';
        emptyCart.style.display = 'none';
        
        cartItemsContainer.innerHTML = '';
        let subtotal = 0;

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const cartItemEl = document.createElement('div');
            cartItemEl.className = 'cart-item';
            
            cartItemEl.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-info">
                    <a href="product.html?id=${item.id}" class="cart-item-name">${item.name}</a>
                    <span class="cart-item-price">${formatCurrency(item.price)}</span>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateItemQuantity(${index}, -1)">-</button>
                    <input type="number" class="qty-input" value="${item.quantity}" readonly>
                    <button class="qty-btn" onclick="updateItemQuantity(${index}, 1)">+</button>
                </div>
                <div class="cart-item-total">${formatCurrency(itemTotal)}</div>
                <button class="remove-btn" onclick="removeItem(${index})" aria-label="Remove item">
                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            `;
            cartItemsContainer.appendChild(cartItemEl);
        });

        // Calculate Totals
        // For demonstration, standard shipping is INR 10.00, or free if subtotal > 100
        const shipping = subtotal > 100 ? 0 : 10.00;
        // Discount logic for demo (e.g. 5% off over 200)
        const discount = subtotal > 200 ? subtotal * 0.05 : 0;
        const total = subtotal + shipping - discount;

        summarySubtotal.textContent = formatCurrency(subtotal);
        summaryShipping.textContent = shipping === 0 ? 'Free' : formatCurrency(shipping);
        summaryDiscount.textContent = `-${formatCurrency(discount)}`;
        summaryTotal.textContent = formatCurrency(total);
    }

    // Expose functions globally for inline handlers
    window.updateItemQuantity = function(index, change) {
        const cart = getCart();
        if (cart[index]) {
            const newQty = cart[index].quantity + change;
            if (newQty > 0) {
                cart[index].quantity = newQty;
                saveCart(cart);
                renderCart();
            }
        }
    };

    window.removeItem = function(index) {
        const cart = getCart();
        if (cart[index]) {
            const itemName = cart[index].name;
            cart.splice(index, 1);
            saveCart(cart);
            renderCart();
            showToast(`${itemName} removed from cart`);
        }
    };
});
