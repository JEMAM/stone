"use client";
import React from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { useState, useEffect } from "react";
import { Radar } from "react-chartjs-2";
import type { Metrics } from "@/lib/types";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface DoraChartProps {
  metrics: Metrics;
}

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setTheme(isLight ? "light" : "dark");

    const observer = new MutationObserver(() => {
      const isLightNow = document.documentElement.classList.contains("light");
      setTheme(isLightNow ? "light" : "dark");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

export default function DoraChart({ metrics }: DoraChartProps) {
  const theme = useTheme();
  const isLight = theme === "light";

  const textColor = isLight ? "#1E2329" : "#f3f4f6";
  const labelColor = isLight ? "#374151" : "#9ca3af";
  const gridColor = isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.08)";
  const angleColor = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.05)";
  
  const metaBg = isLight ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.05)";
  const metaBorder = isLight ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.2)";
  const metaPoint = isLight ? "rgba(0, 0, 0, 0.35)" : "rgba(255, 255, 255, 0.4)";

  // Map actual metrics to DORA scoring
  const dfScore = Math.min((metrics.deployment_frequency / 12) * 100, 100);
  const ltScore = Math.max(10, 100 - metrics.lead_time_for_changes / 1.5);
  const cfrScore = Math.max(0, 100 - metrics.change_failure_rate * 10);
  const mttrScore = Math.max(0, 100 - metrics.mean_time_to_restore / 0.6); // adjusted scale

  const data = {
    labels: [
      "Frequência de Deploy",
      "Lead Time de Mudanças",
      "Taxa de Falha de Mudanças",
      "MTTR / Restauração",
    ],
    datasets: [
      {
        label: "Métricas Atuais",
        data: [dfScore, ltScore, cfrScore, mttrScore],
        backgroundColor: "rgba(0, 168, 104, 0.2)",
        borderColor: "#00A868",
        borderWidth: 2,
        pointBackgroundColor: "#00A868",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#00A868",
      },
      {
        label: "Metas Limites do SLA",
        data: [60, 50, 80, 70],
        backgroundColor: metaBg,
        borderColor: metaBorder,
        borderWidth: 1,
        borderDash: [5, 5],
        pointBackgroundColor: metaPoint,
        pointBorderColor: "transparent",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          color: angleColor,
        },
        grid: {
          color: gridColor,
        },
        pointLabels: {
          color: labelColor,
          font: {
            size: 10.5,
            family: "Inter, sans-serif",
            weight: "bold" as const,
          },
        },
        ticks: {
          display: false,
        },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
    plugins: {
      legend: {
        labels: {
          color: textColor,
          font: {
            family: "Inter, sans-serif",
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Radar data={data} options={options} />
    </div>
  );
}
