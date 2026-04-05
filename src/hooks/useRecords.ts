import { useState, useEffect } from 'react';
import { SavedRecord } from '../types';

const STORAGE_KEY = 'wrong_question_book_records';

export function useRecords() {
  const [records, setRecords] = useState<SavedRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse records", e);
      }
    }
  }, []);

  const saveToStorage = (newRecords: SavedRecord[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords));
    setRecords(newRecords);
  };

  const addRecord = (record: SavedRecord) => {
    const newRecords = [record, ...records];
    saveToStorage(newRecords);
  };

  const deleteRecord = (id: string) => {
    const newRecords = records.filter(r => r.id !== id);
    saveToStorage(newRecords);
  };

  const updateRecord = (record: SavedRecord) => {
    const newRecords = records.map(r => r.id === record.id ? record : r);
    saveToStorage(newRecords);
  };

  return { records, addRecord, deleteRecord, updateRecord };
}
