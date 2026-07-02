-- Nexus Donation Platform - Database Schema
-- For Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Users Table (Auth)
-- ============================================
-- Note: Supabase Auth handles users, but you can add a profiles table
-- if you want to store additional user data.

-- Optional: User Profiles Table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'donor' CHECK (role IN ('donor', 'ngo', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. NGOs Table
-- ============================================
CREATE TABLE IF NOT EXISTS ngos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    description TEXT,
    wallet_address TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    joined DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Campaigns Table
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ngo_id UUID REFERENCES ngos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    goal_amount NUMERIC NOT NULL,
    raised_amount NUMERIC DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. Donation Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS donation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. Fund Usage Table (Transparency)
-- ============================================
CREATE TABLE IF NOT EXISTS fund_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    ngo_id UUID REFERENCES ngos(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_campaigns_ngo_id ON campaigns(ngo_id);
CREATE INDEX IF NOT EXISTS idx_donation_logs_campaign_id ON donation_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donation_logs_donor_id ON donation_logs(donor_id);
CREATE INDEX IF NOT EXISTS idx_fund_usage_campaign_id ON fund_usage(campaign_id);
CREATE INDEX IF NOT EXISTS idx_fund_usage_ngo_id ON fund_usage(ngo_id);
CREATE INDEX IF NOT EXISTS idx_ngos_status ON ngos(status);
CREATE INDEX IF NOT EXISTS idx_ngos_verification_status ON ngos(verification_status);

-- ============================================
-- Row Level Security (RLS) - Optional (for Supabase)
-- ============================================
-- Enable RLS for all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Sample Data (for testing)
-- ============================================
-- Insert sample NGOs
-- INSERT INTO ngos (id, name, email, description, verification_status, status, joined, wallet_address) VALUES
-- ('ngo-1', 'Global Relief Foundation', 'contact@grf.org', 'Dedicated to providing worldwide humanitarian aid and emergency relief to victims of natural disasters and conflict.', 'verified', 'verified', '2024-01-15', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'),
-- ('ngo-2', 'Direct Aid Network', 'help@dan.com', 'Empowering local communities with direct resources and micro-grants for rapid emergency response.', 'pending', 'pending', '2024-05-10', '0x2198301820A38102A88aA8bcF988F781a9862cd5');

-- Insert sample campaigns
-- INSERT INTO campaigns (id, ngo_id, title, description, goal_amount, raised_amount, image_url) VALUES
-- ('1', 'ngo-1', 'Flood Relief 2024', 'Providing food and shelter to those affected by the recent floods in the coastal region.', 50000, 15000, 'https://images.unsplash.com/photo-1547683905-f686c993a9e6?auto=format&fit=crop&q=80&w=800'),
-- ('2', 'ngo-2', 'Earthquake Recovery', 'Helping families rebuild their homes after the devastating earthquake.', 100000, 45000, 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800');
