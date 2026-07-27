import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";
import { getUserRole, authFetch } from "../utils/session";
import "../styles/manageusers.css";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { config } = useConfig();
  const t = lang[config.language];
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await authFetch("/api/users");
      const json = await res.json();
      if (json.status === "ok") {
        setUsers(json.data);
      } else {
        setError(json.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await authFetch(`/api/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole })
      });
      const json = await res.json();
      if (json.status === "ok") {
        fetchUsers();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert("Failed to update role");
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(t.deleteConfirm || "Delete this item?")) return;
    
    try {
      const res = await authFetch(`/api/users/${userId}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.status === "ok") {
        fetchUsers();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  if (loading) return <div className="manage-users-loading">{t.loading}</div>;
  if (error) return <div className="manage-users-error">{error}</div>;

  return (
    <div className="manage-users-container">
      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>{t.role || "Role"}</th>
              <th>{t.registeredAt || "Registered"}</th>
              <th className="text-center">{t.actions || "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.user_id === currentUser.userId;
              return (
                <tr key={u.user_id} className={isSelf ? "row-self" : ""}>
                  <td>{u.user_id}</td>
                  <td className="font-medium">{u.username} {isSelf && "(You)"}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                      className={`role-select role-${u.role}`}
                    >
                      <option value="farmer">Farmer</option>
                      <option value="researcher">Researcher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="text-center">
                    <button
                      onClick={() => handleDelete(u.user_id)}
                      disabled={isSelf}
                      className="delete-btn"
                      title={t.delete || "Delete"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
