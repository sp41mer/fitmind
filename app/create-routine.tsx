import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Routine, RoutineDay } from '@/types/routine';
import { addRoutine } from '@/utils/storage';
import { generateRoutineWithAI, generateDayWithAI } from '@/services/newell';
import { Ionicons } from '@expo/vector-icons';

interface ExerciseInput {
  id: string;
  name: string;
  sets: number;
  restTime: number;
  notes?: string;
}

interface DayInput {
  id: string;
  name: string;
  exercises: ExerciseInput[];
  isExpanded: boolean;
}

export default function CreateRoutineScreen() {
  const router = useRouter();
  const [routineName, setRoutineName] = useState('');
  const [routineNotes, setRoutineNotes] = useState('');
  const [days, setDays] = useState<DayInput[]>([]);
  const [showRoutineAI, setShowRoutineAI] = useState(false);
  const [routineAIPrompt, setRoutineAIPrompt] = useState('');
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);
  const [generatingDayId, setGeneratingDayId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addDayManually = () => {
    const newDay: DayInput = {
      id: Date.now().toString(),
      name: `Day ${days.length + 1}`,
      exercises: [],
      isExpanded: true,
    };
    setDays([...days, newDay]);
  };

  const removeDay = (dayId: string) => {
    setDays(days.filter((day) => day.id !== dayId));
  };

  const updateDayName = (dayId: string, name: string) => {
    setDays(days.map((day) => (day.id === dayId ? { ...day, name } : day)));
  };

  const toggleDayExpanded = (dayId: string) => {
    setDays(
      days.map((day) =>
        day.id === dayId ? { ...day, isExpanded: !day.isExpanded } : day
      )
    );
  };

  const addExerciseToDay = (dayId: string) => {
    setDays(
      days.map((day) => {
        if (day.id === dayId) {
          const newExercise: ExerciseInput = {
            id: `${dayId}-ex-${Date.now()}`,
            name: '',
            sets: 3,
            restTime: 90,
          };
          return { ...day, exercises: [...day.exercises, newExercise] };
        }
        return day;
      })
    );
  };

  const removeExerciseFromDay = (dayId: string, exerciseId: string) => {
    setDays(
      days.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            exercises: day.exercises.filter((ex) => ex.id !== exerciseId),
          };
        }
        return day;
      })
    );
  };

  const updateExercise = (
    dayId: string,
    exerciseId: string,
    field: keyof ExerciseInput,
    value: any
  ) => {
    setDays(
      days.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            exercises: day.exercises.map((ex) =>
              ex.id === exerciseId ? { ...ex, [field]: value } : ex
            ),
          };
        }
        return day;
      })
    );
  };

  const handleGenerateRoutineWithAI = async () => {
    if (!routineAIPrompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt for the AI');
      return;
    }

    setIsGeneratingRoutine(true);
    try {
      const generatedRoutine = await generateRoutineWithAI(routineAIPrompt);

      // Populate routine name
      setRoutineName(generatedRoutine.routineName);

      // Populate days
      const newDays: DayInput[] = generatedRoutine.days.map((day, index) => ({
        id: `${Date.now()}-day-${index}`,
        name: day.dayName,
        exercises: day.exercises.map((ex, exIndex) => ({
          id: `${Date.now()}-day-${index}-ex-${exIndex}`,
          name: ex.name,
          sets: ex.sets,
          restTime: ex.restTime || 90,
        })),
        isExpanded: index === 0, // Only expand first day
      }));
      setDays(newDays);

      setShowRoutineAI(false);
      setRoutineAIPrompt('');

      Alert.alert(
        'Success',
        'Routine generated! You can review and edit before saving.'
      );
    } catch (error) {
      console.error('Error generating routine:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to generate routine. Please try again.'
      );
    } finally {
      setIsGeneratingRoutine(false);
    }
  };

  const handleGenerateDayWithAI = async (dayId: string, prompt: string) => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt for the AI');
      return;
    }

    setGeneratingDayId(dayId);
    try {
      const generatedDay = await generateDayWithAI(prompt);

      // Update the specific day
      setDays(
        days.map((day) => {
          if (day.id === dayId) {
            return {
              ...day,
              name: generatedDay.dayName,
              exercises: generatedDay.exercises.map((ex, index) => ({
                id: `${dayId}-ex-${Date.now()}-${index}`,
                name: ex.name,
                sets: ex.sets,
                restTime: ex.restTime || 90,
              })),
            };
          }
          return day;
        })
      );

      Alert.alert('Success', 'Day generated successfully!');
    } catch (error) {
      console.error('Error generating day:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to generate day. Please try again.'
      );
    } finally {
      setGeneratingDayId(null);
    }
  };

  const promptForDayAI = (dayId: string) => {
    Alert.prompt(
      'AI Generate Day',
      'Describe what you want for this training day',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: (prompt) => {
            if (prompt) {
              handleGenerateDayWithAI(dayId, prompt);
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleSave = async () => {
    // Validation
    if (!routineName.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }

    if (days.length === 0) {
      Alert.alert('Error', 'Please add at least one day');
      return;
    }

    // Check that each day has exercises
    const emptyDays = days.filter((day) => day.exercises.length === 0);
    if (emptyDays.length > 0) {
      Alert.alert('Error', 'Each day must have at least one exercise');
      return;
    }

    // Check that all exercises have names
    const invalidExercises = days.some((day) =>
      day.exercises.some((ex) => !ex.name.trim())
    );
    if (invalidExercises) {
      Alert.alert('Error', 'Please fill in all exercise names');
      return;
    }

    setIsSaving(true);

    try {
      // Generate AI image for the routine
      let imageUrl: string | undefined;
      try {
        const { generateRoutineImage } = await import('@/services/imageService');
        imageUrl = await generateRoutineImage(routineName.trim());
      } catch (imageError) {
        console.warn('Failed to generate routine image:', imageError);
        // Continue saving without image if generation fails
      }

      const routine: Routine = {
        id: Date.now().toString(),
        name: routineName.trim(),
        notes: routineNotes.trim() || undefined,
        imageUrl,
        days: days.map((day, index) => ({
          id: day.id,
          dayNumber: index + 1,
          name: day.name.trim(),
          exercises: day.exercises.map((ex) => ({
            id: ex.id,
            name: ex.name.trim(),
            sets: ex.sets,
            restTime: ex.restTime,
            notes: ex.notes?.trim() || undefined,
          })),
        })),
        currentDayIndex: 0,
        progressiveOverloadPercentage: 2,
        createdAt: new Date().toISOString(),
      };

      await addRoutine(routine);

      // Navigate to the Routines tab
      router.replace('/(tabs)/workouts');
    } catch (error) {
      console.error('Error saving routine:', error);
      Alert.alert('Error', 'Failed to save routine. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Loading Overlay */}
      {isSaving && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingTitle}>Creating Your Routine</Text>
            <Text style={styles.loadingText}>
              Generating custom AI artwork...
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Routine</Text>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.textLight} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Routine Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Routine Name</Text>
          <TextInput
            style={styles.input}
            value={routineName}
            onChangeText={setRoutineName}
            placeholder="e.g., Push Pull Legs"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {/* Routine Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={routineNotes}
            onChangeText={setRoutineNotes}
            placeholder="Add any notes about this routine..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* AI Generate Full Routine */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => setShowRoutineAI(!showRoutineAI)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="sparkles"
              size={20}
              color={Colors.textLight}
              style={{ marginRight: Spacing.sm }}
            />
            <Text style={styles.aiButtonText}>
              {showRoutineAI ? 'Close AI Assistant' : 'AI Generate Routine'}
            </Text>
          </TouchableOpacity>

          {showRoutineAI && (
            <View style={styles.aiPromptContainer}>
              <TextInput
                style={[styles.input, styles.aiPromptInput]}
                value={routineAIPrompt}
                onChangeText={setRoutineAIPrompt}
                placeholder="Describe your ideal routine (e.g., '4-day upper/lower split for strength')"
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  isGeneratingRoutine && styles.generateButtonDisabled,
                ]}
                onPress={handleGenerateRoutineWithAI}
                disabled={isGeneratingRoutine}
                activeOpacity={0.7}
              >
                {isGeneratingRoutine ? (
                  <ActivityIndicator color={Colors.textLight} />
                ) : (
                  <Text style={styles.generateButtonText}>Generate Routine</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Days List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Training Days ({days.length})</Text>
          </View>

          {days.map((day, dayIndex) => (
            <DayCard
              key={day.id}
              day={day}
              dayIndex={dayIndex}
              onUpdateName={updateDayName}
              onToggleExpanded={toggleDayExpanded}
              onRemove={removeDay}
              onAddExercise={addExerciseToDay}
              onRemoveExercise={removeExerciseFromDay}
              onUpdateExercise={updateExercise}
              onGenerateAI={promptForDayAI}
              isGenerating={generatingDayId === day.id}
            />
          ))}

          <TouchableOpacity
            style={styles.addDayButton}
            onPress={addDayManually}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color={Colors.accent} />
            <Text style={styles.addDayButtonText}>Add Day</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface DayCardProps {
  day: DayInput;
  dayIndex: number;
  onUpdateName: (dayId: string, name: string) => void;
  onToggleExpanded: (dayId: string) => void;
  onRemove: (dayId: string) => void;
  onAddExercise: (dayId: string) => void;
  onRemoveExercise: (dayId: string, exerciseId: string) => void;
  onUpdateExercise: (
    dayId: string,
    exerciseId: string,
    field: keyof ExerciseInput,
    value: any
  ) => void;
  onGenerateAI: (dayId: string) => void;
  isGenerating: boolean;
}

function DayCard({
  day,
  dayIndex,
  onUpdateName,
  onToggleExpanded,
  onRemove,
  onAddExercise,
  onRemoveExercise,
  onUpdateExercise,
  onGenerateAI,
  isGenerating,
}: DayCardProps) {
  return (
    <View style={styles.dayCard}>
      {/* Day Header */}
      <TouchableOpacity
        style={styles.dayHeader}
        onPress={() => onToggleExpanded(day.id)}
        activeOpacity={0.7}
      >
        <View style={styles.dayHeaderLeft}>
          <Ionicons
            name={day.isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={Colors.textSecondary}
          />
          <TextInput
            style={styles.dayNameInput}
            value={day.name}
            onChangeText={(text) => onUpdateName(day.id, text)}
            placeholder={`Day ${dayIndex + 1}`}
            placeholderTextColor={Colors.textSecondary}
            onFocus={(e) => e.stopPropagation()}
          />
        </View>
        <View style={styles.dayHeaderRight}>
          <Text style={styles.exerciseCount}>
            {day.exercises.length} {day.exercises.length === 1 ? 'exercise' : 'exercises'}
          </Text>
          <TouchableOpacity
            onPress={() => onRemove(day.id)}
            style={styles.removeDayButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Day Content (Expanded) */}
      {day.isExpanded && (
        <View style={styles.dayContent}>
          {/* AI Generate Day */}
          <TouchableOpacity
            style={styles.aiDayButton}
            onPress={() => onGenerateAI(day.id)}
            activeOpacity={0.7}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <>
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color={Colors.accent}
                  style={{ marginRight: Spacing.xs }}
                />
                <Text style={styles.aiDayButtonText}>AI Generate Day</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Exercises */}
          {day.exercises.map((exercise, exerciseIndex) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseNumber}>{exerciseIndex + 1}</Text>
                <TouchableOpacity
                  onPress={() => onRemoveExercise(day.id, exercise.id)}
                  style={styles.removeExerciseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                value={exercise.name}
                onChangeText={(text) =>
                  onUpdateExercise(day.id, exercise.id, 'name', text)
                }
                placeholder="Exercise name"
                placeholderTextColor={Colors.textSecondary}
              />

              <View style={styles.exerciseControls}>
                <View style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>Sets</Text>
                  <View style={styles.controlButtons}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() =>
                        onUpdateExercise(
                          day.id,
                          exercise.id,
                          'sets',
                          Math.max(1, exercise.sets - 1)
                        )
                      }
                    >
                      <Ionicons name="remove" size={16} color={Colors.textLight} />
                    </TouchableOpacity>
                    <Text style={styles.controlValue}>{exercise.sets}</Text>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() =>
                        onUpdateExercise(day.id, exercise.id, 'sets', exercise.sets + 1)
                      }
                    >
                      <Ionicons name="add" size={16} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>Rest (sec)</Text>
                  <View style={styles.controlButtons}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() =>
                        onUpdateExercise(
                          day.id,
                          exercise.id,
                          'restTime',
                          Math.max(30, exercise.restTime - 15)
                        )
                      }
                    >
                      <Ionicons name="remove" size={16} color={Colors.textLight} />
                    </TouchableOpacity>
                    <Text style={styles.controlValue}>{exercise.restTime}</Text>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={() =>
                        onUpdateExercise(
                          day.id,
                          exercise.id,
                          'restTime',
                          exercise.restTime + 15
                        )
                      }
                    >
                      <Ionicons name="add" size={16} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Exercise Notes */}
              <TextInput
                style={[styles.input, styles.exerciseNotesInput]}
                value={exercise.notes || ''}
                onChangeText={(text) =>
                  onUpdateExercise(day.id, exercise.id, 'notes', text)
                }
                placeholder="Notes (optional)..."
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
            </View>
          ))}

          {/* Add Exercise Button */}
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={() => onAddExercise(day.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color={Colors.accent} />
            <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
    marginLeft: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aiButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.small,
  },
  aiButtonText: {
    color: Colors.textLight,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  aiPromptContainer: {
    marginTop: Spacing.md,
  },
  aiPromptInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  exerciseNotesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
  },
  generateButton: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadow.small,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: Colors.textLight,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  dayCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.small,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayNameInput: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  exerciseCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  removeDayButton: {
    padding: Spacing.xs,
  },
  dayContent: {
    padding: Spacing.md,
  },
  aiDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.accent,
    marginBottom: Spacing.md,
  },
  aiDayButtonText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },
  exerciseCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  exerciseNumber: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  removeExerciseButton: {
    padding: Spacing.xs,
  },
  exerciseControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  controlGroup: {
    flex: 1,
  },
  controlLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
  },
  controlButton: {
    backgroundColor: Colors.accent,
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addExerciseButtonText: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.xs,
  },
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
  },
  addDayButtonText: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    ...Shadow.large,
    minWidth: 280,
  },
  loadingTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
