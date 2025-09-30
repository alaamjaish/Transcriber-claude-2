"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { listPromptsAction } from "@/app/actions/prompts";
import { saveDefaultPromptsAction } from "@/app/actions/settings";
import type { Prompt } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSummaryPrompt, setSelectedSummaryPrompt] = useState<string | null>(null);
  const [selectedHomeworkPrompt, setSelectedHomeworkPrompt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userPrompts = await listPromptsAction();
        setPrompts(userPrompts);

        // Load preferences from API endpoint
        const prefsResponse = await fetch("/api/preferences");
        if (prefsResponse.ok) {
          const prefs = await prefsResponse.json();
          setSelectedSummaryPrompt(prefs.defaultSummaryPromptId || null);
          setSelectedHomeworkPrompt(prefs.defaultHomeworkPromptId || null);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
        setErrorMessage("Failed to load settings. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      await saveDefaultPromptsAction(selectedSummaryPrompt, selectedHomeworkPrompt);
      alert("Default prompts saved successfully!");
      router.refresh();
    } catch (error) {
      console.error("Failed to save settings", error);
      setErrorMessage("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Card title="Settings" description="Loading your settings...">
          <div className="p-8 text-center text-slate-600 dark:text-slate-400">Loading...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card
        title="Default Prompt Settings"
        description="Choose which prompts to use by default for AI generation"
        footer={
          errorMessage ? (
            <p className="text-rose-600 dark:text-rose-400 text-sm">{errorMessage}</p>
          ) : null
        }
      >
        <div className="space-y-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          {/* Summary Prompt Section */}
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Default Summary Prompt
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This prompt will be used when automatically generating summaries and when regenerating summaries (unless you override it).
            </p>

            <div className="space-y-2">
              {/* Built-in option */}
              <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all group ${
                selectedSummaryPrompt === null
                  ? "border-sky-400 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700"
              }`}>
                <input
                  type="radio"
                  name="summary-prompt"
                  checked={selectedSummaryPrompt === null}
                  onChange={() => setSelectedSummaryPrompt(null)}
                  className="h-4 w-4 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950 text-sky-500 focus:ring-sky-500"
                />
                <div className="flex-1">
                  <div className={`text-sm font-semibold transition-colors ${
                    selectedSummaryPrompt === null
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400"
                  }`}>
                    Built-in System Prompt
                  </div>
                </div>
              </label>

              {/* Custom prompts */}
              {prompts.length > 0 ? (
                <>
                  {prompts.map((prompt) => (
                    <label
                      key={prompt.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all group ${
                        selectedSummaryPrompt === prompt.id
                          ? "border-sky-400 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="summary-prompt"
                        checked={selectedSummaryPrompt === prompt.id}
                        onChange={() => setSelectedSummaryPrompt(prompt.id)}
                        className="h-4 w-4 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950 text-sky-500 focus:ring-sky-500"
                      />
                      <div className="flex-1">
                        <div className={`text-sm font-semibold transition-colors ${
                          selectedSummaryPrompt === prompt.id
                            ? "text-sky-600 dark:text-sky-400"
                            : "text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400"
                        }`}>
                          {prompt.name}
                        </div>
                      </div>
                    </label>
                  ))}
                </>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-500 py-6 text-center">
                  No custom prompts yet.{" "}
                  <a href="/prompts" className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-medium">
                    Create your first prompt →
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Homework Prompt Section */}
          <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Default Homework Prompt
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This prompt will be used when automatically generating homework and when regenerating homework (unless you override it).
            </p>

            <div className="space-y-2">
              {/* Built-in option */}
              <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all group ${
                selectedHomeworkPrompt === null
                  ? "border-sky-400 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700"
              }`}>
                <input
                  type="radio"
                  name="homework-prompt"
                  checked={selectedHomeworkPrompt === null}
                  onChange={() => setSelectedHomeworkPrompt(null)}
                  className="h-4 w-4 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950 text-sky-500 focus:ring-sky-500"
                />
                <div className="flex-1">
                  <div className={`text-sm font-semibold transition-colors ${
                    selectedHomeworkPrompt === null
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400"
                  }`}>
                    Built-in System Prompt
                  </div>
                </div>
              </label>

              {/* Custom prompts */}
              {prompts.length > 0 ? (
                <>
                  {prompts.map((prompt) => (
                    <label
                      key={prompt.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all group ${
                        selectedHomeworkPrompt === prompt.id
                          ? "border-sky-400 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="homework-prompt"
                        checked={selectedHomeworkPrompt === prompt.id}
                        onChange={() => setSelectedHomeworkPrompt(prompt.id)}
                        className="h-4 w-4 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950 text-sky-500 focus:ring-sky-500"
                      />
                      <div className="flex-1">
                        <div className={`text-sm font-semibold transition-colors ${
                          selectedHomeworkPrompt === prompt.id
                            ? "text-sky-600 dark:text-sky-400"
                            : "text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400"
                        }`}>
                          {prompt.name}
                        </div>
                      </div>
                    </label>
                  ))}
                </>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-500 py-6 text-center">
                  No custom prompts yet.{" "}
                  <a href="/prompts" className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-medium">
                    Create your first prompt →
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Save Button */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-sky-400 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Default Prompts"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}