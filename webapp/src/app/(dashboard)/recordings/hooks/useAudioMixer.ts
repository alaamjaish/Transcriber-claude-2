﻿"use client";

import { useCallback, useRef, useState } from "react";

type SystemAudioConstraints = MediaTrackConstraints & { systemAudio?: "include" | "exclude" };

interface MixerOptions {
  includeSystemAudio: boolean;
  micGain: number;
  systemGain: number;
}

interface MixerState {
  stream: MediaStream | null;
  error: string | null;
  requesting: boolean;
}

interface AudioMixer {
  state: MixerState;
  start: (options: MixerOptions) => Promise<MediaStream>;
  stop: () => void;
  setMicGain: (value: number) => void;
  setSystemGain: (value: number) => void;
}

export function useAudioMixer(): AudioMixer {
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const systemGainRef = useRef<GainNode | null>(null);

  const [state, setState] = useState<MixerState>({
    stream: null,
    error: null,
    requesting: false,
  });

  const cleanup = useCallback(() => {
    [micStreamRef.current, systemStreamRef.current].forEach((stream) => {
      stream?.getTracks().forEach((track) => track.stop());
    });
    micStreamRef.current = null;
    systemStreamRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    destinationRef.current = null;
    micGainRef.current = null;
    systemGainRef.current = null;

    setState((prev) => ({ ...prev, stream: null }));
  }, []);

  const start = useCallback(async (options: MixerOptions) => {
    setState({ stream: null, error: null, requesting: true });
    cleanup();

    try {
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;
      destinationRef.current = audioContext.createMediaStreamDestination();

      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      const micSource = audioContext.createMediaStreamSource(micStreamRef.current);
      micGainRef.current = audioContext.createGain();
      micGainRef.current.gain.value = options.micGain;
      micSource.connect(micGainRef.current).connect(destinationRef.current);

      if (options.includeSystemAudio) {
        try {
          systemStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
            audio: { systemAudio: "include" } as SystemAudioConstraints,
            video: true,
          });
          const systemTracks = systemStreamRef.current.getAudioTracks();
          if (systemTracks.length > 0) {
            const systemSource = audioContext.createMediaStreamSource(systemStreamRef.current);
            systemGainRef.current = audioContext.createGain();
            systemGainRef.current.gain.value = options.systemGain;
            systemSource.connect(systemGainRef.current).connect(destinationRef.current);
          }

          const videoTrack = systemStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.addEventListener("ended", () => cleanup());
          }
        } catch (err) {
          console.warn("System audio capture denied", err);
        }
      }

      const mixedStream = destinationRef.current.stream;
      setState({ stream: mixedStream, error: null, requesting: false });
      return mixedStream;
    } catch (error) {
      console.error("useAudioMixer start error", error);
      cleanup();
      const message = (error as Error).message || "Failed to start audio";
      setState({ stream: null, error: message, requesting: false });
      throw error;
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const setMicGain = useCallback((value: number) => {
    if (micGainRef.current) {
      micGainRef.current.gain.value = value;
    }
  }, []);

  const setSystemGain = useCallback((value: number) => {
    if (systemGainRef.current) {
      systemGainRef.current.gain.value = value;
    }
  }, []);

  return {
    state,
    start,
    stop,
    setMicGain,
    setSystemGain,
  };
}
