import { NewellTextRequest, AIGeneratedRoutine, AIGeneratedDay } from '@/types/routine';

const NEWELL_API_URL = process.env.EXPO_PUBLIC_NEWELL_API_URL || 'https://newell.fastshot.ai';
const PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID || 'ea033de4-41dc-48ab-83ba-0407a170fb2c';

export async function generateRoutineWithAI(userPrompt: string): Promise<AIGeneratedRoutine> {
  try {
    // Construct a detailed prompt that instructs the AI to return JSON for multi-day routine
    const systemPrompt = `You are a fitness expert assistant. Based on the user's request, create a complete workout routine with multiple days and return ONLY a valid JSON object with this exact structure:
{
  "routineName": "Name of the routine",
  "days": [
    {
      "dayName": "Day 1 - Push",
      "exercises": [
        {"name": "Bench Press", "sets": 4, "restTime": 90},
        {"name": "Overhead Press", "sets": 3, "restTime": 90}
      ]
    },
    {
      "dayName": "Day 2 - Pull",
      "exercises": [
        {"name": "Deadlift", "sets": 4, "restTime": 120},
        {"name": "Pull-ups", "sets": 3, "restTime": 90}
      ]
    }
  ]
}

CRITICAL: Respond in the SAME LANGUAGE as the user's request. If the user writes in Russian, all names must be in Russian. If in Chinese, use Chinese. If in English, use English. Match the user's language exactly for all text fields (routineName, dayName, exercise names).

Important guidelines:
- Create a logical multi-day split (e.g., Push/Pull/Legs, Upper/Lower, Full Body)
- If the user doesn't specify number of days, create 3-4 days
- Include appropriate rest times (60-120 seconds typically)
- Balance muscle groups across days
- Include 4-6 exercises per day

User request: ${userPrompt}

Return ONLY the JSON object, no additional text or explanation.`;

    const requestBody: NewellTextRequest = {
      project_id: PROJECT_ID,
      prompt: systemPrompt,
      max_tokens: 1000,
      temperature: 0.7,
    };

    const response = await fetch(`${NEWELL_API_URL}/v1/generate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Project validation failed. Please check your project ID.');
      }
      throw new Error(`API error: ${response.status}`);
    }

    const textResponse = await response.text();

    // Try to extract JSON from the response
    // The AI might return text before/after the JSON, so we need to extract it
    let jsonStr = textResponse.trim();

    // Try to find JSON object in the response
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsedResponse: AIGeneratedRoutine = JSON.parse(jsonStr);

    // Validate the response structure
    if (!parsedResponse.routineName || !Array.isArray(parsedResponse.days)) {
      throw new Error('Invalid response format from AI');
    }

    return parsedResponse;
  } catch (error) {
    console.error('Error generating routine with AI:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response. Please try again.');
    }
    throw error;
  }
}

export async function generateDayWithAI(userPrompt: string): Promise<AIGeneratedDay> {
  try {
    // Construct a detailed prompt for generating a single training day
    const systemPrompt = `You are a fitness expert assistant. Based on the user's request, create a single training day and return ONLY a valid JSON object with this exact structure:
{
  "dayName": "Push Day",
  "exercises": [
    {"name": "Bench Press", "sets": 4, "restTime": 90},
    {"name": "Overhead Press", "sets": 3, "restTime": 90},
    {"name": "Tricep Dips", "sets": 3, "restTime": 60}
  ]
}

CRITICAL: Respond in the SAME LANGUAGE as the user's request. If the user writes in Russian, all names must be in Russian. If in Chinese, use Chinese. If in English, use English. Match the user's language exactly for all text fields (dayName, exercise names).

Important guidelines:
- Create 4-6 exercises for the day
- Include appropriate rest times (60-120 seconds typically)
- Balance the workout appropriately
- Choose exercises that work well together

User request: ${userPrompt}

Return ONLY the JSON object, no additional text or explanation.`;

    const requestBody: NewellTextRequest = {
      project_id: PROJECT_ID,
      prompt: systemPrompt,
      max_tokens: 1000,
      temperature: 0.7,
    };

    const response = await fetch(`${NEWELL_API_URL}/v1/generate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Project validation failed. Please check your project ID.');
      }
      throw new Error(`API error: ${response.status}`);
    }

    const textResponse = await response.text();

    // Try to extract JSON from the response
    let jsonStr = textResponse.trim();

    // Try to find JSON object in the response
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsedResponse: AIGeneratedDay = JSON.parse(jsonStr);

    // Validate the response structure
    if (!parsedResponse.dayName || !Array.isArray(parsedResponse.exercises)) {
      throw new Error('Invalid response format from AI');
    }

    return parsedResponse;
  } catch (error) {
    console.error('Error generating day with AI:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response. Please try again.');
    }
    throw error;
  }
}

export async function generateWorkoutFeedback(workoutSummary: {
  routineName: string;
  dayName: string;
  duration: number;
  totalSets: number;
  totalVolume: number;
  exercises: Array<{
    name: string;
    completedSets: number;
    totalSets: number;
  }>;
  personalRecords?: Array<{
    exerciseName: string;
    prTypes: string[];
  }>;
}): Promise<string> {
  try {
    // Build workout summary for AI
    const exercisesSummary = workoutSummary.exercises
      .map(
        (ex) =>
          `${ex.name}: ${ex.completedSets}/${ex.totalSets} sets`
      )
      .join('\n');

    const prsSummary = workoutSummary.personalRecords && workoutSummary.personalRecords.length > 0
      ? `\n\nPersonal Records achieved:\n${workoutSummary.personalRecords
          .map((pr) => `${pr.exerciseName}: ${pr.prTypes.join(', ')}`)
          .join('\n')}`
      : '';

    const systemPrompt = `You are a supportive and knowledgeable fitness coach. A user just completed a workout and you need to provide brief, encouraging feedback.

Workout Details:
- Routine: ${workoutSummary.routineName}
- Day: ${workoutSummary.dayName}
- Duration: ${Math.floor(workoutSummary.duration / 60)} minutes
- Total Sets: ${workoutSummary.totalSets}
- Total Volume: ${Math.round(workoutSummary.totalVolume)} kg
${prsSummary}

Exercises:
${exercisesSummary}

Provide a brief (2-3 sentences) encouraging feedback. If there are PRs, congratulate them. If volume or duration is notably high/low, comment on that. Be positive and motivating. Return ONLY the feedback text, no JSON or extra formatting.`;

    const requestBody: NewellTextRequest = {
      project_id: PROJECT_ID,
      prompt: systemPrompt,
      max_tokens: 200,
      temperature: 0.7,
    };

    const response = await fetch(`${NEWELL_API_URL}/v1/generate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Project validation failed. Please check your project ID.');
      }
      throw new Error(`API error: ${response.status}`);
    }

    const feedback = await response.text();
    return feedback.trim();
  } catch (error) {
    console.error('Error generating workout feedback:', error);
    throw error;
  }
}
