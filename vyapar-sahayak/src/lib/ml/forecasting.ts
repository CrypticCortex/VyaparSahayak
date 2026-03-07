// src/lib/ml/forecasting.ts

import * as ss from "simple-statistics";

export interface ForecastPoint {
  week: number;
  actual?: number;
  forecast: number;
  trend: number;
}

export function exponentialSmoothing(
  data: number[],
  alpha: number = 0.3
): number[] {
  if (data.length === 0) return [];
  const smoothed = [data[0]];
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

export function computeRollingVelocity(
  weeklySales: number[],
  windowSize: number = 4
): Array<{ velocity: number; trend: number }> {
  if (weeklySales.length < windowSize) return [];

  return weeklySales.slice(windowSize - 1).map((_, i) => {
    const window = weeklySales.slice(i, i + windowSize);
    const velocity = ss.mean(window);
    const points: [number, number][] = window.map((v, x) => [x, v]);
    const regression = ss.linearRegression(points);
    return { velocity, trend: regression.m };
  });
}

export function forecastDemand(
  weeklySales: number[],
  weeksAhead: number = 4
): ForecastPoint[] {
  if (weeklySales.length < 4) {
    return Array.from({ length: weeksAhead }, (_, i) => ({
      week: weeklySales.length + i,
      forecast: weeklySales.length > 0 ? ss.mean(weeklySales) : 0,
      trend: 0,
    }));
  }

  const smoothed = exponentialSmoothing(weeklySales, 0.3);
  const lastSmoothed = smoothed[smoothed.length - 1];

  const recentWeeks = Math.min(8, weeklySales.length);
  const recent = weeklySales.slice(-recentWeeks);
  const points: [number, number][] = recent.map((v, x) => [x, v]);
  const regression = ss.linearRegression(points);
  const trendPerWeek = regression.m;

  const forecasts: ForecastPoint[] = [];
  for (let i = 0; i < weeksAhead; i++) {
    forecasts.push({
      week: weeklySales.length + i,
      forecast: Math.max(0, Math.round(lastSmoothed + trendPerWeek * (i + 1))),
      trend: trendPerWeek,
    });
  }

  return forecasts;
}
