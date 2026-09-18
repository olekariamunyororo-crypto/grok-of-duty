import * as pc from 'playcanvas'

export interface PlayerInput {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  sprint: boolean
  jump: boolean
  fire: boolean
  reload: boolean
}

export interface PlayerController {
  update: (dt: number, input: PlayerInput) => void
}

export function createPlayer(app: pc.Application) {
  // Player root (handles yaw / horizontal movement)
  const playerEntity = new pc.Entity('Player')
  playerEntity.setPosition(0, 1.7, 5)
  app.root.addChild(playerEntity)

  // Camera (handles pitch)
  const camera = new pc.Entity('Camera')
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.55, 0.65, 0.78),
    farClip: 200,
    nearClip: 0.08,
    fov: 75,
  })
  camera.setLocalPosition(0, 0, 0)
  playerEntity.addChild(camera)

  // Simple collision / ground check using a capsule-like approach
  // (PlayCanvas has rigidbody, but for pure FPS feel we do custom movement)

  const speed = 6.5
  const sprintMultiplier = 1.65
  const jumpForce = 7.5
  const gravity = -22

  let velocityY = 0
  let isGrounded = true
  const playerHeight = 1.7

  const controller: PlayerController = {
    update(dt: number, input: PlayerInput) {
      // Horizontal movement
      const forward = new pc.Vec3()
      const right = new pc.Vec3()

      camera.getWorldTransform().getZ(forward)
      forward.y = 0
      forward.normalize()
      forward.mulScalar(-1) // camera looks down -Z

      camera.getWorldTransform().getX(right)
      right.y = 0
      right.normalize()

      const move = new pc.Vec3()

      if (input.forward) move.add(forward)
      if (input.backward) move.sub(forward)
      if (input.right) move.add(right)
      if (input.left) move.sub(right)

      if (move.length() > 0) {
        move.normalize()
        const currentSpeed = input.sprint ? speed * sprintMultiplier : speed
        move.mulScalar(currentSpeed * dt)

        const pos = playerEntity.getPosition()
        pos.add(move)

        // Simple world bounds (keep player in the test map)
        pos.x = Math.max(-24, Math.min(24, pos.x))
        pos.z = Math.max(-24, Math.min(24, pos.z))

        playerEntity.setPosition(pos)
      }

      // Jump + gravity
      if (input.jump && isGrounded) {
        velocityY = jumpForce
        isGrounded = false
      }

      velocityY += gravity * dt

      const pos = playerEntity.getPosition()
      pos.y += velocityY * dt

      // Ground collision (flat ground at y = 0)
      if (pos.y <= playerHeight) {
        pos.y = playerHeight
        velocityY = 0
        isGrounded = true
      }

      playerEntity.setPosition(pos)
    },
  }

  return { camera, playerEntity, controller }
}
