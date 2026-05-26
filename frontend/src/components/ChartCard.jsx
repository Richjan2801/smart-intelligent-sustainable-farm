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
  color = "#2563EB",
}) {
  const hasValidData = data && data.length > 0 && data.some((d) => d[dataKey] != null);

  if (!hasValidData) {
    return (
      <p className="chart-empty">
        No data available
      </p>
    );
  }

  return (
    <div className="chart-card">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <LineChart data={data}>

          <CartesianGrid
            strokeDasharray="3 3"
          />

          <XAxis dataKey="time" />

          <YAxis
            domain={[
              "dataMin - 2",
              "dataMax + 2",
            ]}
          />

          <Tooltip />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={false}
            activeDot={false}
          />

        </LineChart>

      </ResponsiveContainer>
    </div>
  );
}