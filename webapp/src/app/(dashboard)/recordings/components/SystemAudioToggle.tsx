"use client";

interface SystemAudioToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function SystemAudioToggle({ enabled, onChange, disabled = false }: SystemAudioToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`
        flex items-center gap-3 rounded-xl border px-5 py-3 text-sm font-medium transition
        ${enabled
          ? 'border-sky-400 bg-sky-400/10 text-sky-700 dark:text-sky-300'
          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
        }
        disabled:cursor-not-allowed disabled:opacity-50
      `}
    >
      <div className={`
        flex h-5 w-5 items-center justify-center rounded border-2 transition
        ${enabled
          ? 'border-sky-500 bg-sky-500'
          : 'border-slate-400 dark:border-slate-600'
        }
      `}>
        {enabled && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span>I&apos;m using my headphones (Enable System Audio Capture)</span>
    </button>
  );
}
