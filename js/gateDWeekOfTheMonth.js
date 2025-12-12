// ======================================================
// Gate D – Week of Month Analysis (Two-step Scrollytelling)
// Rewritten clean version
// ======================================================

// Public function called from stepScrolling.js
// step = 0 → base
// step = 1 → highlight Week 3
// step = 2 → remove highlight, show "no correlation"
window.showGateDStep = function (step) {
  gateD_step = step;
  updateGateDVariants();
};

// State
let gateD_step = 0;

// Globals for the chart
let gD_svg, gD_g, gD_overlayGroup, gD_annotationBox;
let gD_x0, gD_x1, gD_y, gD_innerWidth, gD_innerHeight;
let gD_data = [];

// ======================================================
// INIT
// ======================================================
async function initWeeklyPriceVis() {
  const container = d3.select("#weekly-price-chart");
  if (container.empty()) return;

  container.html("");

  const loading = container.append("p").text("Loading weekly prices...");

  try {
    const [highestData, lowestData] = await Promise.all([
      d3.csv(highestPriceFile, d3.autoType),
      d3.csv(lowestPriceFile, d3.autoType),
    ]);

    const weekSet = new Set();
    lowestData.forEach((d) => weekSet.add(d.week_of_month));
    highestData.forEach((d) => weekSet.add(d.week_of_month));

    const weeks = Array.from(weekSet).sort(d3.ascending);

    const weeklyData = weeks.map((week) => {
      const lows = lowestData.filter((d) => d.week_of_month === week);
      const highs = highestData.filter((d) => d.week_of_month === week);

      return {
        week,
        label: `Week ${week}`,
        avgLowest: lows.length ? d3.mean(lows, (d) => d.price) : null,
        avgHighest: highs.length ? d3.mean(highs, (d) => d.price) : null,
      };
    });

    loading.remove();
    renderGateDChart(container, weeklyData);

    // Start at step 0
    showGateDStep(0);
  } catch (err) {
    console.error(err);
    loading.text("Failed to load weekly price chart.");
  }
}

initWeeklyPriceVis();

// ======================================================
// RENDER BASE CHART
// ======================================================
function renderGateDChart(container, data) {
  gD_data = data;

  const margin = { top: 20, right: 24, bottom: 48, left: 72 };
  const width = 720;
  const height = 320;

  const svg = container.append("svg").attr("width", width).attr("height", height);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  gD_svg = svg;
  gD_g = g;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  gD_innerWidth = innerWidth;
  gD_innerHeight = innerHeight;

  // Scales
  const x0 = d3
    .scaleBand()
    .domain(data.map((d) => d.label))
    .range([0, innerWidth])
    .padding(0.2);

  const x1 = d3
    .scaleBand()
    .domain(["lowest", "highest"])
    .range([0, x0.bandwidth()])
    .padding(0.05);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data.flatMap((d) => [d.avgLowest, d.avgHighest])) * 1.1])
    .nice()
    .range([innerHeight, 0]);

  gD_x0 = x0;
  gD_x1 = x1;
  gD_y = y;

  // Axes
  g.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x0));
  g.append("g").call(d3.axisLeft(y));

  // Tooltip — attach to WEEKLY container (NOT body)
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "bc-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "#fff")
    .style("border", "1px solid #ddd")
    .style("padding", "10px")
    .style("border-radius", "8px")
    .style("opacity", 0)
    .style("font-size", "13px")
    .style("z-index", 9999);

  // Bars
  const groups = g
    .selectAll(".week-group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "week-group")
    .attr("transform", (d) => `translate(${x0(d.label)},0)`);

  groups
    .selectAll("rect")
    .data((d) => [
      { type: "lowest", value: d.avgLowest, label: d.label },
      { type: "highest", value: d.avgHighest, label: d.label },
    ])
    .enter()
    .append("rect")
    .attr("x", (d) => x1(d.type))
    .attr("y", (d) => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => innerHeight - y(d.value))
    .attr("fill", (d) => (d.type === "lowest" ? "#0ea5e9" : "#f97316"))
    .on("mouseenter", function (event, d) {
      tooltip.style("opacity", 1)
        .html(`
            <strong>${d.label}</strong><br>
            ${d.type === "lowest" ? "Lowest Price" : "Highest Price"}<br>
            $${d.value.toFixed(0)}
          `)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY + "px");
    })
    .on("mousemove", function (event) {
      tooltip.style("left", event.pageX + 12 + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseleave", function () {
      tooltip.style("opacity", 0);
    });


  // Overlay group for annotations + highlight
  gD_overlayGroup = g.append("g").attr("class", "overlay-group");

  // Floating annotation box (DOM overlay)
  gD_annotationBox = container
    .append("div")
    .attr("id", "gateD-annotation")
    .style("position", "absolute")
    .style("top", "10px")
    .style("left", "10px")
    .style("opacity", 0)
    .style("padding", "12px 16px")
    .style("background", "rgba(255,255,255,0.92)")
    .style("border-radius", "8px")
    .style("font-size", "14px")
    .style("max-width", "260px")
    .style("transition", "opacity 0.4s");

  // Initial state
  updateGateDVariants();
}

// ======================================================
// UPDATE VIEW BASED ON STEP
// ======================================================
function updateGateDVariants() {
  if (!gD_overlayGroup || !gD_annotationBox) return;

  // Clear previous highlight
  gD_overlayGroup.selectAll("*").remove();

  // Step 0 → nothing
  if (gateD_step === 0) {
    gD_annotationBox.style("opacity", 0);
    return;
  }

  const week3 = gD_data.find(d => +d.week === 3);

  if (!week3) return;

  const x = gD_x0(week3.label);
  const w = gD_x0.bandwidth();

  // Step 1 → highlight + annotation 1
  if (gateD_step === 1) {
    gD_overlayGroup
      .append("rect")
      .attr("x", x)
      .attr("y", 0)
      .attr("width", w)
      .attr("height", gD_innerHeight)
      .attr("fill", "rgba(30,144,255,0.25)")
      .style("opacity", 0)
      .transition()
      .duration(500)
      .style("opacity", 1);

    gD_annotationBox
      .html(`
        <strong>We first looked at Week 3...</strong><br>
        Week 3 shows both the most expensive and cheapest ticket prices on average.
      `)
      .style("opacity", 1);

    return;
  }

  // Step 2 → remove highlight, new annotation
  if (gateD_step === 2) {
    gD_overlayGroup
      .selectAll("rect")
      .transition()
      .duration(500)
      .style("opacity", 0)
      .remove();

    gD_annotationBox
      .style("opacity", 0)
      .transition()
      .duration(400)
      .on("end", () => {
        gD_annotationBox
          .html(`
            <strong>No consistent pattern</strong><br>
            This hints that there seems to be no correlation between the week of the month and ticket prices
          `)
          .style("opacity", 1);
      });

    return; 
  }
}
