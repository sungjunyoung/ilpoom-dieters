import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "../api";
import type { WeightEntry } from "../../shared/types";

interface Props {
  weights: WeightEntry[];
  goalWeight: number | null;
  startWeight: number | null;
}

export default function WeightChart({ weights, goalWeight, startWeight }: Props) {
  if (weights.length === 0) {
    return <p className="muted">아직 기록이 없어요.</p>;
  }

  const data = weights.map((w) => ({ date: w.date, weight: w.weight }));
  const values = data.map((d) => d.weight);
  if (goalWeight != null) values.push(goalWeight);
  if (startWeight != null) values.push(startWeight);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e8eb" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: "#8b95a1" }}
            tickMargin={6}
            axisLine={{ stroke: "#e5e8eb" }}
            tickLine={false}
          />
          <YAxis
            domain={[min, max]}
            tick={{ fontSize: 11, fill: "#8b95a1" }}
            tickFormatter={(v: number) => `${v}`}
            width={46}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}kg`, "몸무게"]}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e8eb",
              fontSize: 13,
            }}
          />
          {goalWeight != null && (
            <ReferenceLine
              y={goalWeight}
              stroke="#02a26a"
              strokeDasharray="5 4"
              label={{
                value: `목표 ${goalWeight.toFixed(1)}`,
                position: "insideBottomRight",
                fontSize: 11,
                fill: "#02a26a",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#3182f6"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: "#3182f6", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
