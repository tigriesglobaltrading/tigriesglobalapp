import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";

type MetricCardProps = {
  icon?: LucideIcon;
  label: string;
  value: string;
  trend: string;
  tone?: "blue" | "cyan" | "green" | "amber" | "rose";
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "blue",
  trend,
}: MetricCardProps) {
  const isNegative = trend.trim().startsWith("-");

  return (
    <article className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-top">
        {Icon ? (
          <span className="metric-icon">
            <Icon aria-hidden="true" size={18} />
          </span>
        ) : null}
        <span>{label}</span>
        <Info aria-hidden="true" className="metric-info" size={15} />
      </div>
      <strong>{value}</strong>
      <small className={isNegative ? "trend-negative" : "trend-positive"}>
        {trend}
      </small>
    </article>
  );
}
