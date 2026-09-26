-- Sistema de gestión — emprendimiento de impresión 3D
-- Ejecutar este archivo completo en Supabase: Panel > SQL Editor > New query > pegar y correr

create extension if not exists "pgcrypto";

-- CLIENTES
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  direccion text,
  notas text,
  created_at timestamptz not null default now()
);

-- MATERIALES (filamentos, resinas, etc.)
create table if not exists materiales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default 'filamento', -- filamento | resina | otro
  color text,
  unidad text not null default 'kg',      -- kg | litro | unidad
  costo_unidad numeric not null default 0,   -- costo por unidad de "unidad"
  stock_actual numeric not null default 0,
  stock_minimo numeric not null default 0,
  created_at timestamptz not null default now()
);

-- PRODUCTOS
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric not null default 0,
  tiempo_impresion_horas numeric not null default 0,
  -- lista de materiales que usa: [{"material_id": "...", "cantidad": 0.05}, ...]
  materiales jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- PEDIDOS
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_impresion', 'listo', 'entregado', 'cancelado')),
  fecha_pedido date not null default current_date,
  fecha_entrega_estimada date,
  notas text,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ITEMS DE CADA PEDIDO
create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  producto_nombre text not null, -- copia del nombre al momento de vender (por si el producto cambia después)
  cantidad integer not null default 1,
  precio_unitario numeric not null default 0
);

-- Seguridad: habilitar RLS y permitir acceso solo a usuarios logueados.
-- Como es un sistema de un solo emprendimiento, cualquier usuario autenticado
-- (vos, o quien vos invites desde Supabase Auth) tiene acceso completo.
alter table clientes enable row level security;
alter table materiales enable row level security;
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;

create policy "autenticados_clientes" on clientes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "autenticados_materiales" on materiales for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "autenticados_productos" on productos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "autenticados_pedidos" on pedidos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "autenticados_pedido_items" on pedido_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Índices útiles
create index if not exists idx_pedidos_cliente on pedidos(cliente_id);
create index if not exists idx_pedidos_estado on pedidos(estado);
create index if not exists idx_pedido_items_pedido on pedido_items(pedido_id);
