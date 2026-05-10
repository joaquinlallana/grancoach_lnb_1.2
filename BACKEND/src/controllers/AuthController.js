const AuthService = require('../services/AuthService');

class AuthController {
  async register(req, res, next) {
    try {
      const { nombre, email, password, nombreEquipo } = req.body;
      const result = await AuthService.register({ nombre, email, password, nombreEquipo });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req, res, next) {
    try {
      const profile = await AuthService.getProfile(req.user.id);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { nombre } = req.body;
      const updated = await AuthService.updateProfile(req.user.id, { nombre });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user.id, { currentPassword, newPassword });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
