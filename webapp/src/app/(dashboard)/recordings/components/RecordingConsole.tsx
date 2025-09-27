"use client";

import { useMemo, useReducer } from "react";

import { RecordingControls } from "./RecordingControls";
import { StatusIndicator } from "./StatusIndicator";
import { TranscriptPane } from "./TranscriptPane";

export type RecordingPhase = "idle" | "requesting" | "connecting" | "live" | "finishing" | "finished" | "error";

export interface RecordingResult {
  transcript: string;
  durationMs: number;
  speakerCount: number;
  startedAt: number | null;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
}

interface RecordingState {
  phase: RecordingPhase;
  liveSegments: TranscriptSegment[];
  finalSegments: TranscriptSegment[];
  errorMessage: string | null;
  startedAt: number | null;
  durationMs: number;
  speakerCount: number;
}

const INITIAL_STATE: RecordingState = {
  phase: "idle",
  liveSegments: [],
  finalSegments: [],
  errorMessage: null,
  startedAt: null,
  durationMs: 0,
  speakerCount: 0,
};

type Action =
  | { type: "REQUEST" }
  | { type: "CONNECT" }
  | { type: "LIVE"; startedAt: number }
  | { type: "APPEND_LIVE"; segments: TranscriptSegment[]; speakerCount: number }
  | { type: "APPEND_FINAL"; segments: TranscriptSegment[]; speakerCount: number }
  | { type: "FINISH"; durationMs: number }
  | { type: "COMPLETE" }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

function reducer(state: RecordingState, action: Action): RecordingState {
  switch (action.type) {
    case "REQUEST":
      return { ...INITIAL_STATE, phase: "requesting" };
    case "CONNECT":
      return { ...state, phase: "connecting", errorMessage: null };
    case "LIVE":
      return { ...state, phase: "live", startedAt: action.startedAt, errorMessage: null };
    case "APPEND_LIVE":
      return {
        ...state,
        liveSegments: action.segments,
        speakerCount: action.speakerCount,
      };
    case "APPEND_FINAL":
      return {
        ...state,
        finalSegments: action.segments,
        speakerCount: action.speakerCount,
      };
    case "FINISH":
      return {
        ...state,
        phase: "finishing",
        durationMs: action.durationMs,
        // Keep liveSegments - they now contain the complete cumulative transcript
      };
    case "COMPLETE":
      return {
        ...state,
        phase: "finished",
        errorMessage: null,
      };
    case "ERROR":
      return { ...state, phase: "error", errorMessage: action.message };
    case "RESET":
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

export interface RecordingActions {
  setConnecting: () => void;
  setLive: (startedAt: number) => void;
  updateLive: (segments: TranscriptSegment[], speakerCount: number) => void;
  updateFinal: (segments: TranscriptSegment[], speakerCount: number) => void;
  finish: (durationMs: number) => void;
  fail: (message: string) => void;
  reset: () => void;
}

interface RecordingConsoleProps {
  onStart: (actions: RecordingActions) => Promise<void> | void;
  onStop: (actions: RecordingActions, result: RecordingResult) => Promise<void> | void;
  onCancel: (actions: RecordingActions) => Promise<void> | void;
}

export function RecordingConsole({ onStart, onStop, onCancel }: RecordingConsoleProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const actions = useMemo<RecordingActions>(
    () => ({
      setConnecting: () => dispatch({ type: "CONNECT" }),
      setLive: (startedAt: number) => dispatch({ type: "LIVE", startedAt }),
      updateLive: (segments, speakerCount) =>
        dispatch({ type: "APPEND_LIVE", segments, speakerCount }),
      updateFinal: (segments, speakerCount) =>
        dispatch({ type: "APPEND_FINAL", segments, speakerCount }),
      finish: (durationMs: number) => dispatch({ type: "FINISH", durationMs }),
      fail: (message: string) => dispatch({ type: "ERROR", message }),
      reset: () => dispatch({ type: "RESET" }),
    }),
    [],
  );

  const liveText = useMemo(
    () => state.liveSegments.map((segment) => `${segment.speaker}: ${segment.text}`).join("\n"),
    [state.liveSegments],
  );

  const finalText = useMemo(
    () => state.finalSegments.map((segment) => `${segment.speaker}: ${segment.text}`).join("\n"),
    [state.finalSegments],
  );

  const status = useMemo(() => {
    switch (state.phase) {
      case "idle":
        return { label: "Idle", tone: "idle" as const };
      case "requesting":
        return { label: "Requesting permissions", tone: "busy" as const };
      case "connecting":
        return { label: "Connecting to Soniox", tone: "busy" as const };
      case "live":
        return { label: "Live", tone: "live" as const };
      case "finishing":
        return { label: "Finishing", tone: "busy" as const };
      case "finished":
        return { label: "Finished", tone: "idle" as const };
      case "error":
        return { label: state.errorMessage || "Error", tone: "error" as const };
      default:
        return { label: "", tone: "idle" as const };
    }
  }, [state.phase, state.errorMessage]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm shadow-black/20">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Recording console</h2>
            <p className="text-sm text-slate-400">Monitor live transcription and manage session capture.</p>
          </div>
          <StatusIndicator label={status.label} tone={status.tone} durationMs={state.durationMs} />
        </header>

        <RecordingControls
          phase={state.phase}
          onStart={async () => {
            dispatch({ type: "REQUEST" });
            try {
              await onStart(actions);
            } catch (error) {
              const message = (error as Error).message || "Failed to start";
              if (message.toLowerCase().includes("cancel")) {
                dispatch({ type: "RESET" });
              } else if (message.toLowerCase().includes("dismiss")) {
                dispatch({ type: "RESET" });
              } else {
                dispatch({
                  type: "ERROR",
                  message,
                });
              }
            }
          }}
          onStop={async () => {
            const duration = state.startedAt ? Date.now() - state.startedAt : 0;
            dispatch({ type: "FINISH", durationMs: duration });
            try {
              const result: RecordingResult = {
                transcript: state.liveSegments.map(segment => `${segment.speaker}: ${segment.text}`).join('\n'),
                durationMs: duration,
                speakerCount: state.speakerCount,
                startedAt: state.startedAt
              };
              await onStop(actions, result);
              dispatch({ type: "COMPLETE" });
            } catch (error) {
              dispatch({
                type: "ERROR",
                message: (error as Error).message || "Failed to stop",
              });
            }
          }}
          onCancel={async () => {
            dispatch({ type: "RESET" });
            try {
              await onCancel(actions);
            } catch (error) {
              dispatch({
                type: "ERROR",
                message: (error as Error).message || "Failed to cancel",
              });
            }
          }}
          disabled={state.phase !== "idle" && state.phase !== "error" && state.phase !== "finished"}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <TranscriptPane
            title="Live transcript"
            description="Partial tokens update as Soniox streams audio."
            text={liveText}
            badge={{ label: `${state.speakerCount} speakers`, tone: "muted" }}
          />
          <TranscriptPane
            title="Final transcript"
            description="Finalized segments with speaker diarization."
            text={finalText}
            badge={{ label: "Auto-saves on finish", tone: "muted" }}
          />
        </div>
      </div>
    </section>
  );
}
