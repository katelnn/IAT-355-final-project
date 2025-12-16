const sections = document.querySelectorAll("section.step");
const navItems = document.querySelectorAll("#progress-nav li");

window.addEventListener("scroll", () => {
  let current = "";

  sections.forEach(section => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.3 && rect.bottom >= window.innerHeight * 0.3) {
      current = section.id;
    }
  });

  navItems.forEach(item => {
    item.classList.toggle("active", item.dataset.target === current);
  });
});
