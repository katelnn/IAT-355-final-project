// =============================================
// overviewOverYear.js — SCROLLY VERSION (Gate B)
// =============================================

// Global variables shared across functions
let mergedData = [];
let svg, width, height, margin;
let x0, x1, y, xAxis, yAxis;
let timeScale, brush, brushG;
let sliderTrack, startPlane, endPlane;
let planeSize = 30;

const parseDate = d3.timeParse("%m/%d/%Y");

// Date range of dataset
const START_DATE = new Date("2025-11-01");
const END_DATE = new Date("2026-11-30");

// Flags for zoom state
let isZoomed = false;

// =============================================
// PUBLIC FUNCTIONS (called from stepScrolling.js)
// =============================================

// 1️⃣ Scroll event says “zoom into December”
window.zoomToDecember = function () {
  if (isZoomed || !timeScale) return;

  const start = new Date("2025-11-11");
  const end = new Date("2025-12-31");

  const x0 = timeScale(start);
  const x1 = timeScale(end);

  svg.select(".custom-brush").call(brush.move, [x0, x1]);

  showAnnotation();
  isZoomed = true;
};

// 2️⃣ Scroll event says “go back to full-year view”
window.resetZoom = function () {
  if (!isZoomed || !timeScale) return;

  svg.select(".custom-brush").call(brush.move, timeScale.range());

  hideAnnotation();
  isZoomed = false;
};

// =============================================
// INITIALIZATION
// =============================================
initDailyBarChart();

async function initDailyBarChart() {
  const container = d3.select("#daily-bar-chart");
  container.html("");

  margin = { top: 30, right: 30, bottom: 90, left: 70 };
  width = 1000 - margin.left - margin.right;
  height = 500 - margin.top - margin.bottom;

  svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  await loadAndPrepareData();

  setupScales();
  drawAxes();
  drawLegend();
  drawBarsAnimated(mergedData);
  initBrush();
}

// =============================================
// DATA PREP
// =============================================
async function loadAndPrepareData() {
  const [highestRaw, lowestRaw] = await Promise.all([
    d3.csv("data/Flights_From_Vancouver_to_Toronto_HighestPrice_clean.csv"),
    d3.csv("data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv")
  ]);

  const highest = highestRaw.map(d => ({
    date: parseDate(d.date),
    label: d.date,
    highest: +d.price
  }));

  const lowest = lowestRaw.map(d => ({
    date: parseDate(d.date),
    label: d.date,
    lowest: +d.price
  }));

  const byDate = new Map();
  highest.forEach(h => byDate.set(h.label, { ...h }));
  lowest.forEach(l => {
    if (byDate.has(l.label)) {
      byDate.get(l.label).lowest = l.lowest;
    }
  });

  mergedData = Array.from(byDate.values()).filter(d => d.date).sort((a, b) => a.date - b.date);
}

// =============================================
// SCALES & AXES
// =============================================
function setupScales() {
  x0 = d3.scaleBand()
    .domain(mergedData.map(d => d.label))
    .range([0, width])
    .padding(0.2);

  x1 = d3.scaleBand()
    .domain(["lowest", "highest"])
    .range([0, x0.bandwidth()])
    .padding(0.05);

  y = d3.scaleLinear()
    .domain([0, 2400])
    .range([height, 0]);

  timeScale = d3.scaleTime()
    .domain([START_DATE, END_DATE])
    .range([0, width]);
}

function drawAxes() {
  xAxis = d3.axisBottom(x0)
    .tickValues(mergedData.filter((d, i) => i % 7 === 0).map(d => d.label));

  svg.append("g")
    .attr("class", "x-axis-group")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-65)")
    .attr("text-anchor", "end");

  yAxis = d3.axisLeft(y).ticks(10);

  svg.append("g").attr("class", "y-axis-group").call(yAxis);
}

// =============================================
// DRAW BARS
// =============================================
function drawBarsAnimated(data) {
  const groups = svg.selectAll(".day-group")
    .data(data, d => d.label);

  // EXIT — fade out & slide away
  groups.exit()
    .transition()
    .duration(300)
    .style("opacity", 0)
    .attr("transform", d => `translate(${x0(d.label)}, 20)`)
    .remove();

  // ENTER
  const groupsEnter = groups.enter()
    .append("g")
    .attr("class", "day-group")
    .attr("transform", d => `translate(${x0(d.label)},10)`)
    .style("opacity", 0);

  groupsEnter.transition()
    .duration(500)
    .style("opacity", 1)
    .attr("transform", d => `translate(${x0(d.label)},0)`);

  // MERGE
  const groupsMerged = groupsEnter.merge(groups);

  const types = ["lowest", "highest"];

  const bars = groupsMerged.selectAll("rect")
    .data(d => types.map(t => ({ label: d.label, type: t, value: d[t] })));

  // ENTER RECTANGLES
  bars.enter()
    .append("rect")
    .attr("x", d => x1(d.type))
    .attr("y", height)
    .attr("width", x1.bandwidth())
    .attr("height", 0)
    .attr("fill", d => d.type === "lowest" ? "#0ea5e9" : "#f97316")
    // ✅ EVENTS MUST BE HERE — BEFORE TRANSITION
    .on("mouseover", (event, d) => showBarTooltip(event, d))
    .on("mouseout", hideBarTooltip)
    // NOW transition begins
    .transition()
    .duration(500)
    .ease(d3.easeCubicOut)
    .attr("y", d => y(d.value))
    .attr("height", d => height - y(d.value));

  bars
  .on("mouseover", (event, d) => showBarTooltip(event, d))
  .on("mouseout", hideBarTooltip)
  .transition()
  .duration(500)
  .ease(d3.easeCubicOut)
  .attr("x", d => x1(d.type))
  .attr("y", d => y(d.value))
  .attr("height", d => height - y(d.value));


  // UPDATE RECTANGLES
  bars.transition()
    .duration(500)
    .ease(d3.easeCubicOut)
    .attr("x", d => x1(d.type))
    .attr("y", d => y(d.value))
    .attr("height", d => height - y(d.value));

  // EXIT RECTANGLES
  bars.exit()
    .transition()
    .duration(300)
    .style("opacity", 0)
    .attr("y", height)
    .attr("height", 0)
    .remove();
}

function showBarTooltip(event, d) {
  d3.select("#daily-bar-chart")
    .append("div")
    .attr("id", "bar-tooltip")
    .style("position", "absolute")
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 30 + "px")
    .style("padding", "6px 10px")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "white")
    .style("border-radius", "4px")
    .style("font-size", "13px")
    .html(`
      <strong>${d.label}</strong><br>
      ${d.type === "lowest" ? "Lowest Price" : "Highest Price"}: $${d.value}
    `);
}

function hideBarTooltip() {
  d3.select("#bar-tooltip").remove();
}


// =============================================
// CUSTOM BRUSH WITH PLANES
// =============================================
function initBrush() {
  brush = d3.brushX()
    .extent([[0, 0], [width, 40]])
    .on("brush", brushed)
    .on("end", brushed);

  brushG = svg.append("g")
    .attr("class", "custom-brush")
    .attr("transform", `translate(0,-50)`);

  brushG.call(brush);
  brushG.selectAll(".handle").remove();

  sliderTrack = brushG.append("rect")
    .attr("class", "slider-track")
    .attr("x", 0)
    .attr("y", 10)
    .attr("height", 20)
    .attr("width", width)
    .attr("fill", "#ddd");

  startPlane = brushG.append("image")
    .attr("href", "assets/airplane.png")
    .attr("width", planeSize)
    .attr("height", planeSize)
    .attr("y", 5);

  endPlane = brushG.append("image")
    .attr("href", "assets/airplane.png")
    .attr("width", planeSize)
    .attr("height", planeSize)
    .attr("y", 5);

  brushG.call(brush.move, timeScale.range());
}

function brushed(event) {
  const sel = event.selection ?? timeScale.range();
  const [xA, xB] = sel;

  sliderTrack.attr("x", xA).attr("width", xB - xA);

  startPlane.attr("x", xA - planeSize / 2);
  endPlane.attr("x", xB - planeSize / 2);

  const start = timeScale.invert(xA);
  const end = timeScale.invert(xB);

  const filtered = mergedData.filter(d => d.date >= start && d.date <= end);

  drawBarsAnimated(filtered);

}

// =============================================
// ANNOTATION BOX
// =============================================
function showAnnotation() {
  if (document.getElementById("gateB-annotation")) return;

  d3.select("#daily-bar-chart")
    .append("div")
    .attr("id", "gateB-annotation")
    .style("position", "absolute")
    .style("top", "10px")
    .style("left", "10px")
    .style("padding", "12px 16px")
    .style("background", "rgba(255,255,255,0.9)")
    .style("border-radius", "8px")
    .style("font-size", "14px")
    .style("max-width", "240px")
    .html(`
      <strong>December Price Pattern</strong><br>
      Ticket prices fluctuate significantly through December 2025,
      especially approaching the end of the month.
    `);
}

function hideAnnotation() {
  d3.select("#gateB-annotation").remove();
}

// =============================================
function drawLegend() {
  const legend = svg.append("g").attr("transform", `translate(${width - 150}, 10)`);

  legend.append("rect").attr("width", 12).attr("height", 12).attr("fill", "#0ea5e9");
  legend.append("text").attr("x", 18).attr("y", 10).text("Lowest Price");

  legend.append("rect").attr("y", 22).attr("width", 12).attr("height", 12).attr("fill", "#f97316");
  legend.append("text").attr("x", 18).attr("y", 32).text("Highest Price");
}
