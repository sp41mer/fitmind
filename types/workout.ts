export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
  previousWeight?: number;
  previousReps?: number;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  dayId: string; // which day of the routine was performed
  dayName: string; // e.g., "Day 1 - Push"
  exercises: WorkoutExercise[];
  startTime: string;
  endTime?: string;
  totalVolume: number;
  totalSets: number;
  duration: number; // in seconds
  weightUnit: 'kg' | 'lbs'; // unit used when recording this workout
  notes?: string; // user's notes about the workout
  aiFeedback?: string; // AI-generated feedback/summary
}
