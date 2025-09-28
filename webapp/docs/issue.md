22:06:44.872 Running build in Washington, D.C., USA (East) – iad1
22:06:44.873 Build machine configuration: 2 cores, 8 GB
22:06:44.896 Cloning github.com/alaamjaish/Transcriber-claude-2 (Branch: main, Commit: dda5e0d)
22:06:45.272 Cloning completed: 376.000ms
22:06:46.034 Restored build cache from previous deployment (ApwbQka4PLBhW9DWtyP2qxDSFy79)
22:06:46.463 Running "vercel build"
22:06:46.989 Vercel CLI 48.1.6
22:06:47.298 Installing dependencies...
22:06:48.393 
22:06:48.393 up to date in 876ms
22:06:48.394 
22:06:48.394 139 packages are looking for funding
22:06:48.394   run `npm fund` for details
22:06:48.427 Detected Next.js version: 15.5.4
22:06:48.431 Running "npm run build"
22:06:48.537 
22:06:48.538 > webapp@0.1.0 build
22:06:48.538 > next build
22:06:48.538 
22:06:49.906    ▲ Next.js 15.5.4
22:06:49.906 
22:06:50.011    Creating an optimized production build ...
22:06:58.289  ✓ Compiled successfully in 5.5s
22:06:58.292    Linting and checking validity of types ...
22:07:06.577 Failed to compile.
22:07:06.578 
22:07:06.578 ./src/app/actions/generation.ts:94:13
22:07:06.578 Type error: No overload matches this call.
22:07:06.578   Overload 1 of 2, '(relation: "sessions" | "students" | "teacher_preferences"): PostgrestQueryBuilder<{ PostgrestVersion: "13.0.5"; }, { Tables: { sessions: { Row: { created_at: string; duration_ms: number; generation_status: string | null; ... 7 more ...; transcript: string; }; Insert: { ...; }; Update: { ...; }; Relationships: [...]; }; students: { ...; }; teacher_preferences: { ...; }; }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {}; }, { ...; } | ... 1 more ... | { ...; }, "sessions" | ... 1 more ... | "teacher_preferences", [...] | ... 1 more ... | [...]>', gave the following error.
22:07:06.578     Argument of type '"prompts"' is not assignable to parameter of type '"sessions" | "students" | "teacher_preferences"'.
22:07:06.578   Overload 2 of 2, '(relation: never): PostgrestQueryBuilder<{ PostgrestVersion: "13.0.5"; }, { Tables: { sessions: { Row: { created_at: string; duration_ms: number; generation_status: string | null; generation_started_at: string | null; ... 6 more ...; transcript: string; }; Insert: { ...; }; Update: { ...; }; Relationships: [...]; }; students: { ...; }; teacher_preferences: { ...; }; }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {}; }, never, never, never>', gave the following error.
22:07:06.578     Argument of type '"prompts"' is not assignable to parameter of type 'never'.
22:07:06.578 
22:07:06.579 [0m [90m 92 |[39m   [36mif[39m (selectedPromptId) {
22:07:06.579  [90m 93 |[39m     [36mconst[39m { data[33m:[39m promptRow[33m,[39m error[33m:[39m promptError } [33m=[39m [36mawait[39m supabase
22:07:06.579 [31m[1m>[22m[39m[90m 94 |[39m       [33m.[39m[36mfrom[39m([32m"prompts"[39m)
22:07:06.579  [90m    |[39m             [31m[1m^[22m[39m
22:07:06.579  [90m 95 |[39m       [33m.[39mselect([32m"prompt_text"[39m)
22:07:06.579  [90m 96 |[39m       [33m.[39meq([32m"id"[39m[33m,[39m selectedPromptId)
22:07:06.579  [90m 97 |[39m       [33m.[39meq([32m"user_id"[39m[33m,[39m user[33m.[39mid)[0m
22:07:06.598 Next.js build worker exited with code: 1 and signal: null
22:07:06.619 Error: Command "npm run build" exited with 1