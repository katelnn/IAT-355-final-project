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
  