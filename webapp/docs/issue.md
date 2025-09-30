19:00:44.522 Running build in Washington, D.C., USA (East) – iad1
19:00:44.523 Build machine configuration: 2 cores, 8 GB
19:00:44.536 Cloning github.com/alaamjaish/Transcriber-claude-2 (Branch: main, Commit: a0de4b7)
19:00:44.827 Cloning completed: 290.000ms
19:00:45.764 Restored build cache from previous deployment (tNiKySBfENZ6ETn3QafesXF1npJB)
19:00:46.208 Running "vercel build"
19:00:46.723 Vercel CLI 48.1.6
19:00:47.114 Installing dependencies...
19:00:48.469 
19:00:48.470 up to date in 1s
19:00:48.470 
19:00:48.471 139 packages are looking for funding
19:00:48.471   run `npm fund` for details
19:00:48.508 Detected Next.js version: 15.5.4
19:00:48.512 Running "npm run build"
19:00:48.624 
19:00:48.625 > webapp@0.1.0 build
19:00:48.625 > next build
19:00:48.625 
19:00:49.748    ▲ Next.js 15.5.4
19:00:49.750 
19:00:49.906    Creating an optimized production build ...
19:00:59.098  ✓ Compiled successfully in 6.5s
19:00:59.104    Linting and checking validity of types ...
19:01:06.275 
19:01:06.277 Failed to compile.
19:01:06.277 
19:01:06.277 ./src/app/(dashboard)/students/[studentId]/components/StudentRecordingInterface.tsx
19:01:06.277 3:23  Warning: 'useEffect' is defined but never used.  @typescript-eslint/no-unused-vars
19:01:06.277 
19:01:06.277 ./src/app/(dashboard)/students/[studentId]/components/StudentSessionList.tsx
19:01:06.277 8:15  Warning: 'Session' is defined but never used.  @typescript-eslint/no-unused-vars
19:01:06.277 
19:01:06.277 ./src/app/(dashboard)/students/[studentId]/page.tsx
19:01:06.277 1:8  Warning: 'Link' is defined but never used.  @typescript-eslint/no-unused-vars
19:01:06.277 41:9  Warning: 'totalSessions' is assigned a value but never used.  @typescript-eslint/no-unused-vars
19:01:06.277 
19:01:06.277 ./src/app/auth/reset/page.tsx
19:01:06.277 7:32  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
19:01:06.278 
19:01:06.278 info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
19:01:06.315 Error: Command "npm run build" exited with 1