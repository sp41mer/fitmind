/**
 * Image Service
 * Generates AI images for routines using Replicate API
 */

const REPLICATE_API_TOKEN = process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN || '';
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[] | string | null;
  error?: string;
}

/**
 * Generate a vibrant, energetic AI image for a workout routine
 * Uses the routine name to create abstract, motivational artwork
 */
export async function generateRoutineImage(routineName: string): Promise<string> {
  try {
    // Create an enhanced prompt for vibrant, energetic, abstract workout art
    const enhancedPrompt = `Abstract energetic fitness artwork inspired by "${routineName}".
Vibrant electric blue (#6366F1) and charcoal dark tones.
Dynamic flowing energy, motion lines, powerful geometric shapes.
Modern minimalist style. High energy. Motivational. No text or words.
Professional fitness app aesthetic. 4K quality.`;

    console.log('[ImageService] Generating image for routine:', routineName);

    // Create prediction using flux-schnell (fast model)
    const createResponse = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'a45f82a1382bed5c7aeb861dac7c7d191b0fdf74d8d57c4a0e6ed7d4d0bf7d24',
        input: {
          prompt: enhancedPrompt,
          num_outputs: 1,
          aspect_ratio: '16:9',
          output_format: 'jpg',
          output_quality: 90,
        },
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[ImageService] Failed to create prediction:', errorText);
      throw new Error(`Failed to generate image: ${createResponse.status}`);
    }

    const prediction: ReplicatePrediction = await createResponse.json();
    console.log('[ImageService] Initial prediction:', prediction.status);

    // If the prediction didn't complete immediately, poll for results
    let finalPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max wait time

    while (
      finalPrediction.status !== 'succeeded' &&
      finalPrediction.status !== 'failed' &&
      finalPrediction.status !== 'canceled' &&
      attempts < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(
        `${REPLICATE_API_URL}/${finalPrediction.id}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to check prediction status');
      }

      finalPrediction = await statusResponse.json();
      attempts++;

      console.log('[ImageService] Prediction status:', finalPrediction.status, `(attempt ${attempts})`);
    }

    if (finalPrediction.status === 'succeeded' && finalPrediction.output) {
      // Extract the image URL from the output
      const imageUrl = Array.isArray(finalPrediction.output)
        ? finalPrediction.output[0]
        : finalPrediction.output;

      console.log('[ImageService] Image generated successfully:', imageUrl);
      return imageUrl;
    }

    if (finalPrediction.status === 'failed') {
      throw new Error(finalPrediction.error || 'Image generation failed');
    }

    throw new Error('Image generation timed out or was canceled');
  } catch (error) {
    console.error('[ImageService] Error generating routine image:', error);
    throw error;
  }
}
