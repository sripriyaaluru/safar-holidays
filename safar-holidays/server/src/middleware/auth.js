// JWT authentication middleware.
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { config } from '../config.js';
import { HttpError } from '../utils/http.js';

const findUser = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?');

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/** Reads "Authorization: Bearer <token>" and returns the matching user, or null. */
function userFromRequest(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return findUser.get(Number(payload.sub)) || null;
  } catch {
    return null;
  }
}

/** Attaches req.user when a valid token is sent, but never blocks the request. */
export function optionalAuth(req, _res, next) {
  req.user = userFromRequest(req);
  next();
}

/** Blocks the request unless the user is logged in. */
export function requireAuth(req, _res, next) {
  req.user = userFromRequest(req);
  if (!req.user) throw new HttpError(401, 'Please log in to continue.');
  next();
}

/** Blocks the request unless the user is an admin. */
export function requireAdmin(req, _res, next) {
  req.user = userFromRequest(req);
  if (!req.user) throw new HttpError(401, 'Please log in to continue.');
  if (req.user.role !== 'admin') throw new HttpError(403, 'Only admins can do this.');
  next();
}
