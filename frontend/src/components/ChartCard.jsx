import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "../styles/chartcard.css";

export default function ChartCard({
  data,
  dataKey,
  color = "#64748b",
  dashed = false,
  getStatus,
  yDomain = ["dataMin - 2", "dataMax + 2"],
}) {
  const hasValidData =
    data &&
    data.length > 0 &&
    data.some((item) => item[dataKey] !== null && item[dataKey] !== undefined);

  if (!hasValidData) {
    return (
      <div className="chart-empty-wrapper">
        <p className="chart-empty">No data available</p>
      </div>
    );
  }

  const getDotColor = (payload) => {
    if (!payload || payload[dataKey] === null || payload[dataKey] === undefined) {
      return color;
    }

    if (!getStatus) {
      return color;
    }

    const status = getStatus(payload[dataKey]);
    return status?.color || color;
  };

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;

    if (cx === undefined || cy === undefined) {
      return null;
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill={getDotColor(payload)}
        stroke="white"
        strokeWidth={3}
      />
    );
  };

  const CustomActiveDot = (props) => {
    const { cx, cy, payload } = props;

    if (cx === undefined || cy === undefined) {
      return null;
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={9}
        fill={getDotColor(payload)}
        stroke="white"
        strokeWidth={3}
      />
    );
  };

  return (
    <div className="chart-card">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="time" />

          <YAxis domain={yDomain} />

          <Tooltip />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            strokeDasharray={dashed ? "8 6" : ""}
            connectNulls={false}
            dot={<CustomDot />}
            activeDot={<CustomActiveDot />}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}