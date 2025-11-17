import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '@/types/settings';

const SETTINGS_KEY = '@fitforge_settings';

const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: 'kg',
};

export const loadSettings = async (): Promise<AppSettings> => {
  try {
    const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};
