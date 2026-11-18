'use strict';
module.exports = function createScene(offCanvas, game) {
  offCanvas.width = offCanvas.height = 64;
  const offCtx = offCanvas.getContext('2d');
  offCtx.imageSmoothingEnabled = false;
  let animTick = 0;

  function pxRect(x, y, w, h, color) {
      offCtx.fillStyle = color;
      offCtx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  function renderPixelScene() {
      animTick++;
      const w = game.save.world;
      const era = game.defs.ERAS_DEF[w.eraIndex] || game.defs.ERAS_DEF[0];

      // 天空/背景渐变色块
      pxRect(0, 0, 64, 42, era.bgTop);
      pxRect(0, 42, 64, 22, era.bgBot);

      const t = animTick * 0.25;

      if (w.eraIndex === 0) {
          // 时代 1：生命起源 - 旋转 DNA 双螺旋与漂浮气泡
          for (let i = 0; i < 6; i++) {
              const bx = (i * 11 + Math.floor(t * 2)) % 60 + 2;
              const by = 56 - ((i * 9 + Math.floor(t * 3)) % 50);
              pxRect(bx, by, 2, 2, 'rgba(56, 189, 248, 0.35)');
          }
          for (let y = 10; y < 54; y += 3) {
              const phase = y * 0.22 + t;
              const x1 = 32 + Math.sin(phase) * 12;
              const x2 = 32 - Math.sin(phase) * 12;
              if (y % 6 === 0) {
                  const minX = Math.min(x1, x2);
                  const len = Math.abs(x1 - x2);
                  pxRect(minX, y, len, 1, '#38bdf8');
              }
              pxRect(x1 - 1, y - 1, 3, 3, '#10b981');
              pxRect(x2 - 1, y - 1, 3, 3, '#f59e0b');
          }
      } else if (w.eraIndex === 1) {
          // 时代 2：农业文明 - 茅草屋、摇曳麦田、飘动白云与小人
          const cloudX = (Math.floor(t * 1.5)) % 76 - 12;
          pxRect(cloudX, 8, 12, 4, '#cbd5e1');
          pxRect(cloudX + 2, 6, 8, 2, '#f8fafc');

          // 草地与麦田
          pxRect(0, 38, 64, 26, '#15803d');
          pxRect(0, 48, 64, 16, '#14532d');
          const sway = Math.round(Math.sin(t));
          for (let gx = 4; gx < 34; gx += 4) {
              pxRect(gx + sway, 40, 2, 7, '#eab308');
          }
          // 简陋居所
          pxRect(38, 28, 18, 12, '#92400e');
          pxRect(35, 24, 24, 4, '#d97706');
          pxRect(39, 21, 16, 3, '#f59e0b');
          pxRect(45, 33, 4, 7, '#451a03');
          // 像素智人小人
          const walk = Math.round(Math.sin(t * 1.5) * 3);
          pxRect(26 + walk, 32, 3, 3, '#fde68a');
          pxRect(26 + walk, 35, 3, 4, '#38bdf8');
      } else if (w.eraIndex === 2) {
          // 时代 3：城市文明 - 石砌城墙、冶炼炉火光与市场旗帜
          pxRect(0, 42, 64, 22, '#334155');
          pxRect(6, 20, 14, 22, '#64748b');
          pxRect(6, 17, 3, 3, '#94a3b8');
          pxRect(12, 17, 3, 3, '#94a3b8');
          pxRect(17, 17, 3, 3, '#94a3b8');
          // 冶炼工坊与闪烁炉火
          pxRect(26, 24, 20, 18, '#7c2d12');
          pxRect(24, 21, 24, 3, '#b45309');
          const flame = (animTick % 4 < 2) ? '#f97316' : '#facc15';
          pxRect(33, 33, 6, 9, flame);
          // 集市帐篷
          pxRect(49, 30, 12, 12, '#4338ca');
          pxRect(48, 28, 14, 3, '#ec4899');
      } else if (w.eraIndex === 3) {
          // 时代 4：工业文明 - 钢铁厂房、高耸烟囱与滚滚像素烟雾
          pxRect(0, 44, 64, 20, '#1e293b');
          pxRect(10, 24, 34, 20, '#475569');
          pxRect(14, 12, 5, 12, '#334155');
          pxRect(28, 10, 5, 14, '#334155');
          // 窗户灯光
          for (let wx = 14; wx <= 36; wx += 6) {
              pxRect(wx, 30, 3, 4, '#fbbf24');
          }
          // 烟雾粒子
          for (let s = 0; s < 3; s++) {
              const sy = 8 - ((animTick + s * 3) % 8);
              const sx = 15 + ((animTick + s * 2) % 6);
              pxRect(sx, sy, 4, 3, '#94a3b8');
              pxRect(sx + 14, sy - 2, 4, 3, '#cbd5e1');
          }
          // 高压电塔
          pxRect(52, 18, 2, 26, '#94a3b8');
          pxRect(48, 22, 10, 2, '#94a3b8');
      } else if (w.eraIndex === 4) {
          // 时代 5：原子时代 - 双曲冷却塔与绿色切伦科夫反应堆光芒
          pxRect(0, 45, 64, 19, '#0f291e');
          // 冷却塔
          pxRect(10, 20, 14, 25, '#cbd5e1');
          pxRect(12, 16, 10, 4, '#e2e8f0');
          // 反应堆穹顶与脉动核能芯
          pxRect(32, 26, 22, 19, '#334155');
          pxRect(35, 21, 16, 5, '#475569');
          const glow = (animTick % 6 < 3) ? '#10b981' : '#6ee7b7';
          pxRect(39, 31, 8, 8, glow);
      } else if (w.eraIndex === 5) {
          // 时代 6：信息文明 - 量子服务器阵列与神经网络光束
          pxRect(0, 46, 64, 18, '#09111e');
          for (let rx = 8; rx <= 44; rx += 18) {
              pxRect(rx, 16, 12, 30, '#1e293b');
              for (let ly = 19; ly <= 40; ly += 5) {
                  const led = ((animTick + rx + ly) % 5 === 0) ? '#38bdf8' : '#10b981';
                  pxRect(rx + 2, ly, 3, 2, led);
                  pxRect(rx + 7, ly, 3, 2, '#6366f1');
              }
          }
          // 顶部数据流
          const dx = (animTick * 4) % 56 + 4;
          pxRect(dx, 9, 6, 2, '#38bdf8');
      } else {
          // 时代 7：太空文明 - 星空、火星星球、航天发射台与殖民方舟火箭
          for (let i = 0; i < 14; i++) {
              const sx = (i * 17 + 5) % 62;
              const sy = (i * 13 + 3) % 38;
              pxRect(sx, sy, 1, 1, (animTick + i) % 4 === 0 ? '#f8fafc' : '#64748b');
          }
          // 红色火星
          pxRect(46, 8, 10, 10, '#ea580c');
          pxRect(48, 10, 4, 3, '#fb923c');
          // 发射基地与火箭
          pxRect(0, 46, 64, 18, '#1e1b4b');
          pxRect(18, 22, 3, 24, '#64748b');
          const hover = Math.round(Math.sin(t) * 1);
          pxRect(26, 16 + hover, 8, 22, '#f8fafc');
          pxRect(28, 12 + hover, 4, 4, '#ef4444');
          pxRect(24, 32 + hover, 2, 6, '#38bdf8');
          pxRect(34, 32 + hover, 2, 6, '#38bdf8');
          // 尾焰
          const thr = (animTick % 2 === 0) ? '#f59e0b' : '#ef4444';
          pxRect(28, 38 + hover, 4, 5, thr);
      }

      return offCanvas;
  }

  return renderPixelScene;
};
