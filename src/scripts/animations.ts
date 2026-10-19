import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Zentraler Einstiegspunkt. Wird von index.astro aufgerufen.
 * Bei reduzierter Bewegung wird nichts animiert – die CSS-Endzustände
 * (bzw. die sichtbaren Standardzustände) bleiben bestehen.
 */
export function initAnimations(): void {
  if (prefersReduced) return;

  try {
    initHero();
    initHeroParallax();
    attachMagnetic(document.querySelector<HTMLElement>('#hero [data-magnetic]'));
    initStatusBar();
    initHighlights();
    initProject();
    initEditorial();
    initSkills();
    initCTA();
    initTilt();

    // Als erfolgreich markieren, damit der Fail-open-Watchdog im Head greift.
    document.documentElement.dataset.animDone = '1';
  } catch (err) {
    // Bei Fehler den sichtbaren Zustand wiederherstellen.
    document.documentElement.classList.remove('anim-ready');
    console.error('[animations] Initialisierung fehlgeschlagen:', err);
  }
}

/**
 * Wiederverwendbare Fade-up-Animation für Unterseiten (Projekte, Kontakt …).
 * Elements with [data-reveal] or [data-reveal-card] fade up on scroll-in;
 * [data-tag] elements stagger in. Reduced motion is a no-op.
 */
export function initRevealAnimations(): void {
  if (prefersReduced) return;

  try {
    const reveals = gsap.utils.toArray<HTMLElement>('[data-reveal]');
    if (reveals.length) {
      gsap.fromTo(
        reveals,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: { trigger: reveals[0], start: 'top 88%', once: true },
        }
      );
    }

    gsap.utils.toArray<HTMLElement>('[data-reveal-card]').forEach((card) => {
      const tags = card.querySelectorAll<HTMLElement>('[data-tag]');
      const tl = gsap.timeline({
        scrollTrigger: { trigger: card, start: 'top 82%', once: true },
      });

      tl.fromTo(
        card,
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );

      if (tags.length) {
        tl.fromTo(
          tags,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: 'power2.out' },
          '-=0.4'
        );
      }
    });

    const btn = document.querySelector<HTMLElement>('[data-cta] [data-magnetic], [data-magnetic]');
    attachMagnetic(btn);

    // Als erfolgreich markieren, damit der Fail-open-Watchdog im Head greift.
    document.documentElement.dataset.animDone = '1';
  } catch (err) {
    // Bei Fehler den sichtbaren Zustand wiederherstellen.
    document.documentElement.classList.remove('anim-ready');
    console.error('[animations] Reveal-Initialisierung fehlgeschlagen:', err);
  }
}

/** Magentic hover for a button — follows the cursor slightly on fine pointers. */
function attachMagnetic(btn: HTMLElement | null): void {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!btn || !fine) return;

  const host = btn.closest<HTMLElement>('[data-cta]') ?? btn.parentElement ?? btn;

  const STRENGTH = 0.3;
  const xTo = gsap.quickTo(btn, 'x', { duration: 0.3, ease: 'power2.out' });
  const yTo = gsap.quickTo(btn, 'y', { duration: 0.3, ease: 'power2.out' });

  host.addEventListener('pointermove', (event) => {
    const rect = btn.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    xTo(dx * STRENGTH);
    yTo(dy * STRENGTH);
  });

  host.addEventListener('pointerleave', () => {
    gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.35)' });
  });
}

/* Tippt Text langsam, sobald das Element ins Bild scrollt */
function attachTypewriter(el: HTMLElement, start = 'top 85%'): void {
  const full = el.dataset.text ?? el.textContent ?? '';
  if (!full) return;

  el.textContent = '';

  ScrollTrigger.create({
    trigger: el,
    start,
    once: true,
    onEnter: () => {
      const proxy = { n: 0 };
      gsap.to(proxy, {
        n: full.length,
        duration: Math.max(0.4, full.length * 0.03),
        ease: 'none',
        onUpdate: () => {
          el.textContent = full.slice(0, Math.round(proxy.n));
        },
        onComplete: () => {
          el.textContent = full;
        },
      });
    },
  });
}

function formatCount(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}

/* Zählwerk: startet bei 0 und zählt beim Scroll-In auf den Zielwert hoch */
function setupCountUp(el: HTMLElement, start = 'top 92%'): void {
  const to = parseFloat(el.dataset.countTo ?? '0');
  const decimals = parseInt(el.dataset.countDecimals ?? '0', 10);
  const suffix = el.dataset.countSuffix ?? '';

  el.textContent = formatCount(0, decimals) + suffix;

  ScrollTrigger.create({
    trigger: el,
    start,
    once: true,
    onEnter: () => {
      const proxy = { n: 0 };
      gsap.to(proxy, {
        n: to,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = formatCount(proxy.n, decimals) + suffix;
        },
        onComplete: () => {
          el.textContent = formatCount(to, decimals) + suffix;
        },
      });
    },
  });
}

/* ============================================================
   HIGHLIGHTS – Karten-Stagger beim Scroll-In + Count-Up
   ============================================================ */
function initHighlights(): void {
  const cards = gsap.utils.toArray<HTMLElement>('[data-highlight]');
  if (!cards.length) return;

  // Zahlen auf 0 setzen, damit sie nicht vorzeitig aufblitzen
  gsap.utils.toArray<HTMLElement>('[data-count-to]').forEach((el) => {
    const decimals = parseInt(el.dataset.countDecimals ?? '0', 10);
    el.textContent = formatCount(0, decimals) + (el.dataset.countSuffix ?? '');
  });

  ScrollTrigger.batch(cards, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        clearProps: 'transform',
      });
    },
  });

  gsap.utils
    .toArray<HTMLElement>('[data-count-to]')
    .forEach((el) => setupCountUp(el));
}

/* ============================================================
   HAUPT-PROJEKT – Karte kippt beim Scroll-In herein, Tags fliegen
   gestaffelt ein, Bild bewegt sich mit Parallax, Stats zählen hoch.
   ============================================================ */
function initProject(): void {
  const card = document.querySelector<HTMLElement>('[data-project]');
  if (!card) return;

  const tags = gsap.utils.toArray<HTMLElement>('[data-tag]');
  const stats = gsap.utils.toArray<HTMLElement>('[data-project-stat]');
  const visual = document.querySelector<HTMLElement>('[data-parallax]');

  const tl = gsap.timeline({
    scrollTrigger: { trigger: card, start: 'top 82%', once: true },
  });

  tl.fromTo(
    card,
    { rotateX: 12, y: 60, opacity: 0, transformPerspective: 1200 },
    { rotateX: 0, y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
  );

  if (tags.length) {
    tl.fromTo(
      tags,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
      '-=0.45'
    );
  }

  if (visual) {
    gsap.fromTo(
      visual,
      { yPercent: -8 },
      {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: {
          trigger: card,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  }

  stats.forEach((el) => setupCountUp(el, 'top 88%'));
}

/* ============================================================
   SKILLS – Karten gestaffelt einblenden
   ============================================================ */
function initSkills(): void {
  const section = document.querySelector<HTMLElement>('#skills');
  const cards = gsap.utils.toArray<HTMLElement>('[data-skill-card]');
  if (!section || !cards.length) return;

  gsap.fromTo(
    cards,
    { y: 20, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.06,
      ease: 'power3.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: section, start: 'top 82%', once: true },
    }
  );
}

/* ============================================================
   TILT – dezenter 3D-Effekt (max. 3°), nur bei Maus/Pointer:fine
   ============================================================ */
/* ============================================================
   CTA – Reveal + magnetischer Button (folgt der Maus max. 8px)
   ============================================================ */
function initCTA(): void {
  const section = document.querySelector<HTMLElement>('[data-cta]');
  if (!section) return;

  const reveals = gsap.utils.toArray<HTMLElement>('[data-cta-reveal]');
  if (reveals.length) {
    gsap.fromTo(
      reveals,
      { y: 24, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 78%', once: true },
      }
    );
  }

  attachMagnetic(section.querySelector<HTMLElement>('[data-magnetic]'));
}

function initTilt(): void {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine) return;

  const MAX_TILT = 3;

  gsap.utils.toArray<HTMLElement>('[data-tilt]').forEach((card) => {
    gsap.set(card, { transformPerspective: 900 });
    const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.45, ease: 'power2.out' });
    const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.45, ease: 'power2.out' });

    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      rotX(-py * MAX_TILT);
      rotY(px * MAX_TILT);
    });

    card.addEventListener('pointerleave', () => {
      rotX(0);
      rotY(0);
    });
  });
}

/* ============================================================
   STATUS-BAR – tippt den Status-Text, sobald sie ins Bild scrollt
   ============================================================ */
function initStatusBar(): void {
  const el = document.querySelector<HTMLElement>('[data-status-text]');
  if (el) attachTypewriter(el, 'top 85%');
}

/* ============================================================
   WARUM AUSBILDUNG – Editorial: Überschrift, Tipp-Untertitel und
   zwei Spalten, die leicht von außen einfliegen.
   ============================================================ */
function initEditorial(): void {
  const section = document.querySelector<HTMLElement>('#warum');
  if (!section) return;

  const typeEl = section.querySelector<HTMLElement>('[data-editorial-type]');
  if (typeEl) attachTypewriter(typeEl, 'top 80%');

  const heading = gsap.utils.toArray<HTMLElement>('[data-editorial]');
  const left = gsap.utils.toArray<HTMLElement>('[data-col-left]');
  const right = gsap.utils.toArray<HTMLElement>('[data-col-right]');

  const tl = gsap.timeline({
    scrollTrigger: { trigger: section, start: 'top 78%', once: true },
  });

  tl.fromTo(
    heading,
    { y: 24, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }
  )
    .fromTo(
      left,
      { x: -20, y: 20, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
      '-=0.35'
    )
    .fromTo(
      right,
      { x: 20, y: 20, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
      '<0.15'
    );
}

/* ============================================================
   HERO – Lade-Sequenz
   Ablauf: whoami (Typewriter, 80 ms/Buchstabe) →
           Name (Mask-Reveal: y 100 → 0, opacity 0 → 1) →
           Subtitle/Bio/Buttons/Social (gemeinsamer Stagger-Fade)
   ============================================================ */
function initHero(): void {
  const whoami = document.querySelector<HTMLElement>('[data-typewriter]');
  const nameMask = document.querySelector<HTMLElement>('[data-hero-mask]');
  const staggerItems = [
    ...gsap.utils.toArray<HTMLElement>('[data-hero-fade]'),
    ...gsap.utils.toArray<HTMLElement>('[data-hero-cta]'),
  ];

  // a) Typewriter – fester Takt von 80 ms pro Buchstabe.
  //    Der blinkende Emerald-Cursor ist rein per CSS animiert (.cursor).
  let typeDuration = 0;
  if (whoami) {
    const full = whoami.dataset.text ?? whoami.textContent ?? '';
    whoami.textContent = '';
    typeDuration = full.length * 0.08;
    const proxy = { n: 0 };

    gsap.to(proxy, {
      n: full.length,
      duration: typeDuration,
      ease: 'none',
      onUpdate: () => {
        whoami.textContent = full.slice(0, Math.round(proxy.n));
      },
      onComplete: () => {
        whoami.textContent = full;
      },
    });
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // b) Name – Mask-Reveal: der h1-Container hat overflow-hidden,
  //    die Zeile schiebt sich von unten (y:100) herein und blendet auf.
  if (nameMask) {
    tl.fromTo(
      nameMask,
      { y: 100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2 },
      typeDuration > 0 ? Math.max(0, typeDuration - 0.1) : 0
    );
  }

  // c) Subtitle, Bio, Buttons, Social Links – ein gemeinsamer Stagger-Fade.
  if (staggerItems.length) {
    tl.fromTo(
      staggerItems,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.15 },
      '>-0.5'
    );
  }
}

/* ============================================================
   HERO – Parallax für den Hintergrund-Riesentext "PORTFOLIO".
   scrub:1 bindet die Bewegung weich an den Scroll-Fortschritt.
   ============================================================ */
function initHeroParallax(): void {
  const text = document.querySelector<HTMLElement>('.hero-bg-text');
  const hero = document.querySelector<HTMLElement>('.hero-section');
  if (!text || !hero) return;

  gsap.to(text, {
    y: 150,
    ease: 'none',
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
    },
  });
}
