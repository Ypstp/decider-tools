import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Trophy, Flame } from 'lucide-react';
import { HistoryEntry, ThemeMode } from '../../types';
import { TranslationSet } from '../../i18n/translations';
import { playSound } from '../../utils/sound';
import { launchConfetti } from '../../utils/confetti';
import { HistoryPanel } from '../HistoryPanel';
import { ToolActionHandle } from './WheelTool';

type ShellPhase = 'READY' | 'REVEAL_START' | 'SHUFFLING' | 'GUESSING' | 'RESULT';
type MixSpeedId = 'slow' | 'normal' | 'fast' | 'turbo';

const SPEED_MS: Record<MixSpeedId, number> = {
  slow: 620,
  normal: 380,
  fast: 220,
  turbo: 130,
};

const DIFFICULTY_PRESETS: {
  id: 'easy' | 'medium' | 'hard' | 'insane';
  cups: number;
  swaps: number;
  speed: MixSpeedId;
}[] = [
  { id: 'easy', cups: 3, swaps: 6, speed: 'slow' },
  { id: 'medium', cups: 3, swaps: 10, speed: 'normal' },
  { id: 'hard', cups: 4, swaps: 14, speed: 'fast' },
  { id: 'insane', cups: 5, swaps: 20, speed: 'turbo' },
];

interface ShellToolProps {
  soundEnabled: boolean;
  isActive?: boolean;
  theme?: ThemeMode;
  history: HistoryEntry[];
  onRecord: (text: string, detail?: string) => void;
  onClearHistory: () => void;
  t: TranslationSet;
}

interface CupEntity {
  id: number;
  slotIndex: number;
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  shadowMesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  targetLift: number;
  currentLift: number;
}

interface SwapStep {
  cupAIndex: number;
  cupBIndex: number;
  fromSlotA: number;
  fromSlotB: number;
  dirSign: number;
}

const _mouse = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.16)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function slotXPosition(slotIdx: number, totalCups: number): number {
  const spacing = totalCups >= 6 ? 1.48 : totalCups === 5 ? 1.6 : 1.75;
  return (slotIdx - (totalCups - 1) / 2) * spacing;
}

export const ShellTool = forwardRef<ToolActionHandle, ShellToolProps>(
  ({ soundEnabled, isActive = true, theme = 'dark', history, onRecord, onClearHistory, t }, ref) => {
    const [cupCount, setCupCount] = useState(3);
    const [swapCount, setSwapCount] = useState(10);
    const [mixSpeed, setMixSpeed] = useState<MixSpeedId>('normal');
    const [phase, setPhase] = useState<ShellPhase>('READY');
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [outcomeMsg, setOutcomeMsg] = useState<string | null>(null);
    const [outcomeSuccess, setOutcomeSuccess] = useState<boolean | null>(null);
    const [webglUnavailable, setWebglUnavailable] = useState(false);

    const mountRef = useRef<HTMLDivElement | null>(null);

    // Mutable refs read by the WebGL loop without tearing down Three.js
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;
    const themeRef = useRef<ThemeMode>(theme);
    themeRef.current = theme;
    const cupCountRef = useRef(cupCount);
    cupCountRef.current = cupCount;
    const swapCountRef = useRef(swapCount);
    swapCountRef.current = swapCount;
    const mixSpeedRef = useRef(mixSpeed);
    mixSpeedRef.current = mixSpeed;
    const phaseRef = useRef<ShellPhase>('READY');
    phaseRef.current = phase;
    const onRecordRef = useRef(onRecord);
    onRecordRef.current = onRecord;
    const tRef = useRef(t);
    tRef.current = t;

    const sceneApiRef = useRef<{
      rebuildCups: (count: number) => void;
      startRound: () => void;
      guessCup: (cupIdx: number) => void;
      guessSlot: (slotIdx: number) => void;
      syncSize: () => void;
      applyTheme: (mode: ThemeMode) => void;
    } | null>(null);

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const width = container.clientWidth || 720;
      const height = container.clientHeight || 430;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: 'default',
        });
      } catch {
        setWebglUnavailable(true);
        return;
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.touchAction = 'none';
      container.appendChild(renderer.domElement);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 80);
      camera.position.set(0, 4.3, 6.8);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.enablePan = false;
      controls.minDistance = 4.5;
      controls.maxDistance = 12;
      controls.minPolarAngle = 0.25;
      controls.maxPolarAngle = Math.PI / 2 - 0.14;
      controls.target.set(0, 0.55, 0);
      controls.update();

      // Clean, simple 3D lighting
      const hemi = new THREE.HemisphereLight(0xffffff, 0x475569, 1.05);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
      keyLight.position.set(4.5, 8.5, 5.5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -6.5;
      keyLight.shadow.camera.right = 6.5;
      keyLight.shadow.camera.top = 5;
      keyLight.shadow.camera.bottom = -5;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 22;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      // Simple matte table surface
      const tableMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.9,
        metalness: 0.0,
      });
      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.24, 48), tableMat);
      tableTop.position.y = -0.12;
      tableTop.receiveShadow = true;
      scene.add(tableTop);

      function applyTheme(mode: ThemeMode) {
        if (mode === 'light') {
          scene.background = new THREE.Color(0xf8fafc);
          tableMat.color.setHex(0xe2e8f0);
          hemi.intensity = 1.25;
          keyLight.intensity = 1.35;
        } else {
          scene.background = new THREE.Color(0x0f172a);
          tableMat.color.setHex(0x1e293b);
          hemi.intensity = 1.0;
          keyLight.intensity = 1.45;
        }
      }
      applyTheme(themeRef.current);

      // Shared Contact Shadow & Basic Cup/Ball Geometries
      const shadowTex = createContactShadowTexture();

      // Simple classic red plastic cup profile (bottom-center pivot at y = 0)
      const lathePoints = [
        new THREE.Vector2(0.49, 0.0),
        new THREE.Vector2(0.52, 0.03),
        new THREE.Vector2(0.49, 0.06),
        new THREE.Vector2(0.36, 1.15),
        new THREE.Vector2(0.34, 1.18),
        new THREE.Vector2(0.0, 1.18),
      ];
      const cupBodyGeo = new THREE.LatheGeometry(lathePoints, 32);
      const shadowGeo = new THREE.PlaneGeometry(1.4, 1.4);
      const hitGeo = new THREE.CylinderGeometry(0.46, 0.54, 1.3, 14);

      // Basic yellow ball
      const ballGroup = new THREE.Group();
      const ballSphereGeo = new THREE.SphereGeometry(0.22, 24, 18);
      const ballSphereMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.35,
        metalness: 0.0,
      });
      const ballMesh = new THREE.Mesh(ballSphereGeo, ballSphereMat);
      ballMesh.position.y = 0.22;
      ballMesh.castShadow = true;
      ballGroup.add(ballMesh);

      const ballShadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      });
      const ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), ballShadowMat);
      ballShadow.rotation.x = -Math.PI / 2;
      ballShadow.position.y = 0.004;
      ballGroup.add(ballShadow);
      scene.add(ballGroup);

      // Runtime game state inside Three.js scope
      let cups: CupEntity[] = [];
      let ballCupIndex = 0;
      let hoveredCupIndex: number | null = null;
      let swapQueue: SwapStep[] = [];
      let activeSwap: SwapStep | null = null;
      let swapProgress = 0;
      let revealTimer = 0;
      let ballBouncePhase = 0;
      let chosenCupIndex: number | null = null;
      const disposableMaterials: THREE.Material[] = [];

      const cupsContainer = new THREE.Group();
      scene.add(cupsContainer);

      function clearCups() {
        cups.forEach((c) => {
          cupsContainer.remove(c.group);
        });
        cups = [];
        disposableMaterials.forEach((m) => m.dispose());
        disposableMaterials.length = 0;
      }

      function frameCamera(count: number) {
        const aspect = Math.max(0.55, camera.aspect || 1);
        const baseZ = count >= 5 ? 8.2 : count === 4 ? 7.3 : 6.6;
        const scale = aspect < 1.35 ? Math.min(1.85, 1.35 / aspect) : 1;
        camera.position.set(0, 4.3 * (1 + (scale - 1) * 0.45), baseZ * scale);
        controls.maxDistance = Math.max(12, baseZ * scale + 4);
        controls.target.set(0, 0.55, 0);
        controls.update();
      }

      function rebuildCups(count: number) {
        clearCups();
        hoveredCupIndex = null;
        chosenCupIndex = null;
        swapQueue = [];
        activeSwap = null;

        for (let i = 0; i < count; i++) {
          const group = new THREE.Group();
          const x = slotXPosition(i, count);
          group.position.set(x, 0, 0);

          const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.34,
            metalness: 0.0,
          });
          const bodyMesh = new THREE.Mesh(cupBodyGeo, bodyMat);
          bodyMesh.castShadow = true;
          bodyMesh.receiveShadow = true;
          group.add(bodyMesh);

          const shadowMat = new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            depthWrite: false,
            opacity: 0.5,
          });
          const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
          shadowMesh.rotation.x = -Math.PI / 2;
          shadowMesh.position.y = 0.006;
          group.add(shadowMesh);

          const hitMat = new THREE.MeshBasicMaterial({ visible: false });
          const hitMesh = new THREE.Mesh(hitGeo, hitMat);
          hitMesh.position.y = 0.65;
          hitMesh.layers.set(1);
          hitMesh.userData.cupIndex = i;
          group.add(hitMesh);

          disposableMaterials.push(bodyMat, shadowMat, hitMat);
          cupsContainer.add(group);

          cups.push({
            id: i,
            slotIndex: i,
            group,
            bodyMat,
            shadowMesh,
            hitMesh,
            targetLift: 0,
            currentLift: 0,
          });
        }

        // Frame camera cleanly for cup count and viewport aspect ratio
        frameCamera(count);

        ballCupIndex = Math.floor(Math.random() * count);
        ballGroup.visible = false;
        const bx = slotXPosition(ballCupIndex, count);
        ballGroup.position.set(bx, 0, 0);
      }

      function buildSwapSequence(totalCups: number, totalSwaps: number): SwapStep[] {
        const slots = Array.from({ length: totalCups }, (_, idx) => idx);
        const steps: SwapStep[] = [];
        let lastPairKey = '';

        for (let s = 0; s < totalSwaps; s++) {
          let sA = 0;
          let sB = 1;
          for (let attempt = 0; attempt < 8; attempt++) {
            sA = Math.floor(Math.random() * totalCups);
            sB = Math.floor(Math.random() * totalCups);
            if (sA === sB) continue;
            const key = sA < sB ? `${sA}-${sB}` : `${sB}-${sA}`;
            if (key !== lastPairKey || totalCups <= 2) {
              lastPairKey = key;
              break;
            }
          }
          const cupA = slots[sA];
          const cupB = slots[sB];
          slots[sA] = cupB;
          slots[sB] = cupA;
          steps.push({
            cupAIndex: cupA,
            cupBIndex: cupB,
            fromSlotA: sA,
            fromSlotB: sB,
            dirSign: Math.random() > 0.5 ? 1 : -1,
          });
        }
        return steps;
      }

      function startRound() {
        if (phaseRef.current === 'REVEAL_START' || phaseRef.current === 'SHUFFLING') return;
        const n = cupCountRef.current;

        // Reset cup placements and lifts
        cups.forEach((c, idx) => {
          c.slotIndex = idx;
          c.targetLift = 0;
          c.currentLift = 0;
          c.group.position.set(slotXPosition(idx, n), 0, 0);
          c.group.rotation.set(0, 0, 0);
          c.bodyMat.color.setHex(0xdc2626);
          c.bodyMat.emissive.setHex(0x000000);
        });

        ballCupIndex = Math.floor(Math.random() * n);
        ballGroup.position.set(slotXPosition(ballCupIndex, n), 0, 0);
        ballGroup.visible = true;
        ballBouncePhase = 0;
        chosenCupIndex = null;
        hoveredCupIndex = null;

        setOutcomeMsg(null);
        setOutcomeSuccess(null);
        setPhase('REVEAL_START');
        phaseRef.current = 'REVEAL_START';
        revealTimer = 0;

        cups[ballCupIndex].targetLift = 1.55;
        playSound('click', soundRef.current);
      }

      function guessCup(cupIdx: number) {
        if (phaseRef.current !== 'GUESSING') return;
        const cup = cups[cupIdx];
        if (!cup) return;

        chosenCupIndex = cupIdx;
        hoveredCupIndex = null;
        renderer.domElement.style.cursor = 'default';

        // Reveal ball beneath its cup
        const ballCup = cups[ballCupIndex];
        ballGroup.position.set(ballCup.group.position.x, 0, ballCup.group.position.z);
        ballGroup.visible = true;

        cup.targetLift = 1.55;
        setPhase('RESULT');
        phaseRef.current = 'RESULT';

        const won = cupIdx === ballCupIndex;
        setOutcomeSuccess(won);

        if (won) {
          setOutcomeMsg(tRef.current.foundBall);
          setStreak((prev) => {
            const next = prev + 1;
            setBestStreak((b) => Math.max(b, next));
            return next;
          });
          playSound('win', soundRef.current);
          launchConfetti();
          onRecordRef.current(
            `Found! (Spot #${cup.slotIndex + 1})`,
            `${cupCountRef.current} cups · ${swapCountRef.current} swaps (${mixSpeedRef.current})`
          );
        } else {
          setOutcomeMsg(`${tRef.current.missedBall} #${ballCup.slotIndex + 1}`);
          setStreak(0);
          playSound('wrong', soundRef.current);
          window.setTimeout(() => {
            if (phaseRef.current === 'RESULT' && cups[ballCupIndex]) {
              cups[ballCupIndex].targetLift = 1.55;
            }
          }, 360);
          onRecordRef.current(
            `Missed (Spot #${ballCup.slotIndex + 1})`,
            `${cupCountRef.current} cups · ${swapCountRef.current} swaps (${mixSpeedRef.current})`
          );
        }
      }

      function guessSlot(slotIdx: number) {
        const match = cups.find((c) => c.slotIndex === slotIdx);
        if (match) guessCup(match.id);
      }

      function syncSize() {
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w <= 0 || h <= 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        frameCamera(cupCountRef.current);
      }

      sceneApiRef.current = { rebuildCups, startRound, guessCup, guessSlot, syncSize, applyTheme };
      rebuildCups(cupCountRef.current);

      // Raycasting & Pointer Interactions
      let pointerDownPos = { x: 0, y: 0 };
      let lastMoveCheck = 0;

      const updateMouse = (clientX: number, clientY: number) => {
        const rect = renderer.domElement.getBoundingClientRect();
        _mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        _mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onPointerDown = (e: PointerEvent) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
      };

      const onPointerMove = (e: PointerEvent) => {
        if (phaseRef.current !== 'GUESSING') {
          if (hoveredCupIndex !== null) {
            hoveredCupIndex = null;
            renderer.domElement.style.cursor = 'grab';
          }
          return;
        }
        const now = performance.now();
        if (now - lastMoveCheck < 35) return;
        lastMoveCheck = now;

        updateMouse(e.clientX, e.clientY);
        _raycaster.layers.set(1);
        _raycaster.setFromCamera(_mouse, camera);
        const hits = _raycaster.intersectObjects(
          cups.map((c) => c.hitMesh),
          false
        );
        if (hits.length > 0) {
          const idx = hits[0].object.userData.cupIndex as number;
          hoveredCupIndex = idx;
          renderer.domElement.style.cursor = 'pointer';
        } else {
          hoveredCupIndex = null;
          renderer.domElement.style.cursor = 'grab';
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        const dx = e.clientX - pointerDownPos.x;
        const dy = e.clientY - pointerDownPos.y;
        if (Math.hypot(dx, dy) > 8) return; // Was orbiting camera, not clicking

        if (phaseRef.current !== 'GUESSING') return;
        updateMouse(e.clientX, e.clientY);
        _raycaster.layers.set(1);
        _raycaster.setFromCamera(_mouse, camera);
        const hits = _raycaster.intersectObjects(
          cups.map((c) => c.hitMesh),
          false
        );
        if (hits.length > 0) {
          const idx = hits[0].object.userData.cupIndex as number;
          guessCup(idx);
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      // Resize observer so Stage Mode / tab switches / window resize keep 3D crisp
      const resizeObserver = new ResizeObserver(() => {
        syncSize();
      });
      resizeObserver.observe(container);

      const timer = new THREE.Timer();
      timer.connect(document);
      let frameId = 0;

      function animate(timestamp?: number) {
        timer.update(timestamp);
        const delta = Math.min(timer.getDelta(), 0.05);
        const n = cups.length;
        const currentPhase = phaseRef.current;

        // 1. Reveal start animation
        if (currentPhase === 'REVEAL_START') {
          revealTimer += delta;
          if (revealTimer > 0.85 && revealTimer <= 1.35) {
            if (cups[ballCupIndex]) cups[ballCupIndex].targetLift = 0;
          } else if (revealTimer > 1.38) {
            ballGroup.visible = false;
            swapQueue = buildSwapSequence(n, swapCountRef.current);
            activeSwap = swapQueue.shift() || null;
            swapProgress = 0;
            setPhase('SHUFFLING');
            phaseRef.current = 'SHUFFLING';
            if (activeSwap) playSound('cupSlide', soundRef.current);
          }
        }

        // 2. Shuffling curved 3D arcs
        if (currentPhase === 'SHUFFLING' && activeSwap) {
          const swapDurationSec = SPEED_MS[mixSpeedRef.current] / 1000;
          swapProgress += delta / swapDurationSec;

          const tNorm = Math.min(1, swapProgress);
          const ease = 0.5 - 0.5 * Math.cos(Math.PI * tNorm);

          const cupA = cups[activeSwap.cupAIndex];
          const cupB = cups[activeSwap.cupBIndex];

          if (cupA && cupB) {
            const xA0 = slotXPosition(activeSwap.fromSlotA, n);
            const xB0 = slotXPosition(activeSwap.fromSlotB, n);
            const dist = Math.abs(xB0 - xA0);
            const arcZ = Math.min(1.85, 0.65 + dist * 0.28);

            cupA.group.position.x = THREE.MathUtils.lerp(xA0, xB0, ease);
            cupA.group.position.z = Math.sin(Math.PI * ease) * arcZ * activeSwap.dirSign;
            cupA.group.rotation.z =
              -Math.sign(xB0 - xA0) * Math.sin(Math.PI * ease) * 0.065;

            cupB.group.position.x = THREE.MathUtils.lerp(xB0, xA0, ease);
            cupB.group.position.z = -Math.sin(Math.PI * ease) * arcZ * activeSwap.dirSign;
            cupB.group.rotation.z =
              Math.sign(xB0 - xA0) * Math.sin(Math.PI * ease) * 0.065;
          }

          if (tNorm >= 1) {
            if (cupA && cupB) {
              cupA.slotIndex = activeSwap.fromSlotB;
              cupB.slotIndex = activeSwap.fromSlotA;
              cupA.group.position.set(slotXPosition(cupA.slotIndex, n), 0, 0);
              cupB.group.position.set(slotXPosition(cupB.slotIndex, n), 0, 0);
              cupA.group.rotation.set(0, 0, 0);
              cupB.group.rotation.set(0, 0, 0);
            }
            activeSwap = swapQueue.shift() || null;
            swapProgress = 0;
            if (activeSwap) {
              playSound('cupSlide', soundRef.current);
            } else {
              setPhase('GUESSING');
              phaseRef.current = 'GUESSING';
            }
          }
        }

        // 3. Smooth vertical lift & hover feedback for all cups
        cups.forEach((cup, idx) => {
          const desiredLift =
            currentPhase === 'GUESSING' && hoveredCupIndex === idx
              ? 0.14
              : cup.targetLift;

          cup.currentLift = THREE.MathUtils.damp(cup.currentLift, desiredLift, 11, delta);
          cup.group.position.y = cup.currentLift;

          // Keep contact shadow anchored on the table while cup lifts
          cup.shadowMesh.position.y = 0.006 - cup.currentLift;
          const shadowScale = Math.max(0.5, 1 - cup.currentLift * 0.25);
          cup.shadowMesh.scale.setScalar(shadowScale);

          // Subtle hover highlight
          if (currentPhase === 'GUESSING') {
            cup.bodyMat.emissive.setHex(hoveredCupIndex === idx ? 0x3b0d0d : 0x000000);
          } else if (currentPhase === 'RESULT' && chosenCupIndex !== idx && idx !== ballCupIndex) {
            cup.bodyMat.emissive.setHex(0x000000);
          }
        });

        // Subtle bounce on yellow ball when revealed
        if (ballGroup.visible && currentPhase === 'RESULT') {
          ballBouncePhase += delta * 6;
          const bY = Math.abs(Math.sin(ballBouncePhase)) * 0.14;
          ballMesh.position.y = 0.22 + bY;
        } else {
          ballMesh.position.y = 0.22;
        }

        if (isActiveRef.current || currentPhase !== 'READY') {
          controls.update();
          renderer.render(scene, camera);
        }
        frameId = requestAnimationFrame(animate);
      }

      animate();

      return () => {
        cancelAnimationFrame(frameId);
        timer.dispose();
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        controls.dispose();
        clearCups();
        cupBodyGeo.dispose();
        shadowGeo.dispose();
        hitGeo.dispose();
        ballSphereGeo.dispose();
        ballSphereMat.dispose();
        ballShadowMat.dispose();
        tableTop.geometry.dispose();
        tableMat.dispose();
        shadowTex.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    useEffect(() => {
      sceneApiRef.current?.applyTheme(theme);
    }, [theme]);

    useEffect(() => {
      if (!isActive) return;
      const raf = requestAnimationFrame(() => {
        sceneApiRef.current?.syncSize();
      });
      return () => cancelAnimationFrame(raf);
    }, [isActive]);

    const handleCupCountChange = (nextCount: number) => {
      if (phase === 'REVEAL_START' || phase === 'SHUFFLING') return;
      setCupCount(nextCount);
      setPhase('READY');
      setOutcomeMsg(null);
      setOutcomeSuccess(null);
      sceneApiRef.current?.rebuildCups(nextCount);
      playSound('click', soundEnabled);
    };

    const applyPreset = (preset: (typeof DIFFICULTY_PRESETS)[number]) => {
      if (phase === 'REVEAL_START' || phase === 'SHUFFLING') return;
      setCupCount(preset.cups);
      setSwapCount(preset.swaps);
      setMixSpeed(preset.speed);
      setPhase('READY');
      setOutcomeMsg(null);
      setOutcomeSuccess(null);
      sceneApiRef.current?.rebuildCups(preset.cups);
      playSound('click', soundEnabled);
    };

    const startRound = useCallback(() => {
      sceneApiRef.current?.startRound();
    }, []);

    useImperativeHandle(ref, () => ({ trigger: startRound }), [startRound]);

    // Allow pressing 1-6 during guessing phase (by left-to-right slot position)
    useEffect(() => {
      if (!isActive) return;
      const onKey = (e: KeyboardEvent) => {
        if (phase !== 'GUESSING') return;
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= cupCount) {
          sceneApiRef.current?.guessSlot(num - 1);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [isActive, phase, cupCount]);

    const isBusy = phase === 'REVEAL_START' || phase === 'SHUFFLING';

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        {/* Game Stage */}
        <div className="tool-stage flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {/* Top HUD inside stage */}
          <div data-guide="shell-hud" className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5 sm:py-3 text-xs dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex items-center gap-2 font-semibold">
              <span
                className={
                  outcomeSuccess === true
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : outcomeSuccess === false
                    ? 'text-rose-600 dark:text-rose-400'
                    : phase === 'GUESSING'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-600 dark:text-slate-300'
                }
              >
                {phase === 'READY'
                  ? t.shellReady
                  : phase === 'REVEAL_START' || phase === 'SHUFFLING'
                  ? t.mixing
                  : phase === 'GUESSING'
                  ? t.pickACup
                  : outcomeMsg}
              </span>
            </div>

            <div className="flex items-center gap-4 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span>
                  {t.streak}: <strong className="text-slate-900 dark:text-white">{streak}</strong>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 dt-text-accent" />
                <span>
                  {t.bestStreak}:{' '}
                  <strong className="text-slate-900 dark:text-white">{bestStreak}</strong>
                </span>
              </span>
            </div>
          </div>

          {/* Dedicated isolated 3D Canvas Container */}
          <div ref={mountRef} data-guide="shell-stage" className="shell-canvas-wrap relative h-[280px] w-full sm:h-[380px] lg:h-[440px]">
            {webglUnavailable && (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                WebGL is required for the Cup &amp; Ball stage.
              </div>
            )}
          </div>

          {/* Bottom Dock inside stage */}
          <div data-guide="shell-action" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 sm:py-3.5 dark:border-slate-800 dark:bg-slate-900">
            {phase === 'GUESSING' ? (
              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                {Array.from({ length: cupCount }, (_, slotIdx) => (
                  <button
                    key={slotIdx}
                    type="button"
                    onClick={() => sceneApiRef.current?.guessSlot(slotIdx)}
                    className="inline-flex min-h-11 min-w-20 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs transition-all sm:hover:-translate-y-0.5 hover:border-rose-500 hover:text-rose-600 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-rose-400 dark:hover:text-rose-400"
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
                    <span>
                      {t.cupLabel} {slotIdx + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t.shellHint}
                </span>

                <button
                  type="button"
                  disabled={isBusy || webglUnavailable}
                  onClick={startRound}
                  className="inline-flex min-h-11 w-full sm:w-auto sm:min-w-44 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold dt-btn-primary shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? t.mixing : phase === 'RESULT' ? t.playAgain : t.startMix}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Controls Sidebar */}
        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {/* Quick Difficulty Presets */}
          <div data-guide="shell-difficulty" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.difficulty}
            </span>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              {DIFFICULTY_PRESETS.map((preset) => {
                const isSelected =
                  cupCount === preset.cups &&
                  swapCount === preset.swaps &&
                  mixSpeed === preset.speed;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => applyPreset(preset)}
                    className={`truncate rounded-lg px-1.5 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {t[preset.id]}
                  </button>
                );
              })}
            </div>
          </div>

          <div data-guide="shell-custom" className="flex flex-col gap-5">
          {/* Cup Count */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.cupCount}
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {cupCount}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              {[3, 4, 5, 6].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleCupCountChange(cnt)}
                  className={`rounded-lg py-2 sm:py-1.5 font-mono text-xs font-bold transition-colors ${
                    cupCount === cnt
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>

          {/* Mix Swaps */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="shell-swaps"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                {t.swapCount}
              </label>
              <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {swapCount}
              </span>
            </div>
            <input
              id="shell-swaps"
              type="range"
              min={3}
              max={25}
              value={swapCount}
              disabled={isBusy}
              onChange={(e) => setSwapCount(parseInt(e.target.value, 10))}
              className="dt-accent-control w-full"
            />
          </div>

          {/* Mix Speed */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.mixSpeed}
            </span>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              {(
                [
                  { id: 'slow', label: t.slow },
                  { id: 'normal', label: t.normal.split(' ')[0] },
                  { id: 'fast', label: t.fast.split(' ')[0] },
                  { id: 'turbo', label: t.turbo },
                ] as { id: MixSpeedId; label: string }[]
              ).map((spd) => (
                <button
                  key={spd.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setMixSpeed(spd.id);
                    playSound('click', soundEnabled);
                  }}
                  className={`truncate rounded-lg px-1.5 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    mixSpeed === spd.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {spd.label}
                </button>
              ))}
            </div>
          </div>
          </div>

          <HistoryPanel entries={history} onClear={onClearHistory} t={t} />
        </div>
      </div>
    );
  }
);

ShellTool.displayName = 'ShellTool';
