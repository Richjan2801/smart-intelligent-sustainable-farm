/**
 * IndicatorLegend — colour-coded legend for the status indicators.
 * Previously a local function in Dashboard.jsx.
 */
export default function IndicatorLegend({ statusText }) {
  return (
    <div className="indicator-info">
      <span className="indicator-dot status-low-bg"></span>
      <span>{statusText.low}</span>

      <span className="indicator-dot status-normal-bg"></span>
      <span>{statusText.normal}</span>

      <span className="indicator-dot status-warning-bg"></span>
      <span>{statusText.warning}</span>

      <span className="indicator-dot status-danger-bg"></span>
      <span>{statusText.danger}</span>
    </div>
  );
}
