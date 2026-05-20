// landing.js — Light theme parallax & animations

// ── NAVBAR scroll ──
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
  doParallax();
});

// ── PARALLAX ──
function doParallax() {
  const sy = window.scrollY;
  // Shapes parallax
  const shapes = document.querySelectorAll('.shape');
  shapes[0] && (shapes[0].style.transform = `translateY(${sy * 0.12}px)`);
  shapes[1] && (shapes[1].style.transform = `translateY(${-sy * 0.08}px)`);
  shapes[2] && (shapes[2].style.transform = `translateY(${sy * 0.06}px)`);

  // Parallax quote divider
  const pqEl = document.querySelector('.parallax-quote');
  const pqBg = document.getElementById('pq-bg');
  if (pqEl && pqBg) {
    const rect = pqEl.getBoundingClientRect();
    const offset = (window.innerHeight / 2 - rect.top) * 0.25;
    pqBg.style.transform = `translateY(${offset}px)`;
  }
}

// ── SCROLL REVEAL ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('revealed'), i * 90);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));

// ── STAT COUNTERS ──
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const item = entry.target;
    // Find all counter spans with data-target in this stat item
    const counters = item.querySelectorAll('[data-target]');
    counters.forEach(c => {
      const elId = c.dataset.el;
      const target = parseInt(c.dataset.target);
      const displayEl = elId ? document.getElementById(elId) : c.querySelector('span') || c;
      animCount(displayEl, target);
    });
    // Also check direct data-target on .stat-num
    const statNum = item.querySelector('.stat-num[data-target]');
    if (statNum) {
      const inner = statNum.querySelector('[id]');
      if (inner) animCount(inner, parseInt(statNum.dataset.target));
    }
    statObserver.unobserve(item);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-item').forEach(el => statObserver.observe(el));

// Simple counter IDs hardcoded
const counterMap = [
  { id: 'cnt-1', target: 12 },
  { id: 'cnt-2', target: 500 },
  { id: 'cnt-3', target: 99 },
  { id: 'cnt-4', target: 3 },
];
const statItemObserver = new IntersectionObserver((entries) => {
  if (entries.some(e => e.isIntersecting)) {
    counterMap.forEach(({ id, target }) => {
      const el = document.getElementById(id);
      if (el && el.textContent === '0') animCount(el, target);
    });
    statItemObserver.disconnect();
  }
}, { threshold: 0.3 });
const statsSection = document.getElementById('stats');
if (statsSection) statItemObserver.observe(statsSection);

function animCount(el, target, duration = 1600) {
  if (!el) return;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

// ── SMOOTH SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ── MOCKUP MOUSE TILT ──
const mockup = document.getElementById('mockup-tilt');
if (mockup) {
  document.addEventListener('mousemove', e => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / cx;
    const dy = (e.clientY - cy) / cy;
    mockup.style.transform = `perspective(900px) rotateY(${dx * -5}deg) rotateX(${dy * 3}deg)`;
  });
  document.addEventListener('mouseleave', () => {
    mockup.style.transform = '';
  });
}
