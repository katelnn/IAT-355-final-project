// =============================================================
// Gate E – Multi-Heatmap Highlight Controller
// =============================================================

// Gate E state (0–4)
let gateEState = 0;

// Exposed by heatmap files (we fill these after both heatmaps load)
window.heatmapLowest_yScale = null;
window.heatmapHighest_yScale = null;

window.heatmapLowest_overlay = null;
window.heatmapHighest_overlay = null;

window.heatmapDescBox = null;

// -------------------------------------------------------------
// Initialize description box (call this once on Gate E load)
// -------------------------------------------------------------
function initGateEDescriptionBox() {
    const container = document.querySelector("#heatmap-description");
    if (!container) return;

    let desc = document.createElement("div");
    desc.id = "gateE-desc-box";
    desc.style.marginTop = "20px";
    desc.style.padding = "16px 20px";
    desc.style.background = "rgba(255,255,255,0.9)";
    desc.style.borderRadius = "10px";
    desc.style.maxWidth = "600px";
    desc.style.display = "none";   // hidden initially

    container.prepend(desc);
    window.heatmapDescBox = desc;
}

initGateEDescriptionBox();

// -------------------------------------------------------------
// Helper – clears highlight rectangles from both heatmaps
// -------------------------------------------------------------
function clearGateEHighlights() {
    if (window.heatmapLowest_overlay)
        window.heatmapLowest_overlay.selectAll("*").remove();

    if (window.heatmapHighest_overlay)
        window.heatmapHighest_overlay.selectAll("*").remove();
}

// -------------------------------------------------------------
// Draw highlight rectangles for a list of month labels
// (rows such as ["Nov"], ["Feb","Mar"], ["Jul","Aug"])
// -------------------------------------------------------------
function highlightRows(monthLabels) {
    clearGateEHighlights();

    // Helper function to draw rectangles for one heatmap
    function drawForHeatmap(yScale, overlay, color = "rgba(255, 30, 233, 0.28)") {
        if (!yScale || !overlay) return;

        monthLabels.forEach(label => {
            const y = yScale(label);
            if (y == null) return;

            overlay.append("rect")
                .attr("x", 0)
                .attr("y", y)
                .attr("width", yScale.bandwidth() * 20) // big enough to cover chart width
                .attr("height", yScale.bandwidth())
                .attr("fill", color)
                .attr("opacity", 0.9);
        });
    }

    drawForHeatmap(window.heatmapLowest_yScale, window.heatmapLowest_overlay);
    drawForHeatmap(window.heatmapHighest_yScale, window.heatmapHighest_overlay);
}

// -------------------------------------------------------------
// Update description text depending on step
// -------------------------------------------------------------
function setGateEDescription(text) {
    if (!window.heatmapDescBox) return;
    window.heatmapDescBox.style.display = "block";
    window.heatmapDescBox.innerHTML = text;
}

// -------------------------------------------------------------
// MAIN ENTRY POINT — Called from stepScrolling.js
// -------------------------------------------------------------
window.showGateEStep = function(step) {
    gateEState = step;

    if (step === 0) {
        clearGateEHighlights();
        setGateEDescription("");
        window.heatmapDescBox.style.display = "none";
        return;
    }

    if (step === 1) {
        highlightRows(["Nov"]);
        setGateEDescription(`
            <strong>Overall, November</strong> is marked with darker blocks on both heatmaps.
            This suggests that November tends to hold the <strong>most expensive</strong> ticket prices.
        `);
        return;
    }

    if (step === 2) {
        highlightRows(["Feb", "Mar"]);
        setGateEDescription(`
            <strong>February and March</strong> show noticeably lighter blocks overall.
            This indicates that the <strong>early months</strong> of the year tend to have
            <strong>cheaper prices</strong>.
        `);
        return;
    }

    if (step === 3) {
        highlightRows(["Jul", "Aug"]);
        setGateEDescription(`
            During the <strong>summer months</strong>, especially July and August, 
            prices tend to increase slightly compared to earlier months.
        `);
        return;
    }

    if (step === 4) {
        clearGateEHighlights();
        setGateEDescription(`
            Despite some seasonal tendencies, as we compared <strong>columns</strong> of the heatmaps,
            we found <strong>no clear correlation</strong> between the <strong>day of the month</strong>
            and <strong>ticket prices</strong>.
        `);
        return;
    }
};
