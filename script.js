const progress = document.querySelector("#progress");
const menu = document.querySelector("#menu");
const nav = document.querySelector("#nav");

function updateProgress() {
  const scrollTop = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${max > 0 ? (scrollTop / max) * 100 : 0}%`;
}
window.addEventListener("scroll", updateProgress, {passive:true});
updateProgress();

menu?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll("#nav a").forEach(a => {
  a.addEventListener("click", () => {
    nav.classList.remove("open");
    menu?.setAttribute("aria-expanded","false");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();

// Entrada progresiva sin framework.
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
      observer.unobserve(entry.target);
    }
  });
}, {threshold:.12});

document.querySelectorAll(".capability,.story-card,.cert-card,.mission-main>div,.leader-copy").forEach(el => {
  el.style.transition = "opacity .7s ease, transform .7s ease";
  el.style.opacity = "0";
  el.style.transform = "translateY(28px)";
  observer.observe(el);
});

document.addEventListener("click", (e) => {
  if (!nav.contains(e.target) && !menu.contains(e.target)) {
    nav.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }
});

// Galería con pestañas
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
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => showTab(tab.dataset.tab));
  tab.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(i + step + tabs.length) % tabs.length];
    next.focus();
    showTab(next.dataset.tab);
  });
});
document.querySelectorAll("[data-galeria]").forEach((link) => {
  link.addEventListener("click", () => showTab(link.dataset.galeria));
});

const wa = document.querySelector(".wa-float");
if (wa) {
  const phone = wa.dataset.phone;
  const message = encodeURIComponent(wa.dataset.message);
  wa.href = `https://wa.me/${phone}?text=${message}`;
}