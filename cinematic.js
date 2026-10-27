/* cinematic.js — motor de composición ligado al scroll.
 *
 * Principios:
 *  - No hay listeners de scroll. Un IntersectionObserver activa una única
 *    animación de requestAnimationFrame por escena visible.
 *  - Sólo se escriben custom properties y transform/opacity.
 *  - prefers-reduced-motion y móvil desactivan el scroll-telling y dejan
 *    todo el contenido en su estado final legible.
 */
(function () {
  "use strict";

  const root = document.documentElement;
  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileMQ = window.matchMedia("(max-width: 900px)");
  const fineMQ = window.matchMedia("(hover: hover) and (pointer: fine)");
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  let scenes = [];
  let activeScenes = new Set();
  let rafId = 0;
  let revealObserver = null;
  let galleryPanelObserver = null;
  let resizeTick = 0;
  const galleryState = { section: null, viewport: null, panel: null, max: 0, vh: 0 };
  const storyState = { stage: null, cards: [], dots: [], counter: null, p: 0 };

  /* ------------------------------------------------------------------ */
  /* Loop                                                               */
  /* ------------------------------------------------------------------ */

  function startLoop() {
    if (rafId || document.hidden || reduceMQ.matches) return;
    rafId = requestAnimationFrame(loop);
  }

  function loop() {
    rafId = 0;
    if (document.hidden || reduceMQ.matches) return;
    activeScenes.forEach((scene) => scene.tick());
    if (activeScenes.size) rafId = requestAnimationFrame(loop);
  }

  function createScene(el, onTick, rootMargin) {
    if (!el) return null;
    const scene = {
      el,
      active: false,
      tick() {
        if (reduceMQ.matches) return;
        onTick(el.getBoundingClientRect());
      },
    };
    scene.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            scene.active = true;
            activeScenes.add(scene);
            scene.tick();
            startLoop();
          } else {
            scene.active = false;
            activeScenes.delete(scene);
          }
        });
      },
      { rootMargin: rootMargin || "25% 0px 25% 0px" },
    );
    scene.io.observe(el);
    scenes.push(scene);
    return scene;
  }

  function teardownScenes() {
    scenes.forEach((scene) => scene.io.disconnect());
    scenes = [];
    activeScenes.clear();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function viewportProgress(rect) {
    const vh = window.innerHeight;
    return clamp((vh - rect.top) / (vh + rect.height), 0, 1);
  }

  /* ------------------------------------------------------------------ */
  /* Hero                                                               */
  /* ------------------------------------------------------------------ */

  function setupHero() {
    const stage = document.querySelector(".hero-stage");
    const hero = document.querySelector(".hero");
    if (!stage || !hero) return;

    createScene(stage, (rect) => {
      const vh = window.innerHeight;
      const span = Math.max(1, rect.height - vh);
      const p = clamp(-rect.top / span, 0, 1);
      hero.style.setProperty("--hp", p.toFixed(4));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Statement                                                          */
  /* ------------------------------------------------------------------ */

  function setupStatement() {
    const section = document.querySelector(".statement");
    if (!section) return;
    createScene(section, (rect) => {
      section.style.setProperty("--sp", viewportProgress(rect).toFixed(4));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Experience                                                         */
  /* ------------------------------------------------------------------ */

  function setupExperience() {
    const section = document.querySelector("#experience");
    const cards = Array.from(document.querySelectorAll(".capability"));
    if (!section || !cards.length) return;

    createScene(section, () => {
      const vh = window.innerHeight;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
        card.style.setProperty("--cap-par", `${((p - 0.5) * 46).toFixed(1)}px`);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Gallery: recorrido horizontal gobernado por scroll                  */
  /* ------------------------------------------------------------------ */

  function galleryPinned() {
    return !reduceMQ.matches && !mobileMQ.matches;
  }

  function primeGalleryImages(panel) {
    panel.querySelectorAll("img").forEach((img) => {
      if (img.loading === "lazy") img.loading = "eager";
    });
  }

  function setGalleryCounter(index, total) {
    const el = galleryState.section?.querySelector("[data-gallery-counter]");
    if (!el) return;
    const text = `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    if (el.textContent !== text) el.textContent = text;
  }

  function updateGallery() {
    const { section, panel, max } = galleryState;
    if (!section || !panel || !galleryPinned()) return;

    const rect = section.getBoundingClientRect();
    const p = max > 0 ? clamp(-rect.top / max, 0, 1) : 0;

    panel.style.setProperty("--gx", `${(-p * max).toFixed(2)}px`);
    section.style.setProperty("--gp", p.toFixed(4));

    const fill = section.querySelector("[data-gallery-fill]");
    if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;

    const ghost = section.querySelector("[data-gallery-ghost]");
    if (ghost) ghost.style.setProperty("--ghost-x", `${(-p * max * 0.24).toFixed(1)}px`);

    const vw = window.innerWidth;
    const items = Array.from(panel.querySelectorAll(".gallery-item"));
    items.forEach((item) => {
      const img = item.querySelector("img");
      const r = item.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const relative = clamp((center - vw / 2) / (vw * 0.5), -1, 1);
      if (img) img.style.setProperty("--ix", `${(relative * -28).toFixed(1)}px`);
    });

    const index = clamp(Math.round(p * (items.length - 1)) + 1, 1, items.length);
    setGalleryCounter(index, items.length);
  }

  function observeGalleryItems(panel) {
    if (galleryPanelObserver) galleryPanelObserver.disconnect();
    galleryPanelObserver = null;
    if (!galleryState.viewport || !panel) return;

    const items = Array.from(panel.querySelectorAll(".gallery-item"));
    galleryPanelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = items.indexOf(entry.target) + 1;
          setGalleryCounter(index, items.length);
        });
      },
      { root: galleryState.viewport, threshold: 0.62 },
    );
    items.forEach((item) => galleryPanelObserver.observe(item));
  }

  function measureGallery() {
    const section = document.querySelector(".gallery");
    const viewport = section?.querySelector("[data-gallery-viewport]");
    if (!section || !viewport) return;

    const panel = section.querySelector(".gallery-panel:not([hidden])");
    if (!panel) return;

    galleryState.section = section;
    galleryState.viewport = viewport;
    galleryState.panel = panel;
    primeGalleryImages(panel);

    if (!galleryPinned()) {
      section.style.height = "";
      section.classList.remove("is-pinned");
      section.classList.add("is-natural");
      panel.style.setProperty("--gx", "0px");
      panel.querySelectorAll("img").forEach((img) => img.style.removeProperty("--ix"));
      const fill = section.querySelector("[data-gallery-fill]");
      if (fill) fill.style.transform = "scaleX(0)";
      observeGalleryItems(panel);
      const items = panel.querySelectorAll(".gallery-item");
      setGalleryCounter(1, items.length);
      return;
    }

    if (galleryPanelObserver) galleryPanelObserver.disconnect();
    galleryPanelObserver = null;

    section.classList.add("is-pinned");
    section.classList.remove("is-natural");

    const vh = window.innerHeight;
    const max = Math.max(0, panel.getBoundingClientRect().width - viewport.clientWidth);

    galleryState.max = max;
    galleryState.vh = vh;
    section.style.height = `${Math.round(vh + max)}px`;

    updateGallery();
  }

  function setupGallery() {
    const section = document.querySelector(".gallery");
    if (!section) return;
    createScene(section, updateGallery, "10% 0px 10% 0px");
    measureGallery();
  }

  /* ------------------------------------------------------------------ */
  /* Compliance: revelado secuencial + seguimiento de puntero            */
  /* ------------------------------------------------------------------ */

  function setupCompliance() {
    const section = document.querySelector("#cumplimiento");
    const cards = Array.from(document.querySelectorAll("[data-cert]"));
    if (!section || !cards.length) return;

    cards.forEach((card) => {
      if (reduceMQ.matches) card.style.setProperty("--in", "1");
      else if (!card.style.getPropertyValue("--in")) card.style.setProperty("--in", "0");
    });

    createScene(section, () => {
      const vh = window.innerHeight;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const p = clamp((vh * 0.94 - rect.top) / (vh * 0.46), 0, 1);
        card.style.setProperty("--in", p.toFixed(3));
      });
      const meter = section.querySelector("[data-compliance-meter]");
      if (meter) {
        const p = viewportProgress(section.getBoundingClientRect());
        meter.style.transform = `scaleX(${p.toFixed(4)})`;
      }
    });
  }

  function setupCertPointer() {
    const cards = Array.from(document.querySelectorAll("[data-cert]"));
    if (!cards.length) return;

    cards.forEach((card) => {
      let pointerRaf = 0;
      let px = 0.5;
      let py = 0.5;

      const reset = () => {
        if (pointerRaf) cancelAnimationFrame(pointerRaf);
        pointerRaf = 0;
        card.classList.remove("is-hover");
        card.style.setProperty("--mx", "0");
        card.style.setProperty("--my", "0");
      };

      card.addEventListener("pointermove", (event) => {
        if (reduceMQ.matches || !fineMQ.matches) return;
        const rect = card.getBoundingClientRect();
        px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
        if (pointerRaf) return;
        pointerRaf = requestAnimationFrame(() => {
          pointerRaf = 0;
          card.style.setProperty("--mx", ((px - 0.5) * 2).toFixed(3));
          card.style.setProperty("--my", ((py - 0.5) * 2).toFixed(3));
          card.style.setProperty("--px", `${(px * 100).toFixed(1)}%`);
          card.style.setProperty("--py", `${(py * 100).toFixed(1)}%`);
        });
      });

      card.addEventListener("pointerenter", () => {
        if (!reduceMQ.matches) card.classList.add("is-hover");
      });
      card.addEventListener("pointerleave", reset);
      card.addEventListener("pointercancel", reset);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Story: capítulos apilados, gobernados por el scroll                 */
  /* ------------------------------------------------------------------ */

  function storyPinned() {
    return !reduceMQ.matches && !mobileMQ.matches;
  }

  function renderStory(p) {
    const { cards, dots, counter } = storyState;
    if (!cards.length) return;
    const n = cards.length;
    const t = Math.min(p, 0.999999) * n;
    const index = clamp(Math.floor(t), 0, n - 1);
    const local = t - index;

    cards.forEach((card, i) => {
      let y = 105;
      let scale = 0.96;
      let opacity = 0;
      let z = 1;

      if (i === index) {
        y = -local * 6;
        scale = 1 - local * 0.02;
        opacity = 1;
        z = 2;
      } else if (i === index + 1) {
        y = (1 - local) * 100;
        scale = 0.96 + local * 0.04;
        opacity = clamp(local * 2.4, 0, 1);
        z = 3;
      } else if (i < index) {
        y = -7;
        scale = 0.95;
        opacity = 0;
      }

      card.style.transform = `translate3d(0, ${y.toFixed(2)}%, 0) scale(${scale.toFixed(3)})`;
      card.style.opacity = opacity.toFixed(3);
      card.style.zIndex = String(z);

      /*const img = card.querySelector(".story-media img");
      if (img) {
        const cardLocal = clamp(t - i, 0, 1);
        const shift = (cardLocal - 0.5) * 7;
        img.style.transform = `translate3d(0, ${0}%, 0) scale(1.14)`;
      }*/
    });

    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    if (counter) {
      const text = `${String(index + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      if (counter.textContent !== text) counter.textContent = text;
    }
  }

  function applyStoryMode(initial = false) {
    const { stage, cards } = storyState;
    if (!stage) return;
    const live = storyPinned();
    stage.classList.toggle("is-live", live);

    if (!live) {
      cards.forEach((card) => {
        card.style.transform = "";
        card.style.opacity = "";
        card.style.zIndex = "";
        const img = card.querySelector(".story-media img");
        if (img) img.style.transform = "";
      });
      return;
    }
    if (initial) renderStory(0);
  }

  function setupStory() {
    const stage = document.querySelector(".story-stage");
    if (!stage) return;

    storyState.stage = stage;
    storyState.cards = Array.from(stage.querySelectorAll(".story-card"));
    storyState.dots = Array.from(stage.querySelectorAll(".story-dots i"));
    storyState.counter = stage.querySelector("[data-story-counter]");
    storyState.p = 0;

    applyStoryMode(true);

    createScene(stage, (rect) => {
      if (!storyPinned()) return;
      const vh = window.innerHeight;
      const span = Math.max(1, rect.height - vh);
      const p = clamp(-rect.top / span, 0, 1);
      storyState.p = p;
      stage.style.setProperty("--sp", p.toFixed(4));
      renderStory(p);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mission                                                            */
  /* ------------------------------------------------------------------ */

  function setupMission() {
    const section = document.querySelector(".mission");
    if (!section) return;
    createScene(section, (rect) => {
      section.style.setProperty("--mp", viewportProgress(rect).toFixed(4));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Apariciones                                                        */
  /* ------------------------------------------------------------------ */

  function setupReveals() {
    const elements = Array.from(document.querySelectorAll("[data-rise]"));
    if (!elements.length) return;

    if (revealObserver) revealObserver.disconnect();

    if (reduceMQ.matches) {
      elements.forEach((el) => el.classList.add("is-in"));
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    elements.forEach((el) => {
      const delay = Number(el.dataset.delay || 0);
      if (delay) el.style.setProperty("--rd", `${delay}ms`);
      revealObserver.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Extras                                                             */
  /* ------------------------------------------------------------------ */

  function setupHeroFilm() {
    const track = document.querySelector("[data-hero-film]");
    if (!track) return;
    const originals = Array.from(track.children);
    const fragment = document.createDocumentFragment();
    for (let copy = 0; copy < 3; copy += 1) {
      originals.forEach((img) => {
        const clone = img.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.loading = "lazy";
        fragment.appendChild(clone);
      });
    }
    track.appendChild(fragment);
  }

  function resetMotionStyles() {
    document.querySelectorAll(".hero").forEach((el) => el.style.setProperty("--hp", "0"));
    document.querySelectorAll(".statement").forEach((el) => el.style.setProperty("--sp", "0.5"));
    document.querySelectorAll("[data-cert]").forEach((card) => card.style.setProperty("--in", "1"));
    document.querySelectorAll("[data-rise]").forEach((el) => el.classList.add("is-in"));

    const gallery = document.querySelector(".gallery");
    if (gallery) {
      gallery.style.height = "";
      gallery.classList.remove("is-pinned");
      gallery.classList.add("is-natural");
      const panel = gallery.querySelector(".gallery-panel:not([hidden])");
      if (panel) {
        panel.style.setProperty("--gx", "0px");
        panel.querySelectorAll("img").forEach((img) => img.style.removeProperty("--ix"));
      }
    }
    if (storyState.stage) {
      storyState.stage.classList.remove("is-live");
      applyStoryMode(false);
      renderStory(0);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                               */
  /* ------------------------------------------------------------------ */

  function init() {
    teardownScenes();
    setupReveals();
    document.querySelectorAll("[data-rise]").forEach((el) => el.classList.remove("is-in"));

    if (reduceMQ.matches) {
      root.classList.add("motion-reduced");
      resetMotionStyles();
      document.querySelectorAll("[data-rise]").forEach((el) => el.classList.add("is-in"));
      return;
    }

    root.classList.remove("motion-reduced");
    setupHero();
    setupStatement();
    setupExperience();
    setupGallery();
    setupCompliance();
    setupStory();
    setupMission();
    applyStoryMode(true);
    measureGallery();
  }

  document.addEventListener("gallery:change", () => {
    requestAnimationFrame(() => {
      measureGallery();
      if (galleryPinned() && galleryState.panel) updateGallery();
    });
  });

  window.addEventListener(
    "resize",
    () => {
      if (resizeTick) return;
      resizeTick = requestAnimationFrame(() => {
        resizeTick = 0;
        measureGallery();
        if (storyState.stage) {
          const live = storyPinned();
          storyState.stage.classList.toggle("is-live", live);
          if (live) renderStory(storyState.p);
          else applyStoryMode(false);
        }
        activeScenes.forEach((scene) => scene.tick());
      });
    },
    { passive: true },
  );

  window.addEventListener("load", measureGallery, { once: true });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) startLoop();
    else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  });

  const onPreferenceChange = () => {
    if (reduceMQ.matches) {
      teardownScenes();
      document.querySelectorAll("[data-rise]").forEach((el) => el.classList.add("is-in"));
      root.classList.add("motion-reduced");
      resetMotionStyles();
    } else {
      root.classList.remove("motion-reduced");
      init();
    }
  };

  if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onPreferenceChange);
  if (mobileMQ.addEventListener) {
    mobileMQ.addEventListener("change", () => {
      measureGallery();
      if (storyState.stage) {
        const live = storyPinned();
        storyState.stage.classList.toggle("is-live", live);
        if (live) renderStory(storyState.p);
        else applyStoryMode(false);
      }
    });
  }

  setupHeroFilm();
  setupCertPointer();
  init();
})();
