export interface Exercise {
  id: string;
  name: string;
  sets: number;
  restTime?: number; // rest time in seconds between sets
  notes?: string; // custom notes for the exercise
}

export interface RoutineDay {
  id: string;
  dayNumber: number;
  name: string; // e.g., "Push Day", "Pull Day", "Leg Day"
  exercises: Exercise[];
}

export interface Routine {
  id: string;
  name: string;
  days: RoutineDay[];
  currentDayIndex: number; // tracks which day to suggest next (0-based)
  progressiveOverloadPercentage: number; // percentage to add to weights (e.g., 2 for 2%)
  createdAt: string;
  notes?: string; // custom notes for the routine
  imageUrl?: string; // AI-generated cover image for the routine
}

export interface NewellTextRequest {
  project_id: string;
  prompt: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  inject_branding?: boolean;
}

export interface AIGeneratedRoutine {
  routineName: string;
  days: Array<{
    dayName: string;
    exercises: Array<{
      name: string;
      sets: number;
      restTime?: number;
    }>;
  }>;
}

export interface AIGeneratedDay {
  dayName: string;
  exercises: Array<{
    name: string;
    sets: number;
    restTime?: number;
  }>;
}
