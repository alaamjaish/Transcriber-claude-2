import { Card } from "@/components/ui/Card";

const sections = [
  {
    title: "Service credentials",
    description:
      "Securely store and rotate API keys for transcription and AI providers. In production this screen will integrate with the secrets service.",
    items: ["Transcription provider", "Generative AI provider", "Storage region"],
  },
  {
    title: "Recording preferences",
    description: "Device selection, default capture mode, and gain presets for microphone and system audio.",
    items: ["Input device", "System audio opt-in", "Gain presets"],
  },
  {
    title: "Notifications",
    description: "Toggle summary delivery emails or push notifications once AI jobs finish.",
    items: ["Session complete", "Generation failed", "Weekly digest"],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <Card key={section.title} title={section.title} description={section.description}>
          <ul className="grid gap-2 text-xs text-slate-400">
            {section.items.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
