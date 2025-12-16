document.querySelectorAll("#progress-nav li").forEach(item => {
    item.addEventListener("click", () => {
      const target = document.getElementById(item.dataset.target);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
  