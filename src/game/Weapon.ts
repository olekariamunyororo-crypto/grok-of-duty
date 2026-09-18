import * as pc from 'playcanvas'
import type { PlayerInput } from './Player'

interface WeaponCallbacks {
  canFire: () => boolean
  onFire: () => void
  onReload: () => void
}

export function createWeapon(app: pc.Application, camera: pc.Entity) {
  // Simple low-poly style rifle model using primitives
  const weaponRoot = new pc.Entity('Weapon')
  weaponRoot.setLocalPosition(0.28, -0.22, -0.55)
  weaponRoot.setLocalEulerAngles(2, 0, 0)
  camera.addChild(weaponRoot)

  const metalMat = new pc.StandardMaterial()
  metalMat.diffuse = new pc.Color(0.18, 0.2, 0.22)
  metalMat.specular = new pc.Color(0.3, 0.3, 0.3)
  metalMat.shininess = 60
  metalMat.update()

  const darkMat = new pc.StandardMaterial()
  darkMat.diffuse = new pc.Color(0.1, 0.11, 0.12)
  darkMat.specular = new pc.Color(0.15, 0.15, 0.15)
  darkMat.shininess = 40
  darkMat.update()

  // Body
  const body = new pc.Entity('Body')
  body.addComponent('render', { type: 'box', material: metalMat })
  body.setLocalScale(0.08, 0.12, 0.55)
  body.setLocalPosition(0, 0, 0)
  weaponRoot.addChild(body)

  // Barrel
  const barrel = new pc.Entity('Barrel')
  barrel.addComponent('render', { type: 'box', material: darkMat })
  barrel.setLocalScale(0.035, 0.035, 0.45)
  barrel.setLocalPosition(0, 0.02, -0.45)
  weaponRoot.addChild(barrel)

  // Stock
  const stock = new pc.Entity('Stock')
  stock.addComponent('render', { type: 'box', material: darkMat })
  stock.setLocalScale(0.07, 0.1, 0.22)
  stock.setLocalPosition(0, -0.02, 0.35)
  weaponRoot.addChild(stock)

  // Mag
  const mag = new pc.Entity('Mag')
  mag.addComponent('render', { type: 'box', material: darkMat })
  mag.setLocalScale(0.05, 0.16, 0.1)
  mag.setLocalPosition(0, -0.14, 0.05)
  weaponRoot.addChild(mag)

  // Sight
  const sight = new pc.Entity('Sight')
  sight.addComponent('render', { type: 'box', material: metalMat })
  sight.setLocalScale(0.02, 0.06, 0.08)
  sight.setLocalPosition(0, 0.1, -0.1)
  weaponRoot.addChild(sight)

  // Muzzle flash (simple light + scale)
  const muzzleFlash = new pc.Entity('MuzzleFlash')
  muzzleFlash.addComponent('light', {
    type: 'point',
    color: new pc.Color(1, 0.7, 0.3),
    intensity: 0,
    range: 4,
  })
  muzzleFlash.setLocalPosition(0, 0.02, -0.7)
  weaponRoot.addChild(muzzleFlash)

  // Recoil state
  let recoilOffset = 0
  let isReloading = false
  let reloadTimer = 0

  const basePos = new pc.Vec3(0.28, -0.22, -0.55)

  return {
    update(dt: number, input: PlayerInput, callbacks: WeaponCallbacks) {
      // Reload
      if (input.reload && !isReloading) {
        isReloading = true
        reloadTimer = 1.6 // seconds
      }

      if (isReloading) {
        reloadTimer -= dt
        // Simple reload animation - dip the gun
        const t = 1 - reloadTimer / 1.6
        const dip = Math.sin(t * Math.PI) * 0.18
        weaponRoot.setLocalPosition(basePos.x, basePos.y - dip, basePos.z)

        if (reloadTimer <= 0) {
          isReloading = false
          callbacks.onReload()
          weaponRoot.setLocalPosition(basePos)
        }
        return
      }

      // Fire
      if (input.fire && callbacks.canFire()) {
        callbacks.onFire()
        recoilOffset = 0.045

        // Flash
        const light = muzzleFlash.light
        if (light) {
          light.intensity = 8
        }
      }

      // Recoil recovery
      if (recoilOffset > 0) {
        recoilOffset = Math.max(0, recoilOffset - dt * 0.35)
      }

      // Apply recoil + idle sway
      const swayX = Math.sin(performance.now() * 0.0015) * 0.003
      const swayY = Math.cos(performance.now() * 0.0018) * 0.002

      weaponRoot.setLocalPosition(
        basePos.x + swayX,
        basePos.y + swayY,
        basePos.z + recoilOffset
      )

      // Fade muzzle flash
      const light = muzzleFlash.light
      if (light && light.intensity > 0) {
        light.intensity = Math.max(0, light.intensity - dt * 40)
      }
    },
  }
}
