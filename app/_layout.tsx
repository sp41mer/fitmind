import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-routine" options={{ headerShown: false }} />
      <Stack.Screen name="active-workout" options={{ headerShown: false }} />
      <Stack.Screen name="workout-detail" options={{ headerShown: false }} />
      <Stack.Screen name="exercise-stats" options={{ headerShown: false }} />
      <Stack.Screen name="routine-history" options={{ headerShown: false }} />
    </Stack>
  );
}
