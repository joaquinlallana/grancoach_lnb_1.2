const { validationResult } = require('express-validator');

/**
 * Middleware que evalúa el resultado de las validaciones de express-validator.
 * Si hay errores, responde 400 con el detalle. Si no, llama a next().
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = { validate };
