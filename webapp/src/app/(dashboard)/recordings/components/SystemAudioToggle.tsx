"use client";

interface SystemAudioToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function SystemAudioToggle({ enabled, onChange, disabled = false }: SystemAudioToggleProps) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 px-4 py-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 rounded border-blue-500/50 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
              Enable System Audio Capture
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-700 dark:text-blue-300">
              For headphones
            </span>
          </div>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Turn this on when wearing headphones or recording meetings (Google Meet, Zoom, etc.).
            You&apos;ll be asked to share your screen/tab to capture system audio.
          </p>
          {enabled && (
            <div className="mt-2 pt-2 border-t border-blue-500/20">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                📋 When recording starts:
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-disc">
                <li><strong>For browser meetings:</strong> Select &quot;Chrome Tab&quot; + check &quot;Share tab audio&quot;</li>
                <li><strong>For desktop apps:</strong> Select &quot;Entire Screen&quot; + check &quot;Share system audio&quot;</li>
              </ul>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}
