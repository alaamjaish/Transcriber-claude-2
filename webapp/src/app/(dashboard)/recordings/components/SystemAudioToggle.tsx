"use client";

interface SystemAudioToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function SystemAudioToggle({ enabled, onChange, disabled = false }: SystemAudioToggleProps) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="text-slate-700 dark:text-slate-300">
        I&apos;m using my headphones (Enable System Audio Capture)
      </span>
    </label>
  );
}
