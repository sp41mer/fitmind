import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Routine } from '@/types/routine';
import { WorkoutSession } from '@/types/workout';
import { loadRoutines } from '@/utils/storage';
import { getWorkoutsByRoutineId } from '@/utils/workoutStorage';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

export default function RoutineHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const routineId = params.routineId as string;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalSets, setTotalSets] = useState(0);
  const [avgDuration, setAvgDuration] = useState(0);

  useEffect(() => {
    loadRoutineHistory();
  }, [routineId]);

  const loadRoutineHistory = async () => {
    try {
      const routines = await loadRoutines();
      const foundRoutine = routines.find(r => r.id === routineId);

      if (!foundRoutine) {
        router.back();
        return;
      }

      setRoutine(foundRoutine);

      const routineWorkouts = await getWorkoutsByRoutineId(routineId);
      // Sort by date descending (newest first)
      const sorted = routineWorkouts.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      setWorkouts(sorted);
      setTotalWorkouts(sorted.length);

      // Calculate stats
      const totalVol = sorted.reduce((sum, w) => sum + w.totalVolume, 0);
      const totalSts = sorted.reduce((sum, w) => sum + w.totalSets, 0);
      const totalDur = sorted.reduce((sum, w) => sum + w.duration, 0);

      setTotalVolume(totalVol);
      setTotalSets(totalSts);
      setAvgDuration(sorted.length > 0 ? Math.round(totalDur / sorted.length) : 0);
    } catch (error) {
      console.error('Error loading routine history:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const prepareVolumeChartData = () => {
    if (workouts.length === 0) return [];

    // Reverse to show oldest to newest
    const reversed = [...workouts].reverse();

    return reversed.map((workout, index) => ({
      value: workout.totalVolume,
      label: index % Math.ceil(reversed.length / 4) === 0 ? formatDate(workout.startTime) : '',
      frontColor: Colors.accent,
    }));
  };

  const prepareDurationChartData = () => {
    if (workouts.length === 0) return [];

    // Reverse to show oldest to newest
    const reversed = [...workouts].reverse();

    return reversed.map((workout, index) => ({
      value: Math.round(workout.duration / 60), // Convert to minutes
      label: index % Math.ceil(reversed.length / 4) === 0 ? formatDate(workout.startTime) : '',
      dataPointText: '',
    }));
  };

  const volumeChartData = prepareVolumeChartData();
  const durationChartData = prepareDurationChartData();

  const handleExerciseClick = (exerciseName: string) => {
    router.push({
      pathname: '/exercise-stats',
      params: {
        exerciseName,
        routineId,
      },
    });
  };

  const handleWorkoutClick = (workoutId: string) => {
    router.push({
      pathname: '/workout-detail',
      params: { workoutId },
    });
  };

  // Get all unique exercises from this routine
  const getUniqueExercises = () => {
    const exerciseStats: { [key: string]: { count: number; lastVolume: number } } = {};

    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        if (!exerciseStats[exercise.name]) {
          exerciseStats[exercise.name] = { count: 0, lastVolume: 0 };
        }
        exerciseStats[exercise.name].count++;
        const volume = exercise.sets.reduce(
          (sum, set) => sum + ((set.weight || 0) * (set.reps || 0)),
          0
        );
        exerciseStats[exercise.name].lastVolume = volume;
      });
    });

    return Object.entries(exerciseStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count);
  };

  const uniqueExercises = getUniqueExercises();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{routine?.name}</Text>
          <Text style={styles.headerSubtitle}>Routine History</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {routine?.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{routine.notes}</Text>
          </View>
        )}

        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>WORKOUTS</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{Math.round(totalVolume / 1000)}K</Text>
            <Text style={styles.statLabel}>TOTAL VOLUME</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-done" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>TOTAL SETS</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{formatDuration(avgDuration)}</Text>
            <Text style={styles.statLabel}>AVG DURATION</Text>
          </View>
        </View>

        {workouts.length > 0 ? (
          <>
            {/* Volume Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Volume Per Workout</Text>
              <Text style={styles.chartSubtitle}>Total weight lifted each session</Text>
              <View style={styles.chartContainer}>
                <BarChart
                  data={volumeChartData}
                  width={width - Spacing.lg * 2 - Spacing.lg * 2}
                  height={220}
                  barWidth={volumeChartData.length > 10 ? 20 : 30}
                  spacing={volumeChartData.length > 10 ? 10 : 20}
                  initialSpacing={20}
                  barBorderRadius={4}
                  frontColor={Colors.accent}
                  gradientColor={Colors.accentLight}
                  showGradient
                  yAxisThickness={1}
                  xAxisThickness={1}
                  yAxisColor={Colors.border}
                  xAxisColor={Colors.border}
                  yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={Math.max(...volumeChartData.map(d => d.value)) * 1.1}
                />
              </View>
            </View>

            {/* Duration Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Workout Duration</Text>
              <Text style={styles.chartSubtitle}>Time spent per session (minutes)</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={durationChartData}
                  width={width - Spacing.lg * 2 - Spacing.md * 2}
                  height={220}
                  spacing={durationChartData.length > 10 ? 40 : 60}
                  initialSpacing={20}
                  color={Colors.success}
                  thickness={3}
                  startFillColor={Colors.success}
                  endFillColor={Colors.successLight}
                  startOpacity={0.4}
                  endOpacity={0.1}
                  areaChart
                  hideDataPoints={false}
                  dataPointsColor={Colors.success}
                  dataPointsRadius={4}
                  textColor={Colors.textSecondary}
                  textFontSize={12}
                  yAxisColor={Colors.border}
                  xAxisColor={Colors.border}
                  yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={Math.max(...durationChartData.map(d => d.value)) * 1.1}
                  curved
                />
              </View>
            </View>

            {/* Exercises */}
            <View style={styles.exercisesSection}>
              <Text style={styles.sectionTitle}>Exercises in this Routine</Text>
              {uniqueExercises.map((exercise, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.exerciseCard}
                  onPress={() => handleExerciseClick(exercise.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseLeft}>
                    <Ionicons name="barbell" size={20} color={Colors.accent} />
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseCount}>{exercise.count} workouts</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Workout History */}
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              {workouts.slice(0, 10).map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.workoutCard}
                  onPress={() => handleWorkoutClick(workout.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.workoutCardHeader}>
                    <View>
                      <Text style={styles.workoutDate}>{formatDate(workout.startTime)}</Text>
                      <Text style={styles.workoutDayName}>{workout.dayName}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </View>

                  <View style={styles.workoutStats}>
                    <View style={styles.workoutStat}>
                      <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.workoutStatText}>{formatDuration(workout.duration)}</Text>
                    </View>

                    <View style={styles.workoutStat}>
                      <Ionicons name="fitness-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.workoutStatText}>{Math.round(workout.totalVolume)} kg</Text>
                    </View>

                    <View style={styles.workoutStat}>
                      <Ionicons name="checkmark-done-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.workoutStatText}>{workout.totalSets} sets</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Workouts Yet</Text>
            <Text style={styles.emptyStateText}>
              Complete a workout for this routine to see history and statistics
            </Text>
          </View>
        )}

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
  headerTextContainer: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xxs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  notesCard: {
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  notesLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: (width - Spacing.lg * 2 - Spacing.md) / 2 - Spacing.md / 2,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.small,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },
  chartSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.small,
  },
  chartTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  chartSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    alignItems: 'center',
  },
  exercisesSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  exerciseCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  exerciseCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  historySection: {
    marginBottom: Spacing.xl,
  },
  workoutCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  workoutDate: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  workoutDayName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  workoutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  workoutStatText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyStateTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
});
