/**
 * Image Service
 * Generates AI images for routines using Newell AI
 */

const NEWELL_API_URL = process.env.EXPO_PUBLIC_NEWELL_API_URL || 'https://newell.fastshot.ai';
const PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID || '';

interface NewellImageRequest {
  project_id: string;
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  num_outputs?: number;
}

interface NewellImageResponse {
  images: string[]; // Array of base64 or URL strings
}

/**
 * Generate a vibrant, energetic AI image for a workout routine
 * Uses the routine name to create abstract, motivational artwork using Newell AI
 */
export async function generateRoutineImage(routineName: string): Promise<string> {
  try {
    // Create an enhanced prompt for vibrant, energetic, abstract workout art
    const enhancedPrompt = `Abstract energetic fitness artwork inspired by "${routineName}".
Vibrant electric blue (#6366F1) and charcoal dark tones.
Dynamic flowing energy, motion lines, powerful geometric shapes.
Modern minimalist style. High energy. Motivational. No text or words.
Professional fitness app aesthetic. 4K quality.`;

    console.log('[ImageService] Generating image with Newell AI for routine:', routineName);

    const requestBody: NewellImageRequest = {
      project_id: PROJECT_ID,
      prompt: enhancedPrompt,
      width: 1024,
      height: 576, // 16:9 aspect ratio
      num_outputs: 1,
    };

    const response = await fetch(`${NEWELL_API_URL}/v1/generate/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ImageService] Newell AI request failed:', errorText);

      if (response.status === 403) {
        throw new Error('Project validation failed. Please check your project ID.');
      }
      throw new Error(`Failed to generate image: ${response.status}`);
    }

    const result: NewellImageResponse = await response.json();

    if (!result.images || result.images.length === 0) {
      throw new Error('No image was generated');
    }

    const imageUrl = result.images[0];
    console.log('[ImageService] Image generated successfully with Newell AI');

    return imageUrl;
  } catch (error) {
    console.error('[ImageService] Error generating routine image with Newell AI:', error);
    throw error;
  }
}
