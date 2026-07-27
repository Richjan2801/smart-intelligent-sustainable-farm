import { useState, useEffect } from "react";
import { Trash2, Edit2, Check, X } from "lucide-react";
import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";
import { authFetch } from "../utils/session";
import "../styles/managedevices.css";

export default function ManageDevices() {
  const [devices, setDevices] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const { config } = useConfig();
  const t = lang[config.language];

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await authFetch("/api/devices");
      const json = await res.json();
      if (json.status === "ok") {
        setDevices(json.data);
        
        // Fetch status for the first device (or all, but currently API returns based on DEVICE_ID env)
        // For a real multi-device setup, the status API should accept an ID. 
        // We'll just fetch the general status API for now to demonstrate.
        fetchStatus();
      } else {
        setError(json.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await authFetch("/api/device/status");
      const json = await res.json();
      if (json.status === "ok" && json.data) {
        setDeviceStatus(prev => ({
          ...prev,
          [json.data.dev_id]: json.data.dev_status
        }));
      }
    } catch (e) {
      // Ignore status errors
    }
  };

  const handleEditClick = (device) => {
    setEditingId(device.dev_id);
    setEditName(device.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      const res = await authFetch(`/api/devices/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName })
      });
      const json = await res.json();
      if (json.status === "ok") {
        setEditingId(null);
        fetchDevices();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert("Failed to update device");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("WARNING: Deleting this device will also delete all of its sensor data permanently. Are you sure?")) return;
    
    try {
      const res = await authFetch(`/api/devices/${id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.status === "ok") {
        fetchDevices();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert("Failed to delete device");
    }
  };

  if (loading) return <div className="manage-devices-loading">{t.loading}</div>;
  if (error) return <div className="manage-devices-error">{error}</div>;

  return (
    <div className="manage-devices-container">
      <div className="table-wrapper">
        <table className="devices-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t.deviceName || "Device Name"}</th>
              <th>{t.status || "Status"}</th>
              <th className="text-center">{t.actions || "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.dev_id}>
                <td>{d.dev_id}</td>
                <td>
                  {editingId === d.dev_id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="edit-device-input"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium">{d.name}</span>
                  )}
                </td>
                <td>
                  <span className={`device-status-badge status-${deviceStatus[d.dev_id] || 'offline'}`}>
                    {deviceStatus[d.dev_id] === 'online' ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className="text-center">
                  {editingId === d.dev_id ? (
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleSaveEdit(d.dev_id)} className="save-btn" title={t.save || "Save"}>
                        <Check size={16} />
                      </button>
                      <button onClick={handleCancelEdit} className="cancel-btn" title="Cancel">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEditClick(d)} className="edit-btn" title={t.edit || "Edit"}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(d.dev_id)} className="delete-btn" title={t.delete || "Delete"}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  No devices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
