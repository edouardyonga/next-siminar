'use client';

import { useMemo } from "react";
import { useDashboard } from "./dashboard-provider";
import { formatMoney } from "@/lib/format";

type Stat = { label: string; value: string; sub?: string };

export function StatsBar() {
  const { courses, trainers } = useDashboard();

  const stats: Stat[] = useMemo(() => {
    const now = new Date();
    const upcoming = courses.filter((c) => new Date(c.startDate) >= now);
    const revenue = courses.reduce((sum, c) => sum + Number(c.price ?? 0), 0);
    const trainerCost = courses.reduce((sum, c) => sum + Number(c.trainerPrice ?? 0), 0);
    const margin = revenue - trainerCost;

    return [
      { label: "Total courses", value: String(courses.length) },
      { label: "Upcoming", value: String(upcoming.length), sub: "start date in the future" },
      { label: "Trainers", value: String(trainers.length) },
      {
        label: "Revenue",
        value: formatMoney(revenue),
        sub: `Margin ${formatMoney(margin)}`,
      },
    ];
  }, [courses, trainers]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">{stat.label}</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{stat.value}</p>
          {stat.sub ? <p className="text-xs text-zinc-500">{stat.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}


