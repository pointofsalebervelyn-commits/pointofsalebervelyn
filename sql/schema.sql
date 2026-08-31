CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'GH',
    currency CHAR(3) NOT NULL DEFAULT 'GHS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email CITEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'cashier')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id);

-- Every future business table must carry tenant_id and be filtered by it.
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image TEXT,
    category TEXT,
    material_type TEXT,
    supplier TEXT,
    buying_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
    min_stock_level NUMERIC(12, 3) NOT NULL DEFAULT 0,
    unit TEXT,
    description TEXT,
    barcode TEXT,
    sku TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_tenant_idx ON products (tenant_id);

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL, customer_phone TEXT, payment_method TEXT NOT NULL,
    items JSONB NOT NULL, total NUMERIC(12, 2) NOT NULL, profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cash_received NUMERIC(12, 2) NOT NULL DEFAULT 0, change_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed', refunded_at TIMESTAMPTZ, created_by UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_tenant_idx ON sales (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, phone TEXT, last_purchase TIMESTAMPTZ, total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
    purchase_count INTEGER NOT NULL DEFAULT 0, UNIQUE (tenant_id, name)
);
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, contact TEXT, phone TEXT
);
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    description TEXT NOT NULL, amount NUMERIC(12, 2) NOT NULL, category TEXT, expense_date DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE TABLE IF NOT EXISTS registers (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE, is_open BOOLEAN NOT NULL DEFAULT false,
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0, opened_at TIMESTAMPTZ, closing_cash NUMERIC(12, 2), closed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, quantity NUMERIC(12, 3) NOT NULL,
    reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT, supplier TEXT, quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action TEXT NOT NULL, details TEXT, user_id UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS held_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer', customer_phone TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0, discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('active', 'held', 'completed', 'cancelled')),
    notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    held_at TIMESTAMPTZ, resumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS customers_tenant_idx ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS suppliers_tenant_idx ON suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS expenses_tenant_idx ON expenses (tenant_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS movements_tenant_idx ON stock_movements (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS purchases_tenant_idx ON purchases (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_tenant_idx ON audit_logs (tenant_id, created_at DESC);
-- Hardware POS scalability upgrade (safe additive migration)
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(14,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS product_groups (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 name TEXT NOT NULL, description TEXT, display_order INTEGER NOT NULL DEFAULT 0,
 is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,name)
);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_group_id_fkey') THEN
  ALTER TABLE products ADD CONSTRAINT products_group_id_fkey FOREIGN KEY (group_id) REFERENCES product_groups(id) ON DELETE SET NULL;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS quick_sell_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, display_order INTEGER NOT NULL DEFAULT 0,
 is_active BOOLEAN NOT NULL DEFAULT true, UNIQUE(tenant_id,product_id)
);
CREATE INDEX IF NOT EXISTS products_tenant_group_idx ON products(tenant_id,group_id);
CREATE INDEX IF NOT EXISTS products_tenant_name_idx ON products(tenant_id,name);
CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_product_code_uq ON products(tenant_id,product_code) WHERE product_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_barcode_uq ON products(tenant_id,barcode) WHERE barcode IS NOT NULL AND barcode <> '';
CREATE INDEX IF NOT EXISTS quick_sell_tenant_order_idx ON quick_sell_items(tenant_id,display_order) WHERE is_active=true;
