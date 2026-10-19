-- Bopstina Ventures POS database schema.
-- Safe to run repeatedly: creates missing tables/columns and does not drop existing data.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	business_type TEXT NOT NULL DEFAULT 'Other',
	country TEXT NOT NULL DEFAULT 'GH',
	currency CHAR(3) NOT NULL DEFAULT 'GHS',
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'Other';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'GH';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'GHS';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	auth_user_id UUID,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	password_hash TEXT NOT NULL DEFAULT 'supabase-auth-managed',
	role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'cashier')),
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (tenant_id, email)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS users_auth_user_idx ON users (auth_user_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	token_hash TEXT NOT NULL UNIQUE,
	expires_at TIMESTAMPTZ NOT NULL,
	revoked_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_groups (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	description TEXT,
	display_order INTEGER NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS products (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	image TEXT,
	category TEXT,
	color_name TEXT,
	color_hex TEXT,
	group_id UUID REFERENCES product_groups(id) ON DELETE SET NULL,
	product_code TEXT,
	material_type TEXT,
	supplier TEXT,
	buying_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
	selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
	wholesale_price NUMERIC(12, 2),
	quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
	min_stock_level NUMERIC(12, 3) NOT NULL DEFAULT 0,
	unit TEXT,
	description TEXT,
	barcode TEXT,
	sku TEXT,
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS color_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_hex TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES product_groups(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS sales (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
	customer_phone TEXT,
	payment_method TEXT NOT NULL DEFAULT 'Cash',
	items JSONB NOT NULL DEFAULT '[]'::jsonb,
	total NUMERIC(12, 2) NOT NULL DEFAULT 0,
	profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
	cash_received NUMERIC(12, 2) NOT NULL DEFAULT 0,
	change_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'completed',
	refunded_at TIMESTAMPTZ,
	created_by UUID REFERENCES users(id) ON DELETE SET NULL,
	client_reference TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_reference TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sales_tenant_client_reference_unique
	ON sales (tenant_id, client_reference) WHERE client_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS customers (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	phone TEXT,
	last_purchase TIMESTAMPTZ,
	total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
	purchase_count INTEGER NOT NULL DEFAULT 0,
	UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS suppliers (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	contact TEXT,
	phone TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	description TEXT NOT NULL,
	amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
	category TEXT,
	expense_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS registers (
	tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
	is_open BOOLEAN NOT NULL DEFAULT false,
	opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
	opened_at TIMESTAMPTZ,
	closing_cash NUMERIC(12, 2),
	closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stock_movements (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
	quantity NUMERIC(12, 3) NOT NULL,
	reason TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
	supplier TEXT,
	quantity NUMERIC(12, 3) NOT NULL,
	unit_cost NUMERIC(12, 2) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	action TEXT NOT NULL,
	details TEXT,
	user_id UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quick_sell_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
	display_order INTEGER NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT true,
	UNIQUE (tenant_id, product_id)
);

CREATE TABLE IF NOT EXISTS held_sales (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
	customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
	customer_phone TEXT NOT NULL DEFAULT '',
	items JSONB NOT NULL DEFAULT '[]'::jsonb,
	subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
	discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
	total NUMERIC(12, 2) NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'held',
	notes TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	held_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	resumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS products_tenant_idx ON products (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sales_tenant_idx ON sales (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customers_tenant_idx ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS suppliers_tenant_idx ON suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS expenses_tenant_idx ON expenses (tenant_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS movements_tenant_idx ON stock_movements (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS purchases_tenant_idx ON purchases (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_tenant_idx ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS groups_tenant_idx ON product_groups (tenant_id, display_order, name);
CREATE INDEX IF NOT EXISTS quick_sell_tenant_idx ON quick_sell_items (tenant_id, display_order);
CREATE INDEX IF NOT EXISTS held_sales_tenant_idx ON held_sales (tenant_id, updated_at DESC);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_sell_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_sales ENABLE ROW LEVEL SECURITY;

COMMIT;