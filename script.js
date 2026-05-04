/* ============================================
   FLOR GALAXY — script.js
   Motor visual completo:
   · Fondo: galaxia con estrellas, nebulosas, fugaces
   · Flor: dibujada en canvas, giratoria, pétalos morados
   · Partículas orbitales alrededor de la flor
   · Pétalos 2D cayendo por la pantalla
   · Transiciones de pantalla + música
   ============================================ */

'use strict';

/* ── ELEMENTOS DOM ── */
const mainCanvas     = document.getElementById('main-canvas');
const mc             = mainCanvas.getContext('2d');

const flowerCanvas   = document.getElementById('flower-canvas');
const fc             = flowerCanvas.getContext('2d');

const miniCanvas     = document.getElementById('mini-flower-canvas');
const mfc            = miniCanvas ? miniCanvas.getContext('2d') : null;

const welcomeScreen  = document.getElementById('welcome-screen');
const letterScreen   = document.getElementById('letter-screen');
const flowerWrap     = document.getElementById('flower-wrap');
const btnOpen        = document.getElementById('btn-open');
const btnBack        = document.getElementById('btn-back');
const musicBar       = document.getElementById('music-bar');
const musicIcon      = document.getElementById('music-icon');
const musicWaves     = document.getElementById('music-waves');
const bgMusic        = document.getElementById('bg-music');

/* ── ESTADO ── */
let isPlaying = false;
let flowerAngle = 0;        // rotación actual de la flor (rad)
let miniFlowerAngle = 0;
let time = 0;               // tick global
let rafId;

/* ════════════════════════════════════════
   1. RESIZE — adaptar todos los canvas
════════════════════════════════════════ */
function resize() {
  mainCanvas.width  = window.innerWidth;
  mainCanvas.height = window.innerHeight;

  // Flower canvas — cuadrado al tamaño del wrapper
  const fw = flowerWrap.offsetWidth;
  flowerCanvas.width  = fw * devicePixelRatio;
  flowerCanvas.height = fw * devicePixelRatio;
  fc.scale(devicePixelRatio, devicePixelRatio);

  // Mini flower
  if (miniCanvas) {
    miniCanvas.width  = 68 * devicePixelRatio;
    miniCanvas.height = 68 * devicePixelRatio;
    mfc.scale(devicePixelRatio, devicePixelRatio);
  }
}

window.addEventListener('resize', resize);

/* ════════════════════════════════════════
   2. SISTEMA DE PARTÍCULAS — fondo galaxia
════════════════════════════════════════ */
const STAR_COUNT  = 320;
const stars = [];

function initStars() {
  stars.length = 0;
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x:  Math.random() * mainCanvas.width,
      y:  Math.random() * mainCanvas.height,
      r:  Math.random() * 1.6 + 0.25,
      alpha: Math.random(),
      tw:   Math.random() * Math.PI * 2,   // fase de twinkle
      spd:  Math.random() * 0.012 + 0.004, // velocidad twinkle
      vx:   (Math.random() - 0.5) * 0.06,  // drift lento
    });
  }
}

/* Nebulosas pintadas una vez */
function drawNebulas() {
  const W = mainCanvas.width, H = mainCanvas.height;
  const spots = [
    { cx: W * 0.12, cy: H * 0.25, r: W * 0.22, c0: 'rgba(90,0,170,.11)',  c1: 'transparent' },
    { cx: W * 0.80, cy: H * 0.18, r: W * 0.28, c0: 'rgba(120,0,210,.09)', c1: 'transparent' },
    { cx: W * 0.55, cy: H * 0.72, r: W * 0.24, c0: 'rgba(200,50,180,.07)',c1: 'transparent' },
    { cx: W * 0.22, cy: H * 0.82, r: W * 0.18, c0: 'rgba(80,0,150,.08)',  c1: 'transparent' },
    { cx: W * 0.70, cy: H * 0.60, r: W * 0.15, c0: 'rgba(140,40,255,.06)',c1: 'transparent' },
  ];
  spots.forEach(s => {
    const g = mc.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.r);
    g.addColorStop(0, s.c0);
    g.addColorStop(1, s.c1);
    mc.fillStyle = g;
    mc.fillRect(0, 0, W, H);
  });
}

/* Estrellas fugaces */
const shooters = [];
function maybeShootingStar() {
  if (Math.random() > 0.004) return; // ~0.4% por frame
  const W = mainCanvas.width, H = mainCanvas.height;
  shooters.push({
    x:     Math.random() * W * 0.7,
    y:     Math.random() * H * 0.35,
    len:   90 + Math.random() * 130,
    angle: Math.PI / 5 + Math.random() * 0.25,
    life:  0,
    dur:   45 + Math.random() * 30,  // frames
  });
}

function drawShooters() {
  for (let i = shooters.length - 1; i >= 0; i--) {
    const s = shooters[i];
    s.life++;
    const t    = s.life / s.dur;
    const ease = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const x2   = s.x + Math.cos(s.angle) * s.len * ease;
    const y2   = s.y + Math.sin(s.angle) * s.len * ease;
    const alpha = t < .5 ? t * 2 : (1 - t) * 2;

    const g = mc.createLinearGradient(s.x, s.y, x2, y2);
    g.addColorStop(0, `rgba(224,196,255,0)`);
    g.addColorStop(1, `rgba(196,130,255,${alpha})`);

    mc.save();
    mc.strokeStyle = g;
    mc.lineWidth   = 1.5;
    mc.lineCap     = 'round';
    mc.beginPath();
    mc.moveTo(s.x, s.y);
    mc.lineTo(x2, y2);
    mc.stroke();
    mc.restore();

    if (s.life >= s.dur) shooters.splice(i, 1);
  }
}

/* ════════════════════════════════════════
   3. PARTÍCULAS ORBITALES (galaxia fondo)
════════════════════════════════════════ */
const ORBIT_PARTS = 60;
const orbitParts = [];

function initOrbitParticles() {
  orbitParts.length = 0;
  for (let i = 0; i < ORBIT_PARTS; i++) {
    orbitParts.push({
      angle:   Math.random() * Math.PI * 2,
      radius:  50 + Math.random() * Math.min(mainCanvas.width, mainCanvas.height) * 0.3,
      speed:   (Math.random() * 0.004 + 0.001) * (Math.random() > .5 ? 1 : -1),
      r:       Math.random() * 2 + 0.5,
      alpha:   Math.random() * 0.7 + 0.2,
      hue:     260 + Math.random() * 80,
      yOff:    (Math.random() - 0.5) * 0.3, // inclinación elipse
    });
  }
}

function drawOrbitParticles() {
  const cx = mainCanvas.width / 2;
  const cy = mainCanvas.height / 2;
  orbitParts.forEach(p => {
    p.angle += p.speed;
    const x = cx + Math.cos(p.angle) * p.radius;
    const y = cy + Math.sin(p.angle) * p.radius * 0.3 + Math.sin(p.angle * 2) * 20;
    mc.beginPath();
    mc.arc(x, y, p.r, 0, Math.PI * 2);
    mc.fillStyle = `hsla(${p.hue}, 90%, 75%, ${p.alpha * (0.5 + 0.5 * Math.sin(time * 0.05 + p.angle))})`;
    mc.fill();
  });
}

/* ════════════════════════════════════════
   4. FLOR GALAXY EN CANVAS
   Pétalos morados luminosos, centro dorado,
   capas de brillo, rotación continua
════════════════════════════════════════ */

/**
 * Dibuja una flor en un contexto 2D.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx   centro X (en px lógicos)
 * @param {number} cy   centro Y
 * @param {number} size radio exterior de pétalo
 * @param {number} angle rotación en radianes
 * @param {number} t    tick de tiempo (para animación viva)
 * @param {boolean} mini  si es pequeña (menos detalles)
 */
function drawFlower(ctx, cx, cy, size, angle, t, mini = false) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const LAYERS = mini ? [
    { count: 6, pLen: size * .9, pW: size * .38, col0: '#a855f7', col1: '#7c3aed', alpha: .92 },
    { count: 6, pLen: size * .6, pW: size * .25, col0: '#c084fc', col1: '#a855f7', alpha: .8  },
  ] : [
    // Capa 0: pétalos exteriores largos
    { count: 8, pLen: size * 1.0, pW: size * .40, col0: '#7b00d4', col1: '#4c0099', alpha: .95 },
    // Capa 1: pétalos medianos rotados
    { count: 8, pLen: size * .75, pW: size * .30, col0: '#a855f7', col1: '#7b00d4', alpha: .88 },
    // Capa 2: pétalos interiores cortos
    { count: 8, pLen: size * .52, pW: size * .22, col0: '#c084fc', col1: '#a855f7', alpha: .75 },
    // Capa 3: micro pétalos decorativos
    { count: 12, pLen: size * .35, pW: size * .13, col0: '#e9d5ff', col1: '#c084fc', alpha: .55 },
  ];

  LAYERS.forEach((layer, li) => {
    const layerRot = (Math.PI / layer.count) * li; // cada capa girada un paso
    for (let i = 0; i < layer.count; i++) {
      const rot = (Math.PI * 2 / layer.count) * i + layerRot;

      ctx.save();
      ctx.rotate(rot);

      // Pétalo como elipse con gradiente
      const grad = ctx.createRadialGradient(0, -layer.pLen * .4, layer.pW * .1, 0, -layer.pLen * .5, layer.pLen);
      grad.addColorStop(0,   layer.col0 + 'ff');
      grad.addColorStop(.6,  layer.col1 + 'cc');
      grad.addColorStop(1,   layer.col1 + '00');

      ctx.beginPath();
      ctx.ellipse(0, -layer.pLen * .5, layer.pW * .5, layer.pLen * .5, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.globalAlpha = layer.alpha * (.85 + .15 * Math.sin(t * .04 + i + li));
      ctx.fill();

      // Brillo central en el pétalo
      if (!mini) {
        ctx.beginPath();
        ctx.ellipse(0, -layer.pLen * .4, layer.pW * .12, layer.pLen * .25, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.globalAlpha = .18;
        ctx.fill();
      }

      ctx.restore();
    }
  });

  ctx.globalAlpha = 1;

  // ── Resplandor del centro ──
  if (!mini) {
    const glowSize = size * .55;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    glow.addColorStop(0,   'rgba(251,191,36,0.9)');
    glow.addColorStop(.35, 'rgba(168,85,247,0.6)');
    glow.addColorStop(.7,  'rgba(124,58,237,0.2)');
    glow.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
  }

  // ── Centro dorado ──
  const cR = mini ? size * .28 : size * .22;
  const cg  = ctx.createRadialGradient(-cR * .3, -cR * .3, 0, 0, 0, cR);
  cg.addColorStop(0,   '#fef3c7');
  cg.addColorStop(.45, '#fbbf24');
  cg.addColorStop(1,   '#d97706');
  ctx.beginPath();
  ctx.arc(0, 0, cR, 0, Math.PI * 2);
  ctx.fillStyle = cg;
  ctx.fill();

  // Brillo especular centro
  ctx.beginPath();
  ctx.arc(-cR * .28, -cR * .28, cR * .35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();

  // ── Emoji corazón flotante ── (solo en grande)
  if (!mini) {
    ctx.font = `${size * .28}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = .9 + .1 * Math.sin(t * .08);
    ctx.fillText('💜', 0, 0);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/* ════════════════════════════════════════
   5. PARTÍCULAS ALREDEDOR DE LA FLOR (canvas fondo)
════════════════════════════════════════ */
const FLOWER_ORBS = 30;
const flowerOrbs = [];

function initFlowerOrbs() {
  flowerOrbs.length = 0;
  for (let i = 0; i < FLOWER_ORBS; i++) {
    flowerOrbs.push({
      angle:  (Math.PI * 2 / FLOWER_ORBS) * i + Math.random() * .5,
      radius: 130 + Math.random() * 90,
      speed:  (.003 + Math.random() * .005) * (Math.random() > .5 ? 1 : -1),
      r:      1 + Math.random() * 2.5,
      hue:    Math.random() > .3 ? 280 + Math.random() * 60 : 40 + Math.random() * 20,
    });
  }
}

function drawFlowerOrbs() {
  const cx = mainCanvas.width / 2;
  const cy = mainCanvas.height / 2;
  flowerOrbs.forEach(p => {
    p.angle += p.speed;
    const wobble = Math.sin(p.angle * 3 + time * .02) * 18;
    const x = cx + Math.cos(p.angle) * (p.radius + wobble);
    const y = cy + Math.sin(p.angle) * (p.radius * .38 + wobble * .3);
    const alpha = .4 + .6 * Math.abs(Math.sin(p.angle + time * .03));
    mc.beginPath();
    mc.arc(x, y, p.r, 0, Math.PI * 2);
    mc.fillStyle = `hsla(${p.hue}, 95%, 75%, ${alpha})`;
    mc.fill();
  });
}

/* ════════════════════════════════════════
   6. PÉTALOS CAYENDO (DOM overlay)
════════════════════════════════════════ */
const petalSymbols = ['🌸', '💜', '🌷', '✨', '🌺', '⭐', '💫'];

function spawnPetal() {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    top: -60px;
    left: ${Math.random() * 100}%;
    font-size: ${.8 + Math.random() * 1.1}rem;
    pointer-events: none;
    z-index: 1;
    user-select: none;
    animation: petalDrop ${6 + Math.random() * 8}s linear ${Math.random() * 3}s forwards;
    opacity: 0;
  `;
  el.textContent = petalSymbols[Math.floor(Math.random() * petalSymbols.length)];
  document.body.appendChild(el);

  // Inyectar keyframe una vez
  if (!document.getElementById('petal-kf')) {
    const s = document.createElement('style');
    s.id = 'petal-kf';
    s.textContent = `@keyframes petalDrop {
      0%   { transform: translateY(0) rotate(0deg);   opacity:0; }
      8%   { opacity:.8; }
      90%  { opacity:.5; }
      100% { transform: translateY(110vh) rotate(480deg); opacity:0; }
    }`;
    document.head.appendChild(s);
  }

  el.addEventListener('animationend', () => el.remove());
}

function startPetals() {
  for (let i = 0; i < 7; i++) setTimeout(spawnPetal, i * 600);
  setInterval(spawnPetal, 1600);
}

/* ════════════════════════════════════════
   7. LOOP PRINCIPAL DE ANIMACIÓN
════════════════════════════════════════ */
function loop() {
  time++;
  const W = mainCanvas.width;
  const H = mainCanvas.height;

  /* ── FONDO GALAXIA ── */
  mc.clearRect(0, 0, W, H);

  // Degradado base cósmico
  const bg = mc.createLinearGradient(0, 0, W * .6, H);
  bg.addColorStop(0,   '#03000a');
  bg.addColorStop(.5,  '#07001a');
  bg.addColorStop(1,   '#050010');
  mc.fillStyle = bg;
  mc.fillRect(0, 0, W, H);

  drawNebulas();

  // Estrellas
  stars.forEach(s => {
    s.tw += s.spd;
    s.x  += s.vx;
    if (s.x < 0) s.x = W;
    if (s.x > W) s.x = 0;
    const a = .25 + .75 * Math.abs(Math.sin(s.tw));
    mc.beginPath();
    mc.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    mc.fillStyle = `rgba(215,195,255,${a})`;
    mc.fill();
  });

  maybeShootingStar();
  drawShooters();
  drawOrbitParticles();
  drawFlowerOrbs();

  /* ── FLOR GRANDE EN EL CANVAS PROPIO ── */
  if (welcomeScreen.style.display !== 'none' && !welcomeScreen.classList.contains('hidden')) {
    fc.clearRect(0, 0, flowerCanvas.width, flowerCanvas.height);

    const fw  = flowerCanvas.width  / devicePixelRatio;
    const fh  = flowerCanvas.height / devicePixelRatio;
    const cx  = fw / 2;
    const cy  = fh / 2;
    const sz  = fw * 0.38;

    flowerAngle += 0.004;

    // Halo exterior pulsante
    const haloR = sz * 1.8 + Math.sin(time * .06) * 10;
    const halo  = fc.createRadialGradient(cx, cy, sz * .3, cx, cy, haloR);
    halo.addColorStop(0,   'rgba(168,85,247,.25)');
    halo.addColorStop(.5,  'rgba(124,58,237,.10)');
    halo.addColorStop(1,   'transparent');
    fc.fillStyle = halo;
    fc.beginPath();
    fc.arc(cx, cy, haloR, 0, Math.PI * 2);
    fc.fill();

    drawFlower(fc, cx, cy, sz, flowerAngle, time);
  }

  /* ── MINI FLOR (cabecera carta) ── */
  if (mfc && letterScreen.classList.contains('visible')) {
    mfc.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
    miniFlowerAngle += 0.006;
    const mSz = 34 * .85;
    drawFlower(mfc, 34, 34, mSz, miniFlowerAngle, time, true);
  }

  rafId = requestAnimationFrame(loop);
}

/* ════════════════════════════════════════
   8. TRANSICIONES
════════════════════════════════════════ */
function openLetter() {
  welcomeScreen.classList.add('fade-out');
  setTimeout(() => {
    welcomeScreen.classList.add('hidden');
    welcomeScreen.classList.remove('fade-out');
    letterScreen.classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Iniciar música automáticamente al entrar a la carta
    if (!isPlaying) {
      bgMusic.play().then(() => {
        isPlaying = true;
        musicIcon.classList.replace('paused', 'playing');
        musicWaves.classList.remove('paused');
        musicBar.setAttribute('aria-label', 'Pausar música');
      }).catch(() => {
        // Si el navegador bloquea, el usuario puede tocar la barra manualmente
      });
    }
  }, 450);
}

function closeLetter() {
  letterScreen.classList.add('fade-out');
  setTimeout(() => {
    letterScreen.classList.remove('visible', 'fade-out');
    welcomeScreen.classList.remove('hidden');
    if (isPlaying) toggleMusic();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 450);
}

btnOpen.addEventListener('click', openLetter);
flowerWrap.addEventListener('click', openLetter);
flowerWrap.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openLetter(); });
btnBack.addEventListener('click', closeLetter);

/* ════════════════════════════════════════
   9. MÚSICA
════════════════════════════════════════ */
function toggleMusic() {
  isPlaying = !isPlaying;

  if (isPlaying) {
    bgMusic.play().then(() => {
      musicIcon.classList.replace('paused', 'playing');
      musicWaves.classList.remove('paused');
      musicBar.setAttribute('aria-label', 'Pausar música');
    }).catch(err => {
      console.warn('No se pudo reproducir el audio:', err);
      isPlaying = false;
    });
  } else {
    bgMusic.pause();
    musicIcon.classList.replace('playing', 'paused');
    musicWaves.classList.add('paused');
    musicBar.setAttribute('aria-label', 'Reproducir música');
  }
}

musicBar.addEventListener('click', toggleMusic);

/* ════════════════════════════════════════
   10. RIPPLE AL TOCAR LA FLOR
════════════════════════════════════════ */
flowerWrap.addEventListener('click', e => {
  const rect = flowerWrap.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;

  const r = document.createElement('div');
  r.style.cssText = `
    position:fixed; left:${cx}px; top:${cy}px;
    width:12px; height:12px; border-radius:50%;
    border:2px solid rgba(196,130,252,.85);
    transform:translate(-50%,-50%) scale(0);
    animation:rippleOut .9s ease-out forwards;
    pointer-events:none; z-index:9999;
  `;

  if (!document.getElementById('ripple-kf')) {
    const s = document.createElement('style');
    s.id = 'ripple-kf';
    s.textContent = `@keyframes rippleOut{to{transform:translate(-50%,-50%) scale(20);opacity:0}}`;
    document.head.appendChild(s);
  }

  document.body.appendChild(r);
  setTimeout(() => r.remove(), 1000);
});

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
function init() {
  resize();
  initStars();
  initOrbitParticles();
  initFlowerOrbs();
  startPetals();
  loop();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();