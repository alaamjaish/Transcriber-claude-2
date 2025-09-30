"use client";

import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <Card
        title="Settings"
        description="Application settings and preferences"
      >
        <div className="p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Settings page is currently under construction.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
            Check back soon for customization options.
          </p>
        </div>
      </Card>
    </div>
  );
}