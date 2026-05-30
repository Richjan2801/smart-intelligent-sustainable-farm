/**
 * RangeFilter — time-range selector buttons used in Dashboard.
 */

export default function RangeFilter({
  range,
  onChange,
  options = [],
}) {
  return (
    <div className="range-filter-row">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`range-btn ${
            range === opt.value ? "range-btn-active" : ""
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}