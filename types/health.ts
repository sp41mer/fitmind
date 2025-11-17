export interface HealthMetrics {
  date: string; // ISO date string
  caloriesBurned: number;
  caloriesConsumed: number;
  sleepHours: number; // Total sleep in hours
  sleepPercentage: number; // % of target (8 hours)
  hrv: number; // Heart Rate Variability in ms
  restingHeartRate: number; // RHR in bpm
  stressScore: number; // 0-100 (lower is better)
  recoveryScore: number; // 0-100 (higher is better)
  exertionScore: number; // 0-10 based on workout intensity
  energyBalance: number; // caloriesConsumed - caloriesBurned (negative = deficit)
  lastCalculated: string; // ISO timestamp
}

export interface WeeklyAverages {
  avgSleepHours: number;
  avgCaloriesBurned: number;
  avgStress: number;
  avgRecovery: number;
}

export interface DailyHealthSummary {
  metrics: HealthMetrics;
  weeklyAverages: WeeklyAverages;
  last7DaysData: HealthMetrics[];
  workoutVolume?: number; // If there was a workout this day
}
