// Küçük kutlama efektleri — confetti, pulse rozetler, achievement bildirimleri
// Hafif canvas-based konfeti (kütüphane yok)
//
// Kullanım:
//   import { confetti, ozelKutlama } from './Konfeti';
//   confetti();                  // standart altın konfeti
//   confetti({ origin: { x: 0.5, y: 0.7 }, count: 80 });
//   ozelKutlama('İlk video! 🌱'); // tam ekran kısa kutlama

let canvasRef = null;
let parcaciklar = [];
let rafId = null;

function ensureCanvas() {
  if (canvasRef) return canvasRef;
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  document.body.appendChild(c);
  canvasRef = c;
  window.addEventListener('resize', () => {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  });
  return c;
}

const RENKLER = ['#fbbf24', '#f59e0b', '#fde68a', '#fcd34d', '#ec4899', '#a855f7'];

function tickConfetti() {
  const c = canvasRef;
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);

  const alive = [];
  for (const p of parcaciklar) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25; // yerçekimi
    p.vx *= 0.99;
    p.spin += p.spinSpeed;
    p.life -= 1;
    if (p.life > 0 && p.y < c.height + 50) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 100));
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
      alive.push(p);
    }
  }
  parcaciklar = alive;

  if (parcaciklar.length > 0) {
    rafId = requestAnimationFrame(tickConfetti);
  } else {
    rafId = null;
  }
}

export function confetti({ count = 60, origin = { x: 0.5, y: 0.5 }, colors = RENKLER, spread = 70 } = {}) {
  ensureCanvas();
  const ox = origin.x * window.innerWidth;
  const oy = origin.y * window.innerHeight;
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180) - Math.PI / 2;
    const v = 6 + Math.random() * 8;
    parcaciklar.push({
      x: ox,
      y: oy,
      vx: Math.cos(angle) * v + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * v,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.3,
      life: 80 + Math.random() * 40,
    });
  }
  if (!rafId) rafId = requestAnimationFrame(tickConfetti);
}

// Tam ekran kısa kutlama mesajı + konfeti
export function ozelKutlama(mesaj, sure = 2500) {
  confetti({ count: 100, origin: { x: 0.5, y: 0.55 }, spread: 100 });

  const div = document.createElement('div');
  div.style.cssText = `
    position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
    z-index:9998;pointer-events:none;animation:kutlama-fade 0.3s ease-out;
  `;
  div.innerHTML = `
    <div style="
      background: linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.95));
      color: #4c1d95; font-weight: 900; font-size: 1.5rem;
      padding: 1.5rem 2.5rem; border-radius: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(251,191,36,0.5);
      border: 3px solid rgba(255,255,255,0.4);
      text-align: center; max-width: 90vw;
      animation: kutlama-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    ">${mesaj}</div>
  `;
  document.body.appendChild(div);

  setTimeout(() => {
    div.style.transition = 'opacity 0.3s';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 300);
  }, sure);
}

// CSS animations (inject once)
if (typeof document !== 'undefined' && !document.getElementById('kutlama-styles')) {
  const style = document.createElement('style');
  style.id = 'kutlama-styles';
  style.textContent = `
    @keyframes kutlama-pop {
      0% { transform: scale(0.3) rotate(-5deg); opacity: 0; }
      60% { transform: scale(1.05) rotate(2deg); }
      100% { transform: scale(1) rotate(0); opacity: 1; }
    }
    @keyframes kutlama-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export default { confetti, ozelKutlama };
