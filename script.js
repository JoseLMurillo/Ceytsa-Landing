/* CE&T — interacciones base (navegación, pestañas de galería, marquesina,
   progreso de lectura y WhatsApp). Las animaciones de scroll viven en
   cinematic.js. */

const progress = document.querySelector("#progress");
const menu = document.querySelector("#menu");
const nav = document.querySelector("#nav");

// La barra de progreso usa CSS Scroll Timeline cuando está disponible.
// El fallback mantiene un único frame por scroll, sin escrituras innecesarias.
if (progress) {
  const supportsScrollTimeline =
    typeof CSS !== "undefined" &&
    CSS.supports &&
    CSS.supports("animation-timeline: scroll()");

  if (!supportsScrollTimeline) {
    let ticking = false;
    const updateProgress = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(updateProgress);
      },
      { passive: true },
    );
    updateProgress();
  }
}

menu?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll("#nav a").forEach((a) => {
  a.addEventListener("click", () => {
    nav.classList.remove("open");
    menu?.setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();

document.addEventListener("click", (e) => {
  if (!nav.contains(e.target) && !menu.contains(e.target)) {
    nav.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }
});

/* Galería: la lógica de pestañas y accesibilidad se conserva.
   cinematic.js escucha "gallery:change" para recalcular el recorrido. */
const tabs = document.querySelectorAll(".gallery-tab");
const panels = document.querySelectorAll(".gallery-panel");

function showTab(name) {
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.id !== `panel-${name}`;
  });
  document.dispatchEvent(
    new CustomEvent("gallery:change", { detail: { name } }),
  );
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => showTab(tab.dataset.tab));
  tab.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(i + step + tabs.length) % tabs.length];
    next.focus();
    showTab(next.dataset.tab);
  });
});

document.querySelectorAll("[data-galeria]").forEach((link) => {
  link.addEventListener("click", () => showTab(link.dataset.galeria));
});

/* Marquesina de marcas: se duplica para que el loop sea continuo. */
document.querySelectorAll(".marquee-track").forEach((track) => {
  const copies = [...track.children].map((li) => {
    const clone = li.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    return clone;
  });
  track.append(...copies);
});

const wa = document.querySelector(".wa-float");
if (wa) {
  const phone = wa.dataset.phone;
  const message = encodeURIComponent(wa.dataset.message);
  wa.href = `https://wa.me/${phone}?text=${message}`;
}
