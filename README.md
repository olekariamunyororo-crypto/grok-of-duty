# Grok of Duty

Single-player FPS built with **React + PlayCanvas**.

## Quick Start

```bash
cd grok-of-duty
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Controls

| Key / Input       | Action          |
|-------------------|-----------------|
| WASD              | Move            |
| Mouse             | Look            |
| Left Click        | Fire            |
| R                 | Reload          |
| Shift             | Sprint          |
| Space             | Jump            |
| Escape            | Return to Menu  |

## Current Features (v0.1)

- First-person controller with sprint & jump
- Mouse look + pointer lock
- Basic assault rifle with recoil + muzzle flash
- Ammo / reload system
- Simple military-style test map (containers, cover, buildings)
- HUD (health, ammo, kills, crosshair)
- Main menu

## Project Structure

```
src/
  components/
    GameCanvas.tsx   # PlayCanvas application + input
    HUD.tsx          # In-game UI
    MainMenu.tsx     # Start screen
  game/
    Player.ts        # FPS movement controller
    Level.ts         # Test map generation
    Weapon.ts        # Gun model + firing logic
  App.tsx            # Top-level state
```

## Next Steps (easy expansions)

- Enemy AI + hit detection
- More weapons / loadout system
- Better map / lighting / post-processing
- Sound effects
- Particle systems (muzzle smoke, impacts)
