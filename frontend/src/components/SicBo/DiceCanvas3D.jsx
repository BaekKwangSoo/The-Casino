import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

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
  ctx.fillStyle = '#1a1a2e';
  for (const [x, y] of DOT_MAP[n]) {
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(cv);
}

const FACE_ORDER = [3, 4, 1, 6, 2, 5];
let _texCache = null;
function getTextures() {
  if (!_texCache) _texCache = FACE_ORDER.map(makeFaceTex);
  return _texCache;
}

const SETTLE_ROT = {
  1: [0,             0, 0],
  2: [-Math.PI / 2,  0, 0],
  3: [0,             0, -Math.PI / 2],
  4: [0,             0,  Math.PI / 2],
  5: [ Math.PI / 2,  0, 0],
  6: [ Math.PI,      0, 0],
};

/* ══ 물리 상수 ════════════════════════════════════════ */
const HALF        = 0.44;
const FLOOR_Y     = -2.3;
const CEIL_Y      =  1.2;
const DISC_RADIUS =  1.4;

const FRONT_POS = [[-1.05, -1.86, 0.15], [0.1, -1.86, -0.2], [1.05, -1.86, 0.1]];
const TOP_POS   = [[-1.1, 0, -0.85], [1.1, 0, -0.85], [0, 0, 1.05]];

/* Rapier 싱글톤 초기화 */
let _rapierReady = null;
function initRapier() {
  if (!_rapierReady) _rapierReady = RAPIER.init().then(() => RAPIER);
  return _rapierReady;
}

/* ══ DiceScene ════════════════════════════════════════ */
function DiceScene({ dice, animState, isTop }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ dice, animState });
  useEffect(() => { stateRef.current = { dice, animState }; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId;
    let disposeFn = () => {};

    initRapier().then(R => {
      if (!canvasRef.current) return;

      /* ── Three.js ── */
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();

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

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xffffff, 1.0);
      dir.position.set(3, 5, 4);
      scene.add(dir);
      const pt = new THREE.PointLight(0xbee0ff, 0.3, 20);
      pt.position.set(-2, 2, 3);
      scene.add(pt);

      const textures  = getTextures();
      const positions = isTop ? TOP_POS : FRONT_POS;

      const meshes = positions.map(pos => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.88, 0.88, 0.88),
          textures.map(t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.2, metalness: 0.05 })),
        );
        mesh.position.set(...pos);
        scene.add(mesh);
        return mesh;
      });

      /* ── Rapier 월드 ── */
      const world = new R.World(isTop ? { x: 0, y: -8, z: 0 } : { x: 0, y: -22, z: 0 });

      if (!isTop) {
        /* 정면: 바닥 + 천장 + 4면 유리 벽 */
        const fb = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, FLOOR_Y, 0));
        world.createCollider(R.ColliderDesc.cuboid(5, 0.05, 5).setRestitution(0.45).setFriction(0.6), fb);

        const cb = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, CEIL_Y, 0));
        world.createCollider(R.ColliderDesc.cuboid(5, 0.05, 5).setRestitution(0.1).setFriction(0.1), cb);

        const wallY = (CEIL_Y + FLOOR_Y) / 2;
        const wallH = (CEIL_Y - FLOOR_Y) / 2;
        [
          { p: [1.4, wallY, 0],   e: [0.05, wallH, 1.2] },
          { p: [-1.4, wallY, 0],  e: [0.05, wallH, 1.2] },
          { p: [0, wallY,  0.65], e: [1.5, wallH, 0.05] },
          { p: [0, wallY, -0.65], e: [1.5, wallH, 0.05] },
        ].forEach(({ p, e }) => {
          const wb = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(...p));
          world.createCollider(R.ColliderDesc.cuboid(...e).setRestitution(0.3).setFriction(0.3), wb);
        });
      } else {
        /* 탑뷰: 바닥 + 원형 벽 (16 세그먼트 박스) */
        const floorY = -HALF - 0.05;
        const fb = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, floorY, 0));
        world.createCollider(R.ColliderDesc.cuboid(3, 0.05, 3).setRestitution(0.3).setFriction(0.8), fb);

        const segs = 16;
        for (let j = 0; j < segs; j++) {
          const ang   = (j / segs) * Math.PI * 2;
          const wx    = Math.cos(ang) * DISC_RADIUS;
          const wz    = Math.sin(ang) * DISC_RADIUS;
          const wb    = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(wx, 0, wz));
          const hLen  = (Math.PI * 2 * DISC_RADIUS / segs) * 0.58;
          const q     = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang + Math.PI / 2);
          world.createCollider(
            R.ColliderDesc.cuboid(hLen, 0.8, 0.08)
              .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
              .setRestitution(0.45)
              .setFriction(0.3),
            wb,
          );
        }
      }

      /* 주사위 리짓바디 */
      const diceBodies = positions.map((pos) => {
        const body = world.createRigidBody(
          R.RigidBodyDesc.dynamic()
            .setTranslation(pos[0], pos[1], pos[2])
            .setLinearDamping(0.1)
            .setAngularDamping(0.1),
        );
        world.createCollider(
          R.ColliderDesc.cuboid(HALF, HALF, HALF)
            .setRestitution(0.4)
            .setFriction(0.5)
            .setDensity(1.5),
          body,
        );
        return body;
      });

      const tgtQuats = positions.map(() => new THREE.Quaternion());
      const settled  = positions.map(() => false);

      /* 리사이즈 */
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

      /* 롤링 임펄스 */
      const applyRollingImpulse = (body, i) => {
        const seed = i - 1;
        if (!isTop) {
          body.setLinvel({ x: (Math.random() - 0.5) * 5, y: 9 + Math.random() * 4, z: (Math.random() - 0.5) * 5 }, true);
        } else {
          /* 중심 방향으로 랜덤 속도 */
          const pos = positions[i];
          const dx  = -pos[0] + (Math.random() - 0.5) * 3;
          const dz  = -pos[2] + (Math.random() - 0.5) * 3;
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          const spd = 6 + Math.random() * 4;
          body.setLinvel({ x: (dx / len) * spd + seed * 1.5, y: 0, z: (dz / len) * spd - seed * 1.2 }, true);
        }
        body.setAngvel({
          x: (Math.random() - 0.5) * 28,
          y: (Math.random() - 0.5) * 35,
          z: (Math.random() - 0.5) * 28,
        }, true);
      };

      /* 애니메이션 루프 */
      let prevState = null;

      const animate = () => {
        rafId = requestAnimationFrame(animate);
        const { dice: d, animState: s } = stateRef.current;

        /* 상태 전환 */
        if (s !== prevState) {
          if (s === 'rolling') {
            settled.fill(false);
            diceBodies.forEach((body, i) => {
              const p = positions[i];
              body.setTranslation({ x: p[0], y: isTop ? HALF + 0.05 : FLOOR_Y + HALF, z: p[2] }, true);
              body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
              body.setLinearDamping(0.05);
              body.setAngularDamping(0.08);
              applyRollingImpulse(body, i);
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
            diceBodies.forEach(body => {
              body.setLinearDamping(3.5);
              body.setAngularDamping(6.0);
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
            diceBodies.forEach((body, i) => {
              const p = positions[i];
              body.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
              body.setLinvel({ x: 0, y: 0, z: 0 }, true);
              body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            });
          }
          prevState = s;
        }

        /* 물리 스텝 */
        if (s === 'rolling' || (s === 'settling' && !settled.every(Boolean))) {
          world.step();
        }

        /* 메시 동기화 */
        if (s === 'rolling' || s === 'settling') {
          diceBodies.forEach((body, i) => {
            if (settled[i]) return;

            const t = body.translation();
            const r = body.rotation();
            meshes[i].position.set(t.x, t.y, t.z);

            if (s === 'settling' && d[i]) {
              const lv = body.linvel();
              const av = body.angvel();
              const spd    = lv.x ** 2 + lv.y ** 2 + lv.z ** 2;
              const angSpd = av.x ** 2 + av.y ** 2 + av.z ** 2;

              if (spd < 0.09 && angSpd < 0.25) {
                /* 정착 → 회전 스냅 */
                settled[i] = true;
                meshes[i].quaternion.copy(tgtQuats[i]);
                body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                body.setAngvel({ x: 0, y: 0, z: 0 }, true);
              } else {
                meshes[i].quaternion.set(r.x, r.y, r.z, r.w);
              }
            } else {
              meshes[i].quaternion.set(r.x, r.y, r.z, r.w);
            }
          });
        }

        renderer.render(scene, camera);
      };

      animate();

      disposeFn = () => {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        world.free();
        meshes.forEach(m => {
          m.geometry.dispose();
          [].concat(m.material).forEach(mat => mat.dispose());
        });
        renderer.dispose();
      };
    });

    return () => disposeFn();
  }, [isTop]);

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
