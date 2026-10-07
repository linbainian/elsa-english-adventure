# Codex project handoff

Read `docs/HANDOFF.md` first, followed by `README.md` and `docs/verification.md`.
The handoff is the persistent context for continuing work on another computer.

## User requirements

- The player is a three-year-old child. Use short instructions, patient pacing,
  clear demonstrations, strong encouragement and visible story consequences.
- Parent setup may use the computer. Once a level starts, child play must be
  entirely voice driven: microphone handoff, actions and advancement are automatic.
  Keep the parent pause/settings and optional read/type preview modes.
- There is no pronunciation assessment or scoring, sentence recognition or body
  tracking. Local voice activity triggers the current instructed action. Do not
  claim the engine understands the child's words or movements.
- Every level has one learning theme, inspired by preschool Big Fun. Gameplay
  repetition should cause different story actions rather than repeating a quiz.
- All human speech is prerecorded MiniMax MP3 in `public/assets/audio`. Never
  add browser speech synthesis or a speech fallback. Runtime does not need an API key.
- Keep Elsa/Frozen-inspired adventures, clearly different locations, multiple
  character looks, smooth transitions and strong playful feedback.
- Pause/scene changes must stop speech and microphone handoff. Wait for narration,
  action and praise to finish before starting the next voice turn.
- The wardrobe chapter owns its own garment, face, shoe and hat layers. Other
  Elsa looks must not overwrite those layers or mutate the original texture frame.

## Working conventions

- Preserve user changes and existing source art. Inspect the relevant director,
  level definition and docs before changing a chapter.
- Phaser is **4.2.1**, despite the original discussion mentioning Phaser 3.
- Keep credentials in ignored local `.env` or environment variables. Never place
  credentials in source, assets, logs, generated docs, commits or frontend bundles.
- Do not run or add unrelated executables. Local runtimes, caches, compiled
  output, rejected art candidates and screenshot frame sequences are not tracked.
- New spoken text requires normal/slow recordings where used, plus Chinese
  guidance/result recordings and praise. Check voice coverage before declaring
  the new chapter complete; generation can incur MiniMax charges.
- Run `npm run build`, then focused tests for changed behavior. Existing full
  seven-chapter voice tests are slow; avoid repeating unrelated tests without cause.
- Do not rerun normalization scripts blindly: older scripts may reference the
  original computer's image generation directory or Windows fonts.
- Communicate with this user in concise Chinese and carry authorized work through
  implementation, resource preparation and verification.
