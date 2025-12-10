const heroSky   = document.getElementById('hero'); 
const cloudLeft  = document.querySelector('.cloud-left');
const cloudRight = document.querySelector('.cloud-right');
const plane      = document.querySelector('.plane');

function updateHeroAnimation() {
const rect = heroSky.getBoundingClientRect();
const windowHeight = window.innerHeight;

let progress = (windowHeight * 0.6 - rect.top) / (windowHeight * 0.6);
progress = Math.min(Math.max(progress* 1.5, 0), 1);

const maxOffset = 260;

// cloud movement
cloudLeft.style.transform  = `translateX(${-maxOffset * progress}px)`;
cloudRight.style.transform = `translateX(${maxOffset * progress}px) scaleX(-1)`;

// airline.png scale
const planeScale = 0.6 + 0.9 * progress;
plane.style.transform = `translate(-50%, -50%) scale(${planeScale})`;

// the timing airplane.png start appearing
const appearThreshold = 0.15; 

if (progress < appearThreshold) {
    plane.style.opacity = 0;
} else {
    plane.style.opacity = 1;
}
}

window.addEventListener('scroll', updateHeroAnimation);
window.addEventListener('resize', updateHeroAnimation);
window.addEventListener('load', updateHeroAnimation);