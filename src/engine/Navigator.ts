import * as THREE from 'three';

export class Navigator {
    private camera: THREE.Camera;
    private velocity = new THREE.Vector3();
    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private moveUp = false;
    private moveDown = false;
    private isSprinting = false;
    public enabled = false;

    constructor(camera: THREE.Camera) {
        this.camera = camera;
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    private onKeyDown = (event: KeyboardEvent) => {
        if (!this.enabled) return;
        switch (event.code) {
            case 'KeyW': this.moveForward = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'Space': this.moveUp = true; break;
            case 'ControlLeft': this.moveDown = true; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.isSprinting = true; break;
        }
    };

    private onKeyUp = (event: KeyboardEvent) => {
        if (!this.enabled) return;
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyD': this.moveRight = false; break;
            case 'Space': this.moveUp = false; break;
            case 'ControlLeft': this.moveDown = false; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.isSprinting = false; break;
        }
    };

    public update(delta: number) {
        // Limit delta to avoid huge jumps
        const actualDelta = Math.min(delta, 0.1);

        const baseAcceleration = 5000.0;
        const acceleration = this.isSprinting ? baseAcceleration * 2.0 : baseAcceleration;
        const friction = 15.0;
        const baseMaxSpeed = 800.0;
        const maxSpeed = this.isSprinting ? baseMaxSpeed * 2.0 : baseMaxSpeed;

        // Calculate move direction
        const direction = new THREE.Vector3();
        direction.z = Number(this.moveForward) - Number(this.moveBackward);
        direction.x = Number(this.moveRight) - Number(this.moveLeft);
        direction.y = Number(this.moveUp) - Number(this.moveDown);
        direction.normalize();

        // Apply acceleration
        if (this.moveForward || this.moveBackward) {
            this.velocity.z += direction.z * acceleration * actualDelta;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x += direction.x * acceleration * actualDelta;
        }
        if (this.moveUp || this.moveDown) {
            this.velocity.y += direction.y * acceleration * actualDelta;
        }

        // Apply friction
        this.velocity.x -= this.velocity.x * friction * actualDelta;
        this.velocity.z -= this.velocity.z * friction * actualDelta;
        this.velocity.y -= this.velocity.y * friction * actualDelta;

        // Clamp speed
        const currentSpeed = this.velocity.length();
        if (currentSpeed > maxSpeed) {
            this.velocity.multiplyScalar(maxSpeed / currentSpeed);
        }

        // Threshold to stop completely
        if (Math.abs(this.velocity.x) < 1.0) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 1.0) this.velocity.y = 0;
        if (Math.abs(this.velocity.z) < 1.0) this.velocity.z = 0;

        // Calculate combined movement vector
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0); // Always up in world space for vertical movement

        const moveVector = new THREE.Vector3();
        moveVector.addScaledVector(forward, this.velocity.z * actualDelta);
        moveVector.addScaledVector(right, this.velocity.x * actualDelta);
        moveVector.addScaledVector(up, this.velocity.y * actualDelta);

        this.camera.position.add(moveVector);
    }

    public dispose() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }
}
