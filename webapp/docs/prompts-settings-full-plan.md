# Prompts Settings Feature - Full Implementation Plan

## 🎯 Goal
Allow users to set **two separate default prompts**:
- One for **Summary** generation
- One for **Homework** generation

Each can be either a **System Prompt** (Gulf/Levantine/Egyptian) or a **Custom Prompt** (user-created).

---

## 📋 Phase 1: Database Setup

### 1.1 Create System Prompts Table
```sql
CREATE TABLE public.system_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prompt_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### 1.2 Insert 3 System Prompts
```sql
INSERT INTO public.system_prompts (name, prompt_text) VALUES
('Gulf Dialect', 'Prompt text for Gulf dialect...'),
('Levantine Dialect', 'Prompt text for Levantine dialect...'),
('Egyptian Dialect', 'Prompt text for Egyptian dialect...');
```

### 1.3 Update Existing `prompts` Table
Already exists - no changes needed! Structure:
- `id`, `user_id`, `name`, `prompt_text`, `created_at`, `updated_at`

### 1.4 Extend User Preferences Table
```sql
ALTER TABLE public.teacher_preferences
ADD COLUMN default_summary_prompt_type text DEFAULT 'builtin' CHECK (default_summary_prompt_type IN ('system', 'custom', 'builtin')),
ADD COLUMN default_summary_prompt_id uuid,
ADD COLUMN default_homework_prompt_type text DEFAULT 'builtin' CHECK (default_homework_prompt_type IN ('system', 'custom', 'builtin')),
ADD COLUMN default_homework_prompt_id uuid;
```

**Explanation:**
- `prompt_type`:
  - `'system'` = Gulf/Levantine/Egyptian (references `system_prompts` table)
  - `'custom'` = User's custom prompt (references `prompts` table)
  - `'builtin'` = Original hardcoded prompt from code
- `prompt_id`: References either `system_prompts.id` or `prompts.id`
- Separate fields for summary and homework

---

## 📋 Phase 2: Backend Changes

### 2.1 Update Types (`lib/types.ts`)
```typescript
export interface SystemPrompt {
  id: string;
  name: string;
  promptText: string;
  createdAt: string;
}

export interface TeacherPreference {
  userId: string;
  currentStudentId?: string;
  defaultSummaryPromptType: 'system' | 'custom' | 'builtin';
  defaultSummaryPromptId?: string;
  defaultHomeworkPromptType: 'system' | 'custom' | 'builtin';
  defaultHomeworkPromptId?: string;
  updatedAt: string;
}
```

### 2.2 Create Data Loaders (`lib/data-loaders.ts`)
Add:
```typescript
export async function loadSystemPrompts(): Promise<SystemPrompt[]>
  // Load all system prompts (Gulf, Levantine, Egyptian)
  // Query: SELECT * FROM system_prompts ORDER BY display_order, name

export async function loadUserPreferences(): Promise<TeacherPreference | null>
  // Load current user's preferences
  // Query: SELECT * FROM teacher_preferences WHERE user_id = auth.uid()

export async function loadDefaultPromptText(
  promptType: 'system' | 'custom' | 'builtin',
  promptId: string | undefined,
  generationType: 'summary' | 'homework'
): Promise<string | undefined>
  // Given preferences, return the actual prompt text
  // If 'system' → query system_prompts table
  // If 'custom' → query prompts table
  // If 'builtin' → return undefined (use hardcoded)
```

### 2.3 Create Settings Actions (`app/actions/settings.ts`)
```typescript
export async function setDefaultSummaryPromptAction(
  promptType: 'system' | 'custom' | 'builtin',
  promptId?: string
): Promise<void> {
  // 1. Get authenticated user
  // 2. Upsert into teacher_preferences
  // 3. Set default_summary_prompt_type and default_summary_prompt_id
  // 4. revalidatePath('/settings')
}

export async function setDefaultHomeworkPromptAction(
  promptType: 'system' | 'custom' | 'builtin',
  promptId?: string
): Promise<void> {
  // 1. Get authenticated user
  // 2. Upsert into teacher_preferences
  // 3. Set default_homework_prompt_type and default_homework_prompt_id
  // 4. revalidatePath('/settings')
}

export async function saveDefaultPromptsAction(
  summaryPromptType: 'system' | 'custom' | 'builtin',
  summaryPromptId: string | undefined,
  homeworkPromptType: 'system' | 'custom' | 'builtin',
  homeworkPromptId: string | undefined
): Promise<void> {
  // Save both in one transaction
}
```

### 2.4 Modify Generation Action (`app/actions/generation.ts`)

**Current flow:**
```typescript
generateSessionArtifactsAction(sessionId, options, userContext, selectedPromptId?)
```

**New flow:**
```typescript
// ONLY if no selectedPromptId provided, load user's default
if (!selectedPromptId) {
  const prefs = await loadUserPreferences();

  if (runSummary && prefs) {
    const defaultText = await loadDefaultPromptText(
      prefs.defaultSummaryPromptType,
      prefs.defaultSummaryPromptId,
      'summary'
    );
    if (defaultText) {
      // Use this for summary generation
      promptOverride = defaultText;
    }
  }

  if (runHomework && prefs) {
    const defaultText = await loadDefaultPromptText(
      prefs.defaultHomeworkPromptType,
      prefs.defaultHomeworkPromptId,
      'homework'
    );
    if (defaultText) {
      // Use this for homework generation
      promptOverride = defaultText;
    }
  }
}

// If selectedPromptId IS provided (user manually selected in modal)
// → Use that (override the default)
```

**Important Notes:**
- When `runSummary` and `runHomework` are BOTH true, we need to handle them separately
- May need to split generation into two calls or pass both prompt texts
- Current code uses ONE `promptOverride` for both summary and homework
- **Need to refactor to support different prompts for each**

---

## 📋 Phase 3: Frontend - Settings Page

### 3.1 Create Settings Page (`app/(dashboard)/settings/page.tsx`)

**Server Component:**
```typescript
export default async function SettingsPage() {
  const systemPrompts = await loadSystemPrompts();
  const userPrompts = await loadPrompts();
  const userPreferences = await loadUserPreferences();

  return (
    <SettingsClient
      systemPrompts={systemPrompts}
      userPrompts={userPrompts}
      preferences={userPreferences}
    />
  );
}
```

**Client Component Structure:**
```typescript
"use client";

export function SettingsClient({ systemPrompts, userPrompts, preferences }) {
  const [summaryType, setSummaryType] = useState(preferences?.defaultSummaryPromptType || 'builtin');
  const [summaryId, setSummaryId] = useState(preferences?.defaultSummaryPromptId);
  const [homeworkType, setHomeworkType] = useState(preferences?.defaultHomeworkPromptType || 'builtin');
  const [homeworkId, setHomeworkId] = useState(preferences?.defaultHomeworkPromptId);

  const handleSave = async () => {
    await saveDefaultPromptsAction(summaryType, summaryId, homeworkType, homeworkId);
  };

  return (
    <Card title="Default Prompt Settings">
      {/* Summary Section */}
      <PromptSelector
        title="Default Summary Prompt"
        systemPrompts={systemPrompts}
        userPrompts={userPrompts}
        selectedType={summaryType}
        selectedId={summaryId}
        onSelect={(type, id) => {
          setSummaryType(type);
          setSummaryId(id);
        }}
      />

      {/* Homework Section */}
      <PromptSelector
        title="Default Homework Prompt"
        systemPrompts={systemPrompts}
        userPrompts={userPrompts}
        selectedType={homeworkType}
        selectedId={homeworkId}
        onSelect={(type, id) => {
          setHomeworkType(type);
          setHomeworkId(id);
        }}
      />

      <button onClick={handleSave}>Save Default Prompts</button>
    </Card>
  );
}
```

**UI Layout:**
```
┌──────────────────────────────────────────────┐
│  Settings Card                               │
│  "Configure Default Prompts"                 │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Default Summary Prompt                 │ │
│  │                                        │ │
│  │ ○ Built-in System Prompt (original)   │ │
│  │                                        │ │
│  │ System Prompts:                        │ │
│  │ ○ Gulf Dialect                         │ │
│  │ ● Levantine Dialect                    │ │
│  │ ○ Egyptian Dialect                     │ │
│  │                                        │ │
│  │ Your Custom Prompts:                   │ │
│  │ ○ My Prompt 1                          │ │
│  │ ○ My Prompt 2                          │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Default Homework Prompt                │ │
│  │                                        │ │
│  │ ○ Built-in System Prompt (original)   │ │
│  │                                        │ │
│  │ System Prompts:                        │ │
│  │ ○ Gulf Dialect                         │ │
│  │ ○ Levantine Dialect                    │ │
│  │ ○ Egyptian Dialect                     │ │
│  │                                        │ │
│  │ Your Custom Prompts:                   │ │
│  │ ● My Custom Prompt 1                   │ │
│  │ ○ My Prompt 2                          │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [Save Default Prompts]                      │
└──────────────────────────────────────────────┘
```

### 3.2 Create PromptSelector Component

```typescript
interface PromptSelectorProps {
  title: string;
  systemPrompts: SystemPrompt[];
  userPrompts: Prompt[];
  selectedType: 'system' | 'custom' | 'builtin';
  selectedId?: string;
  onSelect: (type: 'system' | 'custom' | 'builtin', id?: string) => void;
}

export function PromptSelector({ ... }) {
  return (
    <div>
      <h3>{title}</h3>

      {/* Built-in option */}
      <label>
        <input
          type="radio"
          checked={selectedType === 'builtin'}
          onChange={() => onSelect('builtin')}
        />
        Built-in System Prompt (original)
      </label>

      {/* System prompts */}
      <h4>System Prompts</h4>
      {systemPrompts.map(prompt => (
        <label key={prompt.id}>
          <input
            type="radio"
            checked={selectedType === 'system' && selectedId === prompt.id}
            onChange={() => onSelect('system', prompt.id)}
          />
          {prompt.name}
        </label>
      ))}

      {/* Custom prompts */}
      <h4>Your Custom Prompts</h4>
      {userPrompts.map(prompt => (
        <label key={prompt.id}>
          <input
            type="radio"
            checked={selectedType === 'custom' && selectedId === prompt.id}
            onChange={() => onSelect('custom', prompt.id)}
          />
          {prompt.name}
        </label>
      ))}
    </div>
  );
}
```

### 3.3 Update Context Modal (`recordings/components/ContextModal.tsx`)

**Current behavior:**
- Loads user's custom prompts
- Shows "Default System Prompt" at top
- User selects one via radio buttons

**New behavior:**
- Load user's default preferences
- Pre-select based on user's defaults:
  - If regenerating Summary → pre-select default summary prompt
  - If regenerating Homework → pre-select default homework prompt
- User can still override and pick different prompt for this one generation

**Changes needed:**
```typescript
interface ContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (context: string, selectedPromptId?: string) => void;
  type: "summary" | "homework"; // Already exists!
  isPending: boolean;
}

export function ContextModal({ type, ... }) {
  // Load user preferences
  const [preferences, setPreferences] = useState<TeacherPreference | null>(null);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load preferences and system prompts
      loadUserPreferencesAction().then(setPreferences);
      loadSystemPromptsAction().then(setSystemPrompts);
    }
  }, [isOpen]);

  // Determine default selection based on type
  const getDefaultSelection = () => {
    if (!preferences) return "default";

    const promptType = type === "summary"
      ? preferences.defaultSummaryPromptType
      : preferences.defaultHomeworkPromptType;

    const promptId = type === "summary"
      ? preferences.defaultSummaryPromptId
      : preferences.defaultHomeworkPromptId;

    if (promptType === 'builtin') return "default";
    if (promptType === 'system') return `system-${promptId}`;
    if (promptType === 'custom') return promptId;
  };

  const [selectedPromptId, setSelectedPromptId] = useState<string>(getDefaultSelection);

  // Update selection when preferences load
  useEffect(() => {
    if (preferences) {
      setSelectedPromptId(getDefaultSelection());
    }
  }, [preferences, type]);

  // Rest of modal logic...
}
```

**UI Changes:**
- Add system prompts section BEFORE custom prompts
- Display like:
  ```
  ○ Built-in System Prompt

  System Prompts:
  ○ Gulf Dialect
  ○ Levantine Dialect
  ○ Egyptian Dialect

  Your Custom Prompts:
  ○ My Prompt 1
  ○ My Prompt 2
  ```

### 3.4 Add Settings Navigation Link

Add to sidebar navigation (wherever dashboard/students/recordings links are):
```tsx
<Link href="/settings">
  <SettingsIcon />
  Settings
</Link>
```

---

## 📋 Phase 4: Implementation Order

### Step 1: Database (15 min)
1. Create `system_prompts` table
2. Insert 3 dialect prompts
3. Alter `teacher_preferences` table
4. Test migrations

### Step 2: Backend Types & Data Loaders (30 min)
1. Update `types.ts` with new interfaces
2. Add `loadSystemPrompts()` to `data-loaders.ts`
3. Add `loadUserPreferences()` to `data-loaders.ts`
4. Add `loadDefaultPromptText()` to `data-loaders.ts`
5. Test data loading

### Step 3: Settings Actions (20 min)
1. Create `app/actions/settings.ts`
2. Implement `setDefaultSummaryPromptAction()`
3. Implement `setDefaultHomeworkPromptAction()`
4. Implement `saveDefaultPromptsAction()`
5. Test actions

### Step 4: Settings Page UI (45 min)
1. Create `app/(dashboard)/settings/page.tsx`
2. Create `PromptSelector` component
3. Implement two-section layout
4. Wire up save functionality
5. Add loading/error states
6. Test UI

### Step 5: Add Navigation (5 min)
1. Find sidebar component
2. Add settings link
3. Test navigation

### Step 6: Modify Generation Flow (30 min)
1. Update `generateSessionArtifactsAction()` in `generation.ts`
2. Add default prompt loading logic
3. Handle separate prompts for summary/homework
4. Test automatic generation uses defaults
5. Test manual override still works

### Step 7: Update Context Modal (30 min)
1. Add system prompts loading to `ContextModal.tsx`
2. Add preferences loading
3. Implement pre-selection logic based on type
4. Update UI to show system prompts
5. Test modal pre-selects correctly
6. Test manual override works

### Step 8: Testing (30 min)
1. Test new user (no preferences set)
2. Test setting defaults
3. Test automatic generation
4. Test manual regeneration with defaults
5. Test manual override
6. Test switching between prompts

---

## 📋 Files to Create

1. **Migration:** `migrations/add_default_prompts.sql`
2. **Settings Page:** `app/(dashboard)/settings/page.tsx`
3. **Settings Client:** `app/(dashboard)/settings/components/SettingsClient.tsx`
4. **Prompt Selector:** `app/(dashboard)/settings/components/PromptSelector.tsx`
5. **Settings Actions:** `app/actions/settings.ts`

## 📋 Files to Modify

1. **Types:** `lib/types.ts` - Add SystemPrompt & update TeacherPreference
2. **Data Loaders:** `lib/data-loaders.ts` - Add 3 new functions
3. **Generation Action:** `app/actions/generation.ts` - Add default prompt logic
4. **Context Modal:** `recordings/components/ContextModal.tsx` - Pre-select defaults and show system prompts
5. **Navigation:** Find and update sidebar navigation component
6. **Schema Docs:** `schema.sql` - Document new tables

---

## 🎉 Final User Experience

### Scenario 1: First-time user
- Defaults to "Built-in System Prompt" for both summary and homework
- Works exactly like current behavior
- No breaking changes

### Scenario 2: User customizes defaults
1. Goes to Settings page
2. Selects "Levantine Dialect" for summaries
3. Selects "My Custom Prompt 1" for homework
4. Clicks "Save Default Prompts"
5. Success message appears

### Scenario 3: Recording stops (automatic generation)
- Summary generates automatically with **Levantine Dialect**
- Homework generates automatically with **My Custom Prompt 1**
- No user interaction needed!
- Happens in background

### Scenario 4: Manual regeneration (using default)
1. User clicks "Regenerate Summary"
2. Modal opens with **"Levantine Dialect"** already selected
3. User adds optional context
4. User clicks "Generate" (1 click!)
5. Regenerates with Levantine dialect

### Scenario 5: Manual regeneration (override)
1. User clicks "Regenerate Homework"
2. Modal opens with **"My Custom Prompt 1"** already selected
3. User switches to **"Egyptian Dialect"** for this ONE time
4. Adds optional context
5. Clicks "Generate"
6. This generation uses Egyptian dialect
7. **Next time** modal opens, still defaults to "My Custom Prompt 1"

### Scenario 6: User creates new custom prompt
1. Goes to Prompts page
2. Creates "Advanced Grammar Prompt"
3. Goes to Settings
4. Sets "Advanced Grammar Prompt" as default for homework
5. All future homework uses new prompt

---

## ✅ Benefits

- ✅ Set defaults once, use everywhere
- ✅ Separate control for summary vs homework
- ✅ System prompts (dialects) managed by admin
- ✅ Custom prompts created by users
- ✅ Can override anytime in modal
- ✅ Automatic generation uses defaults
- ✅ Manual regeneration pre-selects defaults
- ✅ Backward compatible (defaults to current behavior)
- ✅ No breaking changes
- ✅ Improves user workflow dramatically

---

## 🚨 Important Implementation Notes

### Database Considerations
- User preferences default to 'builtin' type to maintain backward compatibility
- System prompts have no user_id (global for all users)
- Need proper indexes on teacher_preferences for fast lookups

### Backend Considerations
- `loadDefaultPromptText()` must handle all three types correctly
- Generation action currently uses ONE promptOverride - may need refactoring for separate summary/homework prompts
- Need to handle case where user deletes a custom prompt that was set as default
- Need to handle case where admin deletes/disables a system prompt

### Frontend Considerations
- Modal must load both system and custom prompts
- Need to format prompt IDs correctly (system prompts vs custom prompts)
- Loading states important (preferences and prompts load async)
- Consider caching system prompts (they rarely change)

### Error Handling
- What if preferences fail to load? → Fall back to 'builtin'
- What if selected default prompt is deleted? → Fall back to 'builtin'
- What if generation fails? → Show error, don't change defaults

---

## 📝 Migration SQL Script

```sql
-- Create system prompts table
CREATE TABLE IF NOT EXISTS public.system_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prompt_text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Insert initial system prompts
INSERT INTO public.system_prompts (name, prompt_text) VALUES
(
  'Gulf Dialect',
  'Your prompt text for Gulf dialect Arabic lessons...'
),
(
  'Levantine Dialect',
  'Your prompt text for Levantine dialect Arabic lessons...'
),
(
  'Egyptian Dialect',
  'Your prompt text for Egyptian dialect Arabic lessons...'
);

-- Extend teacher_preferences table
ALTER TABLE public.teacher_preferences
ADD COLUMN IF NOT EXISTS default_summary_prompt_type text DEFAULT 'builtin' CHECK (default_summary_prompt_type IN ('system', 'custom', 'builtin')),
ADD COLUMN IF NOT EXISTS default_summary_prompt_id uuid,
ADD COLUMN IF NOT EXISTS default_homework_prompt_type text DEFAULT 'builtin' CHECK (default_homework_prompt_type IN ('system', 'custom', 'builtin')),
ADD COLUMN IF NOT EXISTS default_homework_prompt_id uuid;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_prefs_user_id ON public.teacher_preferences(user_id);

-- Grant permissions
GRANT SELECT ON public.system_prompts TO authenticated;
```

---

## 🎨 UI/UX Details

### Settings Page Design
- Use same Card component as rest of app
- Clear section headers
- Radio buttons for prompt selection
- Visual distinction between Built-in, System, and Custom prompts
- Show prompt preview on hover
- Save button at bottom (disabled until changes made)
- Success/error toasts on save

### Context Modal Updates
- Keep same modal design
- Add system prompts ABOVE custom prompts
- Use same radio button style
- Show which is currently default (maybe badge or icon)
- Allow override easily

### Navigation
- Add Settings icon/link to sidebar
- Place below Dashboard/Students/Recordings
- Active state when on settings page

---

## 🧪 Testing Checklist

- [ ] Database migration runs successfully
- [ ] System prompts inserted correctly
- [ ] Can load system prompts from DB
- [ ] Can load user preferences from DB
- [ ] Settings page loads without errors
- [ ] Can select different prompts in settings
- [ ] Can save default prompts
- [ ] Automatic generation uses correct default prompts
- [ ] Modal pre-selects correct default prompt
- [ ] Can override default in modal
- [ ] Override doesn't change saved default
- [ ] Works with no preferences set (new user)
- [ ] Works when custom prompt is deleted
- [ ] Works when system prompt is disabled
- [ ] UI handles loading states
- [ ] UI handles error states
- [ ] Navigation works correctly

---

## 📅 Estimated Total Time

- Database: 15 min
- Backend: 50 min
- Settings UI: 50 min
- Context Modal: 30 min
- Testing: 30 min
- **Total: ~3 hours**