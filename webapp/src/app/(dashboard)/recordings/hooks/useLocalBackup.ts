"use client";

import { useEffect, useRef } from "react";

interface RecordingDraft {
  studentId: string;
  studentName: string;
  transcript: string;
  startedAt: number;
  durationMs: number;
  speakerCount: number;
  status: "recording" | "paused";
  lastSaved: number;
}

interface UploadQueueItem {
  id: string;
  studentId: string;
  studentName: string;
  transcript: string;
  startedAt: number;
  durationMs: number;
  createdAt: number;
  attempts: number;
}

const DRAFT_KEY = "recording_draft";
const QUEUE_KEY = "upload_queue";

export function useLocalBackup() {
  const autoSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveDraft = (draft: RecordingDraft) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("[recording-backup] Failed to save draft", error);
    }
  };

  const loadDraft = (): RecordingDraft | null => {
    try {
      const data = localStorage.getItem(DRAFT_KEY);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as RecordingDraft;
    } catch (error) {
      console.error("[recording-backup] Failed to load draft", error);
      return null;
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error("[recording-backup] Failed to clear draft", error);
    }
  };

  const getQueue = (): UploadQueueItem[] => {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data) as UploadQueueItem[];
    } catch (error) {
      console.error("[recording-backup] Failed to read queue", error);
      return [];
    }
  };

  const writeQueue = (queue: UploadQueueItem[]) => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("[recording-backup] Failed to write queue", error);
    }
  };

  const addToQueue = (item: Omit<UploadQueueItem, "id" | "createdAt" | "attempts">) => {
    const queue = getQueue();
    const newItem: UploadQueueItem = {
      ...item,
      id: `queue_${Date.now()}`,
      createdAt: Date.now(),
      attempts: 0,
    };
    queue.push(newItem);
    writeQueue(queue);
    return newItem;
  };

  const removeFromQueue = (id: string) => {
    const queue = getQueue().filter((item) => item.id !== id);
    writeQueue(queue);
  };

  const incrementQueueAttempts = (id: string) => {
    const queue = getQueue();
    const target = queue.find((item) => item.id === id);
    if (target) {
      target.attempts += 1;
      writeQueue(queue);
    }
  };

  const startAutoSave = (getDraft: () => RecordingDraft) => {
    stopAutoSave();
    autoSaveInterval.current = setInterval(() => {
      try {
        const draft = getDraft();
        saveDraft(draft);
      } catch (error) {
        console.error("[recording-backup] Failed during auto-save", error);
      }
    }, 10_000);
  };

  const stopAutoSave = () => {
    if (autoSaveInterval.current) {
      clearInterval(autoSaveInterval.current);
      autoSaveInterval.current = null;
    }
  };

  useEffect(() => () => stopAutoSave(), []);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    addToQueue,
    getQueue,
    removeFromQueue,
    incrementQueueAttempts,
    startAutoSave,
    stopAutoSave,
  };
}
