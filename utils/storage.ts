import AsyncStorage from '@react-native-async-storage/async-storage';
import { Routine } from '@/types/routine';

const ROUTINES_KEY = '@fitforge_routines';

export const saveRoutines = async (routines: Routine[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(routines);
    await AsyncStorage.setItem(ROUTINES_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving routines:', error);
    throw error;
  }
};

export const loadRoutines = async (): Promise<Routine[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(ROUTINES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error loading routines:', error);
    return [];
  }
};

export const addRoutine = async (routine: Routine): Promise<void> => {
  try {
    const routines = await loadRoutines();
    // Add new routine at the beginning so it appears first
    routines.unshift(routine);
    await saveRoutines(routines);
  } catch (error) {
    console.error('Error adding routine:', error);
    throw error;
  }
};

export const updateRoutine = async (updatedRoutine: Routine): Promise<void> => {
  try {
    const routines = await loadRoutines();
    const index = routines.findIndex(r => r.id === updatedRoutine.id);
    if (index !== -1) {
      routines[index] = updatedRoutine;
      await saveRoutines(routines);
    }
  } catch (error) {
    console.error('Error updating routine:', error);
    throw error;
  }
};

export const updateRoutineDayIndex = async (routineId: string, dayIndex: number): Promise<void> => {
  try {
    const routines = await loadRoutines();
    const routine = routines.find(r => r.id === routineId);
    if (routine) {
      routine.currentDayIndex = dayIndex;
      await saveRoutines(routines);
    }
  } catch (error) {
    console.error('Error updating routine day index:', error);
    throw error;
  }
};

export const progressRoutineDay = async (routineId: string): Promise<void> => {
  try {
    const routines = await loadRoutines();
    const routine = routines.find(r => r.id === routineId);
    if (routine) {
      // Move to next day, loop back to 0 if we reach the end
      routine.currentDayIndex = (routine.currentDayIndex + 1) % routine.days.length;
      await saveRoutines(routines);
    }
  } catch (error) {
    console.error('Error progressing routine day:', error);
    throw error;
  }
};
