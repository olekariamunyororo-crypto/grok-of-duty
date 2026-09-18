# GROK OF DUTY
Modern Warfare // Single Player — a browser FPS built with
React 18 + TypeScript + Vite + the PlayCanvas engine (used directly,
no wrapper library).

## Quick start

    npm install
    npm run dev

Open http://localhost:5173 and click DEPLOY, then click the screen to
lock the mouse ("CLICK TO ENGAGE").

## Controls

    W A S D .... move
    Mouse ...... look
    Shift ...... sprint (FOV punch)
    Space ...... jump
    LMB ........ fire (full auto, 600 RPM)
    R .......... reload
    Esc ........ back to the main menu

## Debugging (vConsole)

[vConsole](https://github.com/Tencent/vConsole) is enabled automatically in
development (`npm run dev`). A floating green button appears in the corner —
tap it for logs, network, DOM, and storage.

On production / preview builds, append `?vconsole=1` to the URL:

    http://localhost:4173/?vconsole=1

## Implementation notes

- React StrictMode is intentionally NOT used: it double-mounts effects in
  development, which would create and destroy the PlayCanvas Application
  twice per mount.
- The canvas uses FILLMODE_NONE + RESOLUTION_AUTO with a manual resize
  handler so it always exactly fills its parent container.
- The weapon viewmodel renders through a second camera into a dedicated
  render layer (depth-only clear), so it never clips through walls.
- Physics is a lightweight custom axis-separated AABB solver (with
  auto step-up for stairs/ramps) — no external physics engine required.
- Pop-up targets at the north end of the map are shootable; killed targets
  fall over, respawn after ~3s and increment the kill counter.
- All sounds are procedurally synthesised with WebAudio (no assets).

## Project layout

    src/App.tsx                 game state (menu | playing) + HUD stats
    src/components/MainMenu.tsx title screen with scanlines
    src/components/HUD.tsx      crosshair, health, ammo, kills
    src/components/GameCanvas.tsx  PlayCanvas app + input + frame loop
    src/game/Player.ts          FPS controller (custom AABB physics)
    src/game/Weapon.ts          viewmodel, hitscan firing, reload, SFX
    src/game/Level.ts           test map generation + colliders + targets
