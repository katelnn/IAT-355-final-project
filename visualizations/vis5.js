// =====================================
// vis5.js — Day × Month Calendar Heatmap
// Cheapest ↔ Most Expensive (TOGGLE)
// Responsive full-width + Title + Axis Labels
// =====================================

const LOWEST_CSV  = "data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv";
const HIGHEST_CSV = "data/Flights_From_Vancouver_to_Toronto_HighestPrice_clean.csv";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const parseDate = d3.timeParse("%m/%d/%Y");

let currentMode = "lowest"; // default

initHeatmap();
initToggle();

// ------------------------------
// Init Toggle
// ------------------------------
function initToggle() {
  d3.selectAll(".heatmap-toggle button")
    .on("click", function () {
      const mode = this.dataset.mode;
      if (mode === currentMode) return;

      currentMode = mode;

      d3.selectAll(".heatmap-toggle button").classed("active", false);
      d3.select(this).classed("active", true);

      initHeatmap();
    });
}

// ------------------------------
// Init Heatmap
// ------------------------------
async function initHeatmap() {
  const container = d3.select("#day-month-heatmap");
  if (container.empty()) return;

  container.html("");
  container.style("position", "relative");

  const csvPath = currentMode === "lowest" ? LOWEST_CSV : HIGHEST_CSV;
  const label   = currentMode === "lowest" ? "Avg Cheapest" : "Avg Most Expensive";
  const title =
  currentMode === "lowest"
    ? "Calendar Heatmap of Average Cheapest Prices (Day × Month)"
    : "Calendar Heatmap of Average Most Expensive Prices (Day × Month)";


  const raw = await d3.csv(csvPath, d3.autoType);

  const cellMap = new Map();

  raw.forEach(d => {
    const date = parseDate(d.date);
    if (!date || isNaN(d.price)) return;

    const month = date.getMonth();
    const day   = (date.getDay() + 6) % 7; // Monday = 0

    const key = `${month}|${day}`;

    if (!cellMap.has(key)) {
      cellMap.set(key, {
        month,
        monthLabel: MONTHS[month],
        day,
        dayLabel: DAYS[day],
        sum: 0,
        count: 0
      });
    }

    const cell = cellMap.get(key);
    cell.sum += d.price;
    cell.count++;
  });

  const cells = Array.from(cellMap.values()).map(d => ({
    ...d,
    avg: d.sum / d.count
  }));

  renderHeatmap(container, cells, label, title);
}

// ------------------------------
// Render Heatmap (FULL WIDTH)
// ------------------------------
function renderHeatmap(container, cells, label, title) {

  // Responsive width from container
  const containerWidth = container.node().getBoundingClientRect().width || 900;

  // More breathing room for title + axis labels + legend
  const margin = { top: 200, right: 20, bottom: 70, left: 70 };

  const innerWidth = Math.max(300, containerWidth - margin.left - margin.right);

  // Keep cells reasonable so chart doesn't become insanely tall on wide screens
  const cellSize = Math.min(30, Math.max(20, innerWidth / DAYS.length));
  const innerHeight = cellSize * MONTHS.length;

  const svg = container.append("svg")
    .attr("width", containerWidth)
    .attr("height", innerHeight + margin.top + margin.bottom);

  // Title (inside SVG)
  svg.append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", 22)
    .attr("font-weight", 700)
    .text(title);

  // Group for chart
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(DAYS)
    .range([0, innerWidth])
    .padding(0.10);

  const y = d3.scaleBand()
    .domain(MONTHS)
    .range([0, innerHeight])
    .padding(0.10);

  const minVal = d3.min(cells, d => d.avg);
  const maxVal = d3.max(cells, d => d.avg);

  const color = d3.scaleSequential()
    .domain([minVal, maxVal])
    .interpolator(d3.interpolateYlGnBu);

  // Axes
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y).tickSizeOuter(0));

  // Axis labels
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 50)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .text("Day of Week");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -52)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .text("Month");

// ------------------------------
// COLOR LEGEND (below title)
// ------------------------------
const defs = svg.append("defs");
const gradId = `heatmap-grad-${currentMode}`;

const gradient = defs.append("linearGradient")
  .attr("id", gradId)
  .attr("x1", "0%").attr("y1", "0%")
  .attr("x2", "100%").attr("y2", "0%");

// Smooth gradient stops
const stops = d3.range(0, 1.0001, 0.1);
gradient.selectAll("stop")
  .data(stops)
  .enter()
  .append("stop")
  .attr("offset", d => `${d * 100}%`)
  .attr("stop-color", d => color(minVal + d * (maxVal - minVal)));

// Legend layout (CENTERED, under title)
const legendW = Math.min(300, innerWidth * 0.45);
const legendH = 12;

// Title is at y=28, so place legend just below it
const legendX = margin.left + (innerWidth - legendW) / 2;
const legendY = 100;

// (Optional) small label above the bar
svg.append("text")
  .attr("x", margin.left + innerWidth / 2)
  .attr("y", legendY - 8)
  .attr("text-anchor", "middle")
  .attr("font-size", 12)
  .attr("fill", "#475569")
  .text("Average price");

// Gradient bar
svg.append("rect")
  .attr("x", legendX)
  .attr("y", legendY)
  .attr("width", legendW)
  .attr("height", legendH)
  .attr("rx", 6)
  .attr("fill", `url(#${gradId})`)
  .attr("stroke", "rgba(15,23,42,0.12)");

// Min / Max labels under the bar
svg.append("text")
  .attr("x", legendX)
  .attr("y", legendY + legendH + 16)
  .attr("text-anchor", "start")
  .attr("font-size", 12)
  .attr("fill", "#334155")
  .text(`$${Math.round(minVal)}`);

svg.append("text")
  .attr("x", legendX + legendW)
  .attr("y", legendY + legendH + 16)
  .attr("text-anchor", "end")
  .attr("font-size", 12)
  .attr("fill", "#334155")
  .text(`$${Math.round(maxVal)}`);


  // Tooltip (created per render; container is cleared each time)
  const tooltip = container.append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #ddd")
    .style("padding", "8px 10px")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Cells
  g.selectAll("rect")
    .data(cells)
    .enter()
    .append("rect")
    .attr("x", d => x(d.dayLabel))
    .attr("y", d => y(d.monthLabel))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 7)
    .attr("fill", d => color(d.avg))
    .on("mouseenter", (event, d) => {
      tooltip
        .html(`
          <strong>${d.monthLabel} – ${d.dayLabel}</strong><br>
          ${label}: $${d.avg.toFixed(0)}
        `)
        .style("opacity", 1);
    })
    .on("mousemove", event => {
      const box = container.node().getBoundingClientRect();
      tooltip
        .style("left", (event.clientX - box.left + 14) + "px")
        .style("top", (event.clientY - box.top - 12) + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));
}

