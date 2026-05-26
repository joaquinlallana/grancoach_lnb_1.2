const nodemailer = require('nodemailer');

const EMAILS_ENABLED = process.env.EMAILS_ENABLED === 'true';

let transporter = null;

function initializeTransporter() {
  if (!EMAILS_ENABLED) {
    return null;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[EmailService] SMTP environment variables not configured, emails disabled');
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT);
  const isSecurePort = port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: isSecurePort,
    requireTLS: !isSecurePort, // STARTTLS obligatorio en port 587 (Mailtrap)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
}

function getTransporter() {
  if (transporter === null && EMAILS_ENABLED) {
    transporter = initializeTransporter();
  }
  return transporter;
}

async function sendEmail(to, subject, htmlContent) {
  const trans = getTransporter();
  if (!trans) {
    console.log(`[EmailService] Disabled — would send to ${to}: ${subject}`);
    return;
  }

  try {
    await trans.sendMail({
      from: process.env.SMTP_FROM || 'Gran Coach LNB <noreply@grancoach.com>',
      to,
      subject,
      html: htmlContent,
    });
    console.log(`[EmailService] Sent to ${to}: ${subject}`);
  } catch (err) {
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      console.error(`[EmailService] Auth error — check SMTP_USER/SMTP_PASS:`, err.message);
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      console.error(`[EmailService] Cannot connect to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} — check SMTP_HOST/SMTP_PORT:`, err.message);
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKET') {
      console.error(`[EmailService] Timeout sending to ${to}:`, err.message);
    } else {
      console.error(`[EmailService] Error sending to ${to}:`, err.message);
    }
  }
}

async function verifyConnection() {
  const trans = getTransporter();
  if (!trans) return false;

  try {
    await trans.verify();
    console.log('[EmailService] SMTP connection verified successfully');
    return true;
  } catch (err) {
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      console.error('[EmailService] SMTP auth failed — check SMTP_USER/SMTP_PASS');
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      console.error(`[EmailService] Cannot connect to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    } else {
      console.error('[EmailService] SMTP verification failed:', err.message);
    }
    return false;
  }
}

// ===================== TEMPLATES =====================

function templateWelcome(user, teamName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; }
        .button { background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Bienvenido a Gran Coach LNB!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${user.nombre}</strong>,</p>
          <p>Tu equipo <strong>"${teamName}"</strong> ha sido creado exitosamente.</p>
          <p>Comienza con un presupuesto de <strong>$100,000,000</strong> para fichar los mejores jugadores de la LNB.</p>
          <p>Recuerda que puedes:</p>
          <ul>
            <li>Fichar y vender jugadores (2 transferencias gratis por jornada)</li>
            <li>Armar tu alineación ideal (1 base, 1 escolta, 1 alero, 1 ala-pivot, 1 pivot)</li>
            <li>Competir en el ranking general contra otros managers</li>
          </ul>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Ir a mi equipo</a>
          <p>¿Dudas? Consulta el reglamento en la app.</p>
        </div>
        <div class="footer">
          <p>Gran Coach LNB © 2026 | Fantasy Basketball Argentina</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function templateMarketChange(user, tipo, jugador, penalizado, presupuestoRestante) {
  const tipoTexto = {
    'buy': `Fichaste a <strong>${jugador.nombre}</strong>`,
    'sell': `Vendiste a <strong>${jugador.nombre}</strong>`,
    'transfer': `Intercambiaste por <strong>${jugador.nombre}</strong>`,
  }[tipo] || 'Se realizó una operación';

  const penalizacionHTML = penalizado
    ? `<p style="color: #d32f2f;"><strong>⚠️ Transferencia penalizada:</strong> Excediste las 2 transferencias gratis. Se descuentan 20 puntos.</p>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; }
        .detail { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .button { background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Cambio en tu equipo</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${user.nombre}</strong>,</p>
          <p>${tipoTexto}</p>
          <div class="detail">
            <p><strong>Jugador:</strong> ${jugador.nombre}</p>
            <p><strong>Posición:</strong> ${jugador.posicion}</p>
            <p><strong>Precio:</strong> $${(jugador.precio || 0).toLocaleString('es-AR')}</p>
          </div>
          ${penalizacionHTML}
          <p><strong>Presupuesto restante:</strong> $${(presupuestoRestante || 0).toLocaleString('es-AR')}</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Ver mi equipo</a>
        </div>
        <div class="footer">
          <p>Gran Coach LNB © 2026 | Fantasy Basketball Argentina</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function templateLineupUpdate(user) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; }
        .button { background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Alineación guardada</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${user.nombre}</strong>,</p>
          <p>Tu alineación ha sido actualizada correctamente.</p>
          <p>Tu equipo está listo para la próxima jornada.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Ver alineación</a>
        </div>
        <div class="footer">
          <p>Gran Coach LNB © 2026 | Fantasy Basketball Argentina</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function templateWindowOpen() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; }
        .button { background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏀 ¡Abrió el mercado!</h1>
        </div>
        <div class="content">
          <p>La ventana de transferencias ha abierto.</p>
          <p>Tienes <strong>2 transferencias gratis</strong> esta jornada. ¡Es momento de reforzar tu equipo!</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/market" class="button">Ir al mercado</a>
        </div>
        <div class="footer">
          <p>Gran Coach LNB © 2026 | Fantasy Basketball Argentina</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function templateWindowClose() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #ff6f00 0%, #e65100 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; }
        .button { background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Mercado cerrado</h1>
        </div>
        <div class="content">
          <p>La ventana de transferencias ha cerrado.</p>
          <p>Tu alineación está bloqueada. Los jugadores ya no pueden ser fichados ni vendidos hasta la próxima jornada.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Ver mi equipo</a>
        </div>
        <div class="footer">
          <p>Gran Coach LNB © 2026 | Fantasy Basketball Argentina</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function templateWeekendRanking(user, generalRanking, weeklyRanking) {
  const isMe = (r) => r.email === user.email;
  const userPositionGeneral = generalRanking.findIndex(isMe) + 1 || '-';
  const userPositionWeekly = weeklyRanking.findIndex(isMe) + 1 || '-';

  const generalHTML = generalRanking.slice(0, 10)
    .map((r, i) => `<tr ${isMe(r) ? 'style="background-color: #fff3e0;"' : ''}>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${i + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${r.usuario || r.usuario_nombre || r.nombre}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><strong>${r.puntos_totales || r.total_puntos || 0}</strong></td>
    </tr>`)
    .join('');

  const weeklyHTML = weeklyRanking.slice(0, 10)
    .map((r, i) => `<tr ${isMe(r) ? 'style="background-color: #fff3e0;"' : ''}>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${i + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${r.usuario || r.usuario_nombre || r.nombre}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><strong>${r.puntos_totales || 0}</strong></td>
    </tr>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; }
        .container { max-width: 700px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .section { padding: 20px; }
        .section h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        .button { background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .position-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; text-align: center; }
        .position-box strong { font-size: 20px; color: #667eea; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏆 Ranking Semanal</h1>
          <p>Resumen de la jornada</p>
        </div>

        <div class="section">
          <div class="position-box">
            <p>Tu posición esta semana:</p>
            <strong>#${userPositionWeekly}</strong>
          </div>

          <h2>Top 10 Ranking Semanal</h2>
          <table>
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 12px; text-align: left;">Pos.</th>
                <th style="padding: 12px; text-align: left;">Equipo</th>
                <th style="padding: 12px; text-align: right;">Puntos</th>
              </tr>
            </thead>
            <tbody>
              ${weeklyHTML}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="position-box">
            <p>Tu posición general:</p>
            <strong>#${userPositionGeneral}</strong>
          </div>

          <h2>Top 10 Ranking General</h2>
          <table>
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 12px; text-align: left;">Pos.</th>
                <th style="padding: 12px; text-align: left;">Equipo</th>
                <th style="padding: 12px; text-align: right;">Puntos</th>
              </tr>
            </thead>
            <tbody>
              ${generalHTML}
            </tbody>
          </table>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/rankings" class="button">Ver ranking completo</a>
        </div>

        <div class="footer">
          <p>Gran Coach LNB © 2026 | Fantasy Basketball Argentina</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ===================== PUBLIC API =====================

async function sendWelcome(user, teamName) {
  const html = templateWelcome(user, teamName);
  return sendEmail(user.email, 'Bienvenido a Gran Coach LNB', html);
}

async function sendMarketChange(user, tipo, jugador, penalizado, presupuestoRestante) {
  const tipoEmoji = { buy: '➕', sell: '➖', transfer: '🔄' }[tipo] || '📋';
  const html = templateMarketChange(user, tipo, jugador, penalizado, presupuestoRestante);
  const subject = `${tipoEmoji} Cambio en tu equipo`;
  return sendEmail(user.email, subject, html);
}

async function sendLineupUpdate(user) {
  const html = templateLineupUpdate(user);
  return sendEmail(user.email, '✅ Alineación guardada', html);
}

async function sendWindowOpen(users) {
  if (!Array.isArray(users)) {
    console.error('sendWindowOpen: users must be an array');
    return;
  }

  const html = templateWindowOpen();
  const subject = '🏀 ¡Abrió el mercado!';

  // Fire and forget for all users
  users.forEach(user => {
    sendEmail(user.email, subject, html).catch(console.error);
  });
}

async function sendWindowClose(users) {
  if (!Array.isArray(users)) {
    console.error('sendWindowClose: users must be an array');
    return;
  }

  const html = templateWindowClose();
  const subject = '🔒 Mercado cerrado';

  // Fire and forget for all users
  users.forEach(user => {
    sendEmail(user.email, subject, html).catch(console.error);
  });
}

async function sendWeekendRanking(users, { generalRanking, weeklyRanking }) {
  if (!Array.isArray(users)) {
    console.error('sendWeekendRanking: users must be an array');
    return;
  }

  if (!Array.isArray(generalRanking) || !Array.isArray(weeklyRanking)) {
    console.error('sendWeekendRanking: rankings must be arrays');
    return;
  }

  const subject = '🏆 Ranking Semanal';

  // Fire and forget for all users
  users.forEach(user => {
    const html = templateWeekendRanking(user, generalRanking, weeklyRanking);
    sendEmail(user.email, subject, html).catch(console.error);
  });
}

module.exports = {
  sendWelcome,
  sendMarketChange,
  sendLineupUpdate,
  sendWindowOpen,
  sendWindowClose,
  sendWeekendRanking,
  verifyConnection,
};
