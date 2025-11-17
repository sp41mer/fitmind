import { WorkoutSession, WorkoutSet } from '@/types/workout';

export type PRType = 'max_weight' | 'max_reps' | 'max_volume';

export interface PersonalRecord {
  isPR: boolean;
  types: PRType[]; // can be multiple types simultaneously
}

/**
 * Check if a given set is a personal record for the exercise
 * Compares against all historical workouts for that exercise
 */
export function checkPersonalRecord(
  exerciseName: string,
  currentSet: { weight: number; reps: number },
  allWorkouts: WorkoutSession[]
): PersonalRecord {
  const prTypes: PRType[] = [];

  // Find all historical sets for this exercise across all workouts
  const historicalSets: Array<{ weight: number; reps: number }> = [];

  allWorkouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      if (exercise.name.toLowerCase() === exerciseName.toLowerCase()) {
        exercise.sets.forEach((set) => {
          if (set.completed && set.weight && set.reps) {
            historicalSets.push({
              weight: set.weight,
              reps: set.reps,
            });
          }
        });
      }
    });
  });

  // If no historical data, it's a PR by default
  if (historicalSets.length === 0) {
    return {
      isPR: true,
      types: ['max_weight', 'max_reps', 'max_volume'],
    };
  }

  const currentWeight = currentSet.weight;
  const currentReps = currentSet.reps;
  const currentVolume = currentWeight * currentReps;

  // Check max weight PR
  const maxHistoricalWeight = Math.max(...historicalSets.map((s) => s.weight));
  if (currentWeight > maxHistoricalWeight) {
    prTypes.push('max_weight');
  }

  // Check max reps at this weight PR
  const setsAtCurrentWeight = historicalSets.filter(
    (s) => Math.abs(s.weight - currentWeight) < 0.01 // floating point comparison
  );
  if (setsAtCurrentWeight.length > 0) {
    const maxRepsAtWeight = Math.max(...setsAtCurrentWeight.map((s) => s.reps));
    if (currentReps > maxRepsAtWeight) {
      prTypes.push('max_reps');
    }
  } else {
    // First time at this weight
    prTypes.push('max_reps');
  }

  // Check max volume PR
  const maxHistoricalVolume = Math.max(
    ...historicalSets.map((s) => s.weight * s.reps)
  );
  if (currentVolume > maxHistoricalVolume) {
    prTypes.push('max_volume');
  }

  return {
    isPR: prTypes.length > 0,
    types: prTypes,
  };
}

/**
 * Get a user-friendly description of the PR type(s)
 */
export function getPRDescription(prTypes: PRType[]): string {
  if (prTypes.length === 0) return '';

  const descriptions: string[] = [];

  if (prTypes.includes('max_weight')) {
    descriptions.push('Heaviest Weight');
  }
  if (prTypes.includes('max_reps')) {
    descriptions.push('Most Reps');
  }
  if (prTypes.includes('max_volume')) {
    descriptions.push('Best Volume');
  }

  return descriptions.join(' • ');
}

/**
 * Get all PRs achieved in a workout session
 */
export function getWorkoutPRs(
  workoutSession: WorkoutSession,
  allWorkouts: WorkoutSession[]
): Array<{ exerciseName: string; setNumber: number; prTypes: PRType[] }> {
  const prs: Array<{ exerciseName: string; setNumber: number; prTypes: PRType[] }> = [];

  // Filter out the current workout from historical data
  const historicalWorkouts = allWorkouts.filter((w) => w.id !== workoutSession.id);

  workoutSession.exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      if (set.completed && set.weight && set.reps) {
        const pr = checkPersonalRecord(
          exercise.name,
          { weight: set.weight, reps: set.reps },
          historicalWorkouts
        );

        if (pr.isPR) {
          prs.push({
            exerciseName: exercise.name,
            setNumber: set.setNumber,
            prTypes: pr.types,
          });
        }
      }
    });
  });

  return prs;
}
