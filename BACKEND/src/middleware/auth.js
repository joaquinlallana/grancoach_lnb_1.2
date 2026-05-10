const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Middleware que verifica el JWT y adjunta el usuario al request.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación no proporcionado',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expirado' });
      }
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    // Verificar que el usuario sigue activo en la BD
    const result = await query(
      'SELECT id, nombre, email, activo, es_admin FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows.length || !result.rows[0].activo) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado o inactivo' });
    }

    // Agregar usuario al request, incluyendo es_admin de la BD (más seguro que del token)
    req.user = {
      ...result.rows[0],
      es_admin: result.rows[0].es_admin || false,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware opcional: si hay token lo procesa, sino continúa sin usuario.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authenticate(req, res, next);
};

module.exports = { authenticate, optionalAuth };
