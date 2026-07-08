/**
 * RBAC Middleware — SISF
 *
 * Combines the permission map and the Express authorization middleware
 * in a single file. Add/edit permissions here as the system evolves.
 */

// ─────────────────────────────────────────────
// PERMISSION MAP
// ─────────────────────────────────────────────

/** Valid roles in the system. */
export const ROLES = /** @type {const} */ (['farmer', 'researcher', 'admin']);

/**
 * Maps each permission to the roles that hold it.
 * @type {Record<string, ReadonlyArray<string>>}
 */
export const PERMISSIONS = {
  // Universally available to all authenticated roles
  view_dashboard:     ['farmer', 'researcher', 'admin'],
  view_device_status: ['farmer', 'researcher', 'admin'],
  trigger_pump:       ['farmer', 'researcher', 'admin'],

  // Researcher + Admin
  export_data:        ['researcher', 'admin'],
  view_raw_logs:      ['researcher', 'admin'],

  // Admin only
  manage_devices:     ['admin'],
  manage_users:       ['admin'],
  edit_config:        ['admin'],
};


// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

/**
 * Permission-based authorization middleware.
 *
 * Must be used AFTER the `auth` middleware (which attaches req.user).
 *
 * @param {string} permission - A key from the PERMISSIONS map above
 */
export function authorize(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    const allowedRoles = PERMISSIONS[permission];

    if (!allowedRoles) {
      // Unknown permission — fail closed
      return res.status(403).json({
        status: 'error',
        message: `Unknown permission: ${permission}`,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: insufficient permissions',
      });
    }

    next();
  };
}