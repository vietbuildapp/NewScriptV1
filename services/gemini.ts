import { GoogleGenAI, Type } from "@google/genai";
import { PROMPTS } from '../prompts';
import { NewsItem, SceneBlock, ThumbnailPrompts, Language } from '../types';
import { cleanJsonString, safeJSONParse, delay } from '../utils/helpers';
import { useAppStore } from '../store/useAppStore';

// We use a singleton pattern for the AI client, lazy initialized
let aiClient: GoogleGenAI | null = null;
let currentKey: string | null = null;

const getAI = () => {
  const apiKey = useAppStore.getState().config.apiKey;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  // Re-initialize if the key has changed
  if (!aiClient || currentKey !== apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
    currentKey = apiKey;
  }
  return aiClient;
};

// --- schemas ---
const NEWS_ITEM_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.INTEGER },
        tin_tuc: { type: Type.STRING },
        khu_vuc: { type: Type.STRING },
        chu_de: { type: Type.STRING, enum: ["quan_su", "chinh_tri", "xa_hoi", "tap_tran", "dia_chinh_tri"] },
        thoi_gian_phat_hanh: { type: Type.STRING },
        tinh_thoi_su: { type: Type.NUMBER },
        muc_do_quan_trong: { type: Type.STRING, enum: ["quoc_gia", "khu_vuc", "toan_cau"] },
        tac_dong_dai: { type: Type.STRING, enum: ["ngan_han", "trung_han", "dai_han"] },
        cac_ben_lien_quan: { type: Type.ARRAY, items: { type: Type.STRING } },
        phan_tich_tac_dong: { type: Type.STRING },
        xu_huong: { type: Type.STRING, enum: ["leo_thang", "on_dinh", "giai_ngoai"] },
        kha_nang_phat_trien: { type: Type.STRING, enum: ["cao", "trung_binh", "thap"] },
        ky_vong_thoi_gian: { type: Type.STRING, enum: ["vai_ngay", "vai_tuan", "vai_thang"] },
        goc_nhin_doc_dao: { type: Type.STRING },
        yeu_to_bat_ngo: { type: Type.STRING },
        thong_diep_chinh: { type: Type.STRING },
        cau_hoi_gay_tranh_cai: { type: Type.STRING },
        so_lieu_quan_trong: { type: Type.STRING },
        lich_su_quan_he: { type: Type.STRING },
        dia_diem_nong: { type: Type.STRING },
        nhan_vat_chinh: { type: Type.ARRAY, items: { type: Type.STRING } },
        timeline_su_kien: { type: Type.STRING },
        do_uu_tien: { type: Type.NUMBER },
        do_hap_dan: { type: Type.NUMBER },
        tieu_de_video: { type: Type.STRING },
        goc_do_khai_thac: { type: Type.STRING },
        ly_do_chon: { type: Type.STRING },
        xac_nhan_thoi_gian: { type: Type.BOOLEAN },
        hashtag: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["id", "tin_tuc", "tieu_de_video", "ly_do_chon", "do_uu_tien"]
  }
};

const SCENE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      scene: { type: Type.INTEGER },
      description: { type: Type.STRING },
      context: { type: Type.STRING },
      subject: { type: Type.STRING },
      motion: { type: Type.STRING },
      camera: { type: Type.STRING },
      visualEffect: { type: Type.STRING },
      audioEffect: { type: Type.STRING },
      voice_over: { type: Type.STRING, description: "The strict single field for narration." },
      feasibilityLevel: { type: Type.STRING, enum: ["Dễ", "Trung bình", "Khó", "Rất khó"] },
      feasibilityNote: { type: Type.STRING },
      imagePrompt: { type: Type.STRING },
      videoPrompt: { type: Type.STRING }
    },
    required: ["scene", "description", "voice_over", "imagePrompt", "videoPrompt"]
  }
};


export const fetchNewsAnalysis = async (): Promise<NewsItem[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        ${PROMPTS.NEWS_ANALYSIS}
        Current Time: ${new Date().toISOString()}
        Use Google Search to find the latest news.
      `,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: NEWS_ITEM_SCHEMA,
        thinkingConfig: { thinkingBudget: 2048 } 
      }
    });
    
    const text = response.text || "[]";
    return safeJSONParse<NewsItem[]>(text, []);
  } catch (error) {
    console.error("News Fetch Error:", error);
    throw error;
  }
};

export const generateOverview = async (newsItem: NewsItem, language: Language): Promise<string> => {
  const ai = getAI();
  const prompt = `
    ${PROMPTS.OVERVIEW_WRITER}
    Target Language: ${language}
    Input News Item:
    ${JSON.stringify(newsItem)}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || "{}";
  // Fallback: If JSON parsing fails but we have text, assume the text IS the overview 
  // (sometimes LLMs forget to wrap in JSON if they are chatty)
  const json = safeJSONParse<{overview: string}>(text, { overview: "" });
  
  if (!json.overview && text.length > 50 && !text.trim().startsWith('{')) {
      return text;
  }

  return json.overview;
};

export const generateScenes = async (
  overview: string, 
  language: Language,
  onProgress?: (msg: string) => void
): Promise<SceneBlock[]> => {
  const ai = getAI();
  const allScenes: SceneBlock[] = [];
  
  // BATCH CONFIGURATION
  // User confirmed: 5-7 scenes per batch, 3s delay.
  const BATCH_SIZE = 7;
  const TARGET_TOTAL = 49; // Multiple of 7 for clean batches
  let currentStart = 1;

  while (currentStart <= TARGET_TOTAL) {
    const currentEnd = Math.min(currentStart + BATCH_SIZE - 1, TARGET_TOTAL);
    const isFirstBatch = currentStart === 1;
    
    if (onProgress) {
      onProgress(`🎬 Generating Batch ${Math.ceil(currentStart/BATCH_SIZE)}: Scenes ${currentStart}-${currentEnd}...`);
    }

    const batchContext = isFirstBatch 
      ? "Start from Scene 1. Begin with strict Date/Time."
      : `Continue immediately from Scene ${currentStart}. The previous scene (${currentStart - 1}) ended with: "${allScenes[allScenes.length-1]?.voiceOver}". Maintain flow.`;
      
    const taskConstraint = `
      CURRENT BATCH TASK:
      Generate ONLY scenes from ${currentStart} to ${currentEnd}.
      Strictly ${BATCH_SIZE} scenes in this JSON response.
    `;

    const prompt = `
      ${PROMPTS.SCENE_DIRECTOR}
      
      ${taskConstraint}
      
      Target Language for Narrative: ${language}
      
      Overview:
      ${overview}
      
      CONTEXT INSTRUCTION:
      ${batchContext}
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: SCENE_SCHEMA,
          thinkingConfig: { thinkingBudget: 2048 } 
        }
      });

      const rawScenes = safeJSONParse<any[]>(response.text || "[]", []);
      
      // Map 'voice_over' (from JSON) to 'voiceOver' (internal TS)
      const batchScenes: SceneBlock[] = rawScenes.map((s, idx) => ({
        ...s,
        scene: currentStart + idx,
        voiceOver: s.voice_over || s.voiceOver || s.narrative || "", // Fallback mapping
      }));

      if (batchScenes.length > 0) {
        allScenes.push(...batchScenes);
      } else {
        if (onProgress) onProgress(`⚠️ Batch returned empty. Retrying loop...`);
      }

    } catch (e) {
      console.error(`Error generating batch ${currentStart}-${currentEnd}`, e);
      if (onProgress) onProgress(`❌ Error generating batch ${currentStart}-${currentEnd}. Skipping.`);
    }

    // Move cursor
    currentStart += BATCH_SIZE;

    // Delay if not finished
    if (currentStart <= TARGET_TOTAL) {
       if (onProgress) onProgress(`⏳ Batch done. Cooling down for 3s...`);
       await delay(3000); // 3 seconds delay as requested
    }
  }

  return allScenes;
};

export const optimizePrompts = async (scenes: SceneBlock[]): Promise<any[]> => {
  const ai = getAI();
  const prompt = `
    ${PROMPTS.PROMPT_OPTIMIZER}
    Input Scenes:
    ${JSON.stringify(scenes.map(s => ({ scene: s.scene, imagePrompt: s.imagePrompt, videoPrompt: s.videoPrompt })))}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });
  
  return safeJSONParse<any[]>(response.text || "[]", []);
};

export const generateThumbnails = async (newsItem: NewsItem): Promise<ThumbnailPrompts> => {
  const ai = getAI();
  const prompt = `
    ${PROMPTS.THUMBNAIL_GENERATOR}
    Input News:
    ${JSON.stringify(newsItem)}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });
  
  const res = safeJSONParse<{thumbnail: ThumbnailPrompts}>(response.text || "{}", { thumbnail: { tiktok_9_16: "", youtube_16_9: "" } });
  return res.thumbnail;
};