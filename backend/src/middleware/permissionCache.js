import { pool } from '../db.js';

let cache = {}; // { roleName: Set([permissionName, ...]) }

/**
 * Load all role-permission mappings from the database into memory.
 * Call once at startup, and again via the refresh endpoint.
 */
export async function loadPermissions() {
  const { rows } = await pool.query(`
    SELECT r.name AS role, p.name AS permission
    FROM role_permissions rp
    JOIN roles r ON r.role_id = rp.role_id
    JOIN permissions p ON p.permission_id = rp.permission_id
  `);

  const next = {};
  for (const row of rows) {
    if (!next[row.role]) next[row.role] = new Set();
    next[row.role].add(row.permission);
  }
  cache = next;

  const totalMappings = rows.length;
  const totalRoles = Object.keys(cache).length;
  console.log(`[RBAC] Loaded ${totalMappings} permission mappings for ${totalRoles} roles`);
}

/**
 * Check if a role has a specific permission.
 * @param {string} role - Role name (e.g. 'admin')
 * @param {string} permission - Permission name (e.g. 'manage_users')
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  return cache[role]?.has(permission) ?? false;
}
