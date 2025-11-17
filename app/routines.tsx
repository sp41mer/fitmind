import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Routine } from '@/types/routine';
import { loadRoutines } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [showDayPicker, setShowDayPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRoutinesData();
    }, [])
  );

  const loadRoutinesData = async () => {
    try {
      const loadedRoutines = await loadRoutines();
      setRoutines(loadedRoutines);
    } catch (error) {
      console.error('Error loading routines:', error);
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

  const handleSelectDay = (routine: Routine) => {
    setSelectedRoutine(routine);
    setShowDayPicker(true);
  };

  const handleDaySelected = (dayId: string) => {
    if (selectedRoutine) {
      router.push({
        pathname: '/active-workout',
        params: {
          routineId: selectedRoutine.id,
          dayId: dayId,
        },
      });
      setShowDayPicker(false);
      setSelectedRoutine(null);
    }
  };

  const renderRoutineCard = ({ item }: { item: Routine }) => {
    const nextDay = item.days[item.currentDayIndex];
    const totalExercises = item.days.reduce(
      (sum, day) => sum + day.exercises.length,
      0
    );

    return (
      <View style={styles.routineCard}>
        <View style={styles.routineHeader}>
          <Text style={styles.routineName}>{item.name}</Text>
          <View style={styles.routineStats}>
            <View style={styles.stat}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.statText}>{item.days.length} days</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons
                name="barbell-outline"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.statText}>{totalExercises} exercises</Text>
            </View>
          </View>
        </View>

        {/* Next Suggested Day */}
        <View style={styles.nextDayContainer}>
          <Text style={styles.nextDayLabel}>Next up:</Text>
          <Text style={styles.nextDayName}>{nextDay.name}</Text>
          <Text style={styles.nextDayExercises}>
            {nextDay.exercises.length}{' '}
            {nextDay.exercises.length === 1 ? 'exercise' : 'exercises'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.quickStartButton}
            onPress={() => handleQuickStart(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={20} color={Colors.textLight} />
            <Text style={styles.quickStartText}>Quick Start</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectDayButton}
            onPress={() => handleSelectDay(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectDayText}>Choose Day</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Days Preview */}
        <View style={styles.daysPreview}>
          {item.days.map((day, index) => (
            <View
              key={day.id}
              style={[
                styles.dayDot,
                index === item.currentDayIndex && styles.dayDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons
        name="barbell-outline"
        size={64}
        color={Colors.textSecondary}
      />
      <Text style={styles.emptyStateTitle}>No Routines Yet</Text>
      <Text style={styles.emptyStateText}>
        Create your first workout routine to get started!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Ready to train?</Text>
          <Text style={styles.title}>My Routines</Text>
        </View>
      </View>

      <FlatList
        data={routines}
        renderItem={renderRoutineCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/create-routine')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.textLight} />
      </TouchableOpacity>

      {/* Day Picker Modal */}
      <Modal
        visible={showDayPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Day</Text>
              <TouchableOpacity
                onPress={() => setShowDayPicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.daysList}>
              {selectedRoutine?.days.map((day, index) => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayOption,
                    index === selectedRoutine.currentDayIndex &&
                      styles.dayOptionSuggested,
                  ]}
                  onPress={() => handleDaySelected(day.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayOptionLeft}>
                    <View
                      style={[
                        styles.dayOptionNumber,
                        index === selectedRoutine.currentDayIndex &&
                          styles.dayOptionNumberActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayOptionNumberText,
                          index === selectedRoutine.currentDayIndex &&
                            styles.dayOptionNumberTextActive,
                        ]}
                      >
                        {day.dayNumber}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.dayOptionName}>{day.name}</Text>
                      {index === selectedRoutine.currentDayIndex && (
                        <Text style={styles.suggestedTag}>Suggested Next</Text>
                      )}
                      <Text style={styles.dayOptionExercises}>
                        {day.exercises.length} exercises
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  listContainer: {
    padding: Spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  routineCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.medium,
  },
  routineHeader: {
    marginBottom: Spacing.md,
  },
  routineName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  routineStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  nextDayContainer: {
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  nextDayLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
    marginBottom: Spacing.xxs,
  },
  nextDayName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xxs,
  },
  nextDayExercises: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickStartButton: {
    flex: 2,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.small,
  },
  quickStartText: {
    color: Colors.textLight,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  selectDayButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  selectDayText: {
    color: Colors.accent,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  daysPreview: {
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
  },
  dayDotActive: {
    backgroundColor: Colors.accent,
    width: 24,
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
  addButton: {
    position: 'absolute',
    bottom: Spacing.xxxl,
    right: Spacing.lg,
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.large,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  daysList: {
    padding: Spacing.lg,
  },
  dayOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayOptionSuggested: {
    borderColor: Colors.accent,
    borderWidth: 2,
    backgroundColor: Colors.accentLight,
  },
  dayOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  dayOptionNumber: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayOptionNumberActive: {
    backgroundColor: Colors.accent,
  },
  dayOptionNumberText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  dayOptionNumberTextActive: {
    color: Colors.textLight,
  },
  dayOptionName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  suggestedTag: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.xxs,
  },
  dayOptionExercises: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
});
