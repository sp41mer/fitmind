import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutSession } from '@/types/workout';

const WORKOUTS_KEY = '@fitforge_workouts';

export const saveWorkoutSession = async (workout: WorkoutSession): Promise<void> => {
  try {
    const existingWorkouts = await loadWorkoutSessions();
    existingWorkouts.push(workout);
    const jsonValue = JSON.stringify(existingWorkouts);
    await AsyncStorage.setItem(WORKOUTS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving workout session:', error);
    throw error;
  }
};

export const loadWorkoutSessions = async (): Promise<WorkoutSession[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(WORKOUTS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error loading workout sessions:', error);
    return [];
  }
};

export const getWorkoutsByRoutineId = async (routineId: string): Promise<WorkoutSession[]> => {
  try {
    const allWorkouts = await loadWorkoutSessions();
    return allWorkouts.filter((workout) => workout.routineId === routineId);
  } catch (error) {
    console.error('Error getting workouts by routine ID:', error);
    return [];
  }
};
