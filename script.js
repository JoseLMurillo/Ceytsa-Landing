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

document.addEventListener("scroll", () => {
  document.querySelectorAll(".capability.visible,.story-card.visible,.cert-card.visible,.mission-main>div.visible,.leader-copy.visible")
    .forEach(el => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
}, {passive:true});

const wa = document.querySelector(".wa-float");
if (wa) {
  const phone = wa.dataset.phone;
  const message = encodeURIComponent(wa.dataset.message);
  wa.href = `https://wa.me/${phone}?text=${message}`;
}