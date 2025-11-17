import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Animated,
  Alert,
  Modal,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Routine, RoutineDay } from '@/types/routine';
import { WorkoutExercise, WorkoutSet, WorkoutSession } from '@/types/workout';
import { loadRoutines } from '@/utils/storage';
import { saveWorkoutSession, getWorkoutsByRoutineId, loadWorkoutSessions } from '@/utils/workoutStorage';
import { progressRoutineDay } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { checkPersonalRecord, getWorkoutPRs, getPRDescription, PRType } from '@/utils/personalRecords';
import { calculatePlates, formatPlateCalculation } from '@/utils/plateCalculator';
import { generateWorkoutFeedback } from '@/services/newell';
import { loadSettings } from '@/utils/settingsStorage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const routineId = params.routineId as string;
  const dayId = params.dayId as string;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [currentDay, setCurrentDay] = useState<RoutineDay | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [startTime] = useState(new Date().toISOString());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalSets, setTotalSets] = useState(0);
  const [restTimer, setRestTimer] = useState<{
    exerciseId: string;
    setId: string;
    startTimestamp: number;
    duration: number;
  } | null>(null);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [showRestTimerModal, setShowRestTimerModal] = useState(false);
  const notificationIds = useRef<string[]>([]);
  const [allWorkouts, setAllWorkouts] = useState<WorkoutSession[]>([]);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);
  const [selectedPlateWeight, setSelectedPlateWeight] = useState<number | null>(null);
  const [showWeightAdjustment, setShowWeightAdjustment] = useState(false);
  const [hasAdjustedWeights, setHasAdjustedWeights] = useState(false);

  // Request notification permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }
    })();
  }, []);

  // Load routine and day data
  useEffect(() => {
    loadRoutineData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId, dayId]);

  // Main workout timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Rest timer countdown - calculate from timestamp
  useEffect(() => {
    if (restTimer) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - restTimer.startTimestamp;
        const remaining = Math.max(0, restTimer.duration - Math.floor(elapsed / 1000));

        setRestTimeRemaining(remaining);

        if (remaining <= 0) {
          // Haptic feedback when rest timer ends
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowRestTimerModal(false);
          setRestTimer(null);
          cancelScheduledNotifications();
        }
      }, 100); // Update every 100ms for smooth display

      return () => clearInterval(interval);
    }
  }, [restTimer]);

  // AppState listener - recalculate timer when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && restTimer) {
        // Recalculate remaining time when app becomes active
        const elapsed = Date.now() - restTimer.startTimestamp;
        const remaining = Math.max(0, restTimer.duration - Math.floor(elapsed / 1000));

        setRestTimeRemaining(remaining);

        if (remaining <= 0) {
          setShowRestTimerModal(false);
          setRestTimer(null);
          cancelScheduledNotifications();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [restTimer]);

  // Cleanup notifications on unmount
  useEffect(() => {
    return () => {
      cancelScheduledNotifications();
    };
  }, []);

  const loadRoutineData = async () => {
    try {
      const routines = await loadRoutines();
      const foundRoutine = routines.find((r) => r.id === routineId);

      if (!foundRoutine) {
        Alert.alert('Error', 'Routine not found');
        router.back();
        return;
      }

      const foundDay = foundRoutine.days.find((d) => d.id === dayId);
      if (!foundDay) {
        Alert.alert('Error', 'Day not found');
        router.back();
        return;
      }

      setRoutine(foundRoutine);
      setCurrentDay(foundDay);

      // Load all historical workouts for PR tracking
      const historicalWorkouts = await loadWorkoutSessions();
      setAllWorkouts(historicalWorkouts);

      // Load weight unit preference
      const settings = await loadSettings();
      setWeightUnit(settings.weightUnit);

      // Load previous workout data for this day
      const previousWorkouts = await getWorkoutsByRoutineId(routineId);
      const previousDayWorkouts = previousWorkouts.filter(
        (w) => w.dayId === dayId
      );
      const lastWorkout =
        previousDayWorkouts.length > 0
          ? previousDayWorkouts[previousDayWorkouts.length - 1]
          : null;

      // Initialize workout exercises
      const workoutExercises: WorkoutExercise[] = foundDay.exercises.map(
        (exercise) => {
          const previousExercise = lastWorkout?.exercises.find(
            (e) => e.name === exercise.name
          );

          return {
            id: exercise.id,
            name: exercise.name,
            sets: Array.from({ length: exercise.sets }, (_, index) => {
              const previousSet = previousExercise?.sets[index];
              return {
                id: `${exercise.id}-set-${index + 1}`,
                setNumber: index + 1,
                weight: null,
                reps: null,
                completed: false,
                previousWeight: previousSet?.weight || undefined,
                previousReps: previousSet?.reps || undefined,
              };
            }),
            restTime: exercise.restTime || 90,
          };
        }
      );

      setExercises(workoutExercises);

      // Show weight adjustment modal if there are previous weights
      const hasPreviousWeights = workoutExercises.some(ex =>
        ex.sets.some(s => s.previousWeight !== undefined)
      );
      if (hasPreviousWeights) {
        setShowWeightAdjustment(true);
      }
    } catch (error) {
      console.error('Error loading routine:', error);
      Alert.alert('Error', 'Failed to load routine');
      router.back();
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(
        secs
      ).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const cancelScheduledNotifications = async () => {
    for (const id of notificationIds.current) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    notificationIds.current = [];
  };

  const scheduleRestNotifications = async (durationSeconds: number) => {
    // Cancel any existing notifications first
    await cancelScheduledNotifications();

    const warningTime = 15; // 15 seconds before end

    try {
      // Schedule warning notification (15 seconds before end)
      if (durationSeconds > warningTime) {
        const warningTrigger: Notifications.TimeIntervalNotificationTrigger = {
          seconds: durationSeconds - warningTime,
          repeats: false,
        };

        const warningId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Rest Ending Soon!',
            body: `${warningTime} seconds remaining`,
            sound: true,
          },
          trigger: warningTrigger,
        });
        notificationIds.current.push(warningId);
      }

      // Schedule completion notification
      const completionTrigger: Notifications.TimeIntervalNotificationTrigger = {
        seconds: durationSeconds,
        repeats: false,
      };

      const completionId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Rest Complete!',
          body: "Time to get back to work!",
          sound: true,
        },
        trigger: completionTrigger,
      });
      notificationIds.current.push(completionId);
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  };

  const calculateStats = useCallback(() => {
    let volume = 0;
    let completedSets = 0;

    exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (set.completed && set.weight && set.reps) {
          volume += set.weight * set.reps;
          completedSets += 1;
        }
      });
    });

    setTotalVolume(volume);
    setTotalSets(completedSets);
  }, [exercises]);

  useEffect(() => {
    calculateStats();
  }, [exercises, calculateStats]);

  const toggleSetCompletion = async (exerciseId: string, setId: string) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    const set = exercise?.sets.find((s) => s.id === setId);

    if (!set) return;

    // If marking as complete, validate weight and reps
    if (!set.completed) {
      if (!set.weight || !set.reps) {
        Alert.alert('Missing Data', 'Please enter weight and reps first');
        return;
      }

      // Haptic feedback on set completion
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Start rest timer if configured
      const restTime = (exercise as any).restTime || 90;
      const now = Date.now();

      setRestTimer({
        exerciseId,
        setId,
        startTimestamp: now,
        duration: restTime,
      });
      setRestTimeRemaining(restTime);
      setShowRestTimerModal(true);

      // Schedule notifications
      await scheduleRestNotifications(restTime);
    }

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            sets: exercise.sets.map((set) => {
              if (set.id === setId) {
                return { ...set, completed: !set.completed };
              }
              return set;
            }),
          };
        }
        return exercise;
      })
    );
  };

  const updateSetValue = (
    exerciseId: string,
    setId: string,
    field: 'weight' | 'reps',
    value: string
  ) => {
    const numValue = value === '' ? null : parseFloat(value);

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            sets: exercise.sets.map((set) => {
              if (set.id === setId) {
                return { ...set, [field]: numValue };
              }
              return set;
            }),
          };
        }
        return exercise;
      })
    );
  };

  const adjustAllWeights = (percentage: number) => {
    setExercises((prev) =>
      prev.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => {
          if (set.previousWeight !== undefined) {
            const adjustedWeight = set.previousWeight * (1 + percentage / 100);
            return {
              ...set,
              weight: Math.round(adjustedWeight * 2) / 2, // Round to nearest 0.5
            };
          }
          return set;
        }),
      }))
    );
    setHasAdjustedWeights(true);
    setShowWeightAdjustment(false);
  };

  const startWithoutAdjustment = () => {
    // Pre-fill weights from previous workout
    setExercises((prev) =>
      prev.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          weight: set.previousWeight !== undefined ? set.previousWeight : null,
        })),
      }))
    );
    setShowWeightAdjustment(false);
  };

  const skipRest = async () => {
    await cancelScheduledNotifications();
    setRestTimer(null);
    setRestTimeRemaining(0);
    setShowRestTimerModal(false);
  };

  const showPlates = (weight: number) => {
    setSelectedPlateWeight(weight);
    setShowPlateCalculator(true);
  };

  const addSetToExercise = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id === exerciseId) {
          const newSetNumber = exercise.sets.length + 1;
          const newSet: WorkoutSet = {
            id: `${exerciseId}-set-${newSetNumber}`,
            setNumber: newSetNumber,
            weight: null,
            reps: null,
            completed: false,
          };
          return {
            ...exercise,
            sets: [...exercise.sets, newSet],
          };
        }
        return exercise;
      })
    );
  };

  const finishWorkout = () => {
    // Show finish modal instead of immediately saving
    setShowFinishModal(true);
  };

  const handleGenerateAIFeedback = async () => {
    try {
      if (!routine || !currentDay) return;

      setIsGeneratingFeedback(true);

      // Get PRs for this workout
      const prs = getWorkoutPRs(
        {
          id: 'temp',
          routineId: routine.id,
          routineName: routine.name,
          dayId: currentDay.id,
          dayName: currentDay.name,
          exercises,
          startTime,
          endTime: new Date().toISOString(),
          totalVolume,
          totalSets,
          duration: elapsedSeconds,
          weightUnit,
        },
        allWorkouts
      );

      const feedback = await generateWorkoutFeedback({
        routineName: routine.name,
        dayName: currentDay.name,
        duration: elapsedSeconds,
        totalSets,
        totalVolume,
        exercises: exercises.map((ex) => ({
          name: ex.name,
          completedSets: ex.sets.filter((s) => s.completed).length,
          totalSets: ex.sets.length,
        })),
        personalRecords: prs.map((pr) => ({
          exerciseName: pr.exerciseName,
          prTypes: pr.prTypes.map((t) => t.replace('_', ' ')),
        })),
      });

      setAiFeedback(feedback);
    } catch (error) {
      console.error('Error generating AI feedback:', error);
      Alert.alert('Error', 'Failed to generate AI feedback. Please try again.');
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const saveAndFinish = async () => {
    try {
      if (!routine || !currentDay) return;

      const workoutSession: WorkoutSession = {
        id: `workout-${Date.now()}`,
        routineId: routine.id,
        routineName: routine.name,
        dayId: currentDay.id,
        dayName: currentDay.name,
        exercises,
        startTime,
        endTime: new Date().toISOString(),
        totalVolume,
        totalSets,
        duration: elapsedSeconds,
        weightUnit,
        notes: workoutNotes.trim() || undefined,
        aiFeedback: aiFeedback.trim() || undefined,
      };

      await saveWorkoutSession(workoutSession);

      // Progress to next day
      await progressRoutineDay(routine.id);

      setShowFinishModal(false);

      Alert.alert(
        'Workout Complete!',
        `Great job! You completed ${totalSets} sets with ${Math.round(
          totalVolume
        )}${weightUnit} total volume.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  if (!routine || !currentDay) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.routineName}>{routine.name}</Text>
          <Text style={styles.dayName}>{currentDay.name}</Text>
        </View>

        <TouchableOpacity
          style={styles.finishButton}
          onPress={finishWorkout}
          activeOpacity={0.8}
        >
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
          <View>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatTime(elapsedSeconds)}</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons
            name="fitness-outline"
            size={20}
            color={Colors.textSecondary}
          />
          <View>
            <Text style={styles.statLabel}>Volume</Text>
            <Text style={styles.statValue}>
              {Math.round(totalVolume)} kg
            </Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons
            name="checkmark-done-outline"
            size={20}
            color={Colors.textSecondary}
          />
          <View>
            <Text style={styles.statLabel}>Sets</Text>
            <Text style={styles.statValue}>{totalSets}</Text>
          </View>
        </View>
      </View>

      {/* Exercise List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {exercises.map((exercise, exerciseIndex) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            exerciseIndex={exerciseIndex}
            onToggleSet={toggleSetCompletion}
            onUpdateSet={updateSetValue}
            onAddSet={addSetToExercise}
            onShowPlates={showPlates}
            allWorkouts={allWorkouts}
            weightUnit={weightUnit}
          />
        ))}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* Weight Adjustment Modal */}
      <Modal
        visible={showWeightAdjustment}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWeightAdjustment(false)}
      >
        <View style={styles.weightAdjustModalOverlay}>
          <View style={styles.weightAdjustModalContent}>
            <Text style={styles.weightAdjustTitle}>Adjust Starting Weights</Text>
            <Text style={styles.weightAdjustSubtitle}>
              Based on your previous workout, do you want to adjust all weights?
            </Text>

            <View style={styles.adjustmentGrid}>
              <TouchableOpacity
                style={[styles.adjustmentButton, styles.decreaseButton]}
                onPress={() => adjustAllWeights(-15)}
                activeOpacity={0.8}
              >
                <Text style={styles.adjustmentButtonText}>-15%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustmentButton, styles.decreaseButton]}
                onPress={() => adjustAllWeights(-10)}
                activeOpacity={0.8}
              >
                <Text style={styles.adjustmentButtonText}>-10%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustmentButton, styles.decreaseButton]}
                onPress={() => adjustAllWeights(-5)}
                activeOpacity={0.8}
              >
                <Text style={styles.adjustmentButtonText}>-5%</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.noAdjustmentButton}
              onPress={startWithoutAdjustment}
              activeOpacity={0.8}
            >
              <Text style={styles.noAdjustmentButtonText}>Same as Last Time</Text>
            </TouchableOpacity>

            <View style={styles.adjustmentGrid}>
              <TouchableOpacity
                style={[styles.adjustmentButton, styles.increaseButton]}
                onPress={() => adjustAllWeights(5)}
                activeOpacity={0.8}
              >
                <Text style={[styles.adjustmentButtonText, styles.increaseButtonText]}>+5%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustmentButton, styles.increaseButton]}
                onPress={() => adjustAllWeights(10)}
                activeOpacity={0.8}
              >
                <Text style={[styles.adjustmentButtonText, styles.increaseButtonText]}>+10%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustmentButton, styles.increaseButton]}
                onPress={() => adjustAllWeights(15)}
                activeOpacity={0.8}
              >
                <Text style={[styles.adjustmentButtonText, styles.increaseButtonText]}>+15%</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rest Timer Modal */}
      <Modal
        visible={showRestTimerModal}
        transparent
        animationType="fade"
        onRequestClose={skipRest}
      >
        <View style={styles.restModalOverlay}>
          <View style={styles.restModalContent}>
            <Text style={styles.restModalTitle}>Rest Timer</Text>
            <Text style={styles.restTimerDisplay}>
              {formatTime(restTimeRemaining)}
            </Text>
            <View style={styles.restTimerProgress}>
              <View
                style={[
                  styles.restTimerProgressBar,
                  {
                    width: `${
                      (restTimeRemaining /
                        (restTimer?.duration || 1)) *
                      100
                    }%`,
                  },
                ]}
              />
            </View>
            <TouchableOpacity
              style={styles.skipRestButton}
              onPress={skipRest}
              activeOpacity={0.8}
            >
              <Text style={styles.skipRestButtonText}>Skip Rest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Finish Workout Modal */}
      <Modal
        visible={showFinishModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFinishModal(false)}
      >
        <View style={styles.finishModalOverlay}>
          <View style={styles.finishModalContent}>
            <Text style={styles.finishModalTitle}>Workout Complete!</Text>
            <Text style={styles.finishModalStats}>
              {totalSets} sets • {Math.round(totalVolume)}{weightUnit} • {formatTime(elapsedSeconds)}
            </Text>

            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Your Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={workoutNotes}
                onChangeText={setWorkoutNotes}
                placeholder="How did the workout feel?"
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.aiSection}>
              <TouchableOpacity
                style={[styles.aiButton, isGeneratingFeedback && styles.aiButtonDisabled]}
                onPress={handleGenerateAIFeedback}
                disabled={isGeneratingFeedback}
                activeOpacity={0.7}
              >
                {isGeneratingFeedback ? (
                  <ActivityIndicator color={Colors.textLight} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color={Colors.textLight} />
                    <Text style={styles.aiButtonText}>Generate AI Feedback</Text>
                  </>
                )}
              </TouchableOpacity>

              {aiFeedback ? (
                <View style={styles.aiFeedbackContainer}>
                  <Text style={styles.aiFeedbackText}>{aiFeedback}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.saveWorkoutButton}
              onPress={saveAndFinish}
              activeOpacity={0.8}
            >
              <Text style={styles.saveWorkoutButtonText}>Save Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Plate Calculator Modal */}
      <Modal
        visible={showPlateCalculator}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlateCalculator(false)}
      >
        <TouchableOpacity
          style={styles.plateModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPlateCalculator(false)}
        >
          <View style={styles.plateModalContent}>
            <Text style={styles.plateModalTitle}>
              {selectedPlateWeight}{weightUnit}
            </Text>
            <Text style={styles.plateModalSubtitle}>
              {selectedPlateWeight
                ? formatPlateCalculation(calculatePlates(selectedPlateWeight, weightUnit), weightUnit)
                : ''}
            </Text>
            <TouchableOpacity
              style={styles.plateCloseButton}
              onPress={() => setShowPlateCalculator(false)}
            >
              <Text style={styles.plateCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface ExerciseCardProps {
  exercise: WorkoutExercise & { restTime?: number };
  exerciseIndex: number;
  onToggleSet: (exerciseId: string, setId: string) => void;
  onUpdateSet: (
    exerciseId: string,
    setId: string,
    field: 'weight' | 'reps',
    value: string
  ) => void;
  onAddSet: (exerciseId: string) => void;
  onShowPlates: (weight: number) => void;
  allWorkouts: WorkoutSession[];
  weightUnit: 'kg' | 'lbs';
}

function ExerciseCard({
  exercise,
  exerciseIndex,
  onToggleSet,
  onUpdateSet,
  onAddSet,
  onShowPlates,
  allWorkouts,
  weightUnit,
}: ExerciseCardProps) {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <View style={styles.exerciseBadge}>
          <Text style={styles.exerciseBadgeText}>{exerciseIndex + 1}</Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { width: 40 }]}>SET</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>PREVIOUS</Text>
        <Text style={[styles.tableHeaderText, { width: 80 }]}>WEIGHT</Text>
        <Text style={[styles.tableHeaderText, { width: 80 }]}>REPS</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Sets */}
      {exercise.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          exerciseId={exercise.id}
          exerciseName={exercise.name}
          onToggle={onToggleSet}
          onUpdate={onUpdateSet}
          onShowPlates={onShowPlates}
          allWorkouts={allWorkouts}
          weightUnit={weightUnit}
        />
      ))}

      {/* Add Set Button */}
      <TouchableOpacity
        style={styles.addSetButton}
        onPress={() => onAddSet(exercise.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={18} color={Colors.accent} />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

interface SetRowProps {
  set: WorkoutSet;
  exerciseId: string;
  exerciseName: string;
  onToggle: (exerciseId: string, setId: string) => void;
  onUpdate: (
    exerciseId: string,
    setId: string,
    field: 'weight' | 'reps',
    value: string
  ) => void;
  onShowPlates: (weight: number) => void;
  allWorkouts: WorkoutSession[];
  weightUnit: 'kg' | 'lbs';
}

function SetRow({ set, exerciseId, exerciseName, onToggle, onUpdate, onShowPlates, allWorkouts, weightUnit }: SetRowProps) {
  const [scaleAnim] = useState(new Animated.Value(1));

  // Check if this set is a PR (only if it's completed and has weight/reps)
  const isPR =
    set.completed && set.weight && set.reps
      ? checkPersonalRecord(exerciseName, { weight: set.weight, reps: set.reps }, allWorkouts)
      : { isPR: false, types: [] as PRType[] };

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onToggle(exerciseId, set.id);
  };

  const rowStyle = [
    styles.setRow,
    set.completed && styles.setRowCompleted,
  ];

  const previousText =
    set.previousWeight && set.previousReps
      ? `${set.previousWeight} × ${set.previousReps}`
      : '-';

  return (
    <View style={rowStyle}>
      <View style={styles.setNumberContainer}>
        <Text style={styles.setNumber}>{set.setNumber}</Text>
        {isPR.isPR && (
          <Ionicons name="trophy" size={14} color={Colors.warning} style={styles.prBadge} />
        )}
      </View>

      <Text style={styles.previousText}>{previousText}</Text>

      <View style={styles.weightInputContainer}>
        <TextInput
          style={[styles.input, set.completed && styles.inputCompleted]}
          value={set.weight !== null ? set.weight.toString() : ''}
          onChangeText={(value) => onUpdate(exerciseId, set.id, 'weight', value)}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={Colors.textTertiary}
          editable={!set.completed}
        />
        {set.weight && set.weight > 0 && (
          <TouchableOpacity
            style={styles.plateCalcButton}
            onPress={() => onShowPlates(set.weight!)}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <Ionicons name="calculator-outline" size={16} color={Colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={[styles.input, set.completed && styles.inputCompleted]}
        value={set.reps !== null ? set.reps.toString() : ''}
        onChangeText={(value) => onUpdate(exerciseId, set.id, 'reps', value)}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={Colors.textTertiary}
        editable={!set.completed}
      />

      <TouchableOpacity
        onPress={handleToggle}
        style={styles.checkButton}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons
            name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={32}
            color={set.completed ? Colors.success : Colors.border}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.cardBackground,
    ...Shadow.small,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  routineName: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxs,
  },
  dayName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  finishButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  finishButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    ...Shadow.small,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxs,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  exerciseCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.medium,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  exerciseName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  exerciseBadge: {
    backgroundColor: Colors.accentLight,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseBadgeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  tableHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  setRowCompleted: {
    backgroundColor: Colors.successLight,
  },
  setNumber: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    width: 40,
    textAlign: 'center',
  },
  previousText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  input: {
    width: 80,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputCompleted: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
    color: Colors.text,
  },
  checkButton: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addSetText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.xs,
  },
  restModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restModalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    minWidth: 280,
    ...Shadow.large,
  },
  restModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  restTimerDisplay: {
    fontSize: 72,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
    marginBottom: Spacing.lg,
  },
  restTimerProgress: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  restTimerProgressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  skipRestButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: BorderRadius.md,
  },
  skipRestButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  setNumberContainer: {
    width: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
  prBadge: {
    marginLeft: Spacing.xxs,
  },
  weightInputContainer: {
    position: 'relative',
    width: 80,
    marginHorizontal: Spacing.xs,
  },
  plateCalcButton: {
    position: 'absolute',
    right: 2,
    top: 2,
    padding: Spacing.xxs,
  },
  finishModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  finishModalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    maxHeight: '80%',
  },
  finishModalTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  finishModalStats: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  notesSection: {
    marginBottom: Spacing.xxl,
  },
  notesLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  notesInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aiSection: {
    marginBottom: Spacing.xxl,
  },
  aiButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  aiFeedbackContainer: {
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  aiFeedbackText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  saveWorkoutButton: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  saveWorkoutButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textLight,
  },
  plateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateModalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    minWidth: 280,
    ...Shadow.large,
  },
  plateModalTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  plateModalSubtitle: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  plateCloseButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: BorderRadius.md,
  },
  plateCloseButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  weightAdjustModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  weightAdjustModalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  weightAdjustTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  weightAdjustSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },
  adjustmentGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  adjustmentButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadow.small,
  },
  decreaseButton: {
    backgroundColor: Colors.error,
  },
  increaseButton: {
    backgroundColor: Colors.success,
  },
  adjustmentButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textLight,
  },
  increaseButtonText: {
    color: Colors.textLight,
  },
  noAdjustmentButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.small,
  },
  noAdjustmentButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textLight,
  },
});
