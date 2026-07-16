"use client";
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import type { Metrics } from "@/lib/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SlaChartProps {
  metrics: Metrics;
}

export default function SlaChart({ metrics }: SlaChartProps) {
  const data = {
    labels: [
      "FRT (segundos)",
      "FCR (%)",
      "Autoatendimento (%)",
      "CSAT (%)",
    ],
    datasets: [
      {
        type: "bar" as const,
        label: "Status Atual",
        data: [
          metrics.first_response_time,
          metrics.first_call_resolution,
          metrics.self_service_adoption,
          metrics.customer_satisfaction,
        ],
        backgroundColor: [
          "rgba(49, 130, 206, 0.75)", // Blue
          "rgba(0, 168, 104, 0.75)",  // Green
          "rgba(128, 90, 213, 0.75)", // Purple
          "rgba(0, 168, 104, 0.9)",   // Dark Green
        ],
        borderRadius: 6,
        borderWidth: 0,
      },
      {
        type: "line" as const,
        label: "Linha Limite do SLA",
        data: [20.0, 75.0, 50.0, 95.0],
        borderColor: "rgba(229, 62, 98, 0.8)",
        borderWidth: 2,
        borderDash: [4, 4],
        fill: false,
        pointStyle: "circle",
        pointRadius: 4,
        pointBackgroundColor: "rgba(229, 62, 98, 1)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#9ca3af",
          font: {
            size: 9,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#9ca3af",
          font: {
            size: 10,
          },
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "#f3f4f6",
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
      <Chart type="bar" data={data} options={options} />
    </div>
  );
}
