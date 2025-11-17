import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { WorkoutSession } from '@/types/workout';
import { loadWorkoutSessions } from '@/utils/workoutStorage';
import { Ionicons } from '@expo/vector-icons';

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workoutId = params.workoutId as string;

  const [workout, setWorkout] = useState<WorkoutSession | null>(null);

  const handleExerciseClick = (exerciseName: string) => {
    router.push({
      pathname: '/exercise-stats',
      params: {
        exerciseName,
        routineId: workout?.routineId,
      },
    });
  };

  useEffect(() => {
    loadWorkoutData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId]);

  const loadWorkoutData = async () => {
    try {
      const workouts = await loadWorkoutSessions();
      const foundWorkout = workouts.find((w) => w.id === workoutId);

      if (!foundWorkout) {
        Alert.alert('Error', 'Workout not found');
        router.back();
        return;
      }

      setWorkout(foundWorkout);
    } catch (error) {
      console.error('Error loading workout:', error);
      Alert.alert('Error', 'Failed to load workout');
      router.back();
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min ${secs}s`;
    }
    return `${minutes}min ${secs}s`;
  };

  if (!workout) {
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
          <Text style={styles.routineName}>{workout.routineName}</Text>
          <Text style={styles.dayName}>{workout.dayName}</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date & Time Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.infoItemText}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(workout.startTime)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.infoItemText}>
                <Text style={styles.infoLabel}>Started</Text>
                <Text style={styles.infoValue}>{formatTime(workout.startTime)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color={Colors.accent} />
            <Text style={styles.statValue}>{formatDuration(workout.duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="fitness" size={32} color={Colors.accent} />
            <Text style={styles.statValue}>{Math.round(workout.totalVolume)} {workout.weightUnit}</Text>
            <Text style={styles.statLabel}>Total Volume</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-done" size={32} color={Colors.accent} />
            <Text style={styles.statValue}>{workout.totalSets}</Text>
            <Text style={styles.statLabel}>Sets Completed</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="barbell" size={32} color={Colors.accent} />
            <Text style={styles.statValue}>{workout.exercises.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>

        {/* AI Feedback */}
        {workout.aiFeedback && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>AI Feedback</Text>
            </View>
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>{workout.aiFeedback}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {workout.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Your Notes</Text>
            </View>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{workout.notes}</Text>
            </View>
          </View>
        )}

        {/* Exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>

          {workout.exercises.map((exercise, exerciseIndex) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <TouchableOpacity
                style={styles.exerciseHeader}
                onPress={() => handleExerciseClick(exercise.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <View style={styles.exerciseHeaderRight}>
                  <View style={styles.exerciseBadge}>
                    <Text style={styles.exerciseBadgeText}>{exerciseIndex + 1}</Text>
                  </View>
                  <Ionicons name="stats-chart" size={18} color={Colors.accent} style={{ marginLeft: Spacing.sm }} />
                </View>
              </TouchableOpacity>

              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: 50 }]}>SET</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>WEIGHT</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>REPS</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>VOLUME</Text>
              </View>

              {/* Sets */}
              {exercise.sets
                .filter((set) => set.completed)
                .map((set) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={[styles.setData, { width: 50 }]}>{set.setNumber}</Text>
                    <Text style={[styles.setData, { flex: 1 }]}>
                      {set.weight ? `${set.weight} ${workout.weightUnit}` : '-'}
                    </Text>
                    <Text style={[styles.setData, { flex: 1 }]}>{set.reps || '-'}</Text>
                    <Text style={[styles.setData, { flex: 1 }]}>
                      {set.weight && set.reps ? `${set.weight * set.reps} ${workout.weightUnit}` : '-'}
                    </Text>
                  </View>
                ))}
            </View>
          ))}
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
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
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  infoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.small,
  },
  infoRow: {
    marginBottom: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  infoItemText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxs,
  },
  infoValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadow.small,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  feedbackCard: {
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadow.small,
  },
  feedbackText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  notesCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadow.small,
  },
  notesText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  exerciseCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.small,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  exerciseHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: FontSize.lg,
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
    paddingVertical: Spacing.md,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  setData: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
});
