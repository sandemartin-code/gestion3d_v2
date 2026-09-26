# Taller 3D — Sistema de gestión

Sistema para gestionar clientes, materiales, productos y pedidos de un
emprendimiento de impresión 3D. Funciona en PC y celular desde el mismo link
(diseño responsive), y expone un endpoint JSON para que sistemas externos
consulten los datos.

Stack: **Next.js** (frontend) + **Supabase** (base de datos + login) +
**Vercel** (hosting).

## 1. Crear el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá una cuenta gratis.
2. Creá un nuevo proyecto (elegí una región cercana, por ejemplo São Paulo).
3. Andá a **SQL Editor** → **New query**, pegá todo el contenido de
   `supabase/schema.sql` y ejecutalo. Esto crea las tablas de clientes,
   materiales, productos, pedidos, sus items y los movimientos de stock, con
   la seguridad y el descuento automático de stock configurados.
4. Andá a **Authentication → Users → Add user** y creá un usuario con tu
   email y una contraseña. Con ese usuario vas a entrar al sistema (no hay
   registro público, es un sistema de uso interno).
5. Andá a **Settings → API** y copiá tres valores que vas a necesitar en el
   paso 3: **Project URL**, **anon public key** y **service_role key**.

## 2. Probar el proyecto en tu computadora (opcional)

Necesitás tener [Node.js](https://nodejs.org) instalado (versión 18 o más).

```bash
npm install
cp .env.example .env.local
```

Editá `.env.local` y completá los valores que copiaste de Supabase, más una
clave que inventes vos para `EXPORT_API_KEY` (cualquier texto largo y
difícil de adivinar).

```bash
npm run dev
```

Abrí `http://localhost:3000` e iniciá sesión con el usuario que creaste.

## 3. Publicarlo en Vercel

1. Subí esta carpeta a un repositorio de GitHub (podés arrastrar los
   archivos desde [github.com/new](https://github.com/new), o usar git).
2. Andá a [vercel.com](https://vercel.com), creá una cuenta gratis con tu
   GitHub, y elegí **Add New → Project**, seleccionando el repositorio.
3. Antes de darle a "Deploy", abrí **Environment Variables** y cargá las
   mismas 4 variables de `.env.example` con los valores reales.
4. Deploy. En un par de minutos tenés un link tipo
   `https://tu-proyecto.vercel.app`, que funciona igual en PC y celular.
5. En el celular, abrí ese link en el navegador y usá "Agregar a pantalla
   de inicio" para que se sienta como una app.

### Dominio propio (opcional)

En Vercel: **Settings → Domains**, agregá tu dominio (comprado en cualquier
proveedor) y seguí las instrucciones para apuntar el DNS.

## 4. Cómo consultan tus datos los sistemas externos

Hay un endpoint listo para eso:

```
GET https://tu-proyecto.vercel.app/api/export
Authorization: Bearer <el EXPORT_API_KEY que elegiste>
```

Devuelve un JSON con clientes, materiales, productos y pedidos
(con sus items y el cliente asociado). Cualquier sistema externo que pueda
hacer una petición HTTP con ese header puede leer tus datos actualizados.

> Guardá el `EXPORT_API_KEY` como si fuera una contraseña: quien la tenga
> puede leer todos tus datos.

## Cómo funcionan los pedidos

Un pedido puede tener dos tipos de ítems:

- **Del catálogo**: elegís un producto ya cargado y se toma su precio. Estos
  ítems son los que descuentan material del stock, según la receta que
  cargaste en Productos.
- **Personalizado**: un trabajo a medida. Cargás descripción, gramos, horas
  y costo, y el precio de venta se calcula solo como **costo × 4** (el
  multiplicador está en `MULTIPLICADOR_PERSONALIZADO`, en
  `app/pedidos/page.js`, por si lo querés cambiar).

También podés dar de alta un cliente nuevo desde la misma pantalla del
pedido, sin ir a Clientes primero.

## Descuento automático de stock

Cuando un pedido pasa a estado **entregado**, la base descuenta sola el
material que consumieron sus ítems de catálogo y deja el registro en la
tabla `movimientos_stock`. Si después volvés ese pedido a otro estado, el
material se devuelve al stock automáticamente.

Toda esa lógica vive en la base (función `aplicar_stock_pedido` + trigger
`pedidos_stock` en `supabase/schema.sql`), así que funciona igual aunque el
cambio de estado venga de la app, del panel de Supabase o de un sistema
externo.

Para que descuente bien, cada producto tiene que tener cargados sus
materiales con la cantidad que consume **una unidad** (por ejemplo: 0.05 kg
de PLA negro).

## Estructura del proyecto

```
app/
  page.js              → Panel principal (resumen)
  login/               → Inicio de sesión
  clientes/            → Alta, edición y baja de clientes
  materiales/          → Alta, edición y baja de materiales (con stock)
  productos/           → Alta, edición y baja de productos (con materiales asociados)
  pedidos/             → Alta de pedidos, cambio de estado
  api/export/          → Endpoint JSON para sistemas externos
components/
  AppShell.js          → Navegación (barra lateral en PC, barra inferior en celular)
lib/
  supabaseClient.js    → Conexión a Supabase desde el navegador
  supabaseAdmin.js     → Conexión con privilegios de servidor (solo para /api/export)
supabase/
  schema.sql           → Estructura de la base de datos
```

## Qué te falta decidir / ajustar

- Los estados de pedido son: pendiente, en impresión, listo, entregado,
  cancelado. Se pueden cambiar en `supabase/schema.sql` y en
  `app/pedidos/page.js` si querés otros.
- Los ítems personalizados **no** descuentan stock, porque no tienen una
  receta de materiales asociada — solo gramos sueltos. Si querés que también
  descuenten, habría que agregarle al ítem qué material usó.
- Los pedidos se pueden crear y cambiar de estado, pero todavía no se pueden
  **editar** después de creados (hay que eliminarlos y volver a cargarlos).
- No hay pantalla de "olvidé mi contraseña" — se resetea desde el panel de
  Supabase (Authentication → Users).
