document.addEventListener("DOMContentLoaded", () => {
    // 1. Select all the scroll-snap sections
    const steps = document.querySelectorAll("[data-step]");
    
    // 2. Select the progress bar container
    const progressBar = document.createElement('div');
    progressBar.id = "progress-bar";
    // For styling purposes, let's assume you'll add the progress bar container somewhere prominent,
    // like right inside the <body> or <main>. We'll append it to the body for now.
    document.body.appendChild(progressBar);

    let currentStep = 0;
    let isScrolling = false; // Flag to control scroll delay
    const SCROLL_DELAY = 600; // Delay in ms to prevent rapid scrolling
    let changeVis = true; // Flag to potentially control visualization triggers

    // --- Progress Bar Setup ---

    // Create progress bar items and set focus/click listeners
    steps.forEach((step, index) => {
        // Add tabindex for keyboard focus navigation
        step.setAttribute("tabindex", "0"); 
        
        // This makes sure focusing on a section scrolls to it (for keyboard users)
        step.addEventListener("focus", () => {
            scrollToStep(index);
        });
        
        // Create the individual progress bar item
        const progressItem = document.createElement("button");
        progressItem.classList.add("progress-item");
        if (index === 0) progressItem.classList.add("active");
        progressItem.dataset.step = index;

        // Add a tooltip showing the step name (using the section ID)
        const tooltip = document.createElement("span");
        tooltip.textContent = step.id || `Step ${index + 1}`;
        progressItem.appendChild(tooltip);

        // Click event to navigate to step
        progressItem.addEventListener("click", () => {
            scrollToStep(index);
        });

        progressBar.appendChild(progressItem);
    });

    /**
     * Updates the progress bar visual state.
     */
    const updateProgressBar = () => {
        const progressItems = document.querySelectorAll(".progress-item");
        progressItems.forEach((item, index) => {
            item.classList.toggle("active", index === currentStep);
        });

        // Hide/Show the progress bar logic from your original code
        if (currentStep === 0) {
            progressBar.classList.add("hide");
        } else {
            progressBar.classList.remove("hide");
        }
    };

    // --- Core Scrolling Function ---

    /**
     * Scrolls to a specific step index.
     * @param {number} index - The target step index.
     */
    const scrollToStep = (index) => {
        if (index >= 0 && index < steps.length) {
            // Scroll the target section into view
            steps[index].scrollIntoView({ behavior: "smooth" });

            // Wait for the scroll animation to finish before updating state
            setTimeout(() => {
                currentStep = index;
                updateProgressBar();
                
                // Update the URL hash
                const stepId = steps[currentStep].id;
                if (stepId) {
                    history.pushState(null, null, `#${stepId}`);
                }
                
                // --- Visualization Triggers (Customizable) ---
                // You can add logic here to run your D3/Highcharts code
                // based on which section (gate) is visible.
                
                // Example: if (stepId === 'gateA') { gradsFromBCToON(); }
                // This replaces the complex tuitionVis/salaryVis calls from your original script.
                
                // --- End Visualization Triggers ---

            }, 300); // Shorter timeout for updating state after scroll starts
        }
    };

    // --- Scroll & Keyboard Handlers ---

    // Handle mouse wheel/trackpad scroll
    window.addEventListener(
        "wheel",
        (event) => {
            if (isScrolling) return;
            isScrolling = true;

            // Determine scroll direction
            const delta = event.deltaY;

            if (delta > 20) {
                // Scroll down
                scrollToStep(currentStep + 1);
            } else if (delta < -20) {
                // Scroll up
                scrollToStep(currentStep - 1);
            }

            // Reset scrolling flag after a delay
            setTimeout(() => {
                isScrolling = false;
            }, SCROLL_DELAY);
        },
        { passive: true }
    );

    // Handle keyboard arrow navigation
    window.addEventListener("keydown", (event) => {
        if (isScrolling) return;
        isScrolling = true;
        
        let newStep = currentStep;

        if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
            event.preventDefault();
            newStep = currentStep + 1;
        } else if (event.key === "ArrowUp" || event.key === "PageUp") {
            event.preventDefault();
            newStep = currentStep - 1;
        }

        if (newStep !== currentStep) {
             scrollToStep(newStep);
        }

        setTimeout(() => {
            isScrolling = false;
        }, SCROLL_DELAY);
    });

    // --- Initialization ---

    // Handle initial URL hash to set the starting step
    const handleInitialHash = () => {
        const hash = window.location.hash.slice(1);
        if (hash) {
            const stepIndex = Array.from(steps).findIndex((step) => step.id === hash);
            if (stepIndex !== -1) {
                currentStep = stepIndex;
                steps[currentStep].scrollIntoView({ behavior: 'auto' }); // Snap immediately on load
                updateProgressBar();
            }
        }
    };

    handleInitialHash();
});
