// PROMPT CHO BƯỚC 1: TẠO STYLE (FASHIONISTA MAKEOVER)
export const STYLING_PROMPT = (kolName: string, productDesc: string) => 
  `TASK: THONGDH STUDIO - HIGH FASHION LOOKBOOK PRODUCTION IN VIETNAM.
  
  INPUTS:
  1. KOL Image: Reference for FACE IDENTITY.
  2. Product: "${productDesc}".

  CRITICAL CONSTRAINTS (STRICTLY FOLLOW):
  1. ⛔️ FACE PRESERVATION: The face MUST remain exactly ${kolName} from the input image. IDENTITY FIDELITY IS #1 PRIORITY. Do not morph or change ethnicity.
  2. ⛔️ HEIGHT & PROPORTIONS: Keep original body type.
  3. ✅ BACKGROUND: THONGDH SIGNATURE VIETNAMESE SETTING. Clean, minimalist, high-end editorial background.

  STYLING INSTRUCTIONS:
  1. OUTFIT: Model wears "${productDesc}". 100% accurate details.
  2. MIX & MATCH: ThongDH Editorial styling. Minimalist, premium accessories.
  3. LIGHTING: Cinematic soft natural sunlight with subtle shadows.
  
  OUTPUT: Ultra-photorealistic high-fashion editorial shot of ${kolName} as the master reference.`;

// PROMPT CHO BƯỚC 2: TẠO KỊCH BẢN STORYLINE (Modern Lifestyle & Viral Content Style)
export const SCRIPT_PLANNING_PROMPT = (productDesc: string) => 
  `You are the Lead Creative Director at ThongDH Studio, specialized in luxury viral TikTok/Reels fashion content.
  
  PRODUCT: "${productDesc}"
  
  TASK: Create a 6-scene "MODERN LIFESTYLE POV" storyboard for a high-end affiliate campaign.
  
  LOCATION STRATEGY:
  - Choose ONE signature ThongDH location in Vietnam (e.g., A minimalist Nordic penthouse in Saigon, a high-end Brutalist museum garden, or a luxury contemporary art space).
  
  THONGDH SIGNATURE STORYBOARD:
  Scene 1: "The Cinematic Entry" - POV of model entering the light, looking at the camera with confidence.
  Scene 2: "The Detail Edit" - Extreme close-up on ${productDesc} fabric/details, hands gently brushing the material.
  Scene 3: "The Street Motion" - Dynamic walk-by shot, showing the fluid movement of the outfit.
  Scene 4: "The Candid Moment" - Model in a relaxed lifestyle pose, looking elegant but approachable.
  Scene 5: "The 360 Spin" - A slow, aesthetic spin showing the complete look from all angles.
  Scene 6: "The Editorial Exit" - Strong gaze, high-contrast flash photography vibe, iconic finale.
  
  REQUIREMENTS:
  1. Visual Language: "ThongDH Aesthetic", "Cinematic Grain", "High-end Minimalist", "Natural Movement".
  2. Continuity: MUST maintain identical face, outfit, and location across all 6 frames.
  
  OUTPUT FORMAT: JSON ONLY. Array of 6 objects.
  Structure:
  [
    {
      "id": "scene_X",
      "title": "SCENE X: [Trendy Title]",
      "description": "[Vibe description]",
      "visualPrompt": "[Cinematic instruction for Image AI: Focus on MOTION and THONGDH signature lighting]"
    }
  ]
  `;

export const DEFAULT_KOL_NAME = "Lê Minh Anh";