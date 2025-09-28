"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { listPromptsAction } from "@/app/actions/prompts";
import type { Prompt } from "@/lib/types";
import { AddPromptModal } from "./components/AddPromptModal";
import { EditPromptModal } from "./components/EditPromptModal";
import { DeletePromptDialog } from "./components/DeletePromptDialog";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await listPromptsAction();
      setPrompts(data);
    } catch (error) {
      console.error("Failed to load prompts", error);
      setErrorMessage("We couldn't load your prompts. Verify Supabase credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const hasPrompts = prompts.length > 0;

  return (
    <div className="space-y-8">
      <Card
        title="Prompts Library"
        description="Create and manage your custom prompts for AI generation. Use these prompts when regenerating summaries and homework."
        footer={<p>Pro tip: Create different prompt styles for different types of lessons or students.</p>}
        actions={hasPrompts ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-300"
          >
            Add New Prompt
          </button>
        ) : undefined}
      >
        {errorMessage ? (
          <EmptyState
            title="Unable to load prompts"
            description={errorMessage}
            actionLabel="Reload"
            actionHref="/prompts"
            aside={<span>If this persists, check that your Supabase env vars are set and the schema has been deployed.</span>}
          />
        ) : hasPrompts ? (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prompts.map((prompt) => (
              <li key={prompt.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-100 line-clamp-1">{prompt.name}</h3>
                  <span className="rounded-full border border-slate-800 px-2 py-1 text-xs text-slate-400 shrink-0">
                    Custom
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                  {prompt.promptText.length > 120
                    ? `${prompt.promptText.substring(0, 120)}...`
                    : prompt.promptText}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Created {new Date(prompt.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => {
                      setEditingPrompt(prompt);
                      setShowEditModal(true);
                    }}
                    className="rounded-md border border-slate-700 px-3 py-1 text-slate-100 hover:border-slate-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeletingPrompt(prompt);
                      setShowDeleteDialog(true);
                    }}
                    className="rounded-md border border-slate-700 px-3 py-1 hover:border-slate-500 text-rose-300 border-rose-800 hover:border-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : loading ? (
          <div className="p-8 text-center text-slate-400">Loading prompts...</div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-slate-300">
            <h3 className="text-lg font-semibold text-slate-100">No custom prompts yet</h3>
            <p className="mt-2 text-sm text-slate-400">
              Create your first custom prompt to personalize AI generation for your teaching style.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-300"
              >
                Add First Prompt
              </button>
            </div>
          </div>
        )}
      </Card>

      <AddPromptModal
        open={showAddModal}
        onDismiss={() => setShowAddModal(false)}
        onPromptCreated={fetchPrompts}
      />

      <EditPromptModal
        open={showEditModal}
        prompt={editingPrompt}
        onDismiss={() => {
          setShowEditModal(false);
          setEditingPrompt(null);
        }}
        onPromptUpdated={fetchPrompts}
      />

      <DeletePromptDialog
        open={showDeleteDialog}
        prompt={deletingPrompt}
        onDismiss={() => {
          setShowDeleteDialog(false);
          setDeletingPrompt(null);
        }}
        onPromptDeleted={fetchPrompts}
      />
    </div>
  );
}