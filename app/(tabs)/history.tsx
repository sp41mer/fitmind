import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { WorkoutSession } from '@/types/workout';
import { loadWorkoutSessions } from '@/utils/workoutStorage';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      loadWorkoutsData();
    }, [])
  );

  const loadWorkoutsData = async () => {
    try {
      const loadedWorkouts = await loadWorkoutSessions();
      // Sort by date descending
      const sorted = loadedWorkouts.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      setWorkouts(sorted);
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getWorkoutsByDate = () => {
    const grouped: { [key: string]: WorkoutSession[] } = {};

    workouts.forEach((workout) => {
      const date = new Date(workout.startTime).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(workout);
    });

    return Object.entries(grouped).map(([date, workouts]) => ({
      date,
      workouts,
    }));
  };

  const groupedWorkouts = getWorkoutsByDate();

  const renderWorkoutCard = (workout: WorkoutSession) => (
    <TouchableOpacity
      key={workout.id}
      style={styles.workoutCard}
      onPress={() =>
        router.push({
          pathname: '/workout-detail',
          params: { workoutId: workout.id },
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.workoutCardHeader}>
        <View style={styles.workoutCardLeft}>
          <Text style={styles.workoutRoutineName}>{workout.routineName}</Text>
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
  );

  const renderDateSection = ({
    item,
  }: {
    item: { date: string; workouts: WorkoutSession[] };
  }) => (
    <View style={styles.dateSection}>
      <Text style={styles.dateHeader}>{formatDate(item.date)}</Text>
      {item.workouts.map(renderWorkoutCard)}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="calendar-outline" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Workouts Yet</Text>
      <Text style={styles.emptyStateText}>
        Complete your first workout to see your training history!
      </Text>
    </View>
  );

  // Calendar stats
  const totalWorkouts = workouts.length;
  const thisMonthWorkouts = workouts.filter((w) => {
    const date = new Date(w.startTime);
    return (
      date.getMonth() === selectedMonth.getMonth() &&
      date.getFullYear() === selectedMonth.getFullYear()
    );
  }).length;

  const totalVolume = workouts.reduce((sum, w) => sum + w.totalVolume, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Your Progress</Text>
          <Text style={styles.title}>Workout History</Text>
        </View>
      </View>

      {/* Stats Cards */}
      {workouts.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{thisMonthWorkouts}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="barbell" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{Math.round(totalVolume / 1000)}K</Text>
            <Text style={styles.statLabel}>Total Volume (kg)</Text>
          </View>
        </View>
      )}

      {/* Workout List */}
      <FlatList
        data={groupedWorkouts}
        renderItem={renderDateSection}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  greeting: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.huge,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
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
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
    textAlign: 'center',
  },
  listContainer: {
    padding: Spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  dateSection: {
    marginBottom: Spacing.xl,
  },
  dateHeader: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workoutCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  workoutCardLeft: {
    flex: 1,
  },
  workoutRoutineName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xxs,
  },
  workoutDayName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
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
