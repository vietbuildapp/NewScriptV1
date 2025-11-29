export type Language = 'English' | 'German' | 'French' | 'Japanese' | 'Korean';

export interface NewsItem {
  id: number;
  tin_tuc: string;
  khu_vuc: string;
  chu_de: "quan_su" | "chinh_tri" | "xa_hoi" | "tap_tran" | "dia_chinh_tri";
  thoi_gian_phat_hanh: string;
  tinh_thoi_su: number;
  muc_do_quan_trong: "quoc_gia" | "khu_vuc" | "toan_cau";
  tac_dong_dai: "ngan_han" | "trung_han" | "dai_han";
  cac_ben_lien_quan: string[];
  phan_tich_tac_dong: string;
  xu_huong: "leo_thang" | "on_dinh" | "giai_ngoai";
  kha_nang_phat_trien: "cao" | "trung_binh" | "thap";
  ky_vong_thoi_gian: "vai_ngay" | "vai_tuan" | "vai_thang";
  goc_nhin_doc_dao: string;
  yeu_to_bat_ngo: string;
  thong_diep_chinh: string;
  cau_hoi_gay_tranh_cai: string;
  so_lieu_quan_trong: string;
  lich_su_quan_he: string;
  dia_diem_nong: string;
  nhan_vat_chinh: string[];
  timeline_su_kien: string;
  do_uu_tien: number;
  do_hap_dan: number;
  tieu_de_video: string;
  goc_do_khai_thac: string;
  ly_do_chon: string;
  xac_nhan_thoi_gian: boolean;
  hashtag: string[];
}

export interface SceneBlock {
  scene: number;
  description: string;
  context: string;
  subject: string;
  motion: string;
  camera: string;
  visualEffect: string;
  audioEffect: string;
  voiceOver: string; // UNIFIED FIELD: Must be used for all narration
  feasibilityLevel: "Dễ" | "Trung bình" | "Khó" | "Rất khó";
  feasibilityNote: string;
  suggestion_prompt?: string;
  suggestion_feasibility?: string;
  imagePrompt: string; // Always English
  videoPrompt: string; // Always English
  optimizedImagePrompt?: string;
  optimizedVideoPrompt?: string;
}

export interface ThumbnailPrompts {
  tiktok_9_16: string;
  youtube_16_9: string;
}

export interface ProcessedNews {
  id: number;
  sourceNews: NewsItem;
  overview?: string;
  scenes?: SceneBlock[];
  thumbnailPrompt?: ThumbnailPrompts;
  status: 'IDLE' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  currentStep: 'FETCH' | 'OVERVIEW' | 'SCENES' | 'OPTIMIZE' | 'THUMBNAIL' | 'DONE';
  logs: string[];
  error?: string;
  createdAt: number;
}

export interface AppConfig {
  language: Language;
  autoRetry: boolean;
  mockMode: boolean;
  apiKey: string;
}