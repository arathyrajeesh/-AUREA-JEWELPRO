-- AUREA × JEWELPRO: SUPABASE POSTGRESQL SCHEMA DDL
-- Paste this script directly into your Supabase SQL Editor to set up all tables

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Ring, Necklace, Earring, Bangle, Anklet
    metal VARCHAR(50) NOT NULL,    -- Gold, Silver, Platinum
    purity VARCHAR(50) NOT NULL,   -- 22K, 925, 950
    weight DECIMAL(10, 2) NOT NULL, -- in grams
    making_charges INT NOT NULL,   -- making charge per gram
    stock INT NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable row-level security (RLS) if required, or keep open for counter/POS operations.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow authenticated adjustments" ON public.products ALL USING (true);

-- Seed initial products
INSERT INTO public.products (sku, name, category, metal, purity, weight, making_charges, stock, image_url)
VALUES 
('JW-R-01', 'Imperial Solitaire Ring', 'Ring', 'Gold', '22K', 8.50, 150, 12, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=80'),
('JW-N-02', 'Royale Peacock Necklace', 'Necklace', 'Gold', '22K', 42.00, 180, 5, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=80'),
('JW-E-03', 'Dewdrop Chandelier Earrings', 'Earring', 'Gold', '22K', 14.20, 160, 8, 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=500&auto=format&fit=crop&q=80'),
('JW-B-04', 'Varanasi Filigree Bangle', 'Bangle', 'Gold', '22K', 28.50, 140, 6, 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&auto=format&fit=crop&q=80'),
('JW-A-05', 'Celestial Ghungroo Anklet', 'Anklet', 'Silver', '925 Sterling', 18.00, 80, 15, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&auto=format&fit=crop&q=80'),
('JW-R-06', 'Eternal Band of Promise', 'Ring', 'Platinum', '950 Platinum', 6.20, 250, 10, 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500&auto=format&fit=crop&q=80')
ON CONFLICT (sku) DO NOTHING;


-- 2. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    phone VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    points INT DEFAULT 0,
    gold_scheme_balance INT DEFAULT 0,
    gold_scheme_paid_months INT DEFAULT 0,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public inserts" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow customer/POS read" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow counter updates" ON public.customers FOR UPDATE USING (true);


-- 3. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id VARCHAR(50) PRIMARY KEY, -- e.g. INV-XXXX
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL REFERENCES public.customers(phone),
    items JSONB NOT NULL, -- Array of item snapshots: [{sku, name, quantity, price}]
    subtotal INT NOT NULL,
    making INT NOT NULL,
    gst INT NOT NULL,
    discount INT DEFAULT 0,
    total INT NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- Cash, UPI, Card, EMI
    type VARCHAR(50) NOT NULL, -- POS, Online
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public checkout" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow counter read" ON public.transactions FOR SELECT USING (true);


-- 4. Create Ledger Table
CREATE TABLE IF NOT EXISTS public.ledger (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    credit INT DEFAULT 0,
    debit INT DEFAULT 0,
    balance INT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.ledger FOR SELECT USING (true);
CREATE POLICY "Allow counter post" ON public.ledger FOR INSERT WITH CHECK (true);


-- 5. Create Repair Jobs Table
CREATE TABLE IF NOT EXISTS public.repair_jobs (
    id VARCHAR(50) PRIMARY KEY, -- e.g. REP-XXXX
    customer_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    issue TEXT NOT NULL,
    cost INT NOT NULL,
    promised_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Received', -- Received, In Progress, Ready, Delivered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.repair_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow operations access" ON public.repair_jobs ALL USING (true);


-- 6. Create Subscribers Table
CREATE TABLE IF NOT EXISTS public.subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public signups" ON public.subscribers FOR INSERT WITH CHECK (true);
