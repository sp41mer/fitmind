import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Routine } from '@/types/routine';
import { loadRoutines } from '@/utils/storage';
import { WorkoutSession } from '@/types/workout';
import { loadWorkoutSessions } from '@/utils/workoutStorage';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [loadedRoutines, loadedWorkouts] = await Promise.all([
        loadRoutines(),
        loadWorkoutSessions(),
      ]);
      setRoutines(loadedRoutines);
      setWorkouts(loadedWorkouts);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleQuickStart = (routine: Routine) => {
    // Start with the suggested next day
    const dayToStart = routine.days[routine.currentDayIndex];
    router.push({
      pathname: '/active-workout',
      params: {
        routineId: routine.id,
        dayId: dayToStart.id,
      },
    });
  };

  // Get suggested next routine (first routine with progress)
  const suggestedRoutine = routines.length > 0 ? routines[0] : null;
  const suggestedDay = suggestedRoutine
    ? suggestedRoutine.days[suggestedRoutine.currentDayIndex]
    : null;

  // Calculate stats
  const today = new Date();
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());

  const thisWeekWorkouts = workouts.filter((w) => {
    const workoutDate = new Date(w.startTime);
    return workoutDate >= thisWeekStart;
  });

  const totalVolume = workouts.reduce((sum, w) => sum + w.totalVolume, 0);
  const totalWorkouts = workouts.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello!</Text>
            <Text style={styles.title}>Find A Workout</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push('/create-routine')}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Workout Card */}
        {suggestedRoutine && suggestedDay && (
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => handleQuickStart(suggestedRoutine)}
            activeOpacity={0.9}
          >
            <View style={styles.featuredCardContent}>
              <View style={styles.featuredIcon}>
                <Ionicons name="barbell" size={48} color={Colors.textLight} />
              </View>
              <View style={styles.featuredInfo}>
                <Text style={styles.featuredName}>{suggestedDay.name}</Text>
                <Text style={styles.featuredRoutine}>{suggestedRoutine.name}</Text>
                <View style={styles.featuredMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={Colors.textLight} />
                    <Text style={styles.metaText}>
                      {suggestedDay.exercises.reduce((sum, ex) => sum + ex.sets * (ex.restTime || 0), 0) / 60} Min
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.startWorkoutButton} activeOpacity={0.8}>
                  <Text style={styles.startWorkoutText}>Start Workout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Today's Activity Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Activity</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.detailsLink}>Details →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="barbell" size={20} color={Colors.accent} />
            <Text style={styles.statValue}>{thisWeekWorkouts.length}</Text>
            <Text style={styles.statLabel}>WORKOUTS</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="flame" size={20} color={Colors.accent} />
            <Text style={styles.statValue}>{Math.round(totalVolume / 1000)}K</Text>
            <Text style={styles.statLabel}>VOLUME</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trophy" size={20} color={Colors.accent} />
            <Text style={styles.statValue}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
        </View>

        {/* Quick Actions */}
        {routines.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Routines Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first workout routine to get started!
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/create-routine')}
              activeOpacity={0.8}
            >
              <Text style={styles.createButtonText}>Create Routine</Text>
            </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  greeting: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxs,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  featuredCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.accent,
    overflow: 'hidden',
    ...Shadow.large,
  },
  featuredCardContent: {
    flexDirection: 'row',
    padding: Spacing.lg,
    minHeight: 180,
  },
  featuredIcon: {
    marginRight: Spacing.lg,
    justifyContent: 'center',
  },
  featuredInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  featuredName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  featuredRoutine: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    opacity: 0.9,
    marginBottom: Spacing.sm,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    opacity: 0.9,
  },
  startWorkoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  startWorkoutText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  detailsLink: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
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
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },
  widgetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  energyBalanceCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadow.small,
  },
  energyBalanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  energyBalanceTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  energyBalanceValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  energyBalanceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  energyBalanceItem: {
    alignItems: 'center',
  },
  energyBalanceLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  energyBalanceNumber: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xxxl,
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
    marginBottom: Spacing.xl,
  },
  createButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: BorderRadius.md,
    ...Shadow.small,
  },
  createButtonText: {
    color: Colors.textLight,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
