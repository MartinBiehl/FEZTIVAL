'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

/*
 * Mascote do hero do /explorar: uma lula 3D (squidScene.js) que segue o mouse
 * e solta tinta em ladrilhos, no estilo da grade do github.com. Fica so no hero (areaRef), so
 * com mouse de verdade e nunca com prefers-reduced-motion. As cores sao as da
 * marca mais as dos dois brilhos que ja seguiam o mouse (#FF3CAC e #00BFE7).
 */
const INK_COLORS = ['#FFD600', '#FF6B35', '#FF3CAC', '#B36AFF', '#00D4FF', '#00BFE7'];
const TILE = 48;
const TILE_GAP = 1;
const TILE_RADIUS = 3;
const TILE_PEAK_ALPHA = 0.82;
const TILE_POP_MS = 180;
const TILE_HOLD_MS = 520;
const TILE_LIFE_MS = 1700;
const GRID_FADE_MS = 400;
// A tinta sai dos tentaculos, abaixo do centro do mascote.
const INK_OFFSET_Y = 34;

const squidSpring = { stiffness: 120, damping: 18, mass: 0.6 };
const showSpring = { type: 'spring', stiffness: 380, damping: 22 };

const PRECISE_HOVER = '(hover: hover) and (pointer: fine)';

function subscribePreciseHover(onChange) {
  const media = window.matchMedia(PRECISE_HOVER);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function usePreciseHover() {
  return useSyncExternalStore(
    subscribePreciseHover,
    () => window.matchMedia(PRECISE_HOVER).matches,
    () => false,
  );
}

/* Ruido estavel por celula: a grade apagada nao "pisca" a cada redesenho. */
function cellNoise(col, row) {
  const value = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function pick(list, except) {
  const options = except ? list.filter((item) => item !== except) : list;
  return options[Math.floor(Math.random() * options.length)];
}

function InkSquidLayer({ areaRef }) {
  const canvasRef = useRef(null);
  const squidCanvasRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, squidSpring);
  const y = useSpring(targetY, squidSpring);

  useEffect(() => {
    const area = areaRef.current;
    const canvas = canvasRef.current;
    if (!area || !canvas) return undefined;

    const context = canvas.getContext('2d');
    const tiles = new Map();
    let width = 0;
    let height = 0;
    let frame = 0;
    let inside = false;
    let gridAlpha = 0;
    let lastTime = 0;
    let lastPoint = null;
    let lastCell = null;
    let squid = null;
    let disposed = false;

    /*
     * three.js so baixa aqui, em desktop com mouse. Sem WebGL a lula nao
     * aparece, mas a tinta continua.
     */
    import('./squidScene.js')
      .then(({ createSquidScene }) => {
        if (!disposed) squid = createSquidScene(squidCanvasRef.current);
      })
      .catch(() => {});

    function resize() {
      const bounds = area.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function paint(col, row, now) {
      if (col < 0 || row < 0 || col * TILE > width || row * TILE > height) return;
      const color = pick(INK_COLORS);
      // Parte dos ladrilhos sai em degrade entre duas cores, como no GitHub.
      const color2 = Math.random() < 0.3 ? pick(INK_COLORS, color) : null;
      tiles.set(`${col},${row}`, { col, row, color, color2, born: now });
    }

    function paintAt(px, py, now) {
      const col = Math.floor(px / TILE);
      const row = Math.floor(py / TILE);
      const cell = `${col},${row}`;
      if (cell === lastCell) return;
      lastCell = cell;
      paint(col, row, now);
      // Respingo num vizinho, para o rastro nao sair como uma linha reta.
      if (Math.random() < 0.4) {
        paint(col + Math.round(Math.random() * 2 - 1), row + Math.round(Math.random() * 2 - 1), now);
      }
    }

    // Percorre o caminho desde o ultimo quadro: movimento rapido nao pula celulas.
    function trail(px, py, now) {
      if (!lastPoint) {
        paintAt(px, py, now);
      } else {
        const steps = Math.ceil(Math.hypot(px - lastPoint.x, py - lastPoint.y) / (TILE / 2));
        for (let step = 1; step <= steps; step += 1) {
          const t = step / steps;
          paintAt(lastPoint.x + (px - lastPoint.x) * t, lastPoint.y + (py - lastPoint.y) * t, now);
        }
      }
      lastPoint = { x: px, y: py };
    }

    function drawTile(tile, now) {
      const age = now - tile.born;
      const pop = Math.min(1, age / TILE_POP_MS);
      const fade = age < TILE_HOLD_MS ? 1 : 1 - (age - TILE_HOLD_MS) / (TILE_LIFE_MS - TILE_HOLD_MS);
      const size = (TILE - TILE_GAP * 2) * (0.5 + 0.5 * easeOutBack(pop));
      const left = tile.col * TILE + (TILE - size) / 2;
      const top = tile.row * TILE + (TILE - size) / 2;

      if (tile.color2) {
        const gradient = context.createLinearGradient(left, top, left + size, top + size);
        gradient.addColorStop(0, tile.color);
        gradient.addColorStop(1, tile.color2);
        context.fillStyle = gradient;
      } else {
        context.fillStyle = tile.color;
      }
      context.globalAlpha = TILE_PEAK_ALPHA * fade * pop;
      context.beginPath();
      context.roundRect(left, top, size, size, TILE_RADIUS);
      context.fill();
    }

    function draw(now) {
      context.clearRect(0, 0, width, height);

      if (gridAlpha > 0) {
        context.globalAlpha = 1;
        const cols = Math.ceil(width / TILE);
        const rows = Math.ceil(height / TILE);
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const noise = cellNoise(col, row);
            if (noise < 0.6) continue;
            context.fillStyle = `rgba(255, 255, 255, ${(0.01 + (noise - 0.6) * 0.06) * gridAlpha})`;
            context.fillRect(col * TILE + TILE_GAP, row * TILE + TILE_GAP, TILE - TILE_GAP * 2, TILE - TILE_GAP * 2);
          }
        }
      }

      for (const [key, tile] of tiles) {
        if (now - tile.born >= TILE_LIFE_MS) tiles.delete(key);
        else drawTile(tile, now);
      }
      context.globalAlpha = 1;
    }

    function tick(now) {
      const elapsed = now - lastTime;
      lastTime = now;
      gridAlpha = Math.min(1, Math.max(0, gridAlpha + (inside ? 1 : -1) * (elapsed / GRID_FADE_MS)));
      if (inside) trail(x.get(), y.get() + INK_OFFSET_Y, now);
      draw(now);
      squid?.render(now, x.getVelocity(), y.getVelocity());
      // O laco para sozinho quando o mouse sai e a tinta termina de secar.
      frame = inside || gridAlpha > 0 || tiles.size ? requestAnimationFrame(tick) : 0;
    }

    function start() {
      if (frame) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function handleMove(event) {
      if (event.pointerType !== 'mouse') return;
      const bounds = area.getBoundingClientRect();
      const px = event.clientX - bounds.left;
      const py = event.clientY - bounds.top;
      if (!inside) {
        // Entra ja no ponteiro, em vez de nadar desde o canto.
        inside = true;
        x.jump(px);
        y.jump(py);
        setVisible(true);
        start();
      }
      targetX.set(px);
      targetY.set(py);
    }

    function handleLeave() {
      inside = false;
      lastPoint = null;
      lastCell = null;
      setVisible(false);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(area);
    resize();
    area.addEventListener('pointermove', handleMove);
    area.addEventListener('pointerleave', handleLeave);

    return () => {
      disposed = true;
      squid?.dispose();
      observer.disconnect();
      area.removeEventListener('pointermove', handleMove);
      area.removeEventListener('pointerleave', handleLeave);
      cancelAnimationFrame(frame);
    };
  }, [areaRef, targetX, targetY, x, y]);

  return (
    <>
      <canvas ref={canvasRef} className="explore-ink" aria-hidden="true" />
      <motion.div className="explore-squid" aria-hidden="true" style={{ x, y }}>
        <motion.div
          className="explore-squid__body"
          initial={false}
          animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.35 }}
          transition={showSpring}
        >
          <canvas ref={squidCanvasRef} />
        </motion.div>
      </motion.div>
    </>
  );
}

function InkSquid({ areaRef }) {
  const shouldReduceMotion = useReducedMotion();
  const preciseHover = usePreciseHover();
  if (shouldReduceMotion || !preciseHover) return null;
  return <InkSquidLayer areaRef={areaRef} />;
}

export default InkSquid;
