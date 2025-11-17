import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { AppSettings, WeightUnit } from '@/types/settings';
import { loadSettings, saveSettings } from '@/utils/settingsStorage';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    weightUnit: 'kg',
  });

  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
    }, [])
  );

  const loadSettingsData = async () => {
    try {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleWeightUnitChange = async (unit: WeightUnit) => {
    const newSettings = { ...settings, weightUnit: unit };
    setSettings(newSettings);
    try {
      await saveSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weight Unit Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weight Unit</Text>
          <Text style={styles.sectionDescription}>
            Choose your preferred weight unit. Previous workouts will be automatically converted.
          </Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                settings.weightUnit === 'kg' && styles.optionButtonActive,
              ]}
              onPress={() => handleWeightUnitChange('kg')}
              activeOpacity={0.7}
            >
              <View style={styles.optionButtonContent}>
                <Ionicons
                  name={settings.weightUnit === 'kg' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={settings.weightUnit === 'kg' ? Colors.accent : Colors.textSecondary}
                />
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionTitle,
                      settings.weightUnit === 'kg' && styles.optionTitleActive,
                    ]}
                  >
                    Kilograms (kg)
                  </Text>
                  <Text style={styles.optionSubtitle}>Metric system</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                settings.weightUnit === 'lbs' && styles.optionButtonActive,
              ]}
              onPress={() => handleWeightUnitChange('lbs')}
              activeOpacity={0.7}
            >
              <View style={styles.optionButtonContent}>
                <Ionicons
                  name={settings.weightUnit === 'lbs' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={settings.weightUnit === 'lbs' ? Colors.accent : Colors.textSecondary}
                />
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionTitle,
                      settings.weightUnit === 'lbs' && styles.optionTitleActive,
                    ]}
                  >
                    Pounds (lbs)
                  </Text>
                  <Text style={styles.optionSubtitle}>Imperial system</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created with</Text>
              <Text style={styles.infoValue}>Fastshot AI</Text>
            </View>
          </View>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: FontSize.huge,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  section: {
    marginBottom: Spacing.xxxl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionButton: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  optionButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  optionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xxs,
  },
  optionTitleActive: {
    color: Colors.accent,
  },
  optionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadow.small,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
});
