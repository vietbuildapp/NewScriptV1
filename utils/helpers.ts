export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const cleanJsonString = (str: string): string => {
  // Remove markdown code blocks if present
  let clean = str.replace(/```json\n?|\n?```/g, '');
  // Attempt to find the first '{' or '['
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  
  if (firstBrace === -1 && firstBracket === -1) return clean;
  
  let start = 0;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
  } else {
      start = firstBracket;
  }
  
  clean = clean.substring(start);
  
  // Find the last '}' or ']'
  const lastBrace = clean.lastIndexOf('}');
  const lastBracket = clean.lastIndexOf(']');
  let end = clean.length;
  
  if (lastBrace !== -1 && lastBrace > lastBracket) {
      end = lastBrace + 1;
  } else if (lastBracket !== -1) {
      end = lastBracket + 1;
  }
  
  return clean.substring(0, end);
};

export const safeJSONParse = <T>(str: string, fallback: T): T => {
  try {
    const cleaned = cleanJsonString(str);
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("JSON Parse Error", e, str);
    return fallback;
  }
};
