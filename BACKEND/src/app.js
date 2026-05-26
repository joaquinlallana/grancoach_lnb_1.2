require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const fantasyTeamRoutes = require('./routes/fantasyTeam');
const marketRoutes = require('./routes/market');
const gameweekRoutes = require('./routes/gameweeks');
const rankingRoutes = require('./routes/rankings');
const adminRoutes = require('./routes/admin');

const app = express();

// ─── Seguridad y utilidades ────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Rate limiting ─────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { success: false, message: 'Demasiadas solicitudes, intentá más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limit más estricto para login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de autenticación' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const { query } = require('./config/database');
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// ─── Rutas API ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/fantasy-team', fantasyTeamRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/gameweeks', gameweekRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ─── Error handler global ──────────────────────────────────────────────────
app.use(errorHandler);

// ─── Iniciar servidor ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Fantasy LNB API corriendo en http://localhost:${PORT}`);
    console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);

    // Iniciar servicio de emails (verificación SMTP + cron de ranking semanal)
    if (process.env.EMAILS_ENABLED === 'true') {
      const EmailService = require('./services/EmailService');
      EmailService.verifyConnection().then(ok => {
        if (!ok) console.warn('[EmailService] Warning: SMTP no disponible — los emails no se entregarán');
      });

      try {
        const { scheduleWeekendRankingEmail } = require('./cron/emailScheduler');
        scheduleWeekendRankingEmail();
      } catch (error) {
        console.error(`[EmailScheduler] Error al inicializar:`, error.message);
      }
    }

    // Iniciar cron job de carga de estadísticas si está habilitado
    if (process.env.TESTING_CRON === 'true') {
      console.log(`🔄 Iniciando cron job de carga progresiva de estadísticas...`);
      const ProgressiveStatsLoaderService = require('./services/ProgressiveStatsLoaderService');
      const cron = require('node-cron');

      const runLoader = async () => {
        try {
          console.log(`[ProgressiveLoader] Iniciando carga automática...`);
          const jornada = await ProgressiveStatsLoaderService.findFirstGameweekWithoutStats();

          if (!jornada) {
            console.log(`[ProgressiveLoader] ✅ Todas las jornadas tienen estadísticas cargadas`);
            return;
          }

          console.log(`[ProgressiveLoader] Cargando Jornada ${jornada.numero}...`);
          const result = await ProgressiveStatsLoaderService.loadGameweekStats(jornada.id);
          console.log(
            `[ProgressiveLoader] Jornada ${result.numero}: ${result.exitosos}/${result.procesados} ✓`
          );
        } catch (error) {
          console.error(`[ProgressiveLoader] Error:`, error.message);
        }
      };

      // Disparar inmediatamente al arrancar
      runLoader();

      // Luego repetir cada 10 minutos
      cron.schedule('*/10 * * * *', runLoader);
    }
  });
}

module.exports = app;
