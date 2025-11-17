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
import { WorkoutSession } from '@/types/workout';
import { loadWorkoutSessions } from '@/utils/workoutStorage';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

interface ExerciseData {
  date: Date;
  maxWeight: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
}

export default function ExerciseStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const exerciseName = params.exerciseName as string;
  const routineId = params.routineId as string | undefined;

  const [exerciseData, setExerciseData] = useState<ExerciseData[]>([]);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [maxWeightEver, setMaxWeightEver] = useState(0);
  const [totalSets, setTotalSets] = useState(0);

  useEffect(() => {
    loadExerciseData();
  }, [exerciseName, routineId]);

  const loadExerciseData = async () => {
    try {
      const allWorkouts = await loadWorkoutSessions();

      // Filter workouts by routine if specified
      const filteredWorkouts = routineId
        ? allWorkouts.filter(w => w.routineId === routineId)
        : allWorkouts;

      // Extract data for this specific exercise
      const data: ExerciseData[] = [];
      let totalVol = 0;
      let maxWeight = 0;
      let sets = 0;

      filteredWorkouts.forEach(workout => {
        const exercise = workout.exercises.find(ex => ex.name === exerciseName);
        if (exercise) {
          const completedSets = exercise.sets.filter(s => s.completed);
          if (completedSets.length > 0) {
            const workoutMaxWeight = Math.max(...completedSets.map(s => s.weight || 0));
            const workoutVolume = completedSets.reduce((sum, s) =>
              sum + ((s.weight || 0) * (s.reps || 0)), 0
            );
            const workoutReps = completedSets.reduce((sum, s) => sum + (s.reps || 0), 0);

            data.push({
              date: new Date(workout.startTime),
              maxWeight: workoutMaxWeight,
              totalVolume: workoutVolume,
              totalSets: completedSets.length,
              totalReps: workoutReps,
            });

            totalVol += workoutVolume;
            maxWeight = Math.max(maxWeight, workoutMaxWeight);
            sets += completedSets.length;
          }
        }
      });

      // Sort by date
      data.sort((a, b) => a.date.getTime() - b.date.getTime());

      setExerciseData(data);
      setTotalWorkouts(data.length);
      setTotalVolume(totalVol);
      setMaxWeightEver(maxWeight);
      setTotalSets(sets);
    } catch (error) {
      console.error('Error loading exercise data:', error);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const prepareChartData = (field: 'maxWeight' | 'totalVolume') => {
    if (exerciseData.length === 0) return [];

    return exerciseData.map((data, index) => ({
      value: field === 'maxWeight' ? data.maxWeight : data.totalVolume,
      label: index % Math.ceil(exerciseData.length / 4) === 0 ? formatDate(data.date) : '',
      dataPointText: '',
    }));
  };

  const volumeChartData = prepareChartData('totalVolume');
  const weightChartData = prepareChartData('maxWeight');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
          <Text style={styles.headerSubtitle}>Exercise Statistics</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>WORKOUTS</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="barbell" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{maxWeightEver}</Text>
            <Text style={styles.statLabel}>MAX WEIGHT</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{Math.round(totalVolume)}</Text>
            <Text style={styles.statLabel}>TOTAL VOLUME</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-done" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>TOTAL SETS</Text>
          </View>
        </View>

        {exerciseData.length > 0 ? (
          <>
            {/* Volume Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Volume Over Time</Text>
              <Text style={styles.chartSubtitle}>Total volume per workout (kg × reps)</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={volumeChartData}
                  width={width - Spacing.lg * 2 - Spacing.md * 2}
                  height={220}
                  spacing={volumeChartData.length > 10 ? 40 : 60}
                  initialSpacing={20}
                  color={Colors.accent}
                  thickness={3}
                  startFillColor={Colors.accent}
                  endFillColor={Colors.accentLight}
                  startOpacity={0.4}
                  endOpacity={0.1}
                  areaChart
                  hideDataPoints={false}
                  dataPointsColor={Colors.accent}
                  dataPointsRadius={4}
                  textColor={Colors.textSecondary}
                  textFontSize={12}
                  yAxisColor={Colors.border}
                  xAxisColor={Colors.border}
                  yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={Math.max(...volumeChartData.map(d => d.value)) * 1.1}
                  curved
                />
              </View>
            </View>

            {/* Max Weight Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Max Weight Progress</Text>
              <Text style={styles.chartSubtitle}>Heaviest weight lifted per workout</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={weightChartData}
                  width={width - Spacing.lg * 2 - Spacing.md * 2}
                  height={220}
                  spacing={weightChartData.length > 10 ? 40 : 60}
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
                  maxValue={Math.max(...weightChartData.map(d => d.value)) * 1.1}
                  curved
                />
              </View>
            </View>

            {/* Workout History */}
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Workout History</Text>
              {exerciseData.slice().reverse().map((data, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{formatDate(data.date)}</Text>
                    <Text style={styles.historyMaxWeight}>{data.maxWeight} kg</Text>
                  </View>
                  <View style={styles.historyStats}>
                    <View style={styles.historyStat}>
                      <Ionicons name="barbell-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.historyStatText}>{data.totalSets} sets</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Ionicons name="trending-up-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.historyStatText}>{Math.round(data.totalVolume)} kg total</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Data Yet</Text>
            <Text style={styles.emptyStateText}>
              Complete a workout with this exercise to see statistics
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
  historySection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  historyCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  historyDate: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  historyMaxWeight: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  historyStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  historyStatText: {
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
