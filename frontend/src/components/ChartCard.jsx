import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useConfig } from "../context/ConfigContext";
import { lang } from "../utils/lang";
import "../styles/chartcard.css";

export default function ChartCard({
  data,
  dataKey,
  color = "#64748b",
  dashed = false,
  yDomain = ["dataMin - 2", "dataMax + 2"],
  range = "1h",
  tooltipName = "Value",
  unit = "",
}) {
  
  const { config } = useConfig();

  const hasValidData =
    data &&
    data.length > 0 &&
    data.some(
      (item) =>
        item[dataKey] !== null &&
        item[dataKey] !== undefined
    );

  const t = lang[config.language];

  if (!hasValidData) {
    return (
      <div className="chart-empty-wrapper">
        <p className="chart-empty">
          {t.noData}
        </p>
      </div>
    );
  }

  const formatXAxisTick = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    if (range === "1h" || range === "1d") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const formatTooltipLabel = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatTooltipValue = (value) => {
    if (value === null || value === undefined) {
      return ["-", tooltipName];
    }

    const numericValue = Number(value);
    const displayValue = Number.isNaN(numericValue)
      ? value
      : numericValue.toFixed(1);

    return [`${displayValue}${unit}`, tooltipName];
  };

  return (
    <div className="chart-card">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={data}
          margin={{
            top: 16,
            right: 24,
            left: 8,
            bottom: 12,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="recordedAt"
            interval="preserveStartEnd"
            minTickGap={48}
            tickMargin={10}
            tickFormatter={formatXAxisTick}
          />

          <YAxis
            domain={yDomain}
            tickMargin={8}
            tickFormatter={(value) => Number(value).toFixed(1)}
          />

          <Tooltip
            labelFormatter={formatTooltipLabel}
            formatter={formatTooltipValue}
          />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            strokeDasharray={dashed ? "8 6" : ""}
            connectNulls={false}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}