window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;
  
    const plane = document.querySelector(".plane");
    const clouds = document.querySelectorAll(".cloud");
  
    const heroHeight = window.innerHeight;
    const progress = Math.min(scrollY / heroHeight, 1); // 0 → 1
  
    /* ----------------------------------
         CLOUDS MOVE OUTWARD ON SCROLL
    ---------------------------------- */
  
    clouds.forEach(el => {
      const speed = parseFloat(el.dataset.speed);
      const direction = el.dataset.direction || "none";
  
      // Base vertical parallax
      let xMove = 0;
      let yMove = scrollY * speed;
  
      // Add outward motion
      if (direction === "left") {
        xMove = -200 * progress;   // moves further left
      }
      if (direction === "right") {
        xMove = 200 * progress;    // moves further right
      }
      if (direction === "down") {
        yMove = yMove + 100 * progress; // moves slightly downward
      }
  
      el.style.transform = `translate(${xMove}px, ${yMove}px)`;
    });
  
    /* ----------------------------------
           PLANE ONLY FLIES UPWARD
    ---------------------------------- */
  
    const upMotion = -250 * progress;
    const scale = 1 + progress * 0.25;
  
    plane.style.transform = `
      translate(-50%, ${upMotion}px)
      scale(${scale})
    `;
  });
  