import { GoogleGenAI } from "@google/genai";
import { AspectRatio, SceneScript } from "../types";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateStoryScript = async (
  prompt: string
): Promise<SceneScript[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found.");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No script generated.");

    const script = JSON.parse(text) as SceneScript[];
    return script;

  } catch (error: any) {
    console.error("Script Generation Error:", error);
    throw new Error("Failed to generate storyline script.");
  }
};

export const generateFashionImage = async (
  prompt: string,
  kolImage: File | null,
  productImages: File[],
  aspectRatio: AspectRatio,
  styledReferenceBase64?: string | null
): Promise<string> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select an API key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  let parts: any[] = [{ text: prompt }];

  if (styledReferenceBase64) {
    const cleanRef = styledReferenceBase64.includes(',') 
      ? styledReferenceBase64.split(',')[1] 
      : styledReferenceBase64;

    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: cleanRef
      }
    });
    parts.push({ text: "MAIN REFERENCE IMAGE: The image above is the CONFIRMED MODEL LOOK. USE THIS AS THE SOURCE OF TRUTH." });
  }

  if (kolImage) {
    const kolBase64 = await fileToBase64(kolImage);
    parts.push({
      inlineData: {
        mimeType: kolImage.type || 'image/jpeg',
        data: kolBase64
      }
    });
    parts.push({ text: "ORIGINAL FACE REFERENCE." });
  }

  const productParts = await Promise.all(productImages.map(async (file) => ({
    inlineData: {
      mimeType: file.type || 'image/jpeg',
      data: await fileToBase64(file)
    }
  })));
  
  if (productParts.length > 0) {
      parts.push({ text: "PRODUCT DETAILS:" });
      parts = parts.concat(productParts);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: '1K' 
        }
      }
    });

    const outputParts = response.candidates?.[0]?.content?.parts;
    if (outputParts) {
      for (const part of outputParts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data received from API");
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate image");
  }
};

// --- NEW: Generate Video from Image Reference ---
export const generateSceneVideo = async (
  imageUri: string,
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found.");

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = imageUri.split(',')[1];

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `${prompt}, cinematic movement, high fashion lifestyle, subtle natural movement, 4k, professional lighting`,
      image: {
        imageBytes: cleanBase64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio === AspectRatio.RATIO_9_16 ? '9:16' : '16:9'
      }
    });

    // Polling for the video result
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed - no URI");

    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Video Generation Error:", error);
    throw new Error(error.message || "Failed to generate video");
  }
};