export interface InputHandlers {
  onDragDelta: (deltaLateral: number) => void;
  onJump: () => void;
  onPauseToggle: () => void;
}

interface PointerRecord {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startTime: number;
  totalDistance: number;
  hasJumped: boolean;
}

export class InputController {
  private element: HTMLElement;
  private handlers: InputHandlers;

  private activePointers = new Map<number, PointerRecord>();
  private primaryPointerId: number | null = null;
  private keyLeft = false;
  private keyRight = false;
  public sensitivityMultiplier = 1.0;

  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;

  constructor(element: HTMLElement, handlers: InputHandlers) {
    this.element = element;
    this.handlers = handlers;

    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);

    this.attach();
  }

  private attach(): void {
    this.element.addEventListener('pointerdown', this.boundOnPointerDown, { passive: false });
    window.addEventListener('pointermove', this.boundOnPointerMove, { passive: false });
    window.addEventListener('pointerup', this.boundOnPointerUp, { passive: true });
    window.addEventListener('pointercancel', this.boundOnPointerUp, { passive: true });

    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
  }

  public detach(): void {
    this.element.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    window.removeEventListener('pointercancel', this.boundOnPointerUp);

    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);
  }

  private onPointerDown(e: PointerEvent): void {
    const target = e.target as HTMLElement;
    // Don't intercept UI buttons (pause button, dedicated jump button, modals)
    if (target.closest('button') || target.closest('.sketch-btn') || target.closest('.interactive-ui')) {
      return;
    }

    e.preventDefault();

    const now = performance.now();
    const ptr: PointerRecord = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      startTime: now,
      totalDistance: 0,
      hasJumped: false,
    };

    // MULTI-TOUCH JUMP:
    // If the player is already steering with one thumb/finger and taps ANYWHERE with a second finger,
    // trigger jump instantly with zero lag!
    if (this.activePointers.size >= 1) {
      ptr.hasJumped = true;
      this.handlers.onJump();
    }

    this.activePointers.set(e.pointerId, ptr);
    if (this.primaryPointerId === null) {
      this.primaryPointerId = e.pointerId;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const ptr = this.activePointers.get(e.pointerId);
    if (!ptr) return;

    const dx = e.clientX - ptr.lastX;
    const dy = e.clientY - ptr.lastY;
    const totalDist = Math.hypot(e.clientX - ptr.startX, e.clientY - ptr.startY);
    ptr.totalDistance = Math.max(ptr.totalDistance, totalDist);
    ptr.lastX = e.clientX;
    ptr.lastY = e.clientY;

    // SWIPE-UP FLICK TO JUMP:
    // Upward flick gesture anywhere on screen effortlessly vaults over obstacles
    if (!ptr.hasJumped && (ptr.startY - e.clientY > 28 || dy < -18)) {
      ptr.hasJumped = true;
      this.handlers.onJump();
    }

    // STEERING: applies lateral movement for primary pointer
    if (e.pointerId === this.primaryPointerId) {
      const screenWidth = Math.max(window.innerWidth, 320);
      const baseSensitivity = 38.0 / screenWidth;
      const deltaLateral = dx * baseSensitivity * this.sensitivityMultiplier;
      this.handlers.onDragDelta(deltaLateral);
    }
  }

  private onPointerUp(e: PointerEvent): void {
    const ptr = this.activePointers.get(e.pointerId);
    if (ptr) {
      const elapsed = performance.now() - ptr.startTime;
      // TAP-TO-JUMP:
      // If the touch was a quick tap (< 350ms) without large drag (< 16px) and hasn't already jumped,
      // trigger jump on tap!
      if (!ptr.hasJumped && elapsed < 350 && ptr.totalDistance < 16) {
        this.handlers.onJump();
      }
      this.activePointers.delete(e.pointerId);
    }

    if (this.primaryPointerId === e.pointerId) {
      const nextPtr = this.activePointers.keys().next();
      this.primaryPointerId = nextPtr.done ? null : nextPtr.value;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.keyLeft = true;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.keyRight = true;
    } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      this.handlers.onJump();
    } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      this.handlers.onPauseToggle();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.keyLeft = false;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.keyRight = false;
    }
  }

  public update(dt: number): void {
    // Snappy, agile keyboard lateral movement
    if (this.keyLeft && !this.keyRight) {
      this.handlers.onDragDelta(-22.0 * dt * this.sensitivityMultiplier);
    } else if (this.keyRight && !this.keyLeft) {
      this.handlers.onDragDelta(22.0 * dt * this.sensitivityMultiplier);
    }
  }
}
