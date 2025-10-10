"use client";

import { useCallback, useEffect, useState } from "react";

import { generateSessionArtifactsAction } from "@/app/actions/generation";
import { saveSessionAction } from "@/app/actions/sessions";

import { useLocalBackup } from "./useLocalBackup";

export function useUploadQueue() {
  const backup = useLocalBackup();
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const updateQueueCount = useCallback(() => {
    setQueueCount(backup.getQueue().length);
  }, [backup]);

  const processQueue = useCallback(async () => {
    if (isProcessing) {
      return;
    }

    const queue = backup.getQueue();
    if (queue.length === 0) {
      return;
    }

    setIsProcessing(true);

    for (const item of queue) {
      try {
        const result = await saveSessionAction({
          transcript: item.transcript,
          durationMs: item.durationMs,
          studentId: item.studentId,
          startedAt: item.startedAt,
        });

        if (!result?.id) {
          throw new Error("Save returned no identifier");
        }

        backup.removeFromQueue(item.id);
        updateQueueCount();

        generateSessionArtifactsAction(result.id).catch((error) => {
          console.error("Failed to enqueue AI generation for queued recording", error);
        });
      } catch (error) {
        console.error("Failed to upload queued recording", error);
        backup.incrementQueueAttempts(item.id);

        if (item.attempts + 1 >= 5) {
          backup.removeFromQueue(item.id);
          updateQueueCount();
        }
      }
    }

    setIsProcessing(false);
    updateQueueCount();
  }, [backup, isProcessing, updateQueueCount]);

  useEffect(() => {
    updateQueueCount();
  }, [updateQueueCount]);

  return {
    processQueue,
    queueCount,
    isProcessing,
    updateQueueCount,
  };
}
