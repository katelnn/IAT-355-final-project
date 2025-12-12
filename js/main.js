// main.js – basic interactivity for the page

document.addEventListener("DOMContentLoaded", () => {
    const heroSubtitle = document.querySelector(".hero-subtitle");
    const contextSection = document.querySelector(".context");
  
    if (heroSubtitle && contextSection) {
      // Show it behaves like an interactive element
      heroSubtitle.style.cursor = "pointer";
      heroSubtitle.title = "Click to jump to the first visualization";
  
      heroSubtitle.addEventListener("click", () => {
        contextSection.scrollIntoView({ behavior: "smooth" });
      });
    }
  });
  
document.addEventListener("DOMContentLoaded", () => {
  const scrollHint = document.getElementById("hero-scroll-hint");

  if (!scrollHint) return;

  scrollHint.addEventListener("click", () => {
    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      code: "ArrowDown",
      keyCode: 40,
      which: 40,
      bubbles: true
    });

    document.dispatchEvent(event);
  });
});

window.addEventListener("scroll", () => {
  const hint = document.getElementById("hero-scroll-hint");
  if (!hint) return;

  if (window.scrollY > window.innerHeight * 0.3) {
    hint.style.opacity = "0";
    hint.style.pointerEvents = "none";
  } else {
    hint.style.opacity = "1";
    hint.style.pointerEvents = "auto";
  }
});