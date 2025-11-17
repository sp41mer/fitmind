import { HealthMetrics, DailyHealthSummary } from '@/types/health';
import {
  saveHealthMetrics,
  getHealthMetricsForDate,
  getHealthMetricsForDateRange,
  shouldRecalculateMetrics,
} from '@/utils/healthStorage';
import { loadWorkoutSessions } from '@/utils/workoutStorage';
import { Platform, NativeModules } from 'react-native';

// Import react-native-health through NativeModules for Expo
let AppleHealthKit: any = null;
let HealthKitAvailable = false;

try {
  // Try to get the native module directly
  AppleHealthKit = NativeModules.RNAppleHealthKit;

  console.log('[HealthKit] NativeModules.RNAppleHealthKit:', AppleHealthKit ? 'exists' : 'null');
  if (AppleHealthKit) {
    console.log('[HealthKit] Available methods:', Object.keys(AppleHealthKit).slice(0, 20));
  }

  HealthKitAvailable = Platform.OS === 'ios' && AppleHealthKit && typeof AppleHealthKit.initHealthKit === 'function';
  console.log('[HealthKit] Module loaded successfully, available:', HealthKitAvailable);
} catch (error) {
  console.log('[HealthKit] Library not available - error:', error);
}

export type HealthValue = any;
export type HealthKitPermissions = any;

/**
 * Request Apple Health permissions
 * Returns true if permissions were granted or already exist
 */
export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.log('[HealthKit] Health tracking is only available on iOS');
    return false;
  }

  if (!HealthKitAvailable) {
    console.warn('[HealthKit] NOT AVAILABLE - You are running in Expo Go. Build the app natively to use HealthKit.');
    console.warn('[HealthKit] See HEALTHKIT_SETUP.md for instructions on building natively.');
    return false;
  }

  try {
    const permissions: HealthKitPermissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.HeartRateVariability,
          AppleHealthKit.Constants.Permissions.RestingHeartRate,
          AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
        ],
        write: [
          AppleHealthKit.Constants.Permissions.Workout,
        ],
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error('[HealthKit] Initialization failed:', error);
          // Note: On iOS, HealthKit errors are common if:
          // 1. Running in Expo Go (not supported)
          // 2. Running in simulator without Health app
          // 3. User denied permissions
          resolve(false);
        } else {
          console.log('[HealthKit] Successfully initialized and permissions granted');
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('[HealthKit] Unexpected error requesting permissions:', error);
    return false;
  }
}

/**
 * Calculate stress score based on HRV and Resting Heart Rate
 *
 * Research-based formula:
 * - HRV (Heart Rate Variability): Higher values indicate better recovery/lower stress
 *   Typical range: 20-200ms, optimal > 60ms
 * - RHR (Resting Heart Rate): Lower values indicate better fitness/less stress
 *   Typical range: 40-100 bpm, optimal < 60 bpm
 *
 * Stress Score (0-100, lower is better):
 * - Uses normalized values from personal baselines
 * - Combines HRV and RHR with weighted average
 * - Accounts for individual variability
 */
export function calculateStressScore(hrv: number, rhr: number): number {
  // Normalize HRV (inverse - higher HRV = lower stress)
  // Typical HRV ranges: 20-200ms
  // Optimal: > 60ms
  const hrvNormalized = Math.max(0, Math.min(100, 100 - ((hrv - 20) / 180) * 100));

  // Normalize RHR (higher RHR = higher stress)
  // Typical RHR ranges: 40-100 bpm
  // Optimal: < 60 bpm
  const rhrNormalized = Math.max(0, Math.min(100, ((rhr - 40) / 60) * 100));

  // Weighted average (HRV is more important for stress)
  const stressScore = (hrvNormalized * 0.7 + rhrNormalized * 0.3);

  return Math.round(stressScore);
}

/**
 * Calculate recovery score based on sleep, HRV, and RHR
 */
export function calculateRecoveryScore(
  sleepHours: number,
  hrv: number,
  rhr: number
): number {
  // Sleep component (0-33 points)
  const targetSleep = 8;
  const sleepScore = Math.min(33, (sleepHours / targetSleep) * 33);

  // HRV component (0-44 points, weighted heavily)
  const hrvScore = Math.min(44, ((hrv - 20) / 180) * 44);

  // RHR component (0-23 points, inverse)
  const rhrScore = Math.min(23, (1 - (rhr - 40) / 60) * 23);

  const recoveryScore = sleepScore + hrvScore + rhrScore;

  return Math.round(Math.max(0, Math.min(100, recoveryScore)));
}

/**
 * Calculate exertion score based on workout volume and duration
 */
export function calculateExertionScore(
  workoutVolume: number,
  workoutDuration: number
): number {
  // Volume-based component (0-7 points)
  // Normalize based on typical volumes (0-10000 kg)
  const volumeScore = Math.min(7, (workoutVolume / 10000) * 7);

  // Duration-based component (0-3 points)
  // Normalize based on typical duration (0-120 minutes)
  const durationScore = Math.min(3, (workoutDuration / 120) * 3);

  const exertionScore = volumeScore + durationScore;

  return Math.round(exertionScore * 10) / 10; // Round to 1 decimal
}

/**
 * Fetch health data from Apple Health (iOS)
 * Note: This requires a native build (not Expo Go) and user permissions
 */
async function fetchHealthDataFromNative(date: Date): Promise<Partial<HealthMetrics>> {
  if (Platform.OS !== 'ios') {
    console.log('[HealthKit] Health data only available on iOS');
    return {};
  }

  if (!HealthKitAvailable) {
    console.log('[HealthKit] Cannot fetch data - HealthKit not available (running in Expo Go)');
    return {};
  }

  try {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    console.log('[HealthKit] Fetching data for date:', date.toISOString().split('T')[0]);

    // Fetch all health data in parallel
    const results = await Promise.all([
      // Active Energy Burned
      new Promise<number>((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(options, (err: Object, results: HealthValue[]) => {
          if (err) {
            console.log('Error fetching calories:', err);
            resolve(0);
            return;
          }
          const total = results.reduce((sum, item) => sum + (item.value || 0), 0);
          resolve(total);
        });
      }),

      // Sleep Analysis
      new Promise<number>((resolve) => {
        AppleHealthKit.getSleepSamples(options, (err: Object, results: any[]) => {
          if (err) {
            console.log('Error fetching sleep:', err);
            resolve(0);
            return;
          }
          // Calculate total sleep in hours
          const totalMinutes = results.reduce((sum, item) => {
            if (item.value === 'INBED' || item.value === 'ASLEEP') {
              const start = new Date(item.startDate).getTime();
              const end = new Date(item.endDate).getTime();
              return sum + (end - start) / (1000 * 60);
            }
            return sum;
          }, 0);
          resolve(totalMinutes / 60);
        });
      }),

      // Heart Rate Variability
      new Promise<number>((resolve) => {
        AppleHealthKit.getHeartRateVariabilitySamples(options, (err: Object, results: HealthValue[]) => {
          if (err) {
            console.log('Error fetching HRV:', err);
            resolve(50); // Default value
            return;
          }
          if (results.length === 0) {
            resolve(50);
            return;
          }
          // Get average HRV for the day
          const avg = results.reduce((sum, item) => sum + (item.value || 0), 0) / results.length;
          resolve(avg);
        });
      }),

      // Resting Heart Rate
      new Promise<number>((resolve) => {
        AppleHealthKit.getRestingHeartRate(options, (err: Object, results: HealthValue[]) => {
          if (err) {
            console.log('Error fetching resting heart rate:', err);
            resolve(65); // Default value
            return;
          }
          if (results.length === 0) {
            resolve(65);
            return;
          }
          // Get average RHR for the day
          const avg = results.reduce((sum, item) => sum + (item.value || 0), 0) / results.length;
          resolve(avg);
        });
      }),

      // Dietary Energy Consumed
      new Promise<number>((resolve) => {
        AppleHealthKit.getDietaryEnergy(options, (err: Object, results: HealthValue[]) => {
          if (err) {
            console.log('Error fetching dietary energy:', err);
            resolve(0);
            return;
          }
          const total = results.reduce((sum, item) => sum + (item.value || 0), 0);
          resolve(total);
        });
      }),
    ]);

    const [caloriesBurned, sleepHours, hrv, restingHeartRate, caloriesConsumed] = results;

    console.log('[HealthKit] Successfully fetched health data:', {
      caloriesBurned: Math.round(caloriesBurned),
      sleepHours: sleepHours.toFixed(1),
      hrv: Math.round(hrv),
      restingHeartRate: Math.round(restingHeartRate),
      caloriesConsumed: Math.round(caloriesConsumed),
    });

    return {
      caloriesBurned,
      caloriesConsumed,
      sleepHours,
      hrv,
      restingHeartRate,
    };
  } catch (error) {
    console.error('[HealthKit] Error fetching health data:', error);
    console.log('[HealthKit] Make sure you are running on a real device with a native build (not Expo Go)');
    return {};
  }
}

/**
 * Get or calculate health metrics for a specific date
 */
export async function getHealthMetricsForDay(
  date: Date,
  forceRecalculate: boolean = false
): Promise<HealthMetrics> {
  const dateStr = date.toISOString().split('T')[0];

  // Check if we have cached data
  const cached = await getHealthMetricsForDate(dateStr);

  // Determine if we should use cached data
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  const isOldData = daysDiff >= 2;

  if (cached && !forceRecalculate && (isOldData || !shouldRecalculateMetrics(cached))) {
    return cached;
  }

  // Fetch fresh data from health sources
  const healthData = await fetchHealthDataFromNative(date);

  // Get workout data for this day
  const workouts = await loadWorkoutSessions();
  const dayWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.startTime);
    return workoutDate.toISOString().split('T')[0] === dateStr;
  });

  const totalVolume = dayWorkouts.reduce((sum, w) => sum + w.totalVolume, 0);
  const totalDuration = dayWorkouts.reduce((sum, w) => sum + w.duration, 0);

  // Calculate metrics
  const sleepHours = healthData.sleepHours || 0;
  const hrv = healthData.hrv || 50;
  const rhr = healthData.restingHeartRate || 65;
  const caloriesBurned = healthData.caloriesBurned || 0;
  const caloriesConsumed = healthData.caloriesConsumed || 0;

  const metrics: HealthMetrics = {
    date: dateStr,
    caloriesBurned,
    caloriesConsumed,
    sleepHours,
    sleepPercentage: Math.round((sleepHours / 8) * 100),
    hrv,
    restingHeartRate: rhr,
    stressScore: calculateStressScore(hrv, rhr),
    recoveryScore: calculateRecoveryScore(sleepHours, hrv, rhr),
    exertionScore: totalVolume > 0 ? calculateExertionScore(totalVolume, totalDuration / 60) : 0,
    energyBalance: caloriesConsumed - caloriesBurned,
    lastCalculated: new Date().toISOString(),
  };

  // Save to cache
  await saveHealthMetrics(dateStr, metrics);

  return metrics;
}

/**
 * Get daily health summary including weekly averages
 */
export async function getDailyHealthSummary(date: Date): Promise<DailyHealthSummary> {
  // Get metrics for the selected date
  const metrics = await getHealthMetricsForDay(date);

  // Get last 7 days of data for averages and charts
  const endDate = date;
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 6); // 7 days including today

  const last7DaysData: HealthMetrics[] = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dayMetrics = await getHealthMetricsForDay(currentDate);
    last7DaysData.push(dayMetrics);
  }

  // Calculate weekly averages
  const weeklyAverages = {
    avgSleepHours: last7DaysData.reduce((sum, m) => sum + m.sleepHours, 0) / 7,
    avgCaloriesBurned: last7DaysData.reduce((sum, m) => sum + m.caloriesBurned, 0) / 7,
    avgStress: last7DaysData.reduce((sum, m) => sum + m.stressScore, 0) / 7,
    avgRecovery: last7DaysData.reduce((sum, m) => sum + m.recoveryScore, 0) / 7,
  };

  // Get workout volume if there was a workout on this date
  const workouts = await loadWorkoutSessions();
  const dateStr = date.toISOString().split('T')[0];
  const dayWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.startTime);
    return workoutDate.toISOString().split('T')[0] === dateStr;
  });
  const workoutVolume = dayWorkouts.reduce((sum, w) => sum + w.totalVolume, 0);

  return {
    metrics,
    weeklyAverages,
    last7DaysData,
    workoutVolume: workoutVolume > 0 ? workoutVolume : undefined,
  };
}
