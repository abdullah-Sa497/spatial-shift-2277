/* ==========================================================================
   The Spatial Shift — interactions & motion
   Progressive enhancement: every feature works without animation.
   Heavy effects (pinning, parallax, cursor) are desktop-only and all motion
   is disabled for visitors who prefer reduced motion.
   ========================================================================== */
(() => {
  'use strict';

  const d = document;
  const root = d.documentElement;
  const body = d.body;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate = root.classList.contains('anim') && !prefersReduced &&
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  if (!canAnimate) root.classList.remove('anim');

  let lenis = null;

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const onScroll = (fn) => {
    let queued = false;
    addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { fn(); queued = false; });
    }, { passive: true });
    fn();
  };

  const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  /* ------------------------------------------------------------------------
     Small things
     ------------------------------------------------------------------------ */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Fade images in once decoded (only hidden while animation is active)
  $$('.frame img').forEach((img) => {
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });

  /* ------------------------------------------------------------------------
     Floating WhatsApp button appears once the visitor starts scrolling
     (the pill navbar itself stays fixed and always visible)
     ------------------------------------------------------------------------ */
  function initHeader() {
    const wa = $('[data-wa-float]');
    const bar = $('[data-m-bar]');
    const footer = $('.site-footer');
    let footerInView = false;
    // Phone action bar steps aside once the footer (with its own contacts) arrives
    if (bar && footer && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        footerInView = entries[0].isIntersecting;
        bar.classList.toggle('is-visible', scrollY > 480 && !footerInView);
      }, { rootMargin: '0px 0px -15% 0px' }).observe(footer);
    }
    // On the home page the hero carries its own calls to action, so the bar
    // waits until the pinned hero has scrolled away.
    const heroXp = $('.xp[data-hero]');
    onScroll(() => {
      let past = scrollY > 480;
      if (heroXp) {
        const holder = heroXp.parentElement.classList.contains('pin-spacer') ? heroXp.parentElement : heroXp;
        past = holder.getBoundingClientRect().bottom < window.innerHeight * 0.5;
      }
      if (wa) wa.classList.toggle('is-visible', past);
      if (bar) bar.classList.toggle('is-visible', past && !footerInView);
    });
  }

  /* ------------------------------------------------------------------------
     Phone swipe rails: live counter and progress line under each rail
     ------------------------------------------------------------------------ */
  function initRails() {
    $$('[data-rail]').forEach((rail) => {
      const ui = rail.nextElementSibling;
      if (!ui || !ui.classList.contains('rail-ui')) return;
      const total = parseInt(ui.dataset.railCount, 10) || 1;
      const now = $('[data-rail-now]', ui);
      const update = () => {
        const max = rail.scrollWidth - rail.clientWidth;
        const p = max > 0 ? rail.scrollLeft / max : 0;
        const i = Math.round(p * (total - 1));
        if (now) now.textContent = String(i + 1).padStart(2, '0');
        ui.style.setProperty('--p', ((i + 1) / total).toFixed(3));
      };
      rail.addEventListener('scroll', update, { passive: true });
      update();
    });
  }

  /* ------------------------------------------------------------------------
     Sticky chip bar: highlight the section being read and keep its chip in view
     ------------------------------------------------------------------------ */
  function initSpy() {
    const nav = $('[data-spy]');
    if (!nav || !('IntersectionObserver' in window)) return;
    const links = $$('a[href^="#"]', nav);
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const link = map.get(e.target.id);
        if (!link) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'true');
        if (nav.scrollWidth > nav.clientWidth) {
          nav.scrollTo({ left: link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2, behavior: prefersReduced ? 'auto' : 'smooth' });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const el = d.getElementById(id); if (el) io.observe(el); });
  }

  /* ------------------------------------------------------------------------
     Mobile menu: focus-trapped overlay, Esc to close, restores focus
     ------------------------------------------------------------------------ */
  function initMenu() {
    const btn = $('[data-menu-toggle]');
    const menu = $('[data-menu]');
    const header = $('[data-header]');
    if (!btn || !menu) return;
    const label = $('[data-menu-label]', btn);
    const isOpen = () => btn.getAttribute('aria-expanded') === 'true';

    const open = () => {
      menu.classList.add('is-open');
      menu.removeAttribute('inert');
      btn.setAttribute('aria-expanded', 'true');
      label.textContent = 'Close';
      body.classList.add('menu-open');
      if (lenis) lenis.stop();
      setTimeout(() => { const first = $('a', menu); if (first) first.focus({ preventScroll: true }); }, 400);
    };

    const close = (restoreFocus = true) => {
      menu.classList.remove('is-open');
      menu.setAttribute('inert', '');
      btn.setAttribute('aria-expanded', 'false');
      label.textContent = 'Menu';
      body.classList.remove('menu-open');
      if (lenis) lenis.start();
      if (restoreFocus) btn.focus({ preventScroll: true });
    };

    btn.addEventListener('click', () => (isOpen() ? close() : open()));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => close(false)));

    d.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const items = [...$$('a[href], button', header), ...$$('a[href], button', menu)].filter(isVisible);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && isOpen()) close(false); });
    addEventListener('pageshow', (e) => { if (e.persisted && isOpen()) close(false); });
  }

  /* ------------------------------------------------------------------------
     Testimonials: accessible, manually controlled carousel (+ swipe)
     ------------------------------------------------------------------------ */
  function initQuotes() {
    const wrap = $('[data-quotes]');
    if (!wrap) return;
    const slides = $$('.quote', wrap);
    const counter = $('[data-quote-current]');
    let index = 0;

    const go = (n) => {
      slides[index].classList.remove('is-active');
      index = (n + slides.length) % slides.length;
      slides[index].classList.add('is-active');
      if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    };

    const prev = $('[data-quote-prev]');
    const next = $('[data-quote-next]');
    if (prev) prev.addEventListener('click', () => go(index - 1));
    if (next) next.addEventListener('click', () => go(index + 1));

    let startX = null;
    wrap.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') startX = e.clientX; }, { passive: true });
    wrap.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     Marquee pause control (WCAG 2.2.2)
     ------------------------------------------------------------------------ */
  function initMarquee() {
    $$('[data-marquee]').forEach((m) => {
      const btn = $('[data-marquee-toggle]', m);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const paused = m.classList.toggle('is-paused');
        btn.setAttribute('aria-pressed', String(paused));
        btn.setAttribute('aria-label', paused ? 'Play scrolling text' : 'Pause scrolling text');
      });
    });
  }

  /* ------------------------------------------------------------------------
     Before / after comparison (native range input = keyboard + touch ready)
     ------------------------------------------------------------------------ */
  function initBeforeAfter() {
    $$('[data-ba]').forEach((el) => {
      const range = $('input[type="range"]', el);
      if (!range) return;
      const set = () => el.style.setProperty('--pos', `${range.value}%`);
      range.addEventListener('input', set);
      set();
    });
  }

  /* ------------------------------------------------------------------------
     Portfolio filter
     ------------------------------------------------------------------------ */
  function initFilter() {
    const grid = $('[data-work-grid]');
    if (!grid) return;
    const buttons = $$('[data-filter]');
    const items = $$('[data-category]', grid);
    const status = $('[data-filter-status]');

    const apply = (filter) => {
      let count = 0;
      items.forEach((it) => {
        const show = filter === 'all' || it.dataset.category === filter;
        it.hidden = !show;
        if (show) count += 1;
      });
      if (status) status.textContent = `Showing ${count} ${count === 1 ? 'project' : 'projects'}`;
      return items.filter((it) => !it.hidden);
    };

    buttons.forEach((b) => b.addEventListener('click', () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const shown = apply(b.dataset.filter);
      if (!canAnimate) return;
      ScrollTrigger.refresh();
      gsap.fromTo(shown, { autoAlpha: 0, y: 48 }, {
        autoAlpha: 1, y: 0, duration: 1, stagger: .08, ease: 'expo.out', overwrite: true
      });
    }));
  }

  /* ------------------------------------------------------------------------
     Enquiry form: inline validation, then Formspree-style endpoint or
     WhatsApp hand-off (the default for a static site with no backend)
     ------------------------------------------------------------------------ */
  function initForm() {
    const form = $('[data-form]');
    if (!form) return;
    const status = $('[data-form-status]', form);
    const submit = $('[type="submit"]', form);

    const rules = {
      name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your full name.'),
      phone: (v) => {
        const digits = v.replace(/[^\d]/g, '');
        return /^\+?[\d\s()-]+$/.test(v.trim()) && digits.length >= 10 && digits.length <= 15
          ? '' : 'Please enter a phone number we can reach you on, e.g. 0300 1234567.';
      },
      email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address, e.g. name@example.com.'),
      type: (v) => (v ? '' : 'Please choose the type of project.'),
      message: (v) => (v.trim().length === 0 || v.trim().length >= 10 ? '' : 'Could you tell us a little more? (at least 10 characters)')
    };

    const fields = Object.keys(rules).map((n) => form.elements[n]).filter(Boolean);

    const validate = (field) => {
      const msg = rules[field.name](field.value);
      const err = d.getElementById(`${field.id}-error`);
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg;
      return !msg;
    };

    fields.forEach((f) => {
      f.addEventListener('blur', () => { if (f.value || f.dataset.touched) { f.dataset.touched = '1'; validate(f); } });
      f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') validate(f); });
      f.addEventListener('change', () => { if (f.tagName === 'SELECT') validate(f); });
    });

    const setStatus = (type, msg) => {
      status.className = `form-status form-status--${type}`;
      status.textContent = msg;
    };

    const setBusy = (on) => {
      submit.disabled = on;
      submit.setAttribute('aria-busy', String(on));
    };

    const compose = (data) => {
      const lines = [
        'Hello The Spatial Shift, I would like to discuss a project.',
        '',
        `Name: ${data.get('name')}`,
        `Phone: ${data.get('phone')}`,
        data.get('email') ? `Email: ${data.get('email')}` : '',
        `Project: ${data.get('type')}`,
        data.get('location') ? `Location: ${data.get('location')}` : '',
        data.get('budget') ? `Budget: ${data.get('budget')}` : '',
        data.get('timeline') ? `Timeline: ${data.get('timeline')}` : '',
        data.get('contact') ? `Preferred contact: ${data.get('contact')}` : '',
        data.get('message') ? `\n${data.get('message')}` : ''
      ];
      return lines.filter((l) => l !== '').join('\n');
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      const invalid = fields.filter((f) => !validate(f));
      if (invalid.length) {
        invalid[0].focus();
        setStatus('error', invalid.length === 1
          ? 'Please check the highlighted field.'
          : `Please check the ${invalid.length} highlighted fields.`);
        return;
      }

      const data = new FormData(form);
      const endpoint = form.dataset.endpoint;

      if (!endpoint) {
        // No backend configured: open WhatsApp with the enquiry pre-filled.
        const url = `https://wa.me/${form.dataset.whatsapp}?text=${encodeURIComponent(compose(data))}`;
        window.open(url, '_blank', 'noopener');
        setStatus('success', 'Thank you! WhatsApp has opened with your enquiry. Just press send and we will reply within one working day.');
        return;
      }

      setBusy(true);
      try {
        const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        fields.forEach((f) => f.removeAttribute('aria-invalid'));
        setStatus('success', 'Thank you. Your enquiry is with us and we will be in touch within one working day.');
      } catch (err) {
        setStatus('error', 'Sorry, your message could not be sent. Please try again, or reach us directly on WhatsApp.');
      } finally {
        setBusy(false);
      }
    });
  }

  /* ------------------------------------------------------------------------
     Back to top
     ------------------------------------------------------------------------ */
  function initToTop() {
    $$('[data-to-top]').forEach((b) => b.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.8 });
      else window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      const main = $('#main');
      if (main) main.focus({ preventScroll: true });
    }));
  }

  /* ========================================================================
     MOTION
     ======================================================================== */
  function initMotion() {
    const { gsap, ScrollTrigger } = window;
    const hasSplit = typeof window.SplitText !== 'undefined';
    gsap.registerPlugin(ScrollTrigger);
    if (hasSplit) gsap.registerPlugin(window.SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const EASE = 'expo.out';
    const mm = gsap.matchMedia();
    // Note: reveals use toggleActions 'play none none none' rather than `once: true`.
    // Self-killing triggers can break ScrollTrigger's refresh when a page loads
    // already scrolled (reload, back button, #anchor links).

    /* Smooth scrolling (wheel only — touch devices keep native momentum) */
    if (typeof window.Lenis !== 'undefined') {
      lenis = new window.Lenis({ lerp: 0.1, anchors: { offset: -90 }, autoRaf: false });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    /* ---- Hero timeline (built now, played after fonts / loader) ---- */
    const hero = $('[data-hero]');
    const heroTl = gsap.timeline({ paused: true, defaults: { ease: EASE } });
    let heroPlayed = false;

    if (hero) {
      const curtain = $('.xp__curtain', hero);
      const heroImg = $('[data-hero-img]', hero);
      if (curtain) heroTl.to(curtain, { scaleY: 0, duration: 1.6, ease: 'expo.inOut' }, 0);
      if (heroImg) heroTl.fromTo(heroImg, { scale: 1.3 }, { scale: 1, duration: 2.4 }, 0);
      const lines = $$('[data-hero-line]', hero);
      if (lines.length) {
        heroTl.fromTo(lines, { yPercent: 130 }, { yPercent: 0, duration: 1.4, stagger: .12 }, curtain ? .45 : .1);
      }
      const fades = $$('[data-reveal]', hero);
      if (fades.length) {
        heroTl.fromTo(fades, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.3, stagger: .09 }, curtain ? .8 : .35);
      }
    }

    /* ---- Scroll-expansion media --------------------------------------------
       The media opens from a small window (arch or frame) to full-bleed while
       its title splits apart; an image sequence drawn to <canvas> plays with
       the scroll (smoother than scrubbing a <video>, on every device). Once
       open, the content fades in and the rest of the sequence plays out. */
    function createSequence(section, canvas) {
      const mobile = window.innerWidth < 768;
      const count = parseInt(mobile ? section.dataset.framesM : section.dataset.framesD, 10) || 1;
      const base = `${section.dataset.seq}/${mobile ? 'm' : 'd'}/`;
      const ctx = canvas.getContext('2d');
      const imgs = new Array(count);
      const ready = new Array(count).fill(false);
      let shown = -1;
      let want = 0;
      let started = false;

      const fit = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
        const w = Math.round(canvas.clientWidth * dpr);
        const h = Math.round(canvas.clientHeight * dpr);
        if (w && h && (canvas.width !== w || canvas.height !== h)) {
          canvas.width = w;
          canvas.height = h;
          shown = -1;
        }
      };

      const nearest = (i) => {
        for (let d = 0; d < count; d++) {
          if (i - d >= 0 && ready[i - d]) return i - d;
          if (i + d < count && ready[i + d]) return i + d;
        }
        return -1;
      };

      const draw = (i) => {
        want = Math.max(0, Math.min(count - 1, i));
        const n = nearest(want);
        if (n < 0 || n === shown) return;
        const img = imgs[n];
        const cw = canvas.width;
        const ch = canvas.height;
        const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const w = img.naturalWidth * s;
        const h = img.naturalHeight * s;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
        shown = n;
        canvas.classList.add('is-ready');
      };

      // Coarse-to-fine loading: every 16th frame first, then fill the gaps,
      // so scrubbing works almost immediately and sharpens as frames arrive.
      const load = () => {
        if (started) return;
        started = true;
        fit();
        const lite = navigator.connection && navigator.connection.saveData;
        const order = [];
        const seen = new Set();
        [16, 8, 4, 2, 1].forEach((step) => {
          if (lite && step < 2) return;
          for (let i = 0; i < count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
        });
        if (!seen.has(count - 1)) order.push(count - 1);

        let next = 0;
        let active = 0;
        const pump = () => {
          while (active < 6 && next < order.length) {
            const i = order[next++];
            const img = new Image();
            active += 1;
            img.decoding = 'async';
            img.src = `${base}${String(i + 1).padStart(3, '0')}.webp`;
            imgs[i] = img;
            const done = () => {
              active -= 1;
              if (img.naturalWidth) {
                ready[i] = true;
                if (shown < 0 || Math.abs(i - want) < Math.abs(shown - want)) { shown = -1; draw(want); }
              }
              pump();
            };
            if (img.decode) img.decode().then(done, done);
            else { img.onload = done; img.onerror = done; }
          }
        };
        pump();
      };

      addEventListener('resize', () => { fit(); draw(want); }, { passive: true });
      return { count, draw, load };
    }

    function initExpand(section) {
      const isHero = section.hasAttribute('data-hero');
      const media = $('[data-xp-media]', section);
      const canvas = $('.xp__canvas', section);
      if (!media || !canvas) return;
      const a = $('.xp__a', section);
      const b = $('.xp__b', section);
      const metaA = $('.xp__meta-a', section);
      const metaB = $('.xp__meta-b', section);
      const kicker = $('.xp__kicker', section);
      const shade = $('.xp__shade', section);
      const veil = $('.xp__veil', section);
      const content = $('.xp__content', section);
      const dialLabel = $('[data-dial-label]', section);
      const dialBar = $('[data-dial-bar]', section);
      const phases = (section.dataset.xpDial || '').split('|').map((p) => {
        const [at, ...text] = p.split(':');
        return { at: parseFloat(at), text: text.join(':') };
      }).filter((p) => p.text);
      const split = parseFloat(section.dataset.xpSplit) || 0.5;
      const arch = !section.classList.contains('xp--frame');

      const seq = createSequence(section, canvas);
      const last = Math.max(1, seq.count - 1);
      const state = { f: 0 };
      let phase = -1;

      const render = () => {
        const i = Math.round(state.f);
        seq.draw(i);
        const p = i / last;
        if (dialBar) dialBar.style.transform = `scaleX(${p.toFixed(3)})`;
        if (dialLabel && phases.length) {
          let k = 0;
          phases.forEach((ph, j) => { if (p >= ph.at) k = j; });
          if (k !== phase) { phase = k; dialLabel.textContent = phases[k].text; }
        }
      };

      // Window size mirrors the CSS custom properties (--ww / --wh)
      const closedClip = () => {
        const W = media.clientWidth;
        const H = media.clientHeight;
        const mobile = W < 768;
        let ww;
        let wh;
        if (arch) {
          ww = mobile ? W * 0.62 : Math.min(Math.max(W * 0.22, 240), 360);
          wh = Math.min(ww * (mobile ? 1.34 : 1.32), H * (mobile ? 0.5 : 0.58));
        } else {
          ww = mobile ? W * 0.8 : Math.min(W * 0.52, 720);
          wh = Math.min(ww * (mobile ? 1.1 : 0.6), H * (mobile ? 0.48 : 0.52));
        }
        const t = (H - wh) / 2;
        const l = (W - ww) / 2;
        const top = arch ? ww / 2 : 14;
        const bottom = arch ? 4 : 14;
        return `inset(${t}px ${l}px ${t}px ${l}px round ${top}px ${top}px ${bottom}px ${bottom}px)`;
      };

      const length = parseFloat(section.dataset.xpLength) || 2.2;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * length * (window.innerWidth < 768 ? 0.85 : 1))}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      tl.fromTo(media, { clipPath: closedClip }, {
        clipPath: 'inset(0px 0px 0px 0px round 0px 0px 0px 0px)', duration: 1, ease: 'power2.inOut'
      }, 0)
        .to(state, { f: split * last, duration: 1, onUpdate: render }, 0);
      if (a) tl.to(a, { x: () => -window.innerWidth * 0.55, duration: 1, ease: 'power2.in' }, 0);
      if (b) tl.to(b, { x: () => window.innerWidth * 0.55, duration: 1, ease: 'power2.in' }, 0);
      if (a || b) tl.to([a, b].filter(Boolean), { autoAlpha: 0, duration: 0.35 }, 0.6);
      if (kicker) tl.to(kicker, { y: -24, autoAlpha: 0, duration: 0.35 }, 0);
      if (metaA) tl.to(metaA, { x: () => -window.innerWidth * 0.3, autoAlpha: 0, duration: 0.7 }, 0);
      if (metaB) tl.to(metaB, { x: () => window.innerWidth * 0.3, autoAlpha: 0, duration: 0.7 }, 0);
      if (veil) tl.to(veil, { opacity: 0, duration: 0.55, ease: 'power1.out' }, 0);
      if (shade) tl.to(shade, { opacity: 1, duration: 0.45 }, 0.7);
      if (content) {
        tl.fromTo(content, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out' }, 1);
      }
      tl.to(state, { f: last, duration: 1.3, onUpdate: render }, 1)
        .to({}, { duration: 0.15 });

      // Sections further down rise their title in as they arrive
      if (!isHero) {
        gsap.fromTo($$('.xp__in', section), { yPercent: 130 }, {
          yPercent: 0, duration: 1.3, stagger: 0.12, ease: EASE,
          scrollTrigger: { trigger: section, start: 'top 70%', toggleActions: 'play none none none' }
        });
      }

      // The hero loads its frames immediately; others shortly before they are reached
      if (isHero || !('IntersectionObserver' in window)) seq.load();
      else {
        const io = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) { seq.load(); io.disconnect(); }
        }, { rootMargin: '150% 0px' });
        io.observe(section);
      }
      render();
    }

    $$('[data-xp]').forEach(initExpand);

    /* ---- Project hero: image drifts & content lifts away on scroll ---- */
    const projectHero = $('.project-hero');
    if (projectHero) {
      const media = $('.project-hero__media', projectHero);
      const content = $('.project-hero__content', projectHero);
      gsap.to(media, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: projectHero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to(content, { yPercent: -18, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: projectHero, start: '40% top', end: 'bottom top', scrub: true } });
    }

    /* ---- Process: pinned horizontal scroll (desktop only) ---- */
    mm.add('(min-width: 1024px)', () => {
      const section = $('[data-process]');
      if (!section) return;
      const track = $('[data-process-track]', section);
      const bar = $('[data-process-bar]', section);
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      if (bar) {
        gsap.fromTo(bar, { scaleX: 0 }, {
          scaleX: 1, ease: 'none',
          scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, scrub: true, invalidateOnRefresh: true }
        });
      }

      // Steps rise in as the section arrives, before the horizontal travel begins
      gsap.from($$('.step', track), {
        y: 60, autoAlpha: 0, duration: 1.2, stagger: .1, ease: EASE,
        scrollTrigger: { trigger: section, start: 'top 55%', toggleActions: 'play none none none' }
      });
    });

    /* ---- The "shift": the page dims from ivory to espresso as the process
       section arrives, and brightens again as it leaves, instead of a hard
       edge between light and dark. Works with or without the desktop pin. ---- */
    const proc = $('[data-process]');
    if (proc) {
      const styles = getComputedStyle(root);
      const mix = gsap.utils.interpolate(styles.getPropertyValue('--bg').trim() || '#F5F0E8', styles.getPropertyValue('--dark').trim() || '#17130F');
      let current = -1;
      const setShade = (t) => {
        const v = Math.round(Math.max(0, Math.min(1, t)) * 200) / 200;
        if (v === current) return;
        current = v;
        body.style.backgroundColor = v === 0 ? '' : mix(v);
      };
      // Measured from where the section (or its pin spacer) really is on screen:
      // darkens as it rises from 90% to 30% of the viewport, lightens only as
      // its bottom edge leaves (70% to 15%). Fully dark while pinned.
      let queued = false;
      const update = () => {
        queued = false;
        const H = window.innerHeight;
        // The pin spacer (desktop) spans the whole pinned distance; use it when present
        const holder = proc.parentElement.classList.contains('pin-spacer') ? proc.parentElement : proc;
        const box = holder.getBoundingClientRect();
        const enter = (H * 0.9 - box.top) / (H * 0.6);
        const leave = (box.bottom - H * 0.15) / (H * 0.55);
        setShade(Math.min(enter, leave, 1));
      };
      const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
      addEventListener('scroll', request, { passive: true });
      addEventListener('resize', request, { passive: true });
      ScrollTrigger.addEventListener('refresh', request);
      update();
    }

    /* ---- Fade-up reveals, batched for performance ---- */
    const reveals = $$('[data-reveal]').filter((el) => !el.closest('[data-hero]'));
    if (reveals.length) {
      gsap.set(reveals, { y: 36, autoAlpha: 0 });
      ScrollTrigger.batch(reveals, {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1.2, ease: EASE, stagger: .1, overwrite: true })
      });
    }

    /* ---- Image curtain reveals ---- */
    $$('[data-reveal-img]').forEach((frame) => {
      const img = $('img', frame);
      const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 88%', toggleActions: 'play none none none' } });
      tl.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
      if (img) tl.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 2, ease: EASE }, 0);
    });

    /* ---- Parallax: gentle drift on every screen size (softer on phones) ---- */
    mm.add({ phone: '(max-width: 767.98px)', large: '(min-width: 768px)' }, (ctx) => {
      const amount = ctx.conditions.phone ? 4 : 7;
      $$('[data-parallax]').forEach((frame) => {
        const img = $('img', frame);
        if (!img) return;
        gsap.fromTo(img, { yPercent: -amount }, {
          yPercent: amount, ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
      $$('[data-speed]').forEach((el) => {
        const speed = parseFloat(el.dataset.speed) || 0.1;
        gsap.fromTo(el, { yPercent: speed * 50 }, {
          yPercent: speed * -50, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });

    /* ---- Count-up numbers ---- */
    $$('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const counter = { v: 0 };
      el.textContent = '0';
      gsap.to(counter, {
        v: target, duration: 2.2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
        onUpdate: () => { el.textContent = Math.round(counter.v); }
      });
    });

    /* ---- Footer wordmark rises into place ---- */
    const word = $('.footer-word svg');
    if (word) {
      gsap.fromTo(word, { yPercent: 100 }, {
        yPercent: 0, duration: 1.6, ease: EASE,
        scrollTrigger: { trigger: '.footer-word', start: 'top 98%', toggleActions: 'play none none none' }
      });
    }

    /* ---- Desktop pointer niceties: "View" cursor, service preview, magnetic buttons ---- */
    mm.add('(hover: hover) and (pointer: fine)', () => {
      const cleanups = [];

      // "View" cursor over project imagery
      const targets = $$('[data-cursor]');
      if (targets.length) {
        const cursor = d.createElement('div');
        cursor.className = 'cursor';
        cursor.setAttribute('aria-hidden', 'true');
        body.appendChild(cursor);
        gsap.set(cursor, { xPercent: -50, yPercent: -50, scale: 0 });
        const xTo = gsap.quickTo(cursor, 'x', { duration: .5, ease: 'power3' });
        const yTo = gsap.quickTo(cursor, 'y', { duration: .5, ease: 'power3' });
        // Re-check what is under the pointer on move AND on scroll, so the
        // bubble never lingers when the page scrolls beneath a still mouse.
        let px = -1;
        let py = -1;
        let over = null;
        let queued = false;
        const check = () => {
          const el = px < 0 ? null : d.elementFromPoint(px, py);
          const target = el && el.closest('[data-cursor]');
          if (target === over) return;
          over = target;
          if (target) {
            cursor.textContent = target.dataset.cursor;
            gsap.to(cursor, { scale: 1, duration: .6, ease: EASE, overwrite: true });
          } else {
            gsap.to(cursor, { scale: 0, duration: .35, ease: 'power3.out', overwrite: true });
          }
        };
        const move = (e) => { px = e.clientX; py = e.clientY; xTo(px); yTo(py); check(); };
        const onScrollCheck = () => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => { queued = false; check(); });
        };
        const out = () => { px = -1; check(); };
        addEventListener('pointermove', move, { passive: true });
        addEventListener('scroll', onScrollCheck, { passive: true });
        root.addEventListener('pointerleave', out);
        cleanups.push(() => {
          removeEventListener('pointermove', move);
          removeEventListener('scroll', onScrollCheck);
          root.removeEventListener('pointerleave', out);
          cursor.remove();
        });
      }

      // Magnetic buttons
      $$('[data-magnetic]').forEach((el) => {
        const xTo = gsap.quickTo(el, 'x', { duration: .8, ease: 'elastic.out(1, .45)' });
        const yTo = gsap.quickTo(el, 'y', { duration: .8, ease: 'elastic.out(1, .45)' });
        const move = (e) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.25);
          yTo((e.clientY - r.top - r.height / 2) * 0.35);
        };
        const reset = () => { xTo(0); yTo(0); };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', reset);
        cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', reset); gsap.set(el, { x: 0, y: 0 }); });
      });

      return () => cleanups.forEach((fn) => fn());
    });

    mm.add('(min-width: 1024px) and (hover: hover) and (pointer: fine)', () => {
      const list = $('[data-svc-list]');
      const preview = $('[data-svc-preview]');
      if (!list || !preview) return;
      const imgs = $$('img', preview);
      let loaded = false;
      gsap.set(preview, { xPercent: -50, yPercent: -50, scale: .7, autoAlpha: 0, rotate: -4 });
      const xTo = gsap.quickTo(preview, 'x', { duration: .7, ease: 'power3' });
      const yTo = gsap.quickTo(preview, 'y', { duration: .7, ease: 'power3' });
      const move = (e) => { xTo(e.clientX); yTo(e.clientY); };
      const enter = (e) => {
        if (!loaded) {
          imgs.forEach((im) => { im.srcset = im.dataset.srcset; im.src = im.dataset.src; });
          loaded = true;
        }
        xTo(e.clientX); yTo(e.clientY);
        gsap.to(preview, { autoAlpha: 1, scale: 1, rotate: 0, duration: .7, ease: EASE });
      };
      const leave = () => gsap.to(preview, { autoAlpha: 0, scale: .7, rotate: -4, duration: .5, ease: 'power3.out' });
      const rows = $$('[data-svc-index]', list);
      const pick = (e) => { const i = +e.currentTarget.dataset.svcIndex; imgs.forEach((im, k) => im.classList.toggle('is-active', k === i)); };
      list.addEventListener('pointermove', move, { passive: true });
      list.addEventListener('pointerenter', enter);
      list.addEventListener('pointerleave', leave);
      rows.forEach((r) => r.addEventListener('pointerenter', pick));
      return () => {
        list.removeEventListener('pointermove', move);
        list.removeEventListener('pointerenter', enter);
        list.removeEventListener('pointerleave', leave);
        rows.forEach((r) => r.removeEventListener('pointerenter', pick));
      };
    });

    /* ---- Typography: split lines & scrubbed statements (after fonts load) ---- */
    const fontsReady = Promise.race([d.fonts ? d.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);

    fontsReady.then(() => {
      $$('[data-split]').forEach((el) => {
        const inHero = !!el.closest('[data-hero]');
        if (!hasSplit) {
          gsap.set(el, { visibility: 'visible' });
          if (!inHero) gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.2, ease: EASE, scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } });
          return;
        }
        window.SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'line',
          autoSplit: true,
          onSplit(self) {
            gsap.set(el, { visibility: 'visible' });
            if (inHero) {
              if (!heroPlayed) heroTl.fromTo(self.lines, { yPercent: 140 }, { yPercent: 0, duration: 1.4, stagger: .11, ease: EASE }, heroTl.getChildren().length ? .35 : .1);
              return undefined;
            }
            return gsap.fromTo(self.lines, { yPercent: 140 }, {
              yPercent: 0, duration: 1.25, stagger: .1, ease: EASE,
              scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
            });
          }
        });
      });

      if (hasSplit) {
        $$('[data-words]').forEach((el) => {
          window.SplitText.create(el, {
            type: 'words',
            wordsClass: 'word',
            autoSplit: true,
            onSplit(self) {
              return gsap.fromTo(self.words, { opacity: .16 }, {
                opacity: 1, stagger: .1, ease: 'none',
                scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: true }
              });
            }
          });
        });
      }

      return runLoader();
    }).then(() => {
      heroPlayed = true;
      heroTl.play();
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });

    /* ---- First-visit loader (home only) ---- */
    function runLoader() {
      const loader = $('.loader');
      if (!loader || getComputedStyle(loader).display === 'none') {
        if (loader) loader.remove();
        return Promise.resolve();
      }
      if (lenis) lenis.stop();
      return new Promise((resolve) => {
        const tl = gsap.timeline({
          onComplete: () => { loader.remove(); if (lenis) lenis.start(); }
        });
        tl.to($$('[pathLength]', loader), { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: .18 })
          .to($$('.loader__word span', loader), { y: 0, duration: 1, ease: EASE }, .35)
          .add(resolve, '+=.2')
          .to(loader, { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, '<');
        const navbar = $('.navbar');
        if (navbar) {
          tl.fromTo(navbar, { yPercent: -160, autoAlpha: 0 }, {
            yPercent: 0, autoAlpha: 1, duration: 1.1, ease: EASE, clearProps: 'transform,opacity,visibility'
          }, '-=.45');
        }
      });
    }

    addEventListener('load', () => ScrollTrigger.refresh());
    root.classList.add('anim-ready');
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  if (canAnimate) {
    try { initMotion(); } catch (err) {
      root.classList.remove('anim');
      console.error('[The Spatial Shift] animation disabled:', err);
    }
  }
  initHeader();
  initRails();
  initSpy();
  initMenu();
  initQuotes();
  initMarquee();
  initBeforeAfter();
  initFilter();
  initForm();
  initToTop();
})();
