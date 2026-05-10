/**
 * Convierte errores de PostgreSQL en respuestas HTTP legibles.
 */
const pgErrorMap = {
  '23505': { status: 409, message: 'Ya existe un registro con esos datos' },
  '23503': { status: 400, message: 'Referencia a un registro inexistente' },
  '23514': { status: 400, message: 'Violación de regla de negocio' },
  '23502': { status: 400, message: 'Campo obligatorio no proporcionado' },
  'P0001': { status: 422, message: null }, // RAISE EXCEPTION personalizado - usar el mensaje
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Errores de PostgreSQL
  if (err.code && pgErrorMap[err.code]) {
    const mapped = pgErrorMap[err.code];
    return res.status(mapped.status).json({
      success: false,
      message: mapped.message || err.message,
      ...(process.env.NODE_ENV === 'development' && { detail: err.detail }),
    });
  }

  // Errores de validación de express-validator (lanzados manualmente)
  if (err.type === 'validation') {
    return res.status(400).json({ success: false, message: err.message, errors: err.errors });
  }

  // Errores de negocio esperados
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Error genérico
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
};

/**
 * Crea un error de negocio con código HTTP.
 */
const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };
