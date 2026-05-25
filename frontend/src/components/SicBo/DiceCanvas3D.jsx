import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

/* ══ 주사위 눈 위치 (256×256 px) ════════════════════ */
const DOT_MAP = {
  1: [[128, 128]],
  2: [[76,  76],  [180, 180]],
  3: [[76,  76],  [128, 128], [180, 180]],
  4: [[76,  76],  [180, 76],  [76,  180], [180, 180]],
  5: [[76,  76],  [180, 76],  [128, 128], [76,  180], [180, 180]],
  6: [[76,  58],  [180, 58],  [76,  128], [180, 128], [76,  198], [180, 198]],
};

function makeFaceTex(n) {
  const sz = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = sz;
  const ctx = cv.getContext('2d');

  /* 둥근 흰 배경 */
  const r = 32, m = 10;
  ctx.fillStyle = '#f2ede4';
  ctx.beginPath();
  ctx.moveTo(m + r, m);
  ctx.lineTo(sz - m - r, m);   ctx.quadraticCurveTo(sz - m, m,     sz - m, m + r);
  ctx.lineTo(sz - m, sz - m - r); ctx.quadraticCurveTo(sz - m, sz - m, sz - m - r, sz - m);
  ctx.lineTo(m + r, sz - m);   ctx.quadraticCurveTo(m, sz - m, m, sz - m - r);
  ctx.lineTo(m, m + r);        ctx.quadraticCurveTo(m, m, m + r, m);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 3;
  ctx.stroke();

  /* 점 */
  ctx.fillStyle = '#1a1a2e';
  for (const [x, y] of DOT_MAP[n]) {
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(cv);
}

/*  BoxGeometry 면 순서: +X, -X, +Y, -Y, +Z, -Z
    표준 주사위:          3,   4,   1,   6,  2,   5  */
const FACE_ORDER = [3, 4, 1, 6, 2, 5];

let _texCache = null;
function getTextures() {
  if (!_texCache) _texCache = FACE_ORDER.map(makeFaceTex);
  return _texCache;
}

/* 값 N을 +Y(위)로 보이게 하는 Euler 각도 */
const SETTLE_ROT = {
  1: [0,             0, 0],
  2: [-Math.PI / 2,  0, 0],
  3: [0,             0, -Math.PI / 2],
  4: [0,             0,  Math.PI / 2],
  5: [ Math.PI / 2,  0, 0],
  6: [ Math.PI,      0, 0],
};

/* 바운스 물리 상수 */
const GRAVITY     = 44;   // 중력 가속도 (units/s²)
const FLOOR_Y     = -2.3; // 나무 바닥 위치
const CEIL_Y      =  1.2; // 유리 상단 위치
const HALF        =  0.44;// 주사위 반크기 (0.88/2)
const DISC_RADIUS =  1.4; // 위에서 보기 유리 링 반지름
const COLL_D      =  0.92;// 주사위 간 최소 거리 (충돌 임계값)
const WALL_X      =  1.35;// 정면 유리 x 벽
const WALL_Z      =  0.55;// 정면 유리 z 벽

/* 주사위 별 속도 — rx/ry/rz: 회전, vy: 수직, vx/vz: 수평(탑뷰) */
function rndVel(seed) {
  return {
    rx: (Math.random() - 0.5) * 28 + seed * 5.0,
    ry: (Math.random() - 0.5) * 36,
    rz: (Math.random() - 0.5) * 28 - seed * 4.0,
    vy: 9.0 + Math.random() * 3.0,
    vx: (Math.random() - 0.5) * 9 + seed * 1.5,
    vz: (Math.random() - 0.5) * 9 - seed * 1.0,
  };
}

/* ══ 공통 Three.js 씬 컴포넌트 ═══════════════════════ */
/* y = FLOOR_Y + HALF = -1.86 → 주사위가 나무판 위에 안착 */
const FRONT_POS = [[-1.05, -1.86, 0.15], [0.1, -1.86, -0.2], [1.05, -1.86, 0.1]];
const TOP_POS   = [[-1.1, 0, -0.85], [1.1, 0, -0.85], [0, 0, 1.05]];

function DiceScene({ dice, animState, isTop }) {
  const canvasRef = useRef(null);
  /* 최신 상태를 RAF 루프에서 읽기 위해 ref 사용 */
  const stateRef  = useRef({ dice, animState });
  useEffect(() => { stateRef.current = { dice, animState }; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* ── 렌더러 ── */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /* ── 씬 ── */
    const scene = new THREE.Scene();

    /* ── 카메라 ── */
    const parent = canvas.parentElement;
    const pw = parent?.clientWidth  || 200;
    const ph = parent?.clientHeight || 200;
    const camera = new THREE.PerspectiveCamera(40, pw / ph, 0.1, 50);
    if (isTop) {
      camera.position.set(0, 6, 0);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(0, 1.2, 5.5);
      camera.lookAt(0, -0.3, 0);
    }

    /* ── 조명 ── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(3, 5, 4);
    scene.add(dir);
    const pt = new THREE.PointLight(0xbee0ff, 0.3, 20);
    pt.position.set(-2, 2, 3);
    scene.add(pt);

    /* ── 주사위 메시 ── */
    const textures  = getTextures();
    const positions = isTop ? TOP_POS : FRONT_POS;
    const vels      = positions.map((_, i) => rndVel(i - 1));
    const tgtQuats  = positions.map(() => new THREE.Quaternion());
    const settled   = positions.map(() => false);

    const meshes = positions.map(pos => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.88, 0.88),
        textures.map(t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.2, metalness: 0.05 })),
      );
      mesh.position.set(...pos);
      scene.add(mesh);
      return mesh;
    });

    /* ── 리사이즈 ── */
    const resize = () => {
      const el = canvas.parentElement;
      if (!el) return;
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (parent) ro.observe(parent);

    /* ── 애니메이션 루프 ── */
    let rafId;
    let prevState = null;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const { dice: d, animState: s } = stateRef.current;

      /* 상태 전환 처리 */
      if (s !== prevState) {
        if (s === 'rolling') {
          settled.fill(false);
          vels.forEach((v, i) => {
            Object.assign(v, rndVel(i - 1));
            if (!isTop) meshes[i].position.y = FLOOR_Y + HALF;
          });
        } else if (s === 'settling') {
          settled.fill(false);
          tgtQuats.forEach((q, i) => {
            const val = d[i];
            if (val) {
              const [ex, ey, ez] = SETTLE_ROT[val] ?? [0, 0, 0];
              q.setFromEuler(new THREE.Euler(ex, ey, ez));
            }
          });
        } else if (s === 'idle') {
          meshes.forEach((mesh, i) => {
            const val = d[i];
            if (val) {
              const [ex, ey, ez] = SETTLE_ROT[val] ?? [0, 0, 0];
              mesh.rotation.set(ex, ey, ez);
            }
            mesh.position.set(...positions[i]);
          });
        }
        prevState = s;
      }

      /* 프레임 업데이트 */
      meshes.forEach((mesh, i) => {
        const v = vels[i];

        if (s === 'rolling') {
          mesh.rotation.x += v.rx * dt;
          mesh.rotation.y += v.ry * dt;
          mesh.rotation.z += v.rz * dt;

          if (!isTop) {
            /* 정면: 중력 + 상하 바운스 */
            v.vy -= GRAVITY * dt;
            mesh.position.y += v.vy * dt;

            /* 충돌 임펄스로 생긴 수평 속도 적용 (빠른 마찰) */
            const hf = Math.pow(0.88, dt * 60);
            mesh.position.x += v.vx * dt;
            mesh.position.z += v.vz * dt;
            v.vx *= hf; v.vz *= hf;
            if (Math.abs(mesh.position.x) > WALL_X) { mesh.position.x = Math.sign(mesh.position.x) * WALL_X; v.vx *= -0.5; }
            if (Math.abs(mesh.position.z) > WALL_Z) { mesh.position.z = Math.sign(mesh.position.z) * WALL_Z; v.vz *= -0.5; }

            if (mesh.position.y < FLOOR_Y + HALF) {
              mesh.position.y = FLOOR_Y + HALF;
              v.vy = 10.0 + Math.random() * 4.0;
            }
            if (mesh.position.y > CEIL_Y - HALF) {
              mesh.position.y = CEIL_Y - HALF;
              v.vy = 0;
            }
          } else {
            /* 탑뷰: 수평 이동 + 원형 벽 반발 */
            mesh.position.x += v.vx * dt;
            mesh.position.z += v.vz * dt;

            const dx = mesh.position.x, dz = mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const limit = DISC_RADIUS - HALF;
            if (dist > limit) {
              const nx = dx / dist, nz = dz / dist;
              mesh.position.x = limit * nx;
              mesh.position.z = limit * nz;
              const dot = v.vx * nx + v.vz * nz;
              v.vx = (v.vx - 2 * dot * nx) * 0.72;
              v.vz = (v.vz - 2 * dot * nz) * 0.72;
            }
          }

        } else if (s === 'settling' && d[i]) {
          if (isTop) {
            /* 탑뷰: 마찰 감속 + 링 유지 */
            const fr = Math.pow(0.84, dt * 60);
            v.vx *= fr; v.vz *= fr;
            mesh.position.x += v.vx * dt;
            mesh.position.z += v.vz * dt;

            const sdx = mesh.position.x, sdz = mesh.position.z;
            const sd = Math.sqrt(sdx * sdx + sdz * sdz);
            const sl = DISC_RADIUS - HALF;
            if (sd > sl) {
              mesh.position.x = sl * (sdx / sd);
              mesh.position.z = sl * (sdz / sd);
              v.vx *= 0.4; v.vz *= 0.4;
            }
            mesh.quaternion.slerp(tgtQuats[i], 0.12);

          } else if (!settled[i]) {
            /* 정면: 중력 + 감쇠 */
            v.vy -= GRAVITY * dt;
            mesh.position.y += v.vy * dt;

            /* 충돌 수평 속도 유지 (마찰) */
            const hf = Math.pow(0.88, dt * 60);
            mesh.position.x += v.vx * dt;
            mesh.position.z += v.vz * dt;
            v.vx *= hf; v.vz *= hf;
            if (Math.abs(mesh.position.x) > WALL_X) { mesh.position.x = Math.sign(mesh.position.x) * WALL_X; v.vx *= -0.5; }
            if (Math.abs(mesh.position.z) > WALL_Z) { mesh.position.z = Math.sign(mesh.position.z) * WALL_Z; v.vz *= -0.5; }

            /* 회전 감쇠 */
            const rd = Math.pow(0.78, dt * 60);
            v.rx *= rd; v.ry *= rd; v.rz *= rd;
            mesh.rotation.x += v.rx * dt;
            mesh.rotation.y += v.ry * dt;
            mesh.rotation.z += v.rz * dt;

            if (mesh.position.y <= FLOOR_Y + HALF) {
              mesh.position.y = FLOOR_Y + HALF;
              if (Math.abs(v.vy) < 3.5) {
                settled[i] = true;
                mesh.quaternion.copy(tgtQuats[i]);
                v.rx = 0; v.ry = 0; v.rz = 0; v.vy = 0; v.vx = 0; v.vz = 0;
              } else {
                v.vy *= -0.38;
                v.rx *= 0.45; v.ry *= 0.45; v.rz *= 0.45;
              }
            }
          }
        }
      });

      /* ── 주사위 간 충돌 해소 ── */
      if (s === 'rolling' || s === 'settling') {
        for (let a = 0; a < meshes.length - 1; a++) {
          for (let b = a + 1; b < meshes.length; b++) {
            const pa = meshes[a].position, pb = meshes[b].position;
            const va = vels[a], vb = vels[b];
            const sA = settled[a], sB = settled[b];
            if (sA && sB) continue;

            const dx = pb.x - pa.x;
            const dy = isTop ? 0 : (pb.y - pa.y);
            const dz = pb.z - pa.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 >= COLL_D * COLL_D || d2 < 1e-6) continue;

            const dist = Math.sqrt(d2);
            const nx = dx / dist, ny = dy / dist, nz = dz / dist;
            const gap = COLL_D - dist;

            /* 위치 분리 */
            const mA = sA ? 0 : (sB ? 1 : 0.5);
            const mB = sB ? 0 : (sA ? 1 : 0.5);
            if (!sA) { pa.x -= nx * gap * mA; pa.z -= nz * gap * mA; if (!isTop) pa.y -= ny * gap * mA; }
            if (!sB) { pb.x += nx * gap * mB; pb.z += nz * gap * mB; if (!isTop) pb.y += ny * gap * mB; }

            /* 속도 교환 */
            const vax = va.vx, vay = va.vy, vaz = va.vz;
            const vbx = vb.vx, vby = vb.vy, vbz = vb.vz;
            const relDot = (vbx - vax) * nx + (isTop ? 0 : (vby - vay) * ny) + (vbz - vaz) * nz;
            if (relDot >= 0) continue;

            const e = 0.65;
            const j = (sA || sB) ? -(1 + e) * relDot : -(1 + e) * relDot * 0.5;

            if (!sA) { va.vx -= j * nx; va.vz -= j * nz; if (!isTop) va.vy -= j * ny; }
            if (!sB) { vb.vx += j * nx; vb.vz += j * nz; if (!isTop) vb.vy += j * ny; }
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      meshes.forEach(m => {
        m.geometry.dispose();
        [].concat(m.material).forEach(mat => mat.dispose());
      });
      renderer.dispose();
    };
  }, [isTop]); // isTop은 바뀌지 않으므로 실질적으로 mount 1회

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

export function DiceCanvasFront({ dice, animState }) {
  return <DiceScene dice={dice} animState={animState} isTop={false} />;
}

export function DiceCanvasTop({ dice, animState }) {
  return <DiceScene dice={dice} animState={animState} isTop={true} />;
}
