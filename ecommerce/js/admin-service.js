window.AdminService = (() => {
    const PRODUCTS_KEY = 'aura_admin_products';
    const ORDERS_KEY = 'aura_orders';

    function readArray(key, label) {
        const value = localStorage.getItem(key);
        if (value === null) return [];
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error(`Saved ${label} data is invalid. Please restore it before continuing.`);
        return parsed;
    }

    function getProducts() {
        const saved = localStorage.getItem(PRODUCTS_KEY);
        const list = saved === null ? products : readArray(PRODUCTS_KEY, 'product');
        return list.map(product => ({
            ...product,
            stock: Number(product.stock) || 0,
            price: Number(product.price) || 0,
            oldPrice: product.oldPrice ? Number(product.oldPrice) : null
        }));
    }

    function saveProducts(nextProducts) {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(nextProducts));
        products.splice(0, products.length, ...nextProducts);
        window.dispatchEvent(new CustomEvent('aura:products-updated'));
    }

    function getOrders() {
        return readArray(ORDERS_KEY, 'order');
    }

    function saveOrders(nextOrders) {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(nextOrders));
        window.dispatchEvent(new CustomEvent('aura:orders-updated'));
    }

    return {
        getProducts,
        saveProducts,
        getOrders,
        saveOrders,
        isDemo: true
    };
})();
