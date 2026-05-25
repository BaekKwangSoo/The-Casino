import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ══ 눈 배치 (256×256 기준 픽셀 좌표) ══════════════ */
const DOT_MAP = {
  1: [[128, 128]],
  2: [[76, 76], [180, 180]],
  3: [[76, 76], [128, 128], [180, 180]],
  4: [[76, 76], [180, 76], [76, 180], [180, 180]],
  5: [[76, 76], [180, 76], [128, 128], [76, 180], [180, 180]],
  6: [[76, 58], [180, 58], [76, 128], [180, 128], [76, 198], [180, 198]],
};

function makeFaceTex(n) {
  const sz = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = sz;
  const ctx = cv.getContext('2d');

  /* 흰 바탕 — 모서리 둥글게 */
  ctx.fillStyle = '#f2ede4';
  ctx.beginPath();
  const r = 32, m = 10;
  ctx.moveTo(m + r, m);
  ctx.lineTo(sz - m - r, m);
  ctx.quadraticCurveTo(sz - m, m,     sz - m, m + r);
  ctx.lineTo(sz - m, sz - m - r);
  ctx.quadraticCurveTo(sz - m, sz - m, sz - m - r, sz - m);
  ctx.lineTo(m + r, sz - m);
  ctx.quadraticCurveTo(m, sz - m, m, sz - m - r);
  ctx.lineTo(m, m + r);
  ctx.quadraticCurveTo(m, m, m + r, m);
  ctx.closePath();
  ctx.fill();

  /* 미세 테두리 */
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 3;
  ctx.stroke();

  /* 점 */
  ctx.fillStyle = '#1a1a2e';
  for (const [x, y] of DOT_MAP[n]) {
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  const t = new THREE.CanvasTexture(cv);
  return t;
}

/*
  BoxGeometry face 순서: +X, -X, +Y, -Y, +Z, -Z
  표준 주사위:            3,   4,   1,   6,  2,   5
*/
const FACE_ORDER = [3, 4, 1, 6, 2, 5];

let _texCache = null;
function getTextures() {
  if (!_texCache) _texCache = FACE_ORDER.map(makeFaceTex);
  return _texCache;
}

/* 값 N을 +Y(위)로 보이게 하는 Euler 각도 */
const SETTLE_ROT = {
  1: [0,           0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0,           0, -Math.PI / 2],
  4: [0,           0,  Math.PI / 2],
  5: [ Math.PI / 2, 0, 0],
  6: [ Math.PI,    0, 0],
};

function rndVel(seed) {
  return {
    x: (Math.random() - 0.5) * 6 + seed * 1.2,
    y: (Math.random() - 0.5) * 8,
    z: (Math.random() - 0.5) * 6 - seed * 0.8,
  };
}

/* ══ 주사위 메시 ══════════════════════════════════════ */
function Die({ value, animState, position, seed = 0 }) {
  const mesh = useRef();
  const vel  = useRef(rndVel(seed));
  const tgtQ = useRef(new THREE.Quaternion());
  const textures = useMemo(getTextures, []);

  /* animState 변경 시만 반응 — velocity 재설정 */
  useEffect(() => {
    if (animState === 'rolling') vel.current = rndVel(seed);
  }, [animState]);

  /* value 혹은 state 변화 시 정착 목표 갱신 */
  useEffect(() => {
    if (!mesh.current) return;
    if (animState === 'settling' && value) {
      const [ex, ey, ez] = SETTLE_ROT[value] ?? [0, 0, 0];
      tgtQ.current.setFromEuler(new THREE.Euler(ex, ey, ez));
    } else if (animState === 'idle' && value) {
      const [ex, ey, ez] = SETTLE_ROT[value] ?? [0, 0, 0];
      mesh.current.rotation.set(ex, ey, ez);
    }
  }, [animState, value]);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    if (animState === 'rolling') {
      mesh.current.rotation.x += vel.current.x * dt;
      mesh.current.rotation.y += vel.current.y * dt;
      mesh.current.rotation.z += vel.current.z * dt;
    } else if (animState === 'settling' && value) {
      mesh.current.quaternion.slerp(tgtQ.current, 0.07);
    }
  });

  return (
    <mesh ref={mesh} position={position} castShadow receiveShadow>
      <boxGeometry args={[0.88, 0.88, 0.88]} />
      {textures.map((t, i) => (
        <meshStandardMaterial
          key={i}
          attach={`material-${i}`}
          map={t}
          roughness={0.2}
          metalness={0.05}
        />
      ))}
    </mesh>
  );
}

/* ══ 정면 씬 ══════════════════════════════════════════ */
const FRONT_POSITIONS = [
  [-1.05, -1.3,  0.15],
  [ 0.1,  -1.3, -0.2 ],
  [ 1.05, -1.3,  0.1 ],
];

export function DiceCanvasFront({ dice, animState }) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 5.5], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
      shadows
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      <pointLight position={[-2, 2, 3]} intensity={0.35} color="#bee0ff" />
      {FRONT_POSITIONS.map((pos, i) => (
        <Die key={i} value={dice[i]} animState={animState} position={pos} seed={i - 1} />
      ))}
    </Canvas>
  );
}

/* ══ 위에서 보기 씬 ══════════════════════════════════ */
const TOP_POSITIONS = [
  [-1.1, 0, -0.85],
  [ 1.1, 0, -0.85],
  [ 0,   0,  1.05],
];

function TopCameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

export function DiceCanvasTop({ dice, animState }) {
  return (
    <Canvas
      camera={{ position: [0, 6, 0], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
      shadows
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <TopCameraSetup />
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, 5, 2]} intensity={0.9} castShadow />
      <pointLight position={[-2, 4, -2]} intensity={0.3} color="#bee0ff" />
      {TOP_POSITIONS.map((pos, i) => (
        <Die key={i} value={dice[i]} animState={animState} position={pos} seed={i - 1} />
      ))}
    </Canvas>
  );
}
