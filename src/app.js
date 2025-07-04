import config from './config.js';

// HTML Elementlerini Seçme
const app = {
    elements: {
        tableIdSpan: document.getElementById('table-id'),
        notificationArea: document.getElementById('notification'),
        landingPage: document.getElementById('landing-page'),
        menuPage: document.getElementById('menu-page'),
        statusPage: document.getElementById('status-page'),
        cartContainer: document.getElementById('cart-container'),
        callWaiterBtn: document.getElementById('call-waiter-btn'),
        showMenuBtn: document.getElementById('show-menu-btn'),
        menuItemsContainer: document.getElementById('menu-items'),
        cartItemsContainer: document.getElementById('cart-items'),
        totalPriceSpan: document.getElementById('total-price'),
        placeOrderBtn: document.getElementById('place-order-btn'),
        closeCartBtn: document.getElementById('close-cart-btn'),
        backToHomeFromMenu: document.getElementById('back-to-home-from-menu'),
        orderStatusText: document.getElementById('order-status-text'),
        orderProgressBar: document.getElementById('order-progress-bar'),
        newOrderBtn: document.getElementById('new-order-btn'),
    },
    state: {
        restaurantId: null,
        tableId: null,
        supabase: null,
        menu: [],
        cart: [], // { id, name, price, quantity }
        currentOrderId: null,
        orderSubscription: null,
    },
    init() {
        this.getUrlParams();
        this.connectToSupabase();
        this.addEventListeners();
        this.render();
    },
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        this.state.restaurantId = params.get('restaurant') || config.RESTAURANT_ID;
        this.state.tableId = params.get('table');

        if (!this.state.tableId) {
            this.showNotification('Masa kimliği bulunamadı! Lütfen QR kodu tekrar okutun.', 'error');
            this.elements.callWaiterBtn.disabled = true;
            this.elements.showMenuBtn.disabled = true;
        }
    },
    connectToSupabase() {
        if (config.SUPABASE_URL.includes('<') || config.SUPABASE_KEY.includes('<')) {
            console.warn('Supabase yapılandırma bilgileri eksik. Lütfen src/config.js dosyasını doldurun.');
            this.showNotification('Sistem yapılandırması eksik.', 'error');
            return;
        }
        try {
            this.state.supabase = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
            console.log('Supabase bağlantısı başarılı.');
        } catch (error) {
            console.error('Supabase bağlantı hatası:', error);
            this.showNotification('Sisteme bağlanılamadı.', 'error');
        }
    },
    addEventListeners() {
        this.elements.callWaiterBtn.addEventListener('click', () => this.callWaiter());
        this.elements.showMenuBtn.addEventListener('click', () => this.showPage('menu'));
        this.elements.backToHomeFromMenu.addEventListener('click', () => this.showPage('landing'));
        this.elements.placeOrderBtn.addEventListener('click', () => this.placeOrder());
        this.elements.newOrderBtn.addEventListener('click', () => this.resetForNewOrder());
        this.elements.closeCartBtn.addEventListener('click', () => this.toggleCart(false));

        this.elements.menuItemsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart-btn')) {
                const menuItemEl = e.target.closest('.menu-item');
                const itemId = parseInt(menuItemEl.dataset.id, 10);
                const item = this.state.menu.find(m => m.id === itemId);
                if (item) this.addToCart(item);
            }
        });

        this.elements.cartItemsContainer.addEventListener('click', (e) => {
             if (e.target.dataset.action === 'decrease') {
                const cartItemEl = e.target.closest('.cart-item');
                const itemId = parseInt(cartItemEl.dataset.id, 10);
                this.updateCartQuantity(itemId, -1);
             } else if (e.target.dataset.action === 'increase') {
                const cartItemEl = e.target.closest('.cart-item');
                const itemId = parseInt(cartItemEl.dataset.id, 10);
                this.updateCartQuantity(itemId, 1);
             }
        });
    },
    async callWaiter() {
        if (!this.state.supabase) return this.showNotification('Sistem bağlantısı yok.', 'error');
        
        try {
            const { error } = await this.state.supabase.from('calls').insert({ 
                restaurant_id: this.state.restaurantId, 
                table_id: this.state.tableId 
            });
            if (error) throw error;
            this.showNotification('Garson çağrıldı, lütfen bekleyin.', 'success');
        } catch (error) {
            console.error('Garson çağırma hatası:', error);
            this.showNotification('İstek gönderilemedi. Lütfen tekrar deneyin.', 'error');
        }
    },
    async fetchMenu() {
        if (this.state.menu.length > 0) return; // Menü zaten çekilmişse tekrar çekme
        if (!this.state.supabase) return this.showNotification('Sistem bağlantısı yok.', 'error');

        try {
            const { data, error } = await this.state.supabase
                .from('menu_items')
                .select('*')
                .eq('restaurant_id', this.state.restaurantId)
                .eq('is_available', true);
            
            if (error) throw error;
            this.state.menu = data;
            this.renderMenu();
        } catch (error) {
            console.error('Menü alınamadı:', error);
            this.showNotification('Menü yüklenemedi.', 'error');
        }
    },
    async placeOrder() {
        if (this.state.cart.length === 0) return this.showNotification('Sepetiniz boş!', 'warning');
        if (!this.state.supabase) return this.showNotification('Sistem bağlantısı yok.', 'error');
        
        this.elements.placeOrderBtn.disabled = true;
        this.elements.placeOrderBtn.textContent = 'Gönderiliyor...';

        const orderItems = this.state.cart.map(item => ({ 
            item_id: item.id, 
            name: item.name,
            quantity: item.quantity, 
            price: item.price 
        }));
        
        const totalPrice = this.state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);

        try {
            const { data, error } = await this.state.supabase
                .from('orders')
                .insert({
                    restaurant_id: this.state.restaurantId,
                    table_id: this.state.tableId,
                    items: orderItems,
                    total_price: totalPrice,
                    status: 'pending_approval' // Garson onayı bekliyor
                })
                .select('id')
                .single();

            if (error) throw error;
            
            this.state.currentOrderId = data.id;
            this.showNotification('Siparişiniz garson onayına gönderildi.', 'success');
            this.listenForOrderUpdates();
            this.showPage('status');

        } catch (error) {
            console.error('Sipariş gönderme hatası:', error);
            this.showNotification('Sipariş gönderilemedi.', 'error');
        } finally {
            this.elements.placeOrderBtn.disabled = false;
            this.elements.placeOrderBtn.textContent = 'Siparişi Onayla';
        }
    },
    showPage(pageName) {
        ['landingPage', 'menuPage', 'statusPage'].forEach(page => {
            this.elements[page].classList.add('hidden');
        });
        this.elements[pageName].classList.remove('hidden');

        if (pageName === 'menuPage') {
            this.fetchMenu();
            this.toggleCart(true);
        } else {
             this.toggleCart(false);
        }
    },
    toggleCart(visible) {
        if(visible && this.state.cart.length > 0) {
            this.elements.cartContainer.classList.remove('hidden');
        } else {
            this.elements.cartContainer.classList.add('hidden');
        }
    },
    addToCart(item) {
        const existingItem = this.state.cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.state.cart.push({ ...item, quantity: 1 });
        }
        this.renderCart();
    },
    updateCartQuantity(itemId, change) {
        const itemInCart = this.state.cart.find(item => item.id === itemId);
        if (!itemInCart) return;

        itemInCart.quantity += change;

        if (itemInCart.quantity <= 0) {
            this.state.cart = this.state.cart.filter(item => item.id !== itemId);
        }
        this.renderCart();
    },
    render() {
        this.elements.tableIdSpan.textContent = this.state.tableId || 'N/A';
        this.renderCart();
        this.renderOrderStatus();
    },
    renderMenu() {
        this.elements.menuItemsContainer.innerHTML = '';
        if (this.state.menu.length === 0) {
            this.elements.menuItemsContainer.innerHTML = '<p class="text-center text-gray-500">Şu anda menüde ürün bulunmuyor.</p>';
            return;
        }

        const categories = [...new Set(this.state.menu.map(item => item.category))];

        categories.forEach(category => {
            const categoryWrapper = document.createElement('div');
            categoryWrapper.innerHTML = `<h3 class="text-xl font-bold text-gray-700 border-b-2 border-brand-primary pb-1 mb-2">${category}</h3>`;
            
            this.state.menu.filter(item => item.category === category).forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'menu-item flex items-center justify-between p-3 bg-white rounded-lg shadow-sm';
                itemEl.dataset.id = item.id;
                itemEl.innerHTML = `
                    <div class="flex-grow">
                        <h4 class="font-bold">${item.name}</h4>
                        <p class="text-sm text-gray-600">${item.description || ''}</p>
                        <p class="font-semibold text-brand-primary mt-1">${item.price.toFixed(2)} TL</p>
                    </div>
                    <button class="add-to-cart-btn bg-brand-primary text-white font-bold w-10 h-10 rounded-full text-lg">+</button>
                `;
                categoryWrapper.appendChild(itemEl);
            });
            this.elements.menuItemsContainer.appendChild(categoryWrapper);
        });
    },
    renderCart() {
        this.elements.cartItemsContainer.innerHTML = '';
        if (this.state.cart.length === 0) {
            this.elements.cartItemsContainer.innerHTML = '<p class="text-center text-xs text-gray-400">Sepetiniz boş.</p>';
            this.toggleCart(false);
        } else {
             this.state.cart.forEach(item => {
                const cartItemEl = document.createElement('div');
                cartItemEl.className = 'cart-item flex justify-between items-center text-sm';
                cartItemEl.dataset.id = item.id;
                cartItemEl.innerHTML = `
                    <span>${item.name}</span>
                    <div class="flex items-center gap-2">
                        <button data-action="decrease" class="bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center font-bold">-</button>
                        <span>${item.quantity}</span>
                        <button data-action="increase" class="bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center font-bold">+</button>
                    </div>
                `;
                this.elements.cartItemsContainer.appendChild(cartItemEl);
            });
            this.toggleCart(true);
        }

        const totalPrice = this.state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        this.elements.totalPriceSpan.textContent = `${totalPrice.toFixed(2)} TL`;
    },
    listenForOrderUpdates() {
        if (this.state.orderSubscription) {
            this.state.supabase.removeChannel(this.state.orderSubscription);
        }

        this.state.orderSubscription = this.state.supabase.channel(`public:orders:id=eq.${this.state.currentOrderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
                console.log('Sipariş durumu güncellendi:', payload.new);
                this.renderOrderStatus(payload.new.status);
            })
            .subscribe();
    },
    renderOrderStatus(status) {
        const currentStatus = status || 'pending_approval';
        const statusMap = {
            'pending_approval': { text: 'Garson Onayı Bekleniyor...', progress: '25%' },
            'received': { text: 'Siparişiniz Alındı ve Hazırlanıyor.', progress: '50%' },
            'preparing': { text: 'Siparişiniz Hazırlanıyor.', progress: '50%' },
            'ready': { text: 'Siparişiniz Hazır! Garsonumuz Getiriyor.', progress: '75%' },
            'served': { text: 'Siparişiniz Servis Edildi. Afiyet Olsun!', progress: '100%' },
        };
        
        const displayStatus = statusMap[currentStatus] || { text: 'Siparişiniz Alındı.', progress: '25%' };
        this.elements.orderStatusText.textContent = displayStatus.text;
        this.elements.orderProgressBar.style.width = displayStatus.progress;

        if (currentStatus === 'served') {
            this.elements.newOrderBtn.classList.remove('hidden');
            if(this.state.orderSubscription) this.state.supabase.removeChannel(this.state.orderSubscription);
        } else {
             this.elements.newOrderBtn.classList.add('hidden');
        }
    },
    showNotification(message, type = 'info') {
        const bgColor = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            error: 'bg-red-500',
        }[type];

        this.elements.notificationArea.className = `p-3 mb-4 rounded-lg text-white text-center font-semibold ${bgColor}`;
        this.elements.notificationArea.textContent = message;
        this.elements.notificationArea.classList.remove('hidden');

        setTimeout(() => {
            this.elements.notificationArea.classList.add('hidden');
        }, 3000);
    },
    resetForNewOrder() {
        this.state.cart = [];
        this.state.currentOrderId = null;
        if(this.state.orderSubscription) this.state.supabase.removeChannel(this.state.orderSubscription);
        this.state.orderSubscription = null;
        this.showPage('landing');
        this.renderCart();
    }
};

// Uygulamayı Başlat
document.addEventListener('DOMContentLoaded', () => app.init()); 