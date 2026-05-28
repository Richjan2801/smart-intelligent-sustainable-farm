/**
 * Toggle — two-option button switcher used in Settings.
 * Previously a local function in Settings.jsx.
 */
export default function Toggle({ left, right, value, setValue }) {
  return (
    <div className="toggle-container">
      <button
        onClick={() => setValue(left)}
        className={`toggle-button ${value === left ? "active" : ""}`}
      >
        {left}
      </button>

      <button
        onClick={() => setValue(right)}
        className={`toggle-button ${value === right ? "active" : ""}`}
      >
        {right}
      </button>
    </div>
  );
}
