export enum AspectRatio {
  RATIO_9_16 = '9:16',
  RATIO_3_4 = '3:4',
  RATIO_1_1 = '1:1',
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  sceneName: string;
  description: string;
  isLoading?: boolean;
  isVideoLoading?: boolean;
  videoUrl?: string;
}

export interface SceneScript {
  id: string;
  title: string;
  description: string;
  visualPrompt: string; // The specific instruction for the image generator
}

export interface AppState {
  kolImage: File | null;
  kolImagePreview: string | null;
  productImages: File[]; 
  productImagePreviews: string[]; 
  productDescription: string;
  aspectRatio: AspectRatio;
  
  // State for Step 1: Styling
  isStyling: boolean;
  styledImage: string | null; // The result of step 1 (Base64)
  
  // State for Step 2: Script
  isGeneratingScript: boolean; // Loading state for generating the text script
  script: SceneScript[]; // The dynamic list of scenes
  isGeneratingImages: boolean; // Loading state for generating images
  generatedImages: GeneratedImage[];
  error: string | null;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}