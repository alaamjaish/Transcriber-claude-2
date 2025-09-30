19:09:58.876 Running build in Washington, D.C., USA (East) – iad1
19:09:58.877 Build machine configuration: 2 cores, 8 GB
19:09:58.892 Cloning github.com/alaamjaish/Transcriber-claude-2 (Branch: main, Commit: fa1c352)
19:09:59.196 Cloning completed: 303.000ms
19:10:00.333 Restored build cache from previous deployment (tNiKySBfENZ6ETn3QafesXF1npJB)
19:10:00.763 Running "vercel build"
19:10:01.161 Vercel CLI 48.1.6
19:10:01.493 Installing dependencies...
19:10:02.599 
19:10:02.599 up to date in 900ms
19:10:02.600 
19:10:02.601 139 packages are looking for funding
19:10:02.601   run `npm fund` for details
19:10:02.638 Detected Next.js version: 15.5.4
19:10:02.642 Running "npm run build"
19:10:02.752 
19:10:02.753 > webapp@0.1.0 build
19:10:02.753 > next build
19:10:02.753 
19:10:03.898    ▲ Next.js 15.5.4
19:10:03.898 
19:10:03.975    Creating an optimized production build ...
19:10:13.602  ✓ Compiled successfully in 6.8s
19:10:13.605    Linting and checking validity of types ...
19:10:23.341 Failed to compile.
19:10:23.341 
19:10:23.342 ./src/app/actions/generation.ts:120:31
19:10:23.342 Type error: Property 'default_summary_prompt_id' does not exist on type 'SelectQueryError<"column 'default_summary_prompt_id' does not exist on 'teacher_preferences'.">'.
19:10:23.342 
19:10:23.342 [0m [90m 118 |[39m     [36mif[39m ([33m![39mprefsError [33m&&[39m prefs) {
19:10:23.342  [90m 119 |[39m       [90m// Load default summary prompt if set[39m
19:10:23.342 [31m[1m>[22m[39m[90m 120 |[39m       [36mif[39m (runSummary [33m&&[39m prefs[33m.[39mdefault_summary_prompt_id) {
19:10:23.342  [90m     |[39m                               [31m[1m^[22m[39m
19:10:23.342  [90m 121 |[39m         [36mconst[39m { data[33m:[39m summaryPromptRow } [33m=[39m [36mawait[39m supabase
19:10:23.342  [90m 122 |[39m           [33m.[39m[36mfrom[39m([32m"prompts"[39m)
19:10:23.342  [90m 123 |[39m           [33m.[39mselect([32m"prompt_text"[39m)[0m
19:10:23.363 Next.js build worker exited with code: 1 and signal: null
19:10:23.385 Error: Command "npm run build" exited with 1