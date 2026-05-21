const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');
const EmailService = require('./EmailService');
const { createError } = require('../middleware/errorHandler');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

class AuthService {
  async register({ nombre, email, password, nombreEquipo }) {
    // Verificar que el email no esté en uso
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw createError(409, 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const teamName = nombreEquipo || `Equipo de ${nombre}`;

    const { user, team } = await UserRepository.createWithFantasyTeam({
      nombre,
      email,
      passwordHash,
      nombreEquipo: teamName,
    });

    // Send welcome email (fire and forget)
    EmailService.sendWelcome(user, team.nombre).catch(console.error);

    const token = this._generateToken(user.id, user.es_admin || false);

    return {
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        es_admin: user.es_admin || false
      },
      equipo: { id: team.id, nombre: team.nombre, presupuesto: team.presupuesto_restante },
    };
  }

  async login({ email, password }) {
    const user = await UserRepository.findByEmail(email);

    if (!user || !user.activo) {
      throw createError(401, 'Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw createError(401, 'Credenciales inválidas');
    }

    await UserRepository.updateLastLogin(user.id);

    const token = this._generateToken(user.id, user.es_admin || false);

    return {
      token,
      user: { 
        id: user.id, 
        nombre: user.nombre, 
        email: user.email,
        es_admin: user.es_admin || false 
      },
    };
  }

  async getProfile(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) throw createError(404, 'Usuario no encontrado');
    return user;
  }

  async updateProfile(userId, data) {
    const updated = await UserRepository.updateProfile(userId, data);
    if (!updated) throw createError(404, 'Usuario no encontrado');
    return updated;
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const { query } = require('../config/database');

    const result = await query(
      'SELECT id, email, password_hash FROM usuarios WHERE id = $1 AND activo = true',
      [userId]
    );
    const user = result.rows[0];
    if (!user) throw createError(404, 'Usuario no encontrado');

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) throw createError(401, 'Contraseña actual incorrecta');

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await query(
      'UPDATE usuarios SET password_hash = $1, actualizado_en = NOW() WHERE id = $2',
      [newHash, userId]
    );

    return { message: 'Contraseña actualizada correctamente' };
  }

  _generateToken(userId, esAdmin = false) {
    return jwt.sign(
      { 
        userId, 
        es_admin: esAdmin 
      }, 
      process.env.JWT_SECRET, 
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );
  }
}

module.exports = new AuthService();
