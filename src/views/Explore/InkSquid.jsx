'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';

/*
 * Mascote do hero do /explorar: uma lula que segue o mouse e solta tinta em
 * ladrilhos, no estilo da grade do github.com. Fica so no hero (areaRef), so
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
const INK_OFFSET_Y = 26;

const squidSpring = { stiffness: 120, damping: 18, mass: 0.6 };
const tiltSpring = { stiffness: 220, damping: 20 };
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
  const [visible, setVisible] = useState(false);
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, squidSpring);
  const y = useSpring(targetY, squidSpring);
  const velocityX = useVelocity(x);
  const velocityY = useVelocity(y);
  // Inclina para o lado em que nada e olha para onde vai.
  const tilt = useSpring(useTransform(velocityX, [-1400, 0, 1400], [-24, 0, 24]), tiltSpring);
  const lookX = useTransform(velocityX, [-900, 0, 900], [-3, 0, 3]);
  const lookY = useTransform(velocityY, [-900, 0, 900], [-2.5, 0, 2.5]);

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
      observer.disconnect();
      area.removeEventListener('pointermove', handleMove);
      area.removeEventListener('pointerleave', handleLeave);
      cancelAnimationFrame(frame);
    };
  }, [areaRef, targetX, targetY, x, y]);

  return (
    <>
      <canvas ref={canvasRef} className="explore-ink" aria-hidden="true" />
      <motion.div className="explore-squid" aria-hidden="true" style={{ x, y, rotate: tilt }}>
        <motion.div
          className="explore-squid__body"
          initial={false}
          animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.35 }}
          transition={showSpring}
        >
          <SquidArt lookX={lookX} lookY={lookY} />
        </motion.div>
      </motion.div>
    </>
  );
}

/*
 * Desenho proprio (nao e o personagem de nenhum jogo): lula rosa-roxa com
 * fone amarelo. O volume vem dos degrades radiais e dos reflexos brancos.
 */
function SquidArt({ lookX, lookY }) {
  return (
    <svg viewBox="0 -14 120 164" focusable="false">
      <defs>
        <radialGradient id="fez-squid-body" cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#FFB8E2" />
          <stop offset="0.35" stopColor="#FF3CAC" />
          <stop offset="0.8" stopColor="#C2188A" />
          <stop offset="1" stopColor="#7A0F63" />
        </radialGradient>
        <linearGradient id="fez-squid-tentacle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E0249A" />
          <stop offset="1" stopColor="#9B4DFF" />
        </linearGradient>
        <radialGradient id="fez-squid-eye" cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D9D2E6" />
        </radialGradient>
        <radialGradient id="fez-squid-pupil" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#5A4680" />
          <stop offset="1" stopColor="#0D0718" />
        </radialGradient>
        <linearGradient id="fez-squid-cup" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF08A" />
          <stop offset="0.5" stopColor="#FFD600" />
          <stop offset="1" stopColor="#B89400" />
        </linearGradient>
      </defs>

      <g className="explore-squid__tentacle explore-squid__tentacle--left">
        <path d="M34 88C28 110 18 124 22 140C24 148 36 148 38 140C40 130 46 116 50 90Z" fill="url(#fez-squid-tentacle)" />
        <circle cx="27" cy="137" r="3.2" fill="#fff" opacity="0.3" />
        <circle cx="32" cy="128" r="2.4" fill="#fff" opacity="0.3" />
      </g>
      <g className="explore-squid__tentacle explore-squid__tentacle--right">
        <path d="M86 88C92 110 102 124 98 140C96 148 84 148 82 140C80 130 74 116 70 90Z" fill="url(#fez-squid-tentacle)" />
        <circle cx="93" cy="137" r="3.2" fill="#fff" opacity="0.3" />
        <circle cx="88" cy="128" r="2.4" fill="#fff" opacity="0.3" />
      </g>
      <path
        className="explore-squid__tentacle explore-squid__tentacle--middle"
        d="M53 92C53 106 55 116 60 122C65 116 67 106 67 92Z"
        fill="url(#fez-squid-tentacle)"
      />

      <path
        d="M20 84H100V90Q96 104 89 96Q83 106 76 97Q70 107 64 98Q60 106 56 98Q50 107 44 97Q37 106 31 96Q24 104 20 90Z"
        fill="#B5157E"
      />

      <path d="M14 66C8 -28 112 -28 106 66" fill="none" stroke="#D9B400" strokeWidth="6" strokeLinecap="round" />

      <path
        d="M60 6C68 6 80 18 92 34C104 50 114 60 112 72C110 84 94 90 60 90C26 90 10 84 8 72C6 60 16 50 28 34C40 18 52 6 60 6Z"
        fill="url(#fez-squid-body)"
      />
      <ellipse cx="40" cy="30" rx="11" ry="6" fill="#fff" opacity="0.55" transform="rotate(-38 40 30)" />
      <circle cx="53" cy="17" r="2.6" fill="#fff" opacity="0.65" />
      <path d="M100 76C96 84 84 87 70 88" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.18" />

      <path d="M31 43L52 49M89 43L68 49" stroke="#2B0B3F" strokeWidth="4.5" strokeLinecap="round" />
      <g className="explore-squid__eyes">
        <ellipse cx="44" cy="62" rx="15.5" ry="17" fill="#2B0B3F" />
        <ellipse cx="76" cy="62" rx="15.5" ry="17" fill="#2B0B3F" />
        <ellipse cx="44" cy="62" rx="11.5" ry="13" fill="url(#fez-squid-eye)" />
        <ellipse cx="76" cy="62" rx="11.5" ry="13" fill="url(#fez-squid-eye)" />
        <motion.g style={{ x: lookX, y: lookY }}>
          <circle cx="46" cy="64" r="6.5" fill="url(#fez-squid-pupil)" />
          <circle cx="78" cy="64" r="6.5" fill="url(#fez-squid-pupil)" />
          <circle cx="44" cy="61" r="2.3" fill="#fff" />
          <circle cx="76" cy="61" r="2.3" fill="#fff" />
          <circle cx="48.5" cy="67" r="1" fill="#fff" />
          <circle cx="80.5" cy="67" r="1" fill="#fff" />
        </motion.g>
      </g>
      <path d="M55 82Q60 86 65 82" fill="none" stroke="#2B0B3F" strokeWidth="2.5" strokeLinecap="round" />

      <rect x="1" y="52" width="17" height="28" rx="8" fill="url(#fez-squid-cup)" transform="rotate(-8 9 66)" />
      <rect x="102" y="52" width="17" height="28" rx="8" fill="url(#fez-squid-cup)" transform="rotate(8 111 66)" />
      <ellipse cx="7" cy="60" rx="2.5" ry="5" fill="#fff" opacity="0.5" transform="rotate(-8 7 60)" />
      <ellipse cx="108" cy="60" rx="2.5" ry="5" fill="#fff" opacity="0.5" transform="rotate(8 108 60)" />
    </svg>
  );
}

function InkSquid({ areaRef }) {
  const shouldReduceMotion = useReducedMotion();
  const preciseHover = usePreciseHover();
  if (shouldReduceMotion || !preciseHover) return null;
  return <InkSquidLayer areaRef={areaRef} />;
}

export default InkSquid;
