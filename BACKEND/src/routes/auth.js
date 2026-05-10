const { Router } = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

// POST /auth/register
router.post(
  '/register',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 100 }),
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('nombreEquipo').optional().trim().isLength({ max: 100 }),
  ],
  validate,
  AuthController.register.bind(AuthController)
);

// POST /auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
  ],
  validate,
  AuthController.login.bind(AuthController)
);

// GET /auth/profile
router.get('/profile', authenticate, AuthController.getProfile.bind(AuthController));

// PATCH /auth/profile
router.patch(
  '/profile',
  authenticate,
  [body('nombre').trim().notEmpty().isLength({ max: 100 })],
  validate,
  AuthController.updateProfile.bind(AuthController)
);

// POST /auth/change-password
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  validate,
  AuthController.changePassword.bind(AuthController)
);

module.exports = router;
