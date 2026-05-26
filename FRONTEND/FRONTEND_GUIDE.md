# Gran Coach LNB — Guía del Frontend

## ¿Qué es este proyecto?

**Gran Coach LNB** es un juego de fantasy basketball para la Liga Nacional de Básquet Argentina. Este directorio contiene el frontend (interfaz de usuario) que se conecta al backend ubicado en `../BACKEND/`.

---

## Cómo correr el proyecto

### Requisitos
- Node.js 18+
- El backend debe estar corriendo en `http://localhost:3000`

### Instalación
```bash
cd FRONTEND
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

### Scripts disponibles
| Comando | Descripción |
|---|---|
| `npm run dev` | Levanta el servidor de desarrollo con HMR |
| `npm run build` | Genera los archivos de producción en `dist/` |
| `npm run preview` | Previsualiza el build de producción localmente |

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 | Framework UI |
| Vite | 5 | Build tool y dev server |
| TailwindCSS | 3 (darkMode: 'class') | Estilos utility-first + design tokens |
| React Router | 6 | Navegación SPA |
| TanStack Query | 5 | Cache y sincronización con el servidor |
| Zustand | 4 | Estado global cliente (auth + theme) |
| Axios | 1.7 | Cliente HTTP con interceptores |
| React Hook Form | 7 | Manejo de formularios |
| Lucide React | latest | Íconos SVG |
| React Hot Toast | 2 | Notificaciones emergentes |
| Inter | Google Fonts | Tipografía UI (pesos 400–800) |
| @dnd-kit/core + utilities | 6.3 / 3.2 | Drag-and-drop del CourtView |

---

## Arquitectura del proyecto

```
src/
├── api/           ← Funciones que llaman a los endpoints del backend
├── store/         ← Zustand: authStore (token + user), themeStore (dark/light)
├── hooks/         ← Hooks de React Query para datos del servidor
├── components/    ← Componentes reutilizables organizados por dominio
│   ├── ui/        ← Primitivas: Button, Card, Badge, Spinner, Skeleton, EmptyState,
│   │              Input, Select, FormField, ErrorBoundary, ThemeToggle, Logo
│   ├── layout/    ← Navbar (con ThemeToggle), Layout (con ErrorBoundary),
│   │              PrivateRoute, AdminRoute
│   ├── market/    ← PlayerCard, PlayerFilters, BudgetBar
│   ├── team/      ← CourtView (responsive + DnD), PlayerChip
│   ├── rankings/  ← RankingTable
│   └── dashboard/ ← StatCard
└── pages/         ← Una página por ruta de la app
```

---

## Páginas y rutas

| Ruta | Página | Acceso | Descripción |
|---|---|---|---|
| `/` | Landing | Público | Presentación del juego, CTAs de registro y login |
| `/login` | Login | Público | Formulario de inicio de sesión |
| `/register` | Register | Público | Formulario de registro con creación de equipo |
| `/dashboard` | Dashboard | Privado | Resumen del equipo: presupuesto, ranking, puntaje |
| `/market` | Market | Privado | Mercado de jugadores con filtros y compra/venta |
| `/my-team` | MyTeam | Privado | Gestión de la plantilla: titulares, suplentes, capitán |
| `/rankings` | Rankings | Privado | Tabla de posiciones global paginada |
| `/players/:id` | PlayerDetail | Privado | Estadísticas y puntaje fantasy de un jugador |
| `/admin` | Admin | Admin | Sincronización de datos y control de jornadas |

---

## Autenticación JWT

### Flujo completo
1. El usuario se registra o inicia sesión → el backend devuelve un token JWT (duración: 7 días)
2. El token y los datos del usuario se guardan en `localStorage`
3. Zustand (`src/store/authStore.js`) expone el estado de auth en toda la app
4. El hook `useAuth()` es el punto de acceso estándar desde cualquier componente
5. Axios (`src/api/axios.js`) adjunta automáticamente el token en cada request con `Authorization: Bearer <token>`
6. Si el backend responde con un error 401, el interceptor de Axios limpia el localStorage y redirige a `/login`

### Protección de rutas
- `PrivateRoute` — redirige a `/login` si no hay token
- `AdminRoute` — redirige a `/dashboard` si el usuario no es admin (campo `es_admin` del JWT)

---

## Cómo funciona cada sección

### Dashboard
- Carga el equipo del usuario (`GET /api/fantasy-team`)
- Carga el puntaje histórico (`GET /api/rankings/my-score`)
- Obtiene la jornada actual (`GET /api/gameweeks/current`)
- Busca la posición del usuario en el ranking global
- Muestra un banner de alerta si la jornada está cerrada (mercado bloqueado)

### Mercado de Jugadores
- Lista paginada de jugadores (`GET /api/market/players`) con filtros:
  - Búsqueda por nombre (`q`)
  - Filtro por posición (`posicion`)
  - Filtro por equipo real (`equipo_id`)
- Indica si un jugador ya está en tu equipo
- Botón "Comprar" llama a `POST /api/market/buy/:id`
- Botón "Vender" llama a `DELETE /api/market/sell/:id`
- Al completar una acción, se invalidan las queries de equipo y mercado → la UI se actualiza automáticamente
- Muestra la barra de presupuesto con el saldo restante
- Bloquea los botones si el mercado está cerrado o el presupuesto es insuficiente

### Mi Equipo
- `CourtView` con **drag-and-drop** (`@dnd-kit`). En desktop: banco a la izquierda + cancha a la derecha. En mobile: cancha arriba + banco en grid 5-columnas debajo.
- Arrastrar un suplente al slot de su posición lo asciende a titular (con swap automático si el slot está ocupado).
- Validación de posición al soltar (toast de error si la posición no coincide).
- Botones inline en cada chip: capitán (corona dorada) y vender (acción confirmada).
- Slot vacío en cancha → botón que lleva al mercado con `?posicion=` pre-aplicado.
- "Guardar cambios" envía `PATCH /api/fantasy-team/lineup` con todos los jugadores y sus estados.
- Muestra advertencia si hay transferencias penalizadas en la jornada actual (−20 pts c/u).
- Bloquea cambios si la jornada está cerrada.

**Reglas del juego mostradas en la UI:**
- Capitán = ×2 puntos
- Titular = ×1 punto · Suplente = ×0.5 puntos
- 2 transferencias gratis por jornada; las siguientes tienen penalización de −20 pts c/u

### Ranking
- Tabla paginada (`GET /api/rankings/global`).
- La fila del usuario autenticado se resalta con borde lateral acento dorado (no fondo saturado).
- Top 3: badge numérico con fondo dorado sutil (`bg-brand-500/15`). Sin emojis de medallas.
- Skeleton rows durante la carga.
- Columnas: Posición, Equipo, Usuario, Puntos totales, Presupuesto restante. En mobile, Usuario y Presupuesto se ocultan responsivamente.

### Panel Admin
- Solo visible para usuarios con `es_admin = true`
- Estado de la API externa (requests restantes del día)
- Información de la jornada actual con botón para avanzar a la siguiente
- Botones de sincronización individuales: equipos, jugadores, partidos, estadísticas
- Cada sync muestra el resultado del servidor al completarse

---

## Conexión con el backend (proxy)

El archivo `vite.config.js` configura un proxy que redirige todas las requests de `/api/*` al backend en `localhost:3000`. Esto evita problemas de CORS durante el desarrollo.

```js
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  }
}
```

En producción, la variable de entorno `VITE_API_URL` debe apuntar al backend desplegado.

---

## Gestión del estado del servidor (React Query)

Se usa TanStack Query v5 para todas las llamadas al backend:

- **`useTeam()`** — datos del equipo, se invalida tras compra/venta/lineup
- **`usePlayers(filters)`** — jugadores del mercado, paginado
- **`useGlobalRanking(params)`** — ranking global
- **`useMyScore()`** — puntaje histórico del usuario
- **`useCurrentGameweek()`** — jornada activa, se refetch cada 2 min
- **`useMarketStatus()`** — estado del mercado, se refetch cada 1 min

Las mutations (compra, venta, lineup) invalidan las queries correspondientes para mantener la UI sincronizada sin necesidad de recargar la página.

---

## Fórmula de puntaje fantasy

Los puntos se calculan en el backend (vistas de PostgreSQL), pero el frontend los muestra:

| Estadística | Multiplicador |
|---|---|
| Puntos anotados | ×1.0 |
| Rebotes | ×1.2 |
| Asistencias | ×1.5 |
| Robos | ×2.0 |
| Tapas | ×2.0 |
| Triples convertidos | +0.5 |
| Pérdidas de balón | −1.0 |
| Tiros de campo fallados | −0.5 |
| Tiros libres fallados | −2.0 |

Modificadores de lineup:
- **Titular**: puntaje base ×1
- **Suplente**: puntaje base ×0.5
- **Capitán**: puntaje base ×2 (debe ser titular)

---

## Reglas de negocio reflejadas en la UI

1. **Presupuesto**: el botón "Comprar" se deshabilita si el precio > presupuesto restante
2. **Límite de plantilla**: el backend rechaza compras si ya hay 10 jugadores (el error se muestra como toast)
3. **Límite por equipo real**: el backend rechaza si ya hay 3 jugadores del mismo equipo LNB
4. **Jornada cerrada**: se bloquean todos los botones de compra/venta/lineup y se muestra banner de alerta
5. **Capitán**: solo puede ser titular; al quitar a alguien de titular, pierde el rol de capitán
6. **Transferencias penalizadas**: se muestran en MyTeam como advertencia con el total de puntos perdidos

---

## Variables de entorno

- **Desarrollo:** no es necesario. `vite.config.js` proxea `/api` → `http://localhost:3000`.
- **Producción:** crear `.env` (o `.env.local`) en la raíz de FRONTEND con:

```env
VITE_API_URL=https://api.tudominio.com
```

`src/api/axios.js` detecta esta variable y compone `${VITE_API_URL}/api` como baseURL. Si no está definida, usa `/api` relativo (proxy en dev).

---

## Sistema de diseño y tema dark/light

El frontend usa **design tokens semánticos** definidos en `tailwind.config.js`:

- `brand-50…950` — escala dorada para acentos premium (CTAs, capitán, top-3).
- `surface-50…950` — escala neutra (zinc-based) para fondos, cards y bordes en ambos temas.
- Tipografía: **Inter** (Google Fonts) con escala `text-display-*` para titulares.

### Cómo agregar un componente nuevo con soporte dark/light

1. Fondos y bordes: `bg-white dark:bg-surface-900`, `border-surface-200 dark:border-surface-800`.
2. Texto: `text-surface-900 dark:text-surface-50` (principal), `text-surface-600 dark:text-surface-400` (secundario), `text-surface-500` (terciario).
3. Acentos: `text-brand-600 dark:text-brand-400` para enlaces e iconos destacados.
4. Semánticos: preferir formato `bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20 text-emerald-700 dark:text-emerald-300` en lugar de colores sólidos saturados.

### ThemeToggle

`<ThemeToggle />` está en la `Navbar` (modo autenticado) y en el header de las páginas públicas (`Landing`, `Login`, `Register`). El estado se persiste en `localStorage` bajo la clave `theme`. Un script inline en `index.html` aplica la clase `dark` antes del primer render para evitar flash.

---

## Manejo de errores y resiliencia

- **ErrorBoundary global** en `App.jsx` envuelve todas las rutas; captura crashes de render y muestra un fallback con botón de recarga.
- **ErrorBoundary local** en `Layout.jsx` aísla páginas privadas: si una página crashea, la navbar y el toggle de tema siguen disponibles.
- **Axios interceptors** (`src/api/axios.js`) manejan JWT expirado y 401.
- **React Query** maneja errores async: los hooks (`useTeam`, `useMarket`, `useRankings`) propagan `isLoading`, `isError`, `error` al consumidor.
- **Skeletons** (`SkeletonCard`, `SkeletonRow`) reemplazan spinners genéricos en grids y tablas para mejor percepción de velocidad.
