# Integración Mailtrap SMTP — Gran Coach LNB

Documentación de configuración y uso del servicio de envío de emails transaccionales mediante **Mailtrap SMTP** en el backend de Gran Coach LNB.

---

## Descripción

Gran Coach LNB envía emails transaccionales a los usuarios en respuesta a eventos del sistema: registro, operaciones de mercado, actualización de alineación y notificaciones de ranking semanal.

El transporte de emails está implementado en `src/services/EmailService.js` usando **nodemailer** (ya incluido en las dependencias) conectado al servidor SMTP de Mailtrap.

Mailtrap se eligió como proveedor porque:
- Ofrece un servidor SMTP dedicado para envío real (`live.smtp.mailtrap.io`)
- Incluye sandbox de testing sin riesgo de spam a usuarios reales
- La autenticación usa un API token revocable (no la contraseña de la cuenta)
- La configuración es idéntica a cualquier otro proveedor SMTP estándar

---

## Variables de entorno

Todas las credenciales se obtienen exclusivamente desde variables de entorno. Nunca están hardcodeadas.

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `EMAILS_ENABLED` | `true` / `false` | Habilita o deshabilita el envío de emails. En `false`, los envíos se loguean pero no se despachan. |
| `SMTP_HOST` | `live.smtp.mailtrap.io` | Host SMTP de Mailtrap (producción). |
| `SMTP_PORT` | `587` | Puerto STARTTLS. Usar `465` para SSL directo (cambia `requireTLS` automáticamente). |
| `SMTP_USER` | `api` | Usuario SMTP. En Mailtrap es siempre la cadena literal `api`. |
| `SMTP_PASS` | `abc123...` | API token de Mailtrap (obtenido desde la consola de Mailtrap). |
| `SMTP_FROM` | `"Gran Coach LNB <noreply@dominio.com>"` | Remitente que verán los destinatarios. Debe pertenecer al dominio verificado en Mailtrap. |
| `FRONTEND_URL` | `http://localhost:5173` | URL del frontend. Usada en los links dentro de los emails. |

---

## Cómo obtener las credenciales en Mailtrap

1. Crear una cuenta en [mailtrap.io](https://mailtrap.io) (hay plan gratuito).
2. En el dashboard, ir a **Sending** → **Domains**.
3. Agregar y verificar tu dominio de envío (requiere agregar registros DNS: SPF, DKIM, DMARC).
4. Una vez verificado, abrir el dominio → pestaña **Integrations** → seleccionar **SMTP**.
5. Copiar el **API token** que aparece como contraseña SMTP.

> El usuario SMTP es siempre `api`. La contraseña es el API token, no la contraseña de tu cuenta Mailtrap.

Para generar tokens adicionales: **Settings** → **API Tokens** → **Add Token**.

---

## Configuración local

### 1. Copiar el archivo de ejemplo

```bash
cp .env.example .env
```

### 2. Completar las variables SMTP en `.env`

```env
EMAILS_ENABLED=true
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=api
SMTP_PASS=tu_api_token_de_mailtrap_aqui
SMTP_FROM="Gran Coach LNB <noreply@tu-dominio-verificado.com>"
FRONTEND_URL=http://localhost:5173
```

### 3. Arrancar el servidor

```bash
npm run dev
```

Al arrancar con `EMAILS_ENABLED=true`, el servidor ejecuta una verificación de la conexión SMTP y reporta el resultado en consola:

```
[EmailService] SMTP connection verified successfully
[CRON] Scheduled: Weekend ranking email every Monday 00:00 UTC (Sunday 21:00 Argentina)
```

Si la conexión falla, verás:

```
[EmailService] Warning: SMTP no disponible — los emails no se entregarán
```

---

## Ejemplo de configuración completa (`.env`)

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=grancoach_lnb
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=al_menos_32_caracteres_aleatorios_aqui
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Email — Mailtrap SMTP
EMAILS_ENABLED=true
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=api
SMTP_PASS=1a2b3c4d5e6f7g8h9i0j_ejemplo_token
SMTP_FROM="Gran Coach LNB <noreply@grancoach.com>"
FRONTEND_URL=http://localhost:5173
```

---

## Uso dentro del proyecto

El `EmailService` es un módulo singleton en `src/services/EmailService.js`. El transporter se inicializa de forma lazy al primer envío.

### Emails disponibles

| Función exportada | Trigger | Llamado desde |
|-------------------|---------|---------------|
| `sendWelcome(user, teamName)` | Registro de usuario | `AuthService.register()` |
| `sendMarketChange(user, tipo, jugador, penalizado, presupuesto)` | Compra / venta / transferencia | `MarketService` |
| `sendLineupUpdate(user)` | Guardado de alineación | `LineupService` / `FantasyTeamController` |
| `sendWindowOpen(users[])` | Apertura del mercado | `AdminController` / cron |
| `sendWindowClose(users[])` | Cierre del mercado | `AdminController` / cron |
| `sendWeekendRanking(users[], { generalRanking, weeklyRanking })` | Lunes 00:00 UTC | `src/cron/emailScheduler.js` |
| `verifyConnection()` | Arranque del servidor | `src/app.js` |

### Ejemplo de llamada directa

```javascript
const EmailService = require('./services/EmailService');

// Fire and forget (patrón usado en todo el proyecto)
EmailService.sendWelcome(user, team.nombre).catch(console.error);

// Con await (en contextos donde se necesita confirmar el envío)
await EmailService.sendWelcome(user, team.nombre);

// Verificar conexión SMTP
const ok = await EmailService.verifyConnection();
if (!ok) console.warn('SMTP no disponible');
```

### Comportamiento con emails deshabilitados

Cuando `EMAILS_ENABLED=false`, todas las funciones de envío retornan inmediatamente sin error, logueando en consola:

```
[EmailService] Disabled — would send to usuario@ejemplo.com: Bienvenido a Gran Coach LNB
```

Esto permite desarrollar y testear sin necesitar credenciales SMTP.

---

## Cómo probar el envío de emails

### Opción A — Sandbox de Mailtrap (recomendado para desarrollo)

Mailtrap ofrece un inbox de testing (distinto al de envío real). Los emails van al inbox de Mailtrap sin llegar a destinatarios reales.

1. En el dashboard: **Testing** → **Inboxes** → copiar credenciales del inbox.
2. Las credenciales del inbox de testing son distintas a las de envío real.
3. Cambiar en `.env`:

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=tu_inbox_user
SMTP_PASS=tu_inbox_password
```

### Opción B — Envío real a tu propio email

Configurar Mailtrap con dominio verificado y `SMTP_HOST=live.smtp.mailtrap.io`. El email llega a la bandeja real del destinatario.

### Opción C — Prueba vía endpoint de registro

```bash
# Registrar usuario — dispara sendWelcome automáticamente
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test User",
    "email": "test@ejemplo.com",
    "password": "Password123!",
    "nombreEquipo": "Los Testers"
  }'
```

Revisar la consola del servidor para confirmar el log `[EmailService] Sent to ...`.

### Opción D — Script directo

```javascript
// scripts/testEmail.js
require('dotenv').config();
const EmailService = require('./src/services/EmailService');

async function main() {
  const ok = await EmailService.verifyConnection();
  if (!ok) {
    console.error('Conexión SMTP fallida');
    process.exit(1);
  }

  await EmailService.sendWelcome(
    { id: 1, nombre: 'Test', email: 'tu@email.com' },
    'Mi Equipo de Prueba'
  );
  console.log('Email enviado exitosamente');
}

main().catch(console.error);
```

```bash
node scripts/testEmail.js
```

---

## Errores frecuentes y troubleshooting

### `[EmailService] Auth error — check SMTP_USER/SMTP_PASS`

**Causa:** Token de API inválido, expirado o mal copiado. `SMTP_USER` no es `api`.

**Solución:**
- Verificar que `SMTP_USER=api` (literal, sin cambios).
- Regenerar el token en Mailtrap: **Settings** → **API Tokens**.
- Asegurarse de no tener espacios o saltos de línea en `SMTP_PASS`.

---

### `[EmailService] Cannot connect to live.smtp.mailtrap.io:587`

**Causa:** Problema de red, firewall bloqueando el puerto 587, o `SMTP_HOST` mal escrito.

**Solución:**
- Verificar conectividad: `telnet live.smtp.mailtrap.io 587`
- Verificar que el valor de `SMTP_HOST` es exactamente `live.smtp.mailtrap.io`.
- Si el puerto 587 está bloqueado, intentar con `SMTP_PORT=465`.

---

### `[EmailService] Timeout sending to ...`

**Causa:** Latencia de red alta, servidor SMTP no responde en 10 segundos.

**Solución:**
- Verificar estado del servicio en [status.mailtrap.io](https://status.mailtrap.io).
- Revisar conectividad de red desde el servidor.

---

### Los emails llegan pero van a spam

**Causa:** El dominio remitente en `SMTP_FROM` no tiene SPF/DKIM/DMARC configurados correctamente, o el dominio no está verificado en Mailtrap.

**Solución:**
- Verificar el dominio en Mailtrap: **Sending** → **Domains** → revisar estado de registros DNS.
- Usar un dominio propio verificado (no `@gmail.com` ni `@grancoach.com` sin registros DNS propios).

---

### `Error: EMAILS_ENABLED is true but SMTP vars missing`

**Causa:** Faltan una o más variables SMTP en `.env` con `EMAILS_ENABLED=true`.

**Solución:** Asegurarse de que estas cuatro variables existan en `.env`:

```
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=api
SMTP_PASS=tu_token
```

---

### Los emails se loguean como "Disabled" aunque `EMAILS_ENABLED=true`

**Causa:** La variable de entorno no se está cargando. Puede ser que el archivo `.env` no esté en `BACKEND/` o que `dotenv` no se ejecute antes de importar el `EmailService`.

**Solución:**
- Confirmar que `.env` existe en `BACKEND/` (al mismo nivel que `package.json`).
- Verificar que `require('dotenv').config()` es la primera línea de `src/app.js`.

---

## Arquitectura del servicio

```
src/
├── services/
│   └── EmailService.js         Transporter nodemailer, templates HTML, funciones públicas
├── cron/
│   └── emailScheduler.js       Cron job: ranking semanal cada lunes 00:00 UTC
└── app.js                      Inicializa servicio y verifica conexión SMTP al arrancar
```

El `EmailService` usa el **patrón lazy singleton**: el transporter se crea en el primer uso, no al importar el módulo. Esto evita fallos en tests que no necesitan SMTP.

Los timeouts configurados son:
- `connectionTimeout`: 10 s — tiempo para establecer la conexión TCP
- `greetingTimeout`: 10 s — tiempo para recibir el saludo SMTP del servidor
- `socketTimeout`: 30 s — tiempo máximo de inactividad por socket

En `NODE_ENV=production`, `tls.rejectUnauthorized` es `true` (rechaza certificados inválidos). En desarrollo es `false` para facilitar testing con sandbox.
