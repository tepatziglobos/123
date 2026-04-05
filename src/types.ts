import { SimilarQuestion, OCRResult } from "./geminiService";

export interface SavedRecord {
  id: string;
  timestamp: number;
  originalImage?: string;
  ocrResult: OCRResult;
  similarQuestions: SimilarQuestion[];
}

export type AppState = {
  records: SavedRecord[];
  addRecord: (record: SavedRecord) => void;
  deleteRecord: (id: string) => void;
  updateRecord: (record: SavedRecord) => void;
};
