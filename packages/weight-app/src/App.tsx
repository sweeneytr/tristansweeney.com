import "chartjs-adapter-date-fns";
import { Chart } from "react-chartjs-2";
import { addDays } from "date-fns";

import { useState } from "react";
import { Chart as ChartJS, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import "./index.css";

ChartJS.register(...registerables, annotationPlugin);

// Example timeseries-by-day dataset
const initialTimeseriesData = [
  { date: "2026-03-01", value: 225 },
  { date: "2026-03-02", value: 224.5 },
  { date: "2026-03-03", value: 224.2 },
  { date: "2026-03-04", value: 223.8 },
  { date: "2026-03-05", value: 223.6 },
  { date: "2026-03-06", value: 223.4 },
  { date: "2026-03-07", value: 223.2 },
];

export default function App() {
  // Helper to get all dates between two dates (inclusive)
  function getDateRange(start: Date, end: Date) {
    const result = [];
    let current = new Date(start);
    while (current <= end) {
      result.push(current.toISOString().slice(0, 10));
      current = addDays(current, 1);
    }
    return result;
  }

  function newWeightLoss(
    startDate: Date,
    start: number,
    target: number,
    weekRate: number,
  ) {
    const res = [];
    let now = startDate;
    let current = start;
    while (current > target) {
      current -= weekRate / 7;
      now = addDays(now, 1);
      res.push({ date: now, value: current });
    }
    return res;
  }

  // Local input state
  const [inputStartWeight, setInputStartWeight] = useState(225);
  const [inputGoalWeight, setInputGoalWeight] = useState(180);
  const [inputHeight, setInputHeight] = useState(70); // inches
  const [inputLossRate, setInputLossRate] = useState(1.5); // lbs per week

  // Chart state (only updates on button press)
  const [chartParams, setChartParams] = useState({
    startWeight: 225,
    goalWeight: 180,
    height: 70,
    lossRate: 1.5,
  });

  // Simulate timeseries data for demo (in real app, this would come from user input or API)
  const timeseriesData = initialTimeseriesData.map((d) => ({
    ...d,
    value: chartParams.startWeight - (225 - d.value),
  }));

  const weightLoss = newWeightLoss(
    new Date(timeseriesData[timeseriesData.length - 1].date),
    chartParams.startWeight,
    chartParams.goalWeight,
    chartParams.lossRate,
  );

  const chartData = {
    datasets: [
      {
        label: "Weight (lbs)",
        data: timeseriesData.map((d) => ({ x: d.date, y: d.value })),
        borderWidth: 2,
        fill: false,
        borderColor: "#3b82f6",
        pointBackgroundColor: "#3b82f6",
        tension: 0.2,
        pointRadius: 1,
        pointHoverRadius: 4,
      },
      {
        label: "Projection (lbs)",
        data: weightLoss.map((d) => ({
          x:
            d.date instanceof Date ? d.date.toISOString().slice(0, 10) : d.date,
          y: d.value,
        })),
        borderWidth: 2,
        fill: false,
        borderColor: "#000",
        pointBackgroundColor: "#000",
        pointRadius: 1,
        pointHoverRadius: 4,
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
      },
      title: {
        display: true,
        text: "Weight Timeseries by Day",
      },
      annotation: {
        annotations: {
          targetLine: {
            type: "line",
            yMin: 180,
            yMax: 180,
            borderColor: "red",
            borderWidth: 2,
            label: {
              content: "Target 180",
              enabled: true,
              position: "end",
            },
          },
        },
      },
    },
    scales: {
      x: {
        type: "timeseries",
        time: {
          unit: "week",
          tooltipFormat: "yyyy-MM-dd",
          displayFormats: {
            week: "MM-dd",
          },
        },
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: "Weight (kg)",
        },
      },
    },
  } as const;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <form
        className="flex flex-col gap-2 mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          setChartParams({
            startWeight: inputStartWeight,
            goalWeight: inputGoalWeight,
            height: inputHeight,
            lossRate: inputLossRate,
          });
        }}
      >
        <label>
          Start Weight (lbs):
          <input
            type="number"
            value={inputStartWeight}
            onChange={(e) => setInputStartWeight(Number(e.target.value))}
            className="border rounded p-1 ml-2 w-24"
          />
        </label>
        <label>
          Goal Weight (lbs):
          <input
            type="number"
            value={inputGoalWeight}
            onChange={(e) => setInputGoalWeight(Number(e.target.value))}
            className="border rounded p-1 ml-2 w-24"
          />
        </label>
        <label>
          Height (in):
          <input
            type="number"
            value={inputHeight}
            onChange={(e) => setInputHeight(Number(e.target.value))}
            className="border rounded p-1 ml-2 w-24"
          />
        </label>
        <label>
          Loss Rate (lbs/week):
          <input
            type="number"
            value={inputLossRate}
            onChange={(e) => setInputLossRate(Number(e.target.value))}
            className="border rounded p-1 ml-2 w-24"
          />
        </label>
        <button
          type="submit"
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Update Graph
        </button>
      </form>
      <Chart type="line" data={chartData} options={chartOptions} />
    </div>
  );
}
