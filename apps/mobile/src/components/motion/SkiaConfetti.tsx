/**
 * SkiaConfetti
 * -------------------------------------------------------------------------
 * A real-time, physics-driven particle confetti burst rendered with
 * `@shopify/react-native-skia` and animated by `react-native-reanimated`'s
 * `useFrameCallback`. Designed as a drop-in celebration effect for the 5BIB
 * mobile app — typically fired on the checkout-success state.
 *
 * Why Skia + Reanimated (vs Lottie)?
 *   - Particles obey real physics (gravity, angular velocity, fan-shaped
 *     emission) so every burst looks subtly different — Lottie loops always
 *     look identical.
 *   - Parametric: tune `particleCount`, `duration`, `origin` at runtime.
 *   - Runs on the UI thread via `useFrameCallback`, so it does not block
 *     the JS thread and stays smooth at 60fps even on mid-range Android.
 *
 * Architecture
 *   - We allocate `particleCount` particles on mount and store their state
 *     inside a single `useSharedValue<Particle[]>` so mutations stay on the
 *     UI thread (no React re-renders per frame).
 *   - `useFrameCallback` integrates physics with a real `dt` derived from
 *     the frame info, so motion is frame-rate independent.
 *   - Each particle is rendered by reading its state via `useDerivedValue`
 *     and applying a translate+rotate Skia `Group` transform around the
 *     particle centre. The actual primitive (`Rect`, `Circle`, or `Path`
 *     for the triangle) is drawn at the origin and transformed into place.
 *
 * Physics constants
 *   - Initial speed: 400–800 px/s (random within the fan)
 *   - Gravity:      +800 px/s²  (positive Y = falling, matches screen coords)
 *   - Angular vel:  ±360 °/s    (so confetti tumbles realistically)
 *   - Emission fan: 120°, centred on straight up — that gives an upward
 *     burst that spreads naturally outward.
 *   - Lifecycle: full opacity until 70% of `duration`, then linear fade to 0
 *     over the final 30%. After `duration` ms the loop freezes particles
 *     invisible and does not auto-restart.
 *
 * Shape mix
 *   40% rectangles (the "5BIB" bib-card silhouette), 40% circles,
 *   20% triangles — matches our brand mood: structured but festive.
 *
 * Imperative API
 *   In addition to the declarative `trigger` prop, this file exports
 *   `useConfettiTrigger()` returning `{ trigger, fire }`. Wire `trigger`
 *   into the component and call `fire()` from any handler to start a burst.
 * -------------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  Skia,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { tokens } from '../../theme/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ParticleShape = 'rect' | 'circle' | 'triangle';

/**
 * Per-particle state. Kept as a plain object inside a SharedValue array so
 * the UI-thread frame callback can mutate it in place without JSI boundary
 * crossings every frame.
 */
interface Particle {
  /** Current position (px, screen-space). */
  x: number;
  y: number;
  /** Velocity (px/s). */
  vx: number;
  vy: number;
  /** Rotation (radians) and angular velocity (rad/s). */
  rotation: number;
  angularVelocity: number;
  /** Half-extent for rect/triangle, or radius for circle (px). */
  size: number;
  /** Fill colour — chosen once at spawn so each particle is mono-coloured. */
  color: string;
  shape: ParticleShape;
  /**
   * Age in seconds, used for the opacity fade tail. Frozen at `lifespan`
   * once the burst is finished so the renderer can short-circuit.
   */
  age: number;
  /** Total lifespan in seconds — equal to `duration / 1000`. */
  lifespan: number;
}

export interface SkiaConfettiProps {
  /**
   * Edge-triggered: when this transitions from `false` to `true`, a single
   * burst is emitted. Returning to `false` does not stop an in-flight burst
   * (it would look strange to cut confetti mid-air); the burst always plays
   * out to `duration` ms.
   */
  trigger: boolean;
  /** Burst lifetime in milliseconds. Default 3000. */
  duration?: number;
  /** Number of particles per burst. Default 80. */
  particleCount?: number;
  /** Burst origin point in the Canvas's coordinate space. */
  origin: { x: number; y: number };
  /** Container style. Usually absolute-fill above the success UI. */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 5BIB-themed palette — picked from the design tokens. */
const PALETTE: readonly string[] = [
  tokens.color.brandPrimary,
  tokens.color.brandAccent,
  tokens.color.magenta,
  tokens.color.success,
  tokens.color.warning,
  tokens.color.brandSecondary,
];

const GRAVITY_PX_PER_S2 = 800;
const MIN_SPEED = 400;
const MAX_SPEED = 800;
const MIN_SIZE = 6;
const MAX_SIZE = 14;
/** ±360°/s in radians — fast enough to tumble visibly without strobing. */
const MAX_ANGULAR_VEL = (360 * Math.PI) / 180;
/** Emission fan width, centred straight up (−π/2). 120° gives a nice spread. */
const FAN_WIDTH_RAD = (120 * Math.PI) / 180;
/** Fraction of lifespan held at full opacity before the fade tail begins. */
const FADE_START_FRACTION = 0.7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const randRange = (min: number, max: number) => min + Math.random() * (max - min);

const pickShape = (): ParticleShape => {
  // 40% rect, 40% circle, 20% triangle
  const r = Math.random();
  if (r < 0.4) return 'rect';
  if (r < 0.8) return 'circle';
  return 'triangle';
};

/**
 * Build a fresh particle at the given origin with a randomised velocity that
 * points within the 120° upward fan. We compute the angle as
 * `−π/2 + (±FAN_WIDTH/2)` so the average direction is straight up and the
 * extremes lean to either side.
 */
const spawnParticle = (origin: { x: number; y: number }, lifespan: number): Particle => {
  const speed = randRange(MIN_SPEED, MAX_SPEED);
  // -π/2 points up in screen coords (y grows downward), then jitter ±60°.
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * FAN_WIDTH_RAD;
  return {
    x: origin.x,
    y: origin.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotation: Math.random() * Math.PI * 2,
    angularVelocity: (Math.random() - 0.5) * 2 * MAX_ANGULAR_VEL,
    size: randRange(MIN_SIZE, MAX_SIZE),
    // PALETTE is non-empty so the index is always in-bounds.
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)] as string,
    shape: pickShape(),
    age: 0,
    lifespan,
  };
};

// ---------------------------------------------------------------------------
// Single-particle renderer
// ---------------------------------------------------------------------------

interface ParticleViewProps {
  /** Index into the shared particle array. */
  index: number;
  particles: ReturnType<typeof useSharedValue<Particle[]>>;
}

/**
 * Renders one particle. We isolate this into its own component so each gets
 * its own `useDerivedValue` -> Skia transform binding, which is what lets
 * Skia update positions on the UI thread without any React re-renders.
 *
 * The transform applied is:
 *   1. translate(x, y) — particle position in screen space
 *   2. rotate(rotation) about the particle centre
 *
 * Because primitives are drawn centred at (0, 0) (e.g. a rect at
 * `(-size, -size, 2*size, 2*size)`), the rotation visually pivots about
 * the particle's centre rather than its corner.
 */
const ParticleView: React.FC<ParticleViewProps> = ({ index, particles }) => {
  // Pull the static (spawn-time) attributes once. Shape/colour/size do not
  // change after spawn, so we can read them from the initial snapshot and
  // skip re-deriving them every frame.
  const initial = particles.value[index]!;

  const transform = useDerivedValue(() => {
    const p = particles.value[index]!;
    return [
      { translateX: p.x },
      { translateY: p.y },
      { rotate: p.rotation },
    ];
  });

  const opacity = useDerivedValue(() => {
    const p = particles.value[index]!;
    const t = p.age / p.lifespan;
    if (t >= 1) return 0;
    if (t <= FADE_START_FRACTION) return 1;
    // Linear fade from 1 -> 0 across the final (1 - FADE_START_FRACTION) of life.
    return 1 - (t - FADE_START_FRACTION) / (1 - FADE_START_FRACTION);
  });

  // Build the triangle path once. It points upward (an equilateral triangle
  // inscribed in a square of side 2 * size, centred at origin).
  const trianglePath = useMemo(() => {
    if (initial.shape !== 'triangle') return null;
    const s = initial.size;
    const path = Skia.Path.Make();
    path.moveTo(0, -s);
    path.lineTo(s, s);
    path.lineTo(-s, s);
    path.close();
    return path;
  }, [initial.shape, initial.size]);

  // origin (0, 0) is the particle centre after the Group's translate.
  switch (initial.shape) {
    case 'rect':
      return (
        <Group transform={transform} opacity={opacity}>
          <Rect
            x={-initial.size}
            y={-initial.size * 0.5}
            width={initial.size * 2}
            height={initial.size}
            color={initial.color}
          />
        </Group>
      );
    case 'circle':
      return (
        <Group transform={transform} opacity={opacity}>
          <Circle cx={0} cy={0} r={initial.size} color={initial.color} />
        </Group>
      );
    case 'triangle':
      return (
        <Group transform={transform} opacity={opacity}>
          <Path path={trianglePath!} color={initial.color} />
        </Group>
      );
  }
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const SkiaConfetti: React.FC<SkiaConfettiProps> = ({
  trigger,
  duration = 3000,
  particleCount = 80,
  origin,
  style,
}) => {
  // Track the previous trigger value so we can fire only on the rising edge.
  const [prevTrigger, setPrevTrigger] = useState(false);
  // Whether the burst is currently animating. While false, the frame callback
  // is a no-op so we burn zero UI-thread time when idle.
  const isActive = useSharedValue(false);

  // Lifespan in seconds (physics integrator works in SI units).
  const lifespanSec = duration / 1000;

  // Shared particle array. We allocate up-front so we never grow the array
  // on the UI thread (allocations during `useFrameCallback` would jank).
  const particles = useSharedValue<Particle[]>(
    Array.from({ length: particleCount }, () => spawnParticle(origin, lifespanSec)),
  );

  // Reset all particles to a freshly spawned state. Called from the JS
  // thread on the rising edge of `trigger`. We mutate inside the same array
  // to preserve referential identity for child components.
  const resetParticles = useCallback(() => {
    const next = particles.value.slice();
    for (let i = 0; i < next.length; i++) {
      next[i] = spawnParticle(origin, lifespanSec);
    }
    particles.value = next;
    isActive.value = true;
  }, [particles, isActive, origin, lifespanSec]);

  // Rising-edge detector.
  useEffect(() => {
    if (trigger && !prevTrigger) {
      resetParticles();
    }
    setPrevTrigger(trigger);
  }, [trigger, prevTrigger, resetParticles]);

  // Per-frame physics integrator. Runs on the UI thread; `frameInfo.timeSincePreviousFrame`
  // is in ms, may be `null` on the very first frame.
  useFrameCallback((frameInfo) => {
    'worklet';
    if (!isActive.value) return;
    const dtMs = frameInfo.timeSincePreviousFrame ?? 16;
    const dt = dtMs / 1000;

    const list = particles.value;
    let anyAlive = false;
    // In-place mutation: assigning back to `particles.value` once at the
    // end is what triggers derived-value re-evaluation in Skia.
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      if (p.age >= p.lifespan) continue;
      p.vy += GRAVITY_PX_PER_S2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.angularVelocity * dt;
      p.age += dt;
      if (p.age < p.lifespan) anyAlive = true;
    }
    // Reassign to broadcast the change to derived values.
    particles.value = list;
    // Once every particle has aged out, freeze the loop so it costs nothing.
    if (!anyAlive) {
      isActive.value = false;
    }
  });

  // Render every particle. `particleCount` is fixed across the component's
  // lifetime so this array is stable and React reconciliation is cheap.
  const indices = useMemo(
    () => Array.from({ length: particleCount }, (_, i) => i),
    [particleCount],
  );

  return (
    <Canvas style={[{ flex: 1 }, style]} pointerEvents="none">
      {indices.map((i) => (
        <ParticleView key={i} index={i} particles={particles} />
      ))}
    </Canvas>
  );
};

// ---------------------------------------------------------------------------
// Imperative hook
// ---------------------------------------------------------------------------

/**
 * Imperative companion to the declarative `trigger` prop. Use this when a
 * burst should be fired from a callback (e.g. inside `onPress` or after an
 * API call resolves) rather than driven by a piece of component state.
 *
 * @example
 *   const { trigger, fire } = useConfettiTrigger();
 *   // ...
 *   <SkiaConfetti trigger={trigger} origin={{ x: 200, y: 100 }} />
 *   <Button onPress={fire} title="Celebrate" />
 */
export const useConfettiTrigger = () => {
  const [trigger, setTrigger] = useState(false);
  const fire = useCallback(() => {
    // Drop the trigger back to false on the next tick so the rising-edge
    // detector inside SkiaConfetti will fire again on the *next* call to fire().
    setTrigger(true);
    // Using a microtask + macrotask ensures the SkiaConfetti effect sees the
    // `true` value at least once before we flip it back.
    setTimeout(() => setTrigger(false), 0);
  }, []);
  return { trigger, fire };
};

export default SkiaConfetti;
