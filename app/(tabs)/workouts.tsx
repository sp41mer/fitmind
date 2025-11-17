import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Routine } from '@/types/routine';
import { loadRoutines } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 3) / 2;

export default function WorkoutsScreen() {
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

  const getRoutineIcon = (index: number): any => {
    const icons = ['barbell', 'bicycle', 'walk', 'fitness', 'body', 'heart'];
    return icons[index % icons.length];
  };

  const handleViewHistory = (routineId: string, e: any) => {
    e.stopPropagation();
    router.push({
      pathname: '/routine-history',
      params: { routineId },
    });
  };

  const renderRoutineCard = ({ item, index }: { item: Routine; index: number }) => {
    const totalExercises = item.days.reduce(
      (sum, day) => sum + day.exercises.length,
      0
    );

    return (
      <View style={styles.routineCardContainer}>
        <TouchableOpacity
          style={styles.routineCard}
          onPress={() => handleSelectDay(item)}
          activeOpacity={0.8}
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.routineImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.iconContainer}>
              <Ionicons
                name={getRoutineIcon(index) as any}
                size={40}
                color={Colors.accent}
              />
            </View>
          )}
          <Text style={styles.routineName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.routineInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{item.days.length} days</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="barbell-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{totalExercises} ex</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={(e) => handleViewHistory(item.id, e)}
          activeOpacity={0.7}
        >
          <Ionicons name="stats-chart" size={16} color={Colors.accent} />
        </TouchableOpacity>
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
        <View style={styles.headerTop}>
          <Text style={styles.title}>Start Activity</Text>
          <TouchableOpacity
            onPress={() => router.push('/create-routine')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={32} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={routines}
        renderItem={renderRoutineCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />

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
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  row: {
    justifyContent: 'space-between',
  },
  routineCardContainer: {
    width: CARD_WIDTH,
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  routineCard: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadow.medium,
  },
  historyButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.accentLight,
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.small,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  routineImage: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  routineName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    minHeight: 40,
  },
  routineInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: FontSize.xs,
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
