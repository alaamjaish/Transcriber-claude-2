19:15:43.271 Running build in Washington, D.C., USA (East) – iad1
19:15:43.272 Build machine configuration: 2 cores, 8 GB
19:15:43.297 Cloning github.com/alaamjaish/Transcriber-claude-2 (Branch: main, Commit: f646ae5)
19:15:43.679 Cloning completed: 382.000ms
19:15:44.844 Restored build cache from previous deployment (tNiKySBfENZ6ETn3QafesXF1npJB)
19:15:45.620 Running "vercel build"
19:15:46.754 Vercel CLI 48.1.6
19:15:47.125 Installing dependencies...
19:15:48.522 
19:15:48.522 up to date in 943ms
19:15:48.522 
19:15:48.522 139 packages are looking for funding
19:15:48.523   run `npm fund` for details
19:15:48.561 Detected Next.js version: 15.5.4
19:15:48.565 Running "npm run build"
19:15:48.688 
19:15:48.688 > webapp@0.1.0 build
19:15:48.688 > next build
19:15:48.688 
19:15:49.800    ▲ Next.js 15.5.4
19:15:49.801 
19:15:49.884    Creating an optimized production build ...
19:15:59.586  ✓ Compiled successfully in 6.9s
19:15:59.593    Linting and checking validity of types ...
19:16:09.360 Failed to compile.
19:16:09.360 
19:16:09.360 ./src/lib/data-loaders.ts:224:18
19:16:09.360 Type error: Property 'user_id' does not exist on type 'SelectQueryError<"column 'default_summary_prompt_id' does not exist on 'teacher_preferences'.">'.
19:16:09.360 
19:16:09.360 [0m [90m 222 |[39m
19:16:09.361  [90m 223 |[39m   [36mreturn[39m {
19:16:09.361 [31m[1m>[22m[39m[90m 224 |[39m     userId[33m:[39m data[33m.[39muser_id[33m,[39m
19:16:09.361  [90m     |[39m                  [31m[1m^[22m[39m
19:16:09.361  [90m 225 |[39m     currentStudentId[33m:[39m data[33m.[39mcurrent_student_id [33m?[39m[33m?[39m undefined[33m,[39m
19:16:09.361  [90m 226 |[39m     defaultSummaryPromptId[33m:[39m data[33m.[39mdefault_summary_prompt_id [33m?[39m[33m?[39m undefined[33m,[39m
19:16:09.361  [90m 227 |[39m     defaultHomeworkPromptId[33m:[39m data[33m.[39mdefault_homework_prompt_id [33m?[39m[33m?[39m undefined[33m,[39m[0m
19:16:09.385 Next.js build worker exited with code: 1 and signal: null
19:16:09.408 Error: Command "npm run build" exited with 1