import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

interface HealthWidgetProps {
  type: 'recovery' | 'sleep' | 'exertion' | 'energy';
  value: number;
  maxValue: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function HealthWidget({ type, value, maxValue, label, icon }: HealthWidgetProps) {
  const percentage = (value / maxValue) * 100;
  const radius = 35;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const size = radius * 2 + strokeWidth;

  const colors = {
    recovery: Colors.success,
    sleep: '#8B5CF6',
    exertion: Colors.success,
    energy: Colors.warning,
  };

  const color = colors[type];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name={icon} size={16} color={Colors.textSecondary} />
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.progressContainer}>
        <Svg width={size} height={size}>
          <Circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            stroke={Colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
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
        <View style={styles.valueContainer}>
          <Text style={styles.value}>
            {type === 'energy' ? Math.round(value) : Math.round(percentage)}
          </Text>
          <Text style={styles.unit}>{type === 'energy' ? '' : '%'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  progressContainer: {
    position: 'relative',
  },
  valueContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  unit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
