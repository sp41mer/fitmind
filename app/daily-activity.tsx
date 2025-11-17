import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getDailyHealthSummary } from '@/services/healthService';
import { DailyHealthSummary } from '@/types/health';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 3) / 2;

export default function DailyActivityScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summary, setSummary] = useState<DailyHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthData();
  }, [selectedDate]);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const data = await getDailyHealthSummary(selectedDate);
      setSummary(data);
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    const today = new Date();
    if (newDate <= today) {
      setSelectedDate(newDate);
    }
  };

  const formatDate = (date: Date): string => {
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

  const formatTime = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading || !summary) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading health data...</Text>
        </View>
      </View>
    );
  }

  const { metrics, weeklyAverages, last7DaysData, workoutVolume } = summary;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.dateButton}>
            <Ionicons name="chevron-back" size={20} color={Colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <TouchableOpacity
            onPress={goToNextDay}
            style={[
              styles.dateButton,
              selectedDate.toDateString() === new Date().toDateString() && styles.dateButtonDisabled,
            ]}
            disabled={selectedDate.toDateString() === new Date().toDateString()}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={selectedDate.toDateString() === new Date().toDateString()
                ? Colors.textSecondary
                : Colors.textLight
              }
            />
          </TouchableOpacity>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 7-Day Averages */}
        <View style={styles.averagesContainer}>
          <Text style={styles.sectionTitle}>7-Day Averages</Text>
          <View style={styles.averagesRow}>
            <View style={styles.averageStat}>
              <Ionicons name="moon" size={20} color={Colors.accent} />
              <Text style={styles.averageValue}>{formatTime(weeklyAverages.avgSleepHours)}</Text>
              <Text style={styles.averageLabel}>Sleep</Text>
            </View>
            <View style={styles.averageStat}>
              <Ionicons name="flame" size={20} color={Colors.warning} />
              <Text style={styles.averageValue}>{Math.round(weeklyAverages.avgCaloriesBurned)}</Text>
              <Text style={styles.averageLabel}>Calories</Text>
            </View>
            <View style={styles.averageStat}>
              <Ionicons name="heart" size={20} color={Colors.error} />
              <Text style={styles.averageValue}>{Math.round(weeklyAverages.avgStress)}</Text>
              <Text style={styles.averageLabel}>Stress</Text>
            </View>
          </View>
        </View>

        {/* Workout Volume (if applicable) */}
        {workoutVolume && workoutVolume > 0 && (
          <View style={styles.workoutCard}>
            <View style={styles.workoutHeader}>
              <Ionicons name="barbell" size={24} color={Colors.accent} />
              <Text style={styles.workoutTitle}>Training Session</Text>
            </View>
            <View style={styles.workoutStats}>
              <View style={styles.workoutStat}>
                <Text style={styles.workoutStatValue}>{Math.round(workoutVolume)}</Text>
                <Text style={styles.workoutStatLabel}>kg Volume</Text>
              </View>
              <View style={styles.workoutStat}>
                <Text style={styles.workoutStatValue}>{metrics.exertionScore.toFixed(1)}</Text>
                <Text style={styles.workoutStatLabel}>Exertion</Text>
              </View>
            </View>
          </View>
        )}

        {/* Health Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Recovery */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Recovery</Text>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.circularProgress}>
              <CircularProgress
                value={metrics.recoveryScore}
                maxValue={100}
                radius={45}
                strokeWidth={8}
                color={Colors.success}
              />
            </View>
            <View style={styles.miniChart}>
              {last7DaysData.map((day, index) => {
                const height = (day.recoveryScore / 100) * 40;
                return (
                  <View
                    key={index}
                    style={[
                      styles.miniBar,
                      { height, backgroundColor: index === 6 ? Colors.success : Colors.border },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Sleep */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Sleep</Text>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.circularProgress}>
              <CircularProgress
                value={metrics.sleepPercentage}
                maxValue={100}
                radius={45}
                strokeWidth={8}
                color="#8B5CF6"
              />
            </View>
            <View style={styles.miniChart}>
              {last7DaysData.map((day, index) => {
                const height = (day.sleepPercentage / 100) * 40;
                return (
                  <View
                    key={index}
                    style={[
                      styles.miniBar,
                      { height, backgroundColor: index === 6 ? '#8B5CF6' : Colors.border },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Exertion */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Exertion</Text>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.circularProgress}>
              <CircularProgress
                value={metrics.exertionScore}
                maxValue={10}
                radius={45}
                strokeWidth={8}
                color={Colors.success}
                showDecimal
              />
            </View>
            <View style={styles.miniChart}>
              {last7DaysData.map((day, index) => {
                const height = (day.exertionScore / 10) * 40;
                return (
                  <View
                    key={index}
                    style={[
                      styles.miniBar,
                      { height, backgroundColor: index === 6 ? Colors.success : Colors.border },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Energy Burned */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Energy Burned</Text>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.circularProgress}>
              <CircularProgress
                value={metrics.caloriesBurned}
                maxValue={3000}
                radius={45}
                strokeWidth={8}
                color={Colors.warning}
                unit="cal"
              />
            </View>
            <View style={styles.miniChart}>
              {last7DaysData.map((day, index) => {
                const height = (day.caloriesBurned / 3000) * 40;
                return (
                  <View
                    key={index}
                    style={[
                      styles.miniBar,
                      { height, backgroundColor: index === 6 ? Colors.warning : Colors.border },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>

        {/* Energy Balance */}
        <View style={styles.energyCard}>
          <Text style={styles.energyTitle}>Energy Balance</Text>
          <View style={styles.energyRow}>
            <View style={styles.energyItem}>
              <Text style={styles.energyLabel}>Consumed</Text>
              <Text style={styles.energyValue}>{Math.round(metrics.caloriesConsumed)} cal</Text>
            </View>
            <Ionicons name="remove" size={20} color={Colors.textSecondary} />
            <View style={styles.energyItem}>
              <Text style={styles.energyLabel}>Burned</Text>
              <Text style={styles.energyValue}>{Math.round(metrics.caloriesBurned)} cal</Text>
            </View>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Net Balance</Text>
            <Text
              style={[
                styles.balanceValue,
                metrics.energyBalance < 0 ? styles.deficit : styles.surplus,
              ]}
            >
              {metrics.energyBalance > 0 ? '+' : ''}{Math.round(metrics.energyBalance)} cal
            </Text>
            <Text style={styles.balanceSubtext}>
              {metrics.energyBalance < 0 ? 'Deficit' : 'Surplus'}
            </Text>
          </View>
        </View>

        {/* Stress Score */}
        <View style={styles.stressCard}>
          <View style={styles.stressHeader}>
            <Ionicons name="analytics" size={24} color={Colors.error} />
            <Text style={styles.stressTitle}>Stress Level</Text>
          </View>
          <Text style={styles.stressValue}>{metrics.stressScore}/100</Text>
          <Text style={styles.stressLabel}>
            {metrics.stressScore < 30
              ? 'Low Stress - Excellent!'
              : metrics.stressScore < 60
              ? 'Moderate Stress'
              : 'High Stress - Rest Needed'}
          </Text>
          <View style={styles.stressDetails}>
            <View style={styles.stressDetail}>
              <Text style={styles.stressDetailLabel}>HRV</Text>
              <Text style={styles.stressDetailValue}>{Math.round(metrics.hrv)} ms</Text>
            </View>
            <View style={styles.stressDetail}>
              <Text style={styles.stressDetailLabel}>Resting HR</Text>
              <Text style={styles.stressDetailValue}>{Math.round(metrics.restingHeartRate)} bpm</Text>
            </View>
          </View>
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

// Circular Progress Component
interface CircularProgressProps {
  value: number;
  maxValue: number;
  radius: number;
  strokeWidth: number;
  color: string;
  unit?: string;
  showDecimal?: boolean;
}

function CircularProgress({
  value,
  maxValue,
  radius,
  strokeWidth,
  color,
  unit,
  showDecimal = false,
}: CircularProgressProps) {
  const percentage = (value / maxValue) * 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const size = radius * 2 + strokeWidth;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke="#2A2A2E"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${radius + strokeWidth / 2}, ${radius + strokeWidth / 2}`}
        />
      </Svg>
      <View style={styles.progressText}>
        <Text style={styles.progressValue}>
          {showDecimal ? value.toFixed(1) : unit ? Math.round(value) : `${Math.round(percentage)}%`}
        </Text>
        {unit && <Text style={styles.progressUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: '#1A1A1E',
  },
  backButton: {
    padding: Spacing.xs,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dateButton: {
    padding: Spacing.xs,
  },
  dateButtonDisabled: {
    opacity: 0.3,
  },
  dateText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
    minWidth: 120,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  averagesContainer: {
    marginBottom: Spacing.xl,
  },
  averagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  averageStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#2A2A2E',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.xs,
  },
  averageValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  averageLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  workoutCard: {
    backgroundColor: '#2A2A2E',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  workoutTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  workoutStat: {
    flex: 1,
  },
  workoutStatValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.textLight,
  },
  workoutStatLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  metricCard: {
    width: CARD_WIDTH,
    backgroundColor: '#2A2A2E',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  metricTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textLight,
  },
  circularProgress: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textLight,
  },
  progressUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    height: 40,
  },
  miniBar: {
    flex: 1,
    borderRadius: BorderRadius.xs,
    minHeight: 4,
  },
  energyCard: {
    backgroundColor: '#2A2A2E',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  energyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  energyItem: {
    alignItems: 'center',
  },
  energyLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  energyValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  balanceContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3E',
  },
  balanceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  balanceValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xxs,
  },
  deficit: {
    color: Colors.success,
  },
  surplus: {
    color: Colors.warning,
  },
  balanceSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  stressCard: {
    backgroundColor: '#2A2A2E',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  stressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stressTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  stressValue: {
    fontSize: FontSize.huge,
    fontWeight: FontWeight.bold,
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  stressLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  stressDetails: {
    flexDirection: 'row',
    gap: Spacing.xxxl,
  },
  stressDetail: {
    alignItems: 'center',
  },
  stressDetailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  stressDetailValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
});
