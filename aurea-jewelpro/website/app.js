// AUREA WEBSITE APPLICATION LOGIC

// Configuration & Mock Database Fallback System
const CONFIG = {
    supabaseUrl: window.localStorage.getItem('SUPABASE_URL') || 'https://lgpabnbpqjjppoohqyed.supabase.co',
    supabaseKey: window.localStorage.getItem('SUPABASE_KEY') || 'sb_publishable_hI8qu4n-dt3xv-SsOac97A_Cf5EMxlI',
    razorpayKey: window.localStorage.getItem('RAZORPAY_KEY') || 'rzp_test_mockKey123',
    baseGoldRate: 7200, // per gram (22K base rate)
};

// Initialize Supabase Client if credentials exist
let supabaseClient = null;
if (CONFIG.supabaseUrl && CONFIG.supabaseKey) {
    supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
}

// Database Helper Module (Works with Supabase or localStorage fallback)
const DB = {
    async getProducts() {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('products').select('*');
            if (!error) return data;
        }
        // Fallback/Mock initial data
        let localProducts = JSON.parse(localStorage.getItem('aurea_products'));
        if (!localProducts) {
            localProducts = [
                { id: 1, sku: 'JW-R-01', name: 'Imperial Solitaire Ring', category: 'Ring', metal: 'Gold', purity: '22K', weight: 8.5, making_charges: 150, stock: 12, image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=80' },
                { id: 2, sku: 'JW-N-02', name: 'Royale Peacock Necklace', category: 'Necklace', metal: 'Gold', purity: '22K', weight: 42.0, making_charges: 180, stock: 5, image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=80' },
                { id: 3, sku: 'JW-E-03', name: 'Dewdrop Chandelier Earrings', category: 'Earring', metal: 'Gold', purity: '22K', weight: 14.2, making_charges: 160, stock: 8, image_url: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=500&auto=format&fit=crop&q=80' },
                { id: 4, sku: 'JW-B-04', name: 'Varanasi Filigree Bangle', category: 'Bangle', metal: 'Gold', purity: '22K', weight: 28.5, making_charges: 140, stock: 6, image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&auto=format&fit=crop&q=80' },
                { id: 5, sku: 'JW-A-05', name: 'Celestial Ghungroo Anklet', category: 'Anklet', metal: 'Silver', purity: '925 Sterling', weight: 18.0, making_charges: 80, stock: 15, image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&auto=format&fit=crop&q=80' },
                { id: 6, sku: 'JW-R-06', name: 'Eternal Band of Promise', category: 'Ring', metal: 'Platinum', purity: '950 Platinum', weight: 6.2, making_charges: 250, stock: 10, image_url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&auto=format&fit=crop&q=80' }
            ];
            localStorage.setItem('aurea_products', JSON.stringify(localProducts));
        }
        return localProducts;
    },

    async saveTransaction(transaction) {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('transactions').insert([transaction]);
            if (!error) return data;
        }
        // Local Fallback
        let localTx = JSON.parse(localStorage.getItem('aurea_transactions')) || [];
        localTx.push(transaction);
        localStorage.setItem('aurea_transactions', JSON.stringify(localTx));

        // Create Ledger credit entry
        await this.saveLedgerEntry({
            description: `Online Order ${transaction.id} - ${transaction.customer_name}`,
            credit: transaction.total,
            debit: 0,
            date: new Date().toISOString()
        });

        // Save/Update Customer in CRM
        await this.upsertCustomer({
            name: transaction.customer_name,
            phone: transaction.customer_phone,
            email: transaction.customer_email || '',
            points: Math.floor(transaction.total / 100),
            join_date: new Date().toISOString()
        }, transaction.total);

        // Update Stock count
        await this.decrementStock(transaction.items);

        return transaction;
    },

    async decrementStock(items) {
        let products = await this.getProducts();
        items.forEach(item => {
            const prod = products.find(p => p.sku === item.sku);
            if (prod) {
                prod.stock = Math.max(0, prod.stock - item.quantity);
            }
        });
        localStorage.setItem('aurea_products', JSON.stringify(products));
        if (supabaseClient) {
            // In a real Supabase setup, you'd perform a batch update or decrement trigger.
        }
    },

    async saveLedgerEntry(entry) {
        let ledger = JSON.parse(localStorage.getItem('aurea_ledger')) || [];
        const prevBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
        entry.balance = prevBalance + entry.credit - entry.debit;
        ledger.push(entry);
        localStorage.setItem('aurea_ledger', JSON.stringify(ledger));
        if (supabaseClient) {
            await supabaseClient.from('ledger').insert([entry]);
        }
    },

    async upsertCustomer(customer, purchaseValue = 0) {
        let customers = JSON.parse(localStorage.getItem('aurea_customers')) || [];
        let existing = customers.find(c => c.phone === customer.phone);
        if (existing) {
            existing.points += Math.floor(purchaseValue / 100);
            if (customer.email) existing.email = customer.email;
        } else {
            customer.points = Math.floor(purchaseValue / 100);
            customers.push(customer);
        }
        localStorage.setItem('aurea_customers', JSON.stringify(customers));
        if (supabaseClient) {
            await supabaseClient.from('customers').upsert([customer]);
        }
    },

    async subscribeNewsletter(email) {
        if (supabaseClient) {
            await supabaseClient.from('subscribers').insert([{ email }]);
        }
        let subs = JSON.parse(localStorage.getItem('aurea_subscribers')) || [];
        if (!subs.includes(email)) {
            subs.push(email);
            localStorage.setItem('aurea_subscribers', JSON.stringify(subs));
        }
    }
};

// Global State
let products = [];
let cart = [];
let liveGoldRate = CONFIG.baseGoldRate;
let selectedCategory = 'all';

// Element Cache
const productGrid = document.getElementById('productGrid');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const goldRateDisplay = document.getElementById('goldRateDisplay');

// Gold Rate Simulation/API Integration
async function updateGoldRate() {
    try {
        // Simulating Live Gold Rate fluctuation (or GoldAPI.io fetch)
        const fluctuation = (Math.random() - 0.5) * 50;
        liveGoldRate = Math.round(CONFIG.baseGoldRate + fluctuation);
        goldRateDisplay.innerText = `✨ Live 22K Gold Rate: ₹${liveGoldRate.toLocaleString('en-IN')}/g | Silver Rate: ₹92/g | 3% GST Applicable`;
        
        // Re-render product list to update prices
        renderProducts();
    } catch (e) {
        console.error("Gold rate update error", e);
    }
}

// Calculate Price based on Weight, Gold Rate, and Making Charges
function calculateProductPrice(product) {
    if (product.metal === 'Gold') {
        const metalCost = product.weight * liveGoldRate;
        const makingCost = product.weight * product.making_charges;
        return Math.round(metalCost + makingCost);
    } else if (product.metal === 'Silver') {
        const metalCost = product.weight * 92; // Silver standard rate
        const makingCost = product.weight * product.making_charges;
        return Math.round(metalCost + makingCost);
    } else { // Platinum standard rate
        const metalCost = product.weight * 4200;
        const makingCost = product.weight * product.making_charges;
        return Math.round(metalCost + makingCost);
    }
}

// Render Products Grid
function renderProducts() {
    if (!productGrid) return;
    productGrid.innerHTML = '';
    
    const filtered = products.filter(p => {
        if (p.stock <= 0) return false; // Hide out of stock items
        if (selectedCategory === 'all') return true;
        return p.category.toLowerCase() === selectedCategory.toLowerCase();
    });

    filtered.forEach(p => {
        const price = calculateProductPrice(p);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image-container">
                <img src="${p.image_url}" alt="${p.name}" class="product-image">
                <div class="product-hover-overlay">
                    <button class="btn btn-primary" onclick="addToCart('${p.sku}')">Add to Cart</button>
                    <button class="btn btn-secondary" onclick="openARModal('${p.sku}')">Try AR</button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-metal">${p.purity} ${p.metal} • ${p.weight}g</div>
                <h3 class="product-name">${p.name}</h3>
                <div class="product-price">₹${price.toLocaleString('en-IN')}</div>
            </div>
        `;
        productGrid.appendChild(card);
    });
}

// Filter Tabs Logic
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedCategory = e.target.getAttribute('data-filter');
        renderProducts();
    });
});

// Cart & Checkout Management
function toggleCart() {
    cartSidebar.classList.toggle('open');
    cartOverlay.classList.toggle('open');
}

function addToCart(sku) {
    const product = products.find(p => p.sku === sku);
    if (!product) return;

    const existing = cart.find(item => item.sku === sku);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
    
    // Automatically open the cart to show feedback
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('open');
}

function removeFromCart(sku) {
    cart = cart.filter(item => item.sku !== sku);
    updateCartUI();
}

function updateCartUI() {
    cartItems.innerHTML = '';
    let totalItems = 0;
    let subtotal = 0;
    let makingCharges = 0;

    cart.forEach(item => {
        const itemPrice = calculateProductPrice(item);
        const making = item.weight * item.making_charges * item.quantity;
        subtotal += itemPrice * item.quantity;
        makingCharges += making;
        totalItems += item.quantity;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <img src="${item.image_url}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">Qty: ${item.quantity} • ₹${(itemPrice * item.quantity).toLocaleString('en-IN')}</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.sku}')">✕</button>
        `;
        cartItems.appendChild(el);
    });

    cartCount.innerText = totalItems;
    
    const gst = Math.round((subtotal + makingCharges) * 0.03);
    const grandTotal = subtotal + makingCharges + gst;

    document.getElementById('cartSubtotal').innerText = `₹${subtotal.toLocaleString('en-IN')}`;
    document.getElementById('cartMaking').innerText = `₹${makingCharges.toLocaleString('en-IN')}`;
    document.getElementById('cartGST').innerText = `₹${gst.toLocaleString('en-IN')}`;
    document.getElementById('cartTotal').innerText = `₹${grandTotal.toLocaleString('en-IN')}`;
    
    // Cache cart
    localStorage.setItem('aurea_cart', JSON.stringify(cart));
}

// Razorpay Payment Integration
function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (calculateProductPrice(item) * item.quantity), 0);
    const making = cart.reduce((sum, item) => sum + (item.weight * item.making_charges * item.quantity), 0);
    const gst = Math.round((subtotal + making) * 0.03);
    const grandTotal = subtotal + making + gst;

    // Open Razorpay Popup
    const options = {
        key: CONFIG.razorpayKey,
        amount: grandTotal * 100, // in paisa
        currency: "INR",
        name: "AUREA Fine Jewellery",
        description: "Order Checkout",
        image: "https://example.com/logo.png",
        handler: async function (response) {
            // Create transaction data on success
            const transaction = {
                id: `INV-${Date.now().toString().slice(-6)}`,
                customer_name: prompt("Please enter your name for the invoice:") || "Valued Customer",
                customer_phone: prompt("Please enter your phone number:") || "9999999999",
                customer_email: prompt("Please enter your email:") || "customer@example.com",
                items: cart.map(i => ({ sku: i.sku, name: i.name, quantity: i.quantity, price: calculateProductPrice(i) })),
                subtotal: subtotal,
                making: making,
                gst: gst,
                discount: 0,
                total: grandTotal,
                payment_method: 'Razorpay',
                type: 'Online',
                date: new Date().toISOString()
            };

            await DB.saveTransaction(transaction);
            alert(`Payment Successful! Transaction ID: ${response.razorpay_payment_id}. Your invoice ${transaction.id} has been generated.`);
            cart = [];
            updateCartUI();
            toggleCart();
        },
        prefill: {
            name: "Customer",
            email: "customer@aurea.in",
            contact: "9999999999"
        },
        theme: {
            color: "#d4af37"
        }
    };
    
    const rzp = new Razorpay(options);
    rzp.open();
}

// Newsletter signup form submission
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = newsletterForm.querySelector('input').value;
        await DB.subscribeNewsletter(email);
        alert("Welcome to the Inner Circle! Exclusive updates will arrive shortly.");
        newsletterForm.reset();
    });
}

// AR TRY-ON MODULE
const arModal = document.getElementById('arModal');
const arVideo = document.getElementById('arVideo');
const arCanvas = document.getElementById('arCanvas');
let arStream = null;
let animationFrameId = null;
let activeARProduct = null;

// AR Calibration State
let arScale = 1.0;
let arYOffset = 0;

function openARModal(sku = null) {
    if (sku) {
        activeARProduct = products.find(p => p.sku === sku);
    }
    
    arModal.classList.add('open');
    initARCamera();
}

function closeARModal() {
    arModal.classList.remove('open');
    stopARCamera();
}

async function initARCamera() {
    try {
        arStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 640, height: 480 }
        });
        arVideo.srcObject = arStream;
        
        arVideo.onloadedmetadata = () => {
            arCanvas.width = arVideo.videoWidth;
            arCanvas.height = arVideo.videoHeight;
            startARDrawing();
        };
    } catch (e) {
        alert("Camera access denied or unavailable. Please enable permissions to try our AR Studio.");
        closeARModal();
    }
}

function stopARCamera() {
    if (arStream) {
        arStream.getTracks().forEach(track => track.stop());
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

// Render dynamic vector jewellery on top of camera
function startARDrawing() {
    const ctx = arCanvas.getContext('2d');
    
    function draw() {
        ctx.clearRect(0, 0, arCanvas.width, arCanvas.height);
        
        if (activeARProduct) {
            const time = Date.now() * 0.005;
            const shimmer = Math.sin(time) * 10;
            const baseColor = `hsl(45, 80%, ${60 + shimmer}%)`;
            const highlightColor = `hsl(45, 100%, ${80 + shimmer}%)`;
            
            ctx.lineWidth = 6;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
            
            const centerX = arCanvas.width / 2;
            const centerY = arCanvas.height / 2;
            
            if (activeARProduct.category === 'Ring') {
                // Draw a beautiful golden luxury ring arc
                ctx.beginPath();
                ctx.ellipse(centerX, centerY + 50, 60, 25, 0, 0, 2 * Math.PI);
                ctx.strokeStyle = baseColor;
                ctx.stroke();
                
                // Floating gleaming diamond on top of the ring
                ctx.beginPath();
                ctx.moveTo(centerX - 15, centerY + 25);
                ctx.lineTo(centerX, centerY + 5);
                ctx.lineTo(centerX + 15, centerY + 25);
                ctx.lineTo(centerX, centerY + 40);
                ctx.closePath();
                ctx.fillStyle = highlightColor;
                ctx.fill();
            } 
            else if (activeARProduct.category === 'Necklace') {
                // Curved elegant bezier line for necklace
                ctx.beginPath();
                ctx.moveTo(centerX - 120, centerY + 50);
                ctx.bezierCurveTo(centerX - 60, centerY + 180, centerX + 60, centerY + 180, centerX + 120, centerY + 50);
                ctx.strokeStyle = baseColor;
                ctx.stroke();
                
                // Hanging brilliant pendant
                ctx.beginPath();
                ctx.arc(centerX, centerY + 140, 15, 0, 2 * Math.PI);
                ctx.fillStyle = highlightColor;
                ctx.fill();
            } 
            else if (activeARProduct.category === 'Earring') {
                // Dual high-fidelity shapes flanking the ears
                const offset = 120;
                
                // Left Earring
                ctx.beginPath();
                ctx.arc(centerX - offset, centerY, 15, 0, 2 * Math.PI);
                ctx.strokeStyle = baseColor;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(centerX - offset, centerY + 15);
                ctx.lineTo(centerX - offset - 10, centerY + 45);
                ctx.lineTo(centerX - offset + 10, centerY + 45);
                ctx.closePath();
                ctx.fillStyle = highlightColor;
                ctx.fill();
                
                // Right Earring
                ctx.beginPath();
                ctx.arc(centerX + offset, centerY, 15, 0, 2 * Math.PI);
                ctx.strokeStyle = baseColor;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(centerX + offset, centerY + 15);
                ctx.lineTo(centerX + offset - 10, centerY + 45);
                ctx.lineTo(centerX + offset + 10, centerY + 45);
                ctx.closePath();
                ctx.fillStyle = highlightColor;
                ctx.fill();
            }
            else {
                // Default golden glow overlay
                ctx.font = '24px Cormorant Garamond';
                ctx.fillStyle = baseColor;
                ctx.textAlign = 'center';
                ctx.fillText(`AR: ${activeARProduct.name}`, centerX, centerY);
            }
        }
        
        animationFrameId = requestAnimationFrame(draw);
    }
    
    draw();
}

function takeSnapshot() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = arCanvas.width;
    tempCanvas.height = arCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw background video mirror image
    tempCtx.save();
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(arVideo, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.restore();
    
    // Draw canvas vector overlay
    tempCtx.save();
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(arCanvas, 0, 0);
    tempCtx.restore();
    
    const link = document.createElement('a');
    link.download = `aurea-ar-tryon-${activeARProduct ? activeARProduct.sku : 'snapshot'}.png`;
    link.href = tempCanvas.toDataURL();
    link.click();
}

function addARItemToCart() {
    if (activeARProduct) {
        addToCart(activeARProduct.sku);
        closeARModal();
    }
}

// Initialise Application
async function init() {
    products = await DB.getProducts();
    
    // Cart persistence
    const savedCart = localStorage.getItem('aurea_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }

    renderProducts();
    updateGoldRate();
    
    // Refresh Gold rate every 15 seconds
    setInterval(updateGoldRate, 15000);
}

// Run init on load
window.addEventListener('DOMContentLoaded', init);
