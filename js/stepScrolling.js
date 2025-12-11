// ============================================
// stepScrolling.js — Scrollytelling Engine
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    const steps = document.querySelectorAll("[data-step]");
    const progressBar = document.createElement("div");
    progressBar.id = "progress-bar";
    document.body.appendChild(progressBar);

    let currentStep = 0;
    let isScrolling = false;
    const SCROLL_DELAY = 600;

    // ●●● STATE FOR SCROLLY BEHAVIOR IN GATE B ●●●
    let gateBZoomTriggered = false;   // has December zoom happened?
    let gateBAutoAdvance = false;     // has auto-scroll to Gate C happened?

    const gateB = document.getElementById("gateB");
    const gateC = document.getElementById("gateC");

    // --------------------------------------------
    // Build Progress Bar
    // --------------------------------------------
    steps.forEach((step, index) => {
        step.setAttribute("tabindex", "0");

        const item = document.createElement("button");
        item.classList.add("progress-item");
        if (index === 0) item.classList.add("active");

        const tooltip = document.createElement("span");
        tooltip.textContent = step.id || `Step ${index + 1}`;
        item.appendChild(tooltip);

        item.addEventListener("click", () => scrollToStep(index));

        progressBar.appendChild(item);
    });

    function updateProgressBar() {
        const items = document.querySelectorAll(".progress-item");
        items.forEach((item, i) => {
            item.classList.toggle("active", i === currentStep);
        });

        if (currentStep === 0) progressBar.classList.add("hide");
        else progressBar.classList.remove("hide");
    }

    // --------------------------------------------
    // Smooth Step Scrolling
    // --------------------------------------------
    function scrollToStep(index) {
        if (index < 0 || index >= steps.length) return;

        steps[index].scrollIntoView({ behavior: "smooth" });

        setTimeout(() => {
            currentStep = index;
            updateProgressBar();

            const id = steps[currentStep].id;
            if (id) history.pushState(null, null, `#${id}`);
        }, 300);
    }

    // --------------------------------------------
    // MAIN WHEEL HANDLER
    // --------------------------------------------
    window.addEventListener("wheel", (event) => {
        if (isScrolling) return;
        isScrolling = true;

        const delta = event.deltaY;

        // ---------------------------
        // SPECIAL LOGIC FOR GATE B
        // ---------------------------
        if (steps[currentStep].id === "gateB") {
            handleGateBScroll(delta);
            resetScrollDelay();
            return;
        }

        // Normal stepping for all other gates
        if (delta > 20) scrollToStep(currentStep + 1);
        else if (delta < -20) scrollToStep(currentStep - 1);

        resetScrollDelay();
    }, { passive: true });

    // --------------------------------------------
    // KEYBOARD HANDLER (Up/Down/Page/Space)
    // --------------------------------------------
    window.addEventListener("keydown", (event) => {
        if (isScrolling) return;
        isScrolling = true;

        let delta = 0;

        if (["ArrowDown", "PageDown", " "].includes(event.key)) {
            event.preventDefault();
            delta = 100;
        } else if (["ArrowUp", "PageUp"].includes(event.key)) {
            event.preventDefault();
            delta = -100;
        }

        if (steps[currentStep].id === "gateB") {
            handleGateBScroll(delta);
            resetScrollDelay();
            return;
        }

        if (delta > 0) scrollToStep(currentStep + 1);
        else if (delta < 0) scrollToStep(currentStep - 1);

        resetScrollDelay();
    });

    function resetScrollDelay() {
        setTimeout(() => isScrolling = false, SCROLL_DELAY);
    }

    // ============================================
    //  🚀 SCROLLY ENGINE FOR GATE B
    // ============================================
    function handleGateBScroll(delta) {
        const rect = gateB.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        const scrolled = viewportHeight - rect.top;  // total amount user scrolled into gateB
        const progress = scrolled / gateB.offsetHeight; // % of the 200vh section

        // Debug if needed:
        // console.log("Gate B progress:", progress);

        // -----------------------------
        // 50% → ZOOM INTO DECEMBER
        // -----------------------------
        if (progress > 0.50 && !gateBZoomTriggered) {
            gateBZoomTriggered = true;
            if (typeof zoomToDecember === "function") zoomToDecember();
        }

        // -----------------------------
        // Back above 50% → RESET ZOOM
        // -----------------------------
        if (progress < 0.50 && gateBZoomTriggered) {
            gateBZoomTriggered = false;
            if (typeof resetZoom === "function") resetZoom();
        }

        // -----------------------------
        // 80% → AUTO ADVANCE TO GATE C
        // -----------------------------
        if (progress > 0.80 && !gateBAutoAdvance) {
            gateBAutoAdvance = true;
            scrollToStep(currentStep + 1);  // move to gateC
            return;
        }

        // If user scrolls back up above 70%, allow moving again
        if (progress < 0.70) {
            gateBAutoAdvance = false;
        }
    }

    // --------------------------------------------
    // Handle initial URL hash
    // --------------------------------------------
    const initialHash = window.location.hash.slice(1);
    if (initialHash) {
        const idx = Array.from(steps).findIndex(step => step.id === initialHash);
        if (idx !== -1) {
            currentStep = idx;
            steps[currentStep].scrollIntoView({ behavior: "auto" });
            updateProgressBar();
        }
    }
});
