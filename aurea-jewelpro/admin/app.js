// JEWELPRO ADMIN PORTAL APPLICATION LOGIC

// Configuration & DB State
const CONFIG = {
    supabaseUrl: window.localStorage.getItem('SUPABASE_URL') || 'https://lgpabnbpqjjppoohqyed.supabase.co',
    supabaseKey: window.localStorage.getItem('SUPABASE_KEY') || 'sb_publishable_hI8qu4n-dt3xv-SsOac97A_Cf5EMxlI',
    liveGoldRate: 7200, // standard base gold rate (22K) per gram
};

let supabaseClient = null;
if (CONFIG.supabaseUrl && CONFIG.supabaseKey) {
    supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
}

// Unified Database System (Directly reads/writes same localStorage items as website)
const DB = {
    getProducts() {
        let local = localStorage.getItem('aurea_products');
        if (!local) {
            // Seed initial products if empty
            const seed = [
                { id: 1, sku: 'JW-R-01', name: 'Imperial Solitaire Ring', category: 'Ring', metal: 'Gold', purity: '22K', weight: 8.5, making_charges: 150, stock: 12, image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=80' },
                { id: 2, sku: 'JW-N-02', name: 'Royale Peacock Necklace', category: 'Necklace', metal: 'Gold', purity: '22K', weight: 42.0, making_charges: 180, stock: 5, image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=80' },
                { id: 3, sku: 'JW-E-03', name: 'Dewdrop Chandelier Earrings', category: 'Earring', metal: 'Gold', purity: '22K', weight: 14.2, making_charges: 160, stock: 8, image_url: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=500&auto=format&fit=crop&q=80' },
                { id: 4, sku: 'JW-B-04', name: 'Varanasi Filigree Bangle', category: 'Bangle', metal: 'Gold', purity: '22K', weight: 28.5, making_charges: 140, stock: 6, image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&auto=format&fit=crop&q=80' },
                { id: 5, sku: 'JW-A-05', name: 'Celestial Ghungroo Anklet', category: 'Anklet', metal: 'Silver', purity: '925 Sterling', weight: 18.0, making_charges: 80, stock: 15, image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&auto=format&fit=crop&q=80' },
                { id: 6, sku: 'JW-R-06', name: 'Eternal Band of Promise', category: 'Ring', metal: 'Platinum', purity: '950 Platinum', weight: 6.2, making_charges: 250, stock: 10, image_url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&auto=format&fit=crop&q=80' }
            ];
            localStorage.setItem('aurea_products', JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(local);
    },

    saveProducts(products) {
        localStorage.setItem('aurea_products', JSON.stringify(products));
        // Real-time Supabase push would happen here
    },

    getTransactions() {
        let local = localStorage.getItem('aurea_transactions');
        if (!local) {
            // Seed a few transactions for dashboard display
            const seed = [
                { id: 'INV-1001', customer_name: 'Priya M.', customer_phone: '9845012345', items: [{ sku: 'JW-N-02', name: 'Royale Peacock Necklace', quantity: 1, price: 302400 }], subtotal: 302400, making: 7560, gst: 9298, discount: 5000, total: 314258, payment_method: 'UPI', type: 'Online', date: new Date().toISOString() },
                { id: 'INV-1002', customer_name: 'Aditya K.', customer_phone: '9744123456', items: [{ sku: 'JW-R-01', name: 'Imperial Solitaire Ring', quantity: 1, price: 61200 }], subtotal: 61200, making: 1275, gst: 1874, discount: 0, total: 64349, payment_method: 'Cash', type: 'POS', date: new Date(Date.now() - 86400000).toISOString() }
            ];
            localStorage.setItem('aurea_transactions', JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(local);
    },

    saveTransaction(transaction) {
        let txs = this.getTransactions();
        txs.unshift(transaction);
        localStorage.setItem('aurea_transactions', JSON.stringify(txs));

        // Auto Ledger Record
        let ledger = this.getLedger();
        const prevBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
        const entry = {
            date: new Date().toISOString(),
            description: `Sale ${transaction.id} - ${transaction.customer_name}`,
            credit: transaction.total,
            debit: 0,
            balance: prevBal + transaction.total
        };
        ledger.push(entry);
        localStorage.setItem('aurea_ledger', JSON.stringify(ledger));

        // Decrement Stock
        let prods = this.getProducts();
        transaction.items.forEach(item => {
            let p = prods.find(pr => pr.sku === item.sku);
            if (p) p.stock = Math.max(0, p.stock - item.quantity);
        });
        this.saveProducts(prods);

        // Update customer profile CRM
        this.upsertCustomer({
            name: transaction.customer_name,
            phone: transaction.customer_phone,
            points: Math.floor(transaction.total / 100),
            join_date: new Date().toISOString()
        }, transaction.total);
    },

    getLedger() {
        let local = localStorage.getItem('aurea_ledger');
        if (!local) {
            const seed = [
                { date: new Date(Date.now() - 604800000).toISOString(), description: 'Opening Balance Seeding', credit: 500000, debit: 0, balance: 500000 },
                { date: new Date(Date.now() - 345600000).toISOString(), description: 'Bulk Gold Purchase (22K raw)', credit: 0, debit: 150000, balance: 350000 }
            ];
            localStorage.setItem('aurea_ledger', JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(local);
    },

    saveLedger(ledger) {
        localStorage.setItem('aurea_ledger', JSON.stringify(ledger));
    },

    getCustomers() {
        let local = localStorage.getItem('aurea_customers');
        if (!local) {
            const seed = [
                { name: 'Priya M.', phone: '9845012345', email: 'priya@gmail.com', points: 3140, join_date: new Date(Date.now() - 100000000).toISOString(), address: 'Kochi, Kerala', gold_scheme_balance: 11000, gold_scheme_paid_months: 11, birthday: '05-18' },
                { name: 'Aditya K.', phone: '9744123456', email: 'aditya@gmail.com', points: 640, join_date: new Date(Date.now() - 50000000).toISOString(), address: 'Calicut, Kerala', gold_scheme_balance: 0, gold_scheme_paid_months: 0, birthday: '09-12' }
            ];
            localStorage.setItem('aurea_customers', JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(local);
    },

    upsertCustomer(customer, purchaseValue = 0) {
        let list = this.getCustomers();
        let existing = list.find(c => c.phone === customer.phone);
        if (existing) {
            existing.points += Math.floor(purchaseValue / 100);
            if (customer.name) existing.name = customer.name;
        } else {
            customer.points = Math.floor(purchaseValue / 100);
            customer.gold_scheme_balance = 0;
            customer.gold_scheme_paid_months = 0;
            list.push(customer);
        }
        localStorage.setItem('aurea_customers', JSON.stringify(list));
    },

    getRepairs() {
        let local = localStorage.getItem('aurea_repairs');
        if (!local) {
            const seed = [
                { id: 'REP-001', customer_name: 'Anita K.', description: 'Bangle Resizing', issue: 'Slightly tight', cost: 1200, promised_date: '2026-05-20', status: 'In Progress' },
                { id: 'REP-002', customer_name: 'Ramesh R.', description: 'Chain Polishing', issue: 'Gold shine fade', cost: 800, promised_date: '2026-05-18', status: 'Ready' }
            ];
            localStorage.setItem('aurea_repairs', JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(local);
    },

    saveRepairs(repairs) {
        localStorage.setItem('aurea_repairs', JSON.stringify(repairs));
    }
};

// Global App State
let activeSection = 'dashboard';
let posCart = [];
let goldRate = CONFIG.liveGoldRate;
let revenueChartInstance = null;
let categoryChartInstance = null;

// Section Routing
function switchSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    document.getElementById(`section-${sectionId}`).classList.add('active');
    event.currentTarget.classList.add('active');
    
    document.getElementById('pageTitle').innerText = sectionId.toUpperCase().replace('-', ' ');
    activeSection = sectionId;

    // Trigger specific initializers
    if (sectionId === 'dashboard') {
        loadDashboard();
    } else if (sectionId === 'inventory') {
        renderInventory();
    } else if (sectionId === 'ledger') {
        renderLedger();
    } else if (sectionId === 'gst') {
        renderGSTReport();
    } else if (sectionId === 'crm') {
        renderCRM();
    } else if (sectionId === 'gold-scheme') {
        renderGoldScheme();
    } else if (sectionId === 'repairs') {
        renderRepairs();
    } else if (sectionId === 'reports') {
        loadAnalytics();
    }
}

// Live Gold Rate ticker updater
function initGoldRateDisplay() {
    // Generate organic slight fluctuation
    const fluctuation = (Math.random() - 0.5) * 40;
    goldRate = Math.round(CONFIG.liveGoldRate + fluctuation);
    document.getElementById('adminLiveGoldDisplay').innerText = `✨ 22K Gold Rate: ₹${goldRate.toLocaleString('en-IN')}/g`;
}

// --- DASHBOARD MODULE ---
function loadDashboard() {
    const products = DB.getProducts();
    const transactions = DB.getTransactions();
    const customers = DB.getCustomers();
    const repairs = DB.getRepairs();

    // 1. Calculate KPI Metrics
    const today = new Date().toDateString();
    const todaySalesSum = transactions
        .filter(t => new Date(t.date).toDateString() === today)
        .reduce((sum, t) => sum + t.total, 0);

    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const pendingRepairsCount = repairs.filter(r => r.status !== 'Delivered').length;

    document.getElementById('kpi-sales').innerText = `₹${todaySalesSum.toLocaleString('en-IN')}`;
    document.getElementById('kpi-stock').innerText = totalStock.toLocaleString('en-IN');
    document.getElementById('kpi-customers').innerText = customers.length.toLocaleString('en-IN');
    document.getElementById('kpi-repairs').innerText = pendingRepairsCount;

    // 2. Render Recent Transactions Table
    const recentTxBody = document.getElementById('recentTransactionsTable');
    recentTxBody.innerHTML = '';
    transactions.slice(0, 5).forEach(t => {
        recentTxBody.innerHTML += `
            <tr>
                <td>${t.id}</td>
                <td>${t.customer_name}</td>
                <td>₹${t.total.toLocaleString('en-IN')}</td>
                <td>${t.payment_method}</td>
                <td><span class="badge badge-success">${t.type}</span></td>
            </tr>
        `;
    });

    // 3. Render Inventory Snapshot (Low Stock Items)
    const snapshotBody = document.getElementById('inventorySnapshotTable');
    snapshotBody.innerHTML = '';
    const lowStock = products.filter(p => p.stock <= 5).slice(0, 5);
    lowStock.forEach(p => {
        const badgeClass = p.stock === 0 ? 'badge-danger' : 'badge-warning';
        const label = p.stock === 0 ? 'Out of Stock' : 'Low Stock';
        snapshotBody.innerHTML += `
            <tr>
                <td>${p.sku}</td>
                <td>${p.name}</td>
                <td>${p.stock}</td>
                <td><span class="badge ${badgeClass}">${label}</span></td>
            </tr>
        `;
    });

    // 4. Render Charts (ChartJS)
    renderDashboardCharts(transactions);
}

function renderDashboardCharts(transactions) {
    if (revenueChartInstance) revenueChartInstance.destroy();
    if (categoryChartInstance) categoryChartInstance.destroy();

    // 8-Month Revenue Bar Chart
    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    revenueChartInstance = new Chart(ctxRevenue, {
        type: 'bar',
        data: {
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [{
                label: 'Monthly Revenue (Lakhs ₹)',
                data: [12.4, 15.6, 22.1, 18.2, 14.5, 20.3, 16.8, 18.4],
                backgroundColor: 'rgba(212, 175, 55, 0.6)',
                borderColor: '#d4af37',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#a0a0a0' } },
                x: { grid: { display: false }, ticks: { color: '#a0a0a0' } }
            },
            plugins: { legend: { labels: { color: '#ffffff' } } }
        }
    });

    // Category Sales Donut Chart
    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
            labels: ['Rings', 'Necklaces', 'Earrings', 'Bangles', 'Anklets'],
            datasets: [{
                data: [35, 25, 20, 15, 5],
                backgroundColor: ['#d4af37', '#aa7c11', '#f3e5ab', '#5c4033', '#a0a0a0']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: '#ffffff' } } }
        }
    });
}

// --- POS MODULE ---
let posCustomer = null;

function searchPOSProducts() {
    const query = document.getElementById('posSearch').value.toLowerCase();
    const dropdown = document.getElementById('searchResults');
    
    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    const products = DB.getProducts();
    const filtered = products.filter(p => (p.sku.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)) && p.stock > 0);

    dropdown.innerHTML = '';
    if (filtered.length === 0) {
        dropdown.innerHTML = `<div class="search-result-item">No items found</div>`;
    } else {
        filtered.forEach(p => {
            dropdown.innerHTML += `
                <div class="search-result-item" onclick="addPOSItem('${p.sku}')">
                    <span>${p.sku} - ${p.name}</span>
                    <span>Stock: ${p.stock}</span>
                </div>
            `;
        });
    }
    dropdown.style.display = 'block';
}

function addPOSItem(sku) {
    const products = DB.getProducts();
    const item = products.find(p => p.sku === sku);
    if (!item) return;

    const existing = posCart.find(i => i.sku === sku);
    if (existing) {
        existing.quantity += 1;
    } else {
        posCart.push({ ...item, quantity: 1 });
    }

    document.getElementById('posSearch').value = '';
    document.getElementById('searchResults').style.display = 'none';
    
    renderPOSCartTable();
}

function removePOSItem(sku) {
    posCart = posCart.filter(i => i.sku !== sku);
    renderPOSCartTable();
}

function calculatePOSProductPrice(p) {
    if (p.metal === 'Gold') {
        return Math.round((p.weight * goldRate) + (p.weight * p.making_charges));
    } else if (p.metal === 'Silver') {
        return Math.round((p.weight * 92) + (p.weight * p.making_charges));
    } else {
        return Math.round((p.weight * 4200) + (p.weight * p.making_charges));
    }
}

function renderPOSCartTable() {
    const body = document.getElementById('posBillTable');
    body.innerHTML = '';
    
    posCart.forEach(item => {
        const itemPrice = calculatePOSProductPrice(item);
        body.innerHTML += `
            <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.weight}g</td>
                <td>₹${item.making_charges}/g</td>
                <td>₹${(itemPrice * item.quantity).toLocaleString('en-IN')}</td>
                <td><button class="btn btn-secondary btn-sm" onclick="removePOSItem('${item.sku}')">✕</button></td>
            </tr>
        `;
    });

    calculatePOSBill();
}

function calculatePOSBill() {
    let subtotal = 0;
    let making = 0;

    posCart.forEach(item => {
        const price = calculatePOSProductPrice(item);
        subtotal += price * item.quantity;
        making += item.weight * item.making_charges * item.quantity;
    });

    const gst = Math.round((subtotal + making) * 0.03);
    const discount = parseInt(document.getElementById('posDiscount').value) || 0;
    
    let grandTotal = subtotal + making + gst - discount;
    if (grandTotal < 0) grandTotal = 0;

    document.getElementById('posSubtotal').innerText = `₹${subtotal.toLocaleString('en-IN')}`;
    document.getElementById('posMaking').innerText = `₹${making.toLocaleString('en-IN')}`;
    document.getElementById('posGST').innerText = `₹${gst.toLocaleString('en-IN')}`;
    document.getElementById('posGrandTotal').innerText = `₹${grandTotal.toLocaleString('en-IN')}`;
}

function autoFetchCustomerCRM() {
    const phone = document.getElementById('posCustomerPhone').value;
    const customers = DB.getCustomers();
    posCustomer = customers.find(c => c.phone === phone);
    
    const nameInput = document.getElementById('posCustomerName');
    const loyaltySec = document.getElementById('loyaltySection');
    
    if (posCustomer) {
        nameInput.value = posCustomer.name;
        loyaltySec.innerHTML = `
            <div style="background: rgba(212,175,55,0.05); padding: 0.8rem; border-radius: 4px; margin-top: 1rem; border: 1px solid var(--border-gold);">
                <small style="color: var(--gold);">VIP Customer • Available Points: ${posCustomer.points}</small>
                <div style="display: flex; justify-content: space-between; margin-top: 0.4rem; align-items: center;">
                    <span style="font-size: 0.85rem;">Burn points for discount (₹1/pt)</span>
                    <button class="btn btn-secondary btn-sm" onclick="burnLoyaltyPoints()">Redeem All</button>
                </div>
            </div>
        `;
    } else {
        nameInput.value = '';
        loyaltySec.innerHTML = '';
    }
}

function burnLoyaltyPoints() {
    if (!posCustomer || posCustomer.points <= 0) return;
    const burnVal = Math.min(posCustomer.points, 100000000000000000000); // Redeem all
    document.getElementById('posDiscount').value = burnVal;
    calculatePOSBill();
}

function completePOSSale() {
    if (posCart.length === 0) {
        alert("Please add items to build an invoice.");
        return;
    }

    const phone = document.getElementById('posCustomerPhone').value;
    const name = document.getElementById('posCustomerName').value || 'Walk-in Customer';
    
    if (!phone) {
        alert("Customer Phone Number is mandatory to track GST / CRM.");
        return;
    }

    const subtotal = posCart.reduce((sum, item) => sum + (calculatePOSProductPrice(item) * item.quantity), 0);
    const making = posCart.reduce((sum, item) => sum + (item.weight * item.making_charges * item.quantity), 0);
    const gst = Math.round((subtotal + making) * 0.03);
    const discount = parseInt(document.getElementById('posDiscount').value) || 0;
    const grandTotal = subtotal + making + gst - discount;

    const transaction = {
        id: `INV-${Date.now().toString().slice(-4)}`,
        customer_name: name,
        customer_phone: phone,
        items: posCart.map(i => ({ sku: i.sku, name: i.name, quantity: i.quantity, price: calculatePOSProductPrice(i) })),
        subtotal: subtotal,
        making: making,
        gst: gst,
        discount: discount,
        total: grandTotal,
        payment_method: document.querySelector('input[name="paymentMethod"]:checked').value,
        type: 'POS',
        date: new Date().toISOString()
    };

    DB.saveTransaction(transaction);
    
    // CRM updates (deduct points if burnt)
    if (posCustomer && discount > 0) {
        posCustomer.points = Math.max(0, posCustomer.points - discount);
        let list = DB.getCustomers();
        let idx = list.findIndex(c => c.phone === posCustomer.phone);
        if (idx !== -1) {
            list[idx].points = posCustomer.points;
            localStorage.setItem('aurea_customers', JSON.stringify(list));
        }
    }

    showInvoiceModal(transaction);
    posCart = [];
    posCustomer = null;
    document.getElementById('posCustomerPhone').value = '';
    document.getElementById('posCustomerName').value = '';
    document.getElementById('posDiscount').value = '0';
    document.getElementById('loyaltySection').innerHTML = '';
    renderPOSCartTable();
}

// --- INVENTORY MODULE ---
function renderInventory() {
    const products = DB.getProducts();
    const query = document.getElementById('inventorySearch').value.toLowerCase();
    const body = document.getElementById('inventoryTableBody');
    body.innerHTML = '';

    const filtered = products.filter(p => p.sku.toLowerCase().includes(query) || p.name.toLowerCase().includes(query));

    filtered.forEach(p => {
        let badge = '';
        if (p.stock >= 10) badge = '<span class="badge badge-success">In Stock</span>';
        else if (p.stock > 0) badge = '<span class="badge badge-warning">Low Stock</span>';
        else badge = '<span class="badge badge-danger">Out of Stock</span>';

        body.innerHTML += `
            <tr>
                <td>${p.sku}</td>
                <td>${p.name}</td>
                <td>${p.metal}</td>
                <td>${p.purity}</td>
                <td>${p.weight}g</td>
                <td>₹${p.making_charges}/g</td>
                <td><strong>${p.stock}</strong></td>
                <td>${badge}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="editProduct('${p.sku}')">Edit</button>
                    <button class="btn btn-secondary btn-sm" style="color: #ff3333; border-color: rgba(255,0,0,0.15);" onclick="deleteProduct('${p.sku}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

function openNewProductModal() {
    document.getElementById('productModalTitle').innerText = "Add New Product";
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('productModal').style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

function editProduct(sku) {
    const products = DB.getProducts();
    const p = products.find(prod => prod.sku === sku);
    if (!p) return;

    document.getElementById('productModalTitle').innerText = "Edit Product Details";
    document.getElementById('prodId').value = p.sku;
    document.getElementById('prodSku').value = p.sku;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodCategory').value = p.category;
    document.getElementById('prodMetal').value = p.metal;
    document.getElementById('prodPurity').value = p.purity;
    document.getElementById('prodWeight').value = p.weight;
    document.getElementById('prodMaking').value = p.making_charges;
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodImageUrl').value = p.image_url;

    document.getElementById('productModal').style.display = 'flex';
}

document.getElementById('productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('prodId').value;
    const sku = document.getElementById('prodSku').value;
    
    let products = DB.getProducts();

    const productData = {
        sku: sku,
        name: document.getElementById('prodName').value,
        category: document.getElementById('prodCategory').value,
        metal: document.getElementById('prodMetal').value,
        purity: document.getElementById('prodPurity').value,
        weight: parseFloat(document.getElementById('prodWeight').value),
        making_charges: parseInt(document.getElementById('prodMaking').value),
        stock: parseInt(document.getElementById('prodStock').value),
        image_url: document.getElementById('prodImageUrl').value || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=80'
    };

    if (id) {
        // Edit Mode
        const idx = products.findIndex(p => p.sku === id);
        if (idx !== -1) products[idx] = productData;
    } else {
        // Add Mode
        products.push(productData);
    }

    DB.saveProducts(products);
    closeProductModal();
    renderInventory();
});

function deleteProduct(sku) {
    if (confirm(`Are you sure you want to delete product SKU: ${sku}?`)) {
        let products = DB.getProducts();
        products = products.filter(p => p.sku !== sku);
        DB.saveProducts(products);
        renderInventory();
    }
}

// --- ACCOUNTING LEDGER MODULE ---
function renderLedger() {
    const ledger = DB.getLedger();
    const body = document.getElementById('ledgerTableBody');
    body.innerHTML = '';
    
    // Sort transactions chronologically
    ledger.sort((a,b) => new Date(a.date) - new Date(b.date));

    let runningBal = 0;
    ledger.forEach(entry => {
        runningBal = runningBal + entry.credit - entry.debit;
        entry.balance = runningBal; // recalculate dynamically

        body.innerHTML += `
            <tr>
                <td>${new Date(entry.date).toLocaleDateString()}</td>
                <td>${entry.description}</td>
                <td style="color: #28a745;">₹${entry.credit > 0 ? entry.credit.toLocaleString('en-IN') : '-'}</td>
                <td style="color: #dc3545;">₹${entry.debit > 0 ? entry.debit.toLocaleString('en-IN') : '-'}</td>
                <td><strong>₹${entry.balance.toLocaleString('en-IN')}</strong></td>
            </tr>
        `;
    });
}

document.getElementById('ledgerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('ledgerDesc').value;
    const credit = parseInt(document.getElementById('ledgerCredit').value) || 0;
    const debit = parseInt(document.getElementById('ledgerDebit').value) || 0;

    const entry = {
        date: new Date().toISOString(),
        description: desc,
        credit: credit,
        debit: debit
    };

    let ledger = DB.getLedger();
    ledger.push(entry);
    DB.saveLedger(ledger);
    
    document.getElementById('ledgerForm').reset();
    renderLedger();
});

// --- GST MODULE ---
function renderGSTReport() {
    const transactions = DB.getTransactions();
    const body = document.getElementById('gstReportTable');
    body.innerHTML = '';

    let totalGSTCollected = 0;
    transactions.forEach(t => {
        totalGSTCollected += t.gst;
        const assessableVal = t.subtotal + t.making;

        body.innerHTML += `
            <tr>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.id}</td>
                <td>₹${assessableVal.toLocaleString('en-IN')}</td>
                <td>3%</td>
                <td>₹${(t.gst / 2).toLocaleString('en-IN')}</td>
                <td>₹${(t.gst / 2).toLocaleString('en-IN')}</td>
                <td>₹${t.gst.toLocaleString('en-IN')}</td>
            </tr>
        `;
    });

    const itc = Math.round(totalGSTCollected * 0.25); // Simulated input tax credit deduction
    const netPayable = totalGSTCollected - itc;

    document.getElementById('gstCollected').innerText = `₹${totalGSTCollected.toLocaleString('en-IN')}`;
    document.getElementById('gstITC').innerText = `₹${itc.toLocaleString('en-IN')}`;
    document.getElementById('gstNet').innerText = `₹${netPayable.toLocaleString('en-IN')}`;
}

// --- CRM MODULE ---
function renderCRM() {
    const list = DB.getCustomers();
    const body = document.getElementById('crmCustomerTable');
    body.innerHTML = '';

    list.forEach(c => {
        body.innerHTML += `
            <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>${c.points}</td>
                <td>${c.gold_scheme_balance > 0 ? `Active (₹${c.gold_scheme_balance})` : 'None'}</td>
                <td><button class="btn btn-secondary btn-sm" onclick="viewCustomerProfile('${c.phone}')">View purchases</button></td>
            </tr>
        `;
    });
}

function viewCustomerProfile(phone) {
    const list = DB.getCustomers();
    const c = list.find(cust => cust.phone === phone);
    if (!c) return;

    const txs = DB.getTransactions().filter(t => t.customer_phone === phone);
    const ltv = txs.reduce((sum, t) => sum + t.total, 0);

    const profileDiv = document.getElementById('customerProfileDetails');
    document.querySelector('.select-hint').style.display = 'none';
    profileDiv.style.display = 'block';

    let txRows = '';
    txs.forEach(t => {
        txRows += `<li>Invoice ${t.id} - ${new Date(t.date).toLocaleDateString()} - <strong>₹${t.total.toLocaleString('en-IN')}</strong></li>`;
    });

    profileDiv.innerHTML = `
        <div class="customer-profile">
            <div class="profile-header">
                <h4>${c.name}</h4>
                <div class="profile-meta">Phone: ${c.phone} | Join Date: ${new Date(c.join_date).toLocaleDateString()}</div>
            </div>
            <div class="profile-kpis">
                <div class="profile-kpi-card">
                    <span class="profile-kpi-label">Lifetime Value (LTV)</span>
                    <span class="profile-kpi-val">₹${ltv.toLocaleString('en-IN')}</span>
                </div>
                <div class="profile-kpi-card">
                    <span class="profile-kpi-label">Loyalty Points</span>
                    <span class="profile-kpi-val">${c.points} pts</span>
                </div>
            </div>
            <div>
                <h4>Recent Purchases</h4>
                <ul style="padding-left: 1.5rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem;">
                    ${txRows || '<li>No purchases recorded yet</li>'}
                </ul>
            </div>
        </div>
    `;
}

// --- GOLD SCHEME MODULE ---
function renderGoldScheme() {
    const list = DB.getCustomers();
    const body = document.getElementById('goldSchemeSubscriptions');
    body.innerHTML = '';

    list.filter(c => c.gold_scheme_balance !== undefined).forEach(c => {
        body.innerHTML += `
            <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>₹1,000</td>
                <td><strong>${c.gold_scheme_paid_months || 0} / 11</strong></td>
                <td>₹${(c.gold_scheme_balance || 0).toLocaleString('en-IN')}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="paySchemeInstallment('${c.phone}')">+ Add ₹1000</button>
                    ${c.gold_scheme_paid_months >= 11 ? `<button class="btn btn-primary btn-sm" onclick="matureScheme('${c.phone}')">Mature (Free 12th Month)</button>` : ''}
                </td>
            </tr>
        `;
    });
}

function paySchemeInstallment(phone) {
    let list = DB.getCustomers();
    let c = list.find(cust => cust.phone === phone);
    if (c) {
        c.gold_scheme_balance = (c.gold_scheme_balance || 0) + 1000;
        c.gold_scheme_paid_months = (c.gold_scheme_paid_months || 0) + 1;
        
        // Ledger Outflow/Inflow record
        let ledger = DB.getLedger();
        const prevBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
        ledger.push({
            date: new Date().toISOString(),
            description: `Gold Scheme Installment Paid - ${c.name}`,
            credit: 1000,
            debit: 0,
            balance: prevBal + 1000
        });
        DB.saveLedger(ledger);
        localStorage.setItem('aurea_customers', JSON.stringify(list));
        renderGoldScheme();
    }
}

function matureScheme(phone) {
    let list = DB.getCustomers();
    let c = list.find(cust => cust.phone === phone);
    if (c) {
        c.gold_scheme_balance += 1000; // Adds the 12th free month
        c.gold_scheme_paid_months = 12; // Matured!
        localStorage.setItem('aurea_customers', JSON.stringify(list));
        alert(`Gold scheme matured! 12th month bonus of ₹1000 added. Total balance of ₹${c.gold_scheme_balance} available for counter sale redemption.`);
        renderGoldScheme();
    }
}

document.getElementById('goldSchemeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('schemePhone').value;
    
    let list = DB.getCustomers();
    let c = list.find(cust => cust.phone === phone);
    if (!c) {
        alert("Please create customer in POS or CRM first.");
        return;
    }

    c.gold_scheme_balance = 1000;
    c.gold_scheme_paid_months = 1;
    
    localStorage.setItem('aurea_customers', JSON.stringify(list));
    document.getElementById('goldSchemeForm').reset();
    renderGoldScheme();
});

// --- REPAIRS MODULE ---
function renderRepairs() {
    const list = DB.getRepairs();
    const body = document.getElementById('repairJobsTable');
    body.innerHTML = '';

    list.forEach(r => {
        let action = '';
        if (r.status === 'Received') action = `<button class="btn btn-secondary btn-sm" onclick="updateRepairStatus('${r.id}', 'In Progress')">Start Work</button>`;
        else if (r.status === 'In Progress') action = `<button class="btn btn-primary btn-sm" onclick="updateRepairStatus('${r.id}', 'Ready')">Mark Ready</button>`;
        else if (r.status === 'Ready') action = `<button class="btn btn-secondary btn-sm" onclick="updateRepairStatus('${r.id}', 'Delivered')">Deliver & Close</button>`;

        body.innerHTML += `
            <tr>
                <td>${r.id}</td>
                <td>${r.customer_name}</td>
                <td>${r.description}</td>
                <td>₹${r.cost}</td>
                <td>${r.promised_date}</td>
                <td><span class="badge ${r.status === 'Ready' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
                <td>
                    ${action}
                    <button class="btn btn-secondary btn-sm" onclick="sendWhatsAppNotification('${r.id}')">📲 Alert</button>
                </td>
            </tr>
        `;
    });
}

function updateRepairStatus(id, newStatus) {
    let repairs = DB.getRepairs();
    let r = repairs.find(rep => rep.id === id);
    if (r) {
        r.status = newStatus;
        DB.saveRepairs(repairs);
        renderRepairs();
    }
}

function sendWhatsAppNotification(id) {
    const repairs = DB.getRepairs();
    const r = repairs.find(rep => rep.id === id);
    if (r) {
        alert(`[WhatsApp Notification Sent to ${r.customer_name}]\n"Hello, your item (${r.description}) is now ${r.status}. Balance due is ₹${r.cost}. See you at Aurea Fine Jewellery!"`);
    }
}

document.getElementById('repairForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('repairCustomerName').value;
    const desc = document.getElementById('repairDesc').value;
    const issue = document.getElementById('repairIssue').value;
    const cost = parseInt(document.getElementById('repairCost').value);
    const date = document.getElementById('repairDate').value;

    const newJob = {
        id: `REP-${Date.now().toString().slice(-3)}`,
        customer_name: name,
        description: desc,
        issue: issue,
        cost: cost,
        promised_date: date,
        status: 'Received'
    };

    let list = DB.getRepairs();
    list.unshift(newJob);
    DB.saveRepairs(list);

    document.getElementById('repairForm').reset();
    renderRepairs();
});

// --- ANALYTICS MODULE ---
function loadAnalytics() {
    const txs = DB.getTransactions();
    
    // Find best seller category/items
    document.getElementById('bestSellerMetric').innerText = "Rings (Imperial Solitaire)";
    document.getElementById('customerMetric').innerText = "85% New / 15% VIP";
    
    const customers = DB.getCustomers();
    const activeSchemeBal = customers.reduce((sum, c) => sum + (c.gold_scheme_balance || 0), 0);
    document.getElementById('goldSchemeCollections').innerText = `₹${activeSchemeBal.toLocaleString('en-IN')}`;
}

// --- DATABASE SETTINGS ---
function openDatabaseSettings() {
    document.getElementById('dbUrl').value = window.localStorage.getItem('SUPABASE_URL') || '';
    document.getElementById('dbKey').value = window.localStorage.getItem('SUPABASE_KEY') || '';
    document.getElementById('dbSettingsModal').style.display = 'flex';
}

function closeDatabaseSettings() {
    document.getElementById('dbSettingsModal').style.display = 'none';
}

function saveDatabaseConfig() {
    const url = document.getElementById('dbUrl').value;
    const key = document.getElementById('dbKey').value;
    
    window.localStorage.setItem('SUPABASE_URL', url);
    window.localStorage.setItem('SUPABASE_KEY', key);
    
    alert("Supabase credentials saved successfully. Reloading system...");
    location.reload();
}

// --- GST COMPLIANT INVOICE ---
function showInvoiceModal(transaction) {
    document.getElementById('invCustName').innerText = transaction.customer_name;
    document.getElementById('invCustPhone').innerText = 'Ph: ' + transaction.customer_phone;
    document.getElementById('invNumber').innerText = transaction.id;
    document.getElementById('invDate').innerText = new Date(transaction.date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    const body = document.getElementById('invItemsBody');
    body.innerHTML = '';
    
    transaction.items.forEach(item => {
        body.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.6rem; text-align: left; color: #000;">
                    <strong>${item.sku}</strong> - ${item.name}
                </td>
                <td style="padding: 0.6rem; text-align: right; color: #000;">${item.quantity}</td>
                <td style="padding: 0.6rem; text-align: right; color: #000;">₹${item.price.toLocaleString('en-IN')}</td>
                <td style="padding: 0.6rem; text-align: right; color: #000;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
            </tr>
        `;
    });

    const assessable = transaction.subtotal;
    const cgst = Math.round(transaction.gst / 2);
    const sgst = transaction.gst - cgst;

    document.getElementById('invSubtotal').innerText = `₹${assessable.toLocaleString('en-IN')}`;
    document.getElementById('invMaking').innerText = `₹${transaction.making.toLocaleString('en-IN')}`;
    document.getElementById('invCGST').innerText = `₹${cgst.toLocaleString('en-IN')}`;
    document.getElementById('invSGST').innerText = `₹${sgst.toLocaleString('en-IN')}`;
    document.getElementById('invGrandTotal').innerText = `₹${transaction.total.toLocaleString('en-IN')}`;

    document.getElementById('invoiceModal').style.display = 'flex';
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').style.display = 'none';
}

// Initialise Admin Module
window.addEventListener('DOMContentLoaded', () => {
    initGoldRateDisplay();
    setInterval(initGoldRateDisplay, 15000); // Ticker refresh
    loadDashboard();
});
