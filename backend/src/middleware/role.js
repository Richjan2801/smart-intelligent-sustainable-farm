/**
 * RBAC Middleware — SISF
 * Dynamic permission-based access control (DB-backed, in-memory cached)
 */

import { hasPermission } from './permissionCache.js';

// ─────────────────────────────────────────────
// AUTHORIZATION MIDDLEWARE
// ─────────────────────────────────────────────

export function authorize(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    const role = req.user.role;

    if (!hasPermission(role, permission)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: insufficient permissions',
      });
    }

    next();
  };
}