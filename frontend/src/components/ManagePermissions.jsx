import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, Save, Info } from 'lucide-react';
import { lang } from '../utils/lang';
import { useConfig } from '../context/ConfigContext';
import { authFetch } from '../utils/session';
import { refreshRbacMapping } from '../utils/rbac';
import '../styles/managepermissions.css';

export default function ManagePermissions() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [matrix, setMatrix] = useState({}); // { role_id: Set(permission_name) }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  const [newRoleName, setNewRoleName] = useState('');
  const [newPermName, setNewPermName] = useState('');

  const { config } = useConfig();
  const t = lang[config.language];

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [rolesRes, permsRes, mappingRes] = await Promise.all([
        authFetch('/api/rbac/roles'),
        authFetch('/api/rbac/permissions'),
        authFetch('/api/rbac/role-permissions'),
      ]);

      const rolesJson = await rolesRes.json();
      const permsJson = await permsRes.json();
      const mappingJson = await mappingRes.json();

      if (rolesJson.status !== 'ok') throw new Error(rolesJson.message || 'Failed to load roles');
      if (permsJson.status !== 'ok') throw new Error(permsJson.message || 'Failed to load permissions');
      if (mappingJson.status !== 'ok') throw new Error(mappingJson.message || 'Failed to load mapping');

      setRoles(rolesJson.data);
      setPermissions(permsJson.data);

      const m = {};
      for (const role of rolesJson.data) {
        const permsForRole = mappingJson.data[role.name] || [];
        m[role.role_id] = new Set(permsForRole);
      }
      setMatrix(m);

      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const togglePermission = (roleId, permName) => {
    setMatrix(prev => {
      const next = { ...prev };
      const set = new Set(next[roleId] || []);
      if (set.has(permName)) {
        set.delete(permName);
      } else {
        set.add(permName);
      }
      next[roleId] = set;
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const role of roles) {
        const permsSet = matrix[role.role_id] || new Set();
        await authFetch(`/api/rbac/roles/${role.role_id}/permissions`, {
          method: 'PUT',
          body: JSON.stringify({ permissions: [...permsSet] }),
        });
      }

      // Refresh frontend RBAC mapping
      await refreshRbacMapping();
      setDirty(false);
      alert(t.permissionsSaved || 'Permissions saved successfully!');
    } catch (err) {
      alert(t.permissionsSaveError || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshCache = async () => {
    try {
      await authFetch('/api/admin/refresh-permissions', { method: 'POST' });
      await refreshRbacMapping();
      alert(t.cacheRefreshed || 'Permission cache refreshed!');
    } catch (err) {
      alert('Failed to refresh cache');
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const res = await authFetch('/api/rbac/roles', {
        method: 'POST',
        body: JSON.stringify({ name: newRoleName.trim() }),
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setNewRoleName('');
        await fetchAll();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Failed to add role');
    }
  };

  const handleAddPermission = async () => {
    if (!newPermName.trim()) return;
    try {
      const res = await authFetch('/api/rbac/permissions', {
        method: 'POST',
        body: JSON.stringify({ name: newPermName.trim() }),
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setNewPermName('');
        await fetchAll();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Failed to add permission');
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Delete role "${roleName}"? Users with this role will need to be reassigned.`)) return;
    try {
      const res = await authFetch(`/api/rbac/roles/${roleId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'ok') {
        await fetchAll();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Failed to delete role');
    }
  };

  const handleDeletePermission = async (permId, permName) => {
    if (!window.confirm(`Delete permission "${permName}"?`)) return;
    try {
      const res = await authFetch(`/api/rbac/permissions/${permId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'ok') {
        await fetchAll();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Failed to delete permission');
    }
  };

  if (loading) return <div className="manage-permissions-loading">{t.loading}</div>;
  if (error) return <div className="manage-permissions-error">{error}</div>;

  return (
    <div className="manage-permissions-container">
      {/* Toolbar */}
      <div className="permissions-toolbar">
        <div className="permissions-toolbar-left">
          {/* Add Role */}
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder={t.newRolePlaceholder || 'New role name...'}
            className="toolbar-input"
            onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
          />
          <button onClick={handleAddRole} className="toolbar-btn toolbar-btn-primary" disabled={!newRoleName.trim()}>
            <Plus size={14} /> {t.addRole || 'Add Role'}
          </button>

          {/* Add Permission */}
          <input
            type="text"
            value={newPermName}
            onChange={(e) => setNewPermName(e.target.value)}
            placeholder={t.newPermPlaceholder || 'New permission name...'}
            className="toolbar-input"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPermission()}
          />
          <button onClick={handleAddPermission} className="toolbar-btn toolbar-btn-primary" disabled={!newPermName.trim()}>
            <Plus size={14} /> {t.addPermission || 'Add Permission'}
          </button>
        </div>

        <div className="permissions-toolbar-left">
          <button onClick={handleRefreshCache} className="toolbar-btn">
            <RefreshCw size={14} /> {t.refreshCache || 'Refresh Cache'}
          </button>
          <button onClick={handleSave} className="toolbar-btn toolbar-btn-success" disabled={!dirty || saving}>
            <Save size={14} /> {saving ? (t.saving || 'Saving...') : (t.saveChanges || 'Save Changes')}
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="permissions-table-wrapper">
        <table className="permissions-table">
          <thead>
            <tr>
              <th>{t.permission || 'Permission'}</th>
              {roles.map(role => (
                <th key={role.role_id} className="role-header">
                  {role.name}
                  <button
                    onClick={() => handleDeleteRole(role.role_id, role.name)}
                    className="role-delete-btn"
                    title={`Delete role: ${role.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </th>
              ))}
              <th className="text-center">{t.actions || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map(perm => (
              <tr key={perm.permission_id}>
                <td>
                  <span className="perm-name">{perm.name}</span>
                </td>
                {roles.map(role => (
                  <td key={role.role_id} className="perm-checkbox-cell">
                    <input
                      type="checkbox"
                      className="perm-checkbox"
                      checked={matrix[role.role_id]?.has(perm.name) || false}
                      onChange={() => togglePermission(role.role_id, perm.name)}
                    />
                  </td>
                ))}
                <td className="text-center">
                  <button
                    onClick={() => handleDeletePermission(perm.permission_id, perm.name)}
                    className="perm-delete-btn"
                    title={`Delete: ${perm.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {permissions.length === 0 && (
              <tr>
                <td colSpan={roles.length + 2} className="text-center py-4 text-gray-500">
                  {t.noPermissions || 'No permissions defined'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info note */}
      <div className="refresh-note">
        <Info size={14} />
        {t.rbacNote || 'Changes are saved to the database. Click "Refresh Cache" to apply changes to the running server without restart.'}
      </div>
    </div>
  );
}
