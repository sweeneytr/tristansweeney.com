import "chart.js/auto";
import "chartjs-adapter-date-fns";
import { Chart } from "react-chartjs-2";
import { addDays } from "date-fns";
import "./index.css";

// Example timeseries-by-day dataset
const timeseriesData = [
  { date: "2026-03-01", value: 72 },
  { date: "2026-03-02", value: 71.5 },
  { date: "2026-03-03", value: 71.2 },
  { date: "2026-03-04", value: 70.8 },
  { date: "2026-03-05", value: 70.6 },
  { date: "2026-03-06", value: 70.4 },
  { date: "2026-03-07", value: 70.2 },
];

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

const targetWeight = 50;
const newWeightLoss = (
  startDate: Date,
  start: number,
  target: number,
  weekRate: number,
) => {
  const res = [];
  let now = startDate;
  while (start > target) {
    start -= weekRate / 7;
    now = addDays(now, 1);
    res.push({ date: now, value: start });
  }
  return res;
};

const weightLoss = newWeightLoss(new Date(), 225, 180, 1.5);

// Find min and max date from both datasets
const allDates = [
  ...timeseriesData.map((d) => d.date),
  ...weightLoss.map((d) =>
    d.date instanceof Date ? d.date.toISOString().slice(0, 10) : d.date,
  ),
];
const minDate = allDates.reduce((min, d) => (d < min ? d : min), allDates[0]);
const maxDate = allDates.reduce((max, d) => (d > max ? d : max), allDates[0]);
const fullLabels = getDateRange(new Date(minDate), new Date(maxDate));

const chartData = {
  labels: fullLabels,
  datasets: [
    {
      label: "Weight (kg)",
      data: fullLabels.map((date) => {
        const found = timeseriesData.find((d) => d.date === date);
        return found ? found.value : null;
      }),
      borderWidth: 2,
      fill: false,
      borderColor: "#3b82f6",
      pointBackgroundColor: "#3b82f6",
      tension: 0.2,
      pointRadius: 1,
      pointHoverRadius: 4,
    },
    {
      label: "Projection (kg)",
      data: fullLabels.map((date) => {
        const found = weightLoss.find((d) => {
          const dDate =
            d.date instanceof Date ? d.date.toISOString().slice(0, 10) : d.date;
          return dDate === date;
        });
        return found ? found.value : null;
      }),
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
  },
  scales: {
    x: {
      type: "timeseries",
      time: {
        unit: "day",
        tooltipFormat: "yyyy-MM-dd",
        displayFormats: {
          day: "yyyy-MM-dd",
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
};

export default function App() {
  return (
    <div>
      <Chart type="line" data={chartData} options={chartOptions} />
    </div>
  );
}
