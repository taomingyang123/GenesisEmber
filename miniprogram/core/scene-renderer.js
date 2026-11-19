'use strict';

/**
 * 64×64 像素时代舞台与气象/粒子特效渲染器
 * 适配微信小程序 <canvas type="2d"> 与离屏 Canvas，15 FPS 节能绘制
 */

const bridge = require('./evolve-bridge.js');

const PARTICLE_MAX = 16;

/**
 * 创建舞台渲染器实例
 * @param {object} mainCanvas 主屏幕 Canvas 节点
 * @param {object} [offCanvas] 可选 64×64 离屏 Canvas（若为空则直接按像素块缩放绘制到主 Canvas）
 * @returns {object}
 */
function createSceneRenderer(mainCanvas, offCanvas) {
  const mainCtx = mainCanvas.getContext('2d');
  if (mainCtx) mainCtx.imageSmoothingEnabled = false;

  const useOffscreen = !!(offCanvas && typeof offCanvas.getContext === 'function');
  const offCtx = useOffscreen ? offCanvas.getContext('2d') : mainCtx;
  if (useOffscreen) {
    offCanvas.width = 64;
    offCanvas.height = 64;
    if (offCtx) offCtx.imageSmoothingEnabled = false;
  }

  let animTick = 0;
  const particlePool = Array.from({ length: PARTICLE_MAX }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#34d399'
  }));
  let particleIdx = 0;

  function spawnParticles(nx, ny, color = '#6ee7b7') {
    const px = Math.floor(nx * 64);
    const py = Math.floor(ny * 64);
    for (let i = 0; i < 4; i++) {
      const p = particlePool[particleIdx];
      particleIdx = (particleIdx + 1) % PARTICLE_MAX;
      p.active = true;
      p.x = px;
      p.y = py;
      p.vx = (Math.random() - 0.5) * 18;
      p.vy = -8 - Math.random() * 14;
      p.life = 0.45;
      p.color = color;
    }
  }

  function render(game) {
    if (!mainCtx || !offCtx || !game) return;
    animTick++;

    const w = game.save.world;
    const era = game.defs.ERAS_DEF[w.eraIndex] || game.defs.ERAS_DEF[0];
    const scaleX = useOffscreen ? 1 : (mainCanvas.width || 64) / 64;
    const scaleY = useOffscreen ? 1 : (mainCanvas.height || 64) / 64;

    const pxRect = (x, y, rw, rh, color) => {
      offCtx.fillStyle = color;
      if (useOffscreen) {
        offCtx.fillRect(Math.floor(x), Math.floor(y), Math.floor(rw), Math.floor(rh));
      } else {
        offCtx.fillRect(
          Math.floor(x) * scaleX,
          Math.floor(y) * scaleY,
          Math.floor(rw) * scaleX,
          Math.floor(rh) * scaleY
        );
      }
    };

    pxRect(0, 0, 64, 42, era.bgTop);
    pxRect(0, 42, 64, 22, era.bgBot);

    const t = animTick * 0.25;

    if (w.eraIndex === 0) {
      const orgCount = Math.min(8, 4 + ((w.evoCells && w.evoCells.organelles) || 0));
      for (let i = 0; i < orgCount; i++) {
        const bx = (i * 11 + Math.floor(t * 2)) % 60 + 2;
        const by = 56 - ((i * 9 + Math.floor(t * 3)) % 50);
        pxRect(bx, by, 2, 2, i % 2 === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(168, 85, 247, 0.45)');
      }
      for (let y = 10; y < 54; y += 3) {
        const phase = y * 0.22 + t;
        const x1 = 32 + Math.sin(phase) * 12;
        const x2 = 32 - Math.sin(phase) * 12;
        if (y % 6 === 0) {
          pxRect(Math.min(x1, x2), y, Math.abs(x1 - x2), 1, '#38bdf8');
        }
        pxRect(x1 - 1, y - 1, 3, 3, '#10b981');
        pxRect(x2 - 1, y - 1, 3, 3, '#f59e0b');
      }
    } else if (w.eraIndex === 1) {
      const cloudX = (Math.floor(t * 1.5)) % 76 - 12;
      pxRect(cloudX, 8, 12, 4, '#cbd5e1');
      pxRect(cloudX + 2, 6, 8, 2, '#f8fafc');
      pxRect(0, 38, 64, 26, '#15803d');
      pxRect(0, 48, 64, 16, '#14532d');
      const sway = Math.round(Math.sin(t));
      for (let gx = 4; gx < 34; gx += 4) {
        pxRect(gx + sway, 40, 2, 7, '#eab308');
      }
      pxRect(38, 28, 18, 12, '#92400e');
      pxRect(35, 24, 24, 4, '#d97706');
      pxRect(39, 21, 16, 3, '#f59e0b');
      pxRect(45, 33, 4, 7, '#451a03');
      const walk = Math.round(Math.sin(t * 1.5) * 3);
      pxRect(26 + walk, 32, 3, 3, '#fde68a');
      pxRect(26 + walk, 35, 3, 4, '#38bdf8');
    } else if (w.eraIndex === 2) {
      pxRect(0, 42, 64, 22, '#334155');
      pxRect(6, 20, 14, 22, '#64748b');
      pxRect(6, 17, 3, 3, '#94a3b8');
      pxRect(12, 17, 3, 3, '#94a3b8');
      pxRect(17, 17, 3, 3, '#94a3b8');
      pxRect(26, 24, 20, 18, '#7c2d12');
      pxRect(24, 21, 24, 3, '#b45309');
      pxRect(33, 33, 6, 9, (animTick % 4 < 2) ? '#f97316' : '#facc15');
      pxRect(49, 30, 12, 12, '#4338ca');
      pxRect(48, 28, 14, 3, '#ec4899');
    } else if (w.eraIndex === 3) {
      pxRect(0, 44, 64, 20, '#1e293b');
      pxRect(10, 24, 34, 20, '#475569');
      pxRect(14, 12, 5, 12, '#334155');
      pxRect(28, 10, 5, 14, '#334155');
      for (let wx = 14; wx <= 36; wx += 6) pxRect(wx, 30, 3, 4, '#fbbf24');
      for (let s = 0; s < 3; s++) {
        const sy = 8 - ((animTick + s * 3) % 8);
        const sx = 15 + ((animTick + s * 2) % 6);
        pxRect(sx, sy, 4, 3, '#94a3b8');
        pxRect(sx + 14, sy - 2, 4, 3, '#cbd5e1');
      }
      pxRect(52, 18, 2, 26, '#94a3b8');
      pxRect(48, 22, 10, 2, '#38bdf8');
    } else if (w.eraIndex === 4) {
      pxRect(0, 45, 64, 19, '#0f291e');
      pxRect(8, 20, 14, 25, '#cbd5e1');
      pxRect(10, 16, 10, 4, '#e2e8f0');
      pxRect(26, 26, 20, 19, '#334155');
      pxRect(29, 21, 14, 5, '#475569');
      pxRect(32, 31, 8, 8, (animTick % 6 < 3) ? '#10b981' : '#6ee7b7');
      if (w.extraBlds && (w.extraBlds.missile_silo || 0) > 0) {
        pxRect(50, 22, 8, 23, '#475569');
        pxRect(52, 16, 4, 6, '#f43f5e');
      }
    } else if (w.eraIndex === 5) {
      pxRect(0, 46, 64, 18, '#09111e');
      for (let rx = 8; rx <= 44; rx += 18) {
        pxRect(rx, 16, 12, 30, '#1e293b');
        for (let ly = 19; ly <= 40; ly += 5) {
          pxRect(rx + 2, ly, 3, 2, ((animTick + rx + ly) % 5 === 0) ? '#38bdf8' : '#10b981');
          pxRect(rx + 7, ly, 3, 2, '#6366f1');
        }
      }
      pxRect((animTick * 4) % 56 + 4, 9, 6, 2, '#38bdf8');
    } else {
      for (let i = 0; i < 14; i++) {
        pxRect((i * 17 + 5) % 62, (i * 13 + 3) % 38, 1, 1, (animTick + i) % 4 === 0 ? '#f8fafc' : '#64748b');
      }
      pxRect(46, 8, 10, 10, '#ea580c');
      pxRect(48, 10, 4, 3, '#fb923c');
      pxRect(0, 46, 64, 18, '#1e1b4b');
      pxRect(18, 22, 3, 24, '#64748b');
      const hover = Math.round(Math.sin(t) * 1);
      pxRect(26, 16 + hover, 8, 22, '#f8fafc');
      pxRect(28, 12 + hover, 4, 4, '#ef4444');
      pxRect(24, 32 + hover, 2, 6, '#38bdf8');
      pxRect(34, 32 + hover, 2, 6, '#38bdf8');
      pxRect(28, 38 + hover, 4, 5, (animTick % 2 === 0) ? '#f59e0b' : '#ef4444');
    }

    bridge.renderSceneOverlay(pxRect, animTick, w);

    for (let i = 0; i < PARTICLE_MAX; i++) {
      const p = particlePool[i];
      if (!p.active) continue;
      p.x += p.vx * 0.066;
      p.y += p.vy * 0.066;
      p.vy += 24 * 0.066;
      p.life -= 0.066;
      if (p.life <= 0) {
        p.active = false;
      } else {
        pxRect(p.x, p.y, 2, 2, p.color);
      }
    }

    if (useOffscreen) {
      const mw = mainCanvas.width || 64;
      const mh = mainCanvas.height || 64;
      mainCtx.imageSmoothingEnabled = false;
      mainCtx.clearRect(0, 0, mw, mh);
      mainCtx.drawImage(offCanvas, 0, 0, 64, 64, 0, 0, mw, mh);
    }
  }

  return {
    spawnParticles,
    render
  };
}

module.exports = { createSceneRenderer };
