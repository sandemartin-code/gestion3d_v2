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
-- Un item puede ser:
--   tipo = 'catalogo'      -> apunta a un producto y copia su nombre
--   tipo = 'personalizado' -> trabajo a medida, con gramos/horas/costo y precio = costo * 4
create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  tipo text not null default 'catalogo'
    check (tipo in ('catalogo', 'personalizado')),
  producto_id uuid references productos(id) on delete set null,
  producto_nombre text,   -- copia del nombre al momento de vender (por si el producto cambia después)
  descripcion text,       -- solo para items personalizados
  cantidad integer not null default 1,
  gramos numeric,         -- solo para items personalizados
  horas_impresion numeric,-- solo para items personalizados
  costo_unitario numeric, -- solo para items personalizados
  precio_unitario numeric not null default 0,
  constraint pedido_items_datos_por_tipo check (
    (tipo = 'catalogo'      and producto_nombre is not null)
    or
    (tipo = 'personalizado' and descripcion is not null)
  )
);

-- MOVIMIENTOS DE STOCK
-- Cada vez que se descuenta (o se devuelve) material queda registrado acá,
-- así el stock de "materiales" siempre se puede auditar y reconstruir.
create table if not exists movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materiales(id) on delete cascade,
  pedido_id uuid references pedidos(id) on delete set null,
  tipo text not null check (tipo in ('consumo', 'devolucion', 'ajuste', 'compra')),
  cantidad numeric not null,  -- negativo = sale stock, positivo = entra stock
  motivo text,
  created_at timestamptz not null default now()
);

-- Seguridad: habilitar RLS y permitir acceso solo a usuarios logueados.
-- Como es un sistema de un solo emprendimiento, cualquier usuario autenticado
-- (vos, o quien vos invites desde Supabase Auth) tiene acceso completo.
alter table clientes enable row level security;
alter table materiales enable row level security;
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table movimientos_stock enable row level security;

drop policy if exists "autenticados_clientes" on clientes;
drop policy if exists "autenticados_materiales" on materiales;
drop policy if exists "autenticados_productos" on productos;
drop policy if exists "autenticados_pedidos" on pedidos;
drop policy if exists "autenticados_pedido_items" on pedido_items;
drop policy if exists "autenticados_movimientos_stock" on movimientos_stock;

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
create policy "autenticados_movimientos_stock" on movimientos_stock for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- DESCUENTO AUTOMÁTICO DE STOCK
-- Cuando un pedido pasa a 'entregado', se descuenta el material que consumieron
-- sus items. Si vuelve de 'entregado' a otro estado, el material se devuelve.
create or replace function aplicar_stock_pedido(p_pedido_id uuid, p_signo int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Items de catálogo: consumen según la receta de materiales del producto
  for r in
    select (m->>'material_id')::uuid as material_id,
           sum((m->>'cantidad')::numeric * pi.cantidad) as cantidad
    from pedido_items pi
    join productos p on p.id = pi.producto_id
    cross join lateral jsonb_array_elements(p.materiales) as m
    where pi.pedido_id = p_pedido_id
      and pi.tipo = 'catalogo'
      and jsonb_typeof(p.materiales) = 'array'
    group by 1
  loop
    update materiales
      set stock_actual = stock_actual - (p_signo * r.cantidad)
      where id = r.material_id;

    insert into movimientos_stock (material_id, pedido_id, tipo, cantidad, motivo)
    values (
      r.material_id,
      p_pedido_id,
      case when p_signo = 1 then 'consumo' else 'devolucion' end,
      -(p_signo * r.cantidad),
      case when p_signo = 1 then 'Pedido entregado' else 'Pedido revertido' end
    );
  end loop;
end;
$$;

create or replace function trg_pedido_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'entregado' and old.estado is distinct from 'entregado' then
    perform aplicar_stock_pedido(new.id, 1);
  elsif old.estado = 'entregado' and new.estado is distinct from 'entregado' then
    perform aplicar_stock_pedido(new.id, -1);
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_stock on pedidos;
create trigger pedidos_stock
  after update of estado on pedidos
  for each row
  execute function trg_pedido_stock();

-- Índices útiles
create index if not exists idx_pedidos_cliente on pedidos(cliente_id);
create index if not exists idx_pedidos_estado on pedidos(estado);
create index if not exists idx_pedido_items_pedido on pedido_items(pedido_id);
create index if not exists idx_pedido_items_tipo on pedido_items(tipo);
create index if not exists idx_movimientos_material on movimientos_stock(material_id);
