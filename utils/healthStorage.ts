import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthMetrics } from '@/types/health';

const HEALTH_METRICS_KEY = '@fitforge_health_metrics';

export async function saveHealthMetrics(date: string, metrics: HealthMetrics): Promise<void> {
  try {
    const existingData = await loadAllHealthMetrics();
    existingData[date] = metrics;
    await AsyncStorage.setItem(HEALTH_METRICS_KEY, JSON.stringify(existingData));
  } catch (error) {
    console.error('Error saving health metrics:', error);
    throw error;
  }
}

export async function loadAllHealthMetrics(): Promise<{ [date: string]: HealthMetrics }> {
  try {
    const data = await AsyncStorage.getItem(HEALTH_METRICS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading health metrics:', error);
    return {};
  }
}

export async function getHealthMetricsForDate(date: string): Promise<HealthMetrics | null> {
  try {
    const allMetrics = await loadAllHealthMetrics();
    return allMetrics[date] || null;
  } catch (error) {
    console.error('Error getting health metrics for date:', error);
    return null;
  }
}

export async function getHealthMetricsForDateRange(
  startDate: string,
  endDate: string
): Promise<HealthMetrics[]> {
  try {
    const allMetrics = await loadAllHealthMetrics();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const results: HealthMetrics[] = [];

    Object.entries(allMetrics).forEach(([date, metrics]) => {
      const metricDate = new Date(date);
      if (metricDate >= start && metricDate <= end) {
        results.push(metrics);
      }
    });

    // Sort by date
    results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return results;
  } catch (error) {
    console.error('Error getting health metrics for date range:', error);
    return [];
  }
}

export function shouldRecalculateMetrics(cachedMetrics: HealthMetrics | null): boolean {
  if (!cachedMetrics) return true;

  const lastCalculated = new Date(cachedMetrics.lastCalculated);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - lastCalculated.getTime()) / (1000 * 60 * 60 * 24));

  // Don't recalculate if data is from 2+ days ago
  return daysDiff < 2;
}
