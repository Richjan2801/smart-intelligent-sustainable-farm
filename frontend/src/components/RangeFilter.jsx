/**
 * RangeFilter — time-range selector buttons used in Dashboard.
 * Previously a local function in Dashboard.jsx.
 */

const RANGE_OPTIONS = [
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "1 Day" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

export default function RangeFilter({ range, onChange }) {
  return (
    <div className="range-filter-row">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`range-btn ${range === opt.value ? "range-btn-active" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
