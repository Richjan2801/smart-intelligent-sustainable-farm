/**
 * StatusBadge — coloured pill that displays a status label.
 * Previously a local function in Dashboard.jsx.
 */
export default function StatusBadge({ status }) {
  return (
    <div className={`status-badge ${status.className}`}>
      {status.label}
    </div>
  );
}
