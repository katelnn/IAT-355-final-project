// ============================================
// stepScrolling.js — Clean STEP ENGINE (Gates A–F)
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    const steps = document.querySelectorAll("[data-step]");
    const progressBar = document.createElement("div");
    progressBar.id = "progress-bar";
    document.body.appendChild(progressBar);

    let currentStep = 0;
    let isScrolling = false;
    const SCROLL_DELAY = 450;

    // -----------------------------
    // INTERNAL STATE FOR EACH GATE
    // -----------------------------
    let gateBState = 1;   // 1 = full year, 2 = zoom, 3 = exit
    let gateCState = 1;   // 1 = clear, 2 = winter, 3 = summer, 4 = exit
    let gateDState = 0;   // 0 = base, 1 = highlight, 2 = post-highlight
    let gateEState = 0;
    let gateFState = 0;


    // -----------------------------
    // Progress Bar Setup
    // -----------------------------
    steps.forEach((step, index) => {
        const item = document.createElement("button");
        item.classList.add("progress-item");
        if (index === 0) item.classList.add("active");

        const tooltip = document.createElement("span");
        tooltip.textContent = step.id;
        item.appendChild(tooltip);

        item.addEventListener("click", () => jumpToStep(index));
        progressBar.appendChild(item);
    });

    function updateProgressBar() {
        document.querySelectorAll(".progress-item").forEach((el, i) =>
            el.classList.toggle("active", i === currentStep)
        );
        progressBar.classList.toggle("hide", currentStep === 0);
    }

    // -----------------------------
    // Scroll + Key Navigation
    // -----------------------------
    function throttleScroll() {
        isScrolling = true;
        setTimeout(() => (isScrolling = false), SCROLL_DELAY);
    }

    window.addEventListener("wheel", (e) => {
        if (isScrolling) return;
        throttleScroll();
        e.deltaY > 0 ? next() : prev();
    });

    window.addEventListener("keydown", (e) => {
        if (isScrolling) return;

        if (["ArrowDown", "PageDown", " "].includes(e.key)) {
            e.preventDefault();
            throttleScroll();
            next();
        }

        if (["ArrowUp", "PageUp"].includes(e.key)) {
            e.preventDefault();
            throttleScroll();
            prev();
        }
    });

    // -----------------------------
    // NEXT / PREV LOGIC
    // -----------------------------
    function next() {
        const id = steps[currentStep].id;

        if (id === "gateB") return nextGateB();
        if (id === "gateC") return nextGateC();
        if (id === "gateD") return nextGateD();
        if (id === "gateE") return nextGateE();
        if (id === "gateF") return nextGateF();


        jumpToStep(currentStep + 1);
    }

    function prev() {
        const id = steps[currentStep].id;

        if (id === "gateB") return prevGateB();
        if (id === "gateC") return prevGateC();
        if (id === "gateD") return prevGateD();
        if (id === "gateE") return prevGateE();
        if (id === "gateF") return prevGateF();


        jumpToStep(currentStep - 1);
    }

    // -----------------------------
    // GATE B ENGINE
    // -----------------------------
    function nextGateB() {
        if (gateBState === 1) {
            gateBState = 2;
            if (typeof zoomToDecember === "function") zoomToDecember();
            return;
        }
        if (gateBState === 2) {
            gateBState = 3;
            jumpToStep(currentStep + 1);
            return;
        }
    }

    function prevGateB() {
        if (gateBState === 2) {
            gateBState = 1;
            if (typeof resetZoom === "function") resetZoom();
            return;
        }
        if (gateBState === 1) {
            jumpToStep(currentStep - 1);
            return;
        }
    }

    // -----------------------------
    // GATE C ENGINE
    // -----------------------------
    function nextGateC() {
        if (gateCState === 1) {
            gateCState = 2;
            showWinterAnnotation();
            return;
        }
        if (gateCState === 2) {
            gateCState = 3;
            showSummerAnnotation();
            return;
        }
        if (gateCState === 3) {
            gateCState = 4;
            jumpToStep(currentStep + 1);
            return;
        }
    }

    function prevGateC() {
        if (gateCState === 3) {
            gateCState = 2;
            showWinterAnnotation();
            return;
        }
        if (gateCState === 2) {
            gateCState = 1;
            clearMonthAnnotations();
            return;
        }
        if (gateCState === 1) {
            jumpToStep(currentStep - 1);
            return;
        }
    }

    // -----------------------------
    // GATE D ENGINE (2-step narrative)
    // -----------------------------
    function nextGateD() {
        if (gateDState === 0) {
            gateDState = 1;
            showGateDStep(1);  // highlight Week 3
            return;
        }
        if (gateDState === 1) {
            gateDState = 2;
            showGateDStep(2); // remove highlight + new annotation
            return;
        }
        if (gateDState === 2) {
            jumpToStep(currentStep + 1);
            return;
        }
    }

    function prevGateD() {
        if (gateDState === 2) {
            gateDState = 1;
            showGateDStep(1);
            return;
        }
        if (gateDState === 1) {
            gateDState = 0;
            showGateDStep(0); // clear annotations + highlight
            return;
        }
        if (gateDState === 0) {
            jumpToStep(currentStep - 1);
            return;
        }
    }

    // -----------------------------
    // GATE E ENGINE 
    // -----------------------------
    function nextGateE() {
        if (gateEState < 4) {
            gateEState++;
            window.showGateEStep(gateEState);
            return;
        }
        // step 4 already shown, go to next gate
        jumpToStep(currentStep + 1);
    }

    function prevGateE() {
        if (gateEState > 0) {
            gateEState--;
            window.showGateEStep(gateEState);
            return;
        }
        jumpToStep(currentStep - 1);
    }

    // -----------------------------
    // GATE F ENGINE
    // -----------------------------
    function nextGateF() {
        if (gateFState < 3) {
            gateFState++;
            window.showGateFStep(gateFState);
            return;
        }
        jumpToStep(currentStep + 1);
    }

    function prevGateF() {
        if (gateFState > 0) {
            gateFState--;
            window.showGateFStep(gateFState);
            return;
        }
        jumpToStep(currentStep - 1);
    }



    // -----------------------------
    // Jump to Step
    // -----------------------------
    function jumpToStep(index) {
        if (index < 0 || index >= steps.length) return;
        currentStep = index;

        const step = steps[currentStep];
        step.scrollIntoView({ behavior: "smooth" });

        updateProgressBar();

        const id = step.id;

        // Reset gate states properly on entry:

        if (id === "gateB") {
            gateBState = 1;
            resetZoom && resetZoom();
        }

        if (id === "gateC") {
            gateCState = 1;
            clearMonthAnnotations && clearMonthAnnotations();
        }

        if (id === "gateD") {
            gateDState = 0;
            showGateDStep(0); // base state
        }

        if (id === "gateE") {
            gateEState = 0;
            window.showGateEStep(0);
        }

        if (id === "gateF") {
            gateFState = 0;
            window.showGateFStep(0);
        }



        if (id) history.pushState(null, null, `#${id}`);
    }

    // -----------------------------
    // Load URL Hash Deep-Link
    // -----------------------------
    const initialHash = window.location.hash.slice(1);
    if (initialHash) {
        const idx = [...steps].findIndex(s => s.id === initialHash);
        if (idx !== -1) {
            currentStep = idx;
            steps[idx].scrollIntoView({ behavior: "auto" });
            updateProgressBar();
        }
    }
});
