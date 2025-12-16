// =============================================================
// VIS 2 — Overview of Price Fluctuations (Dual Line Chart)
// Shows cheapest vs most expensive ticket price per day
// =============================================================
(function () {
    const V2_HIGHEST_CSV =
      "data/Flights_From_Vancouver_to_Toronto_HighestPrice_clean.csv";
    const V2_LOWEST_CSV =
      "data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv";
  
    const parseDate = d3.timeParse("%m/%d/%Y");
    const formatDate = d3.timeFormat("%b %d, %Y");
  
    document.addEventListener("DOMContentLoaded", initVis2);
  
    async function initVis2() {
      const container = d3.select("#chart-yearly");
      if (container.empty()) return; // fail silently if container missing
  
      container.html(""); // clear anything old
      container.style("position", "relative");
  
      // ---------------------------------------------------------
      // 1. Load + merge data
      // ---------------------------------------------------------
      const [highestRaw, lowestRaw] = await Promise.all([
        d3.csv(V2_HIGHEST_CSV, d3.autoType),
        d3.csv(V2_LOWEST_CSV, d3.autoType),
      ]);
  
      const highest = highestRaw.map((d) => ({
        date: parseDate(d.date),
        key: d.date,
        highest: +d.price,
      }));
  
      const lowest = lowestRaw.map((d) => ({
        date: parseDate(d.date),
        key: d.date,
        lowest: +d.price,
      }));
  
      // Merge by date string
      const byDate = new Map();
      highest.forEach((h) => {
        if (!h.date) return;
        byDate.set(h.key, { date: h.date, label: h.key, highest: h.highest });
      });
  
      lowest.forEach((l) => {
        if (!l.date) return;
        if (!byDate.has(l.key)) {
          byDate.set(l.key, { date: l.date, label: l.key });
        }
        byDate.get(l.key).lowest = l.lowest;
      });
  
      let data = Array.from(byDate.values()).filter(
        (d) => d.date && d.lowest != null && d.highest != null
      );
  
      // Sort by date
      data.sort((a, b) => a.date - b.date);
  
      if (!data.length) return;
  
      // ---------------------------------------------------------
// 2. Chart setup
// ---------------------------------------------------------
const margin = { top: 80, right: 220, bottom: 200, left: 80 };
const outerWidth = 1020;
const outerHeight = 520;

const width = outerWidth - margin.left - margin.right;
const height = outerHeight - margin.top - margin.bottom;

const svg = container
  .append("svg")
  .attr("width", outerWidth)
  .attr("height", outerHeight);

const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

      // Scales
      const x = d3
        .scaleTime()
        .domain(d3.extent(data, (d) => d.date))
        .range([0, width]);
  
      const maxPrice = d3.max(data, (d) => Math.max(d.lowest, d.highest)) || 0;
      const y = d3
        .scaleLinear()
        .domain([0, maxPrice * 1.1])
        .nice()
        .range([height, 0]);

      // ---------------------------------------------------------
// 2.1 Find extremes (most expensive / cheapest)
// ---------------------------------------------------------
const maxHighestRow = d3.greatest(data, (d) => d.highest);
const minLowestRow = d3.least(data, (d) => d.lowest);

// Month ranges for shading (change to timeWeek if you prefer)
const expensiveStart = d3.timeMonth.floor(maxHighestRow.date);
const expensiveEnd   = d3.timeMonth.offset(expensiveStart, 1);

const cheapStart = d3.timeMonth.floor(minLowestRow.date);
const cheapEnd   = d3.timeMonth.offset(cheapStart, 1);

// ---------------------------------------------------------
// 2.2 Background highlights (behind everything)
// ---------------------------------------------------------
const highlightLayer = g.insert("g", ":first-child")
  .attr("class", "vis2-highlights")
  .style("pointer-events", "none");

highlightLayer.append("rect")
  .attr("x", x(expensiveStart))
  .attr("y", 0)
  .attr("width", Math.max(0, x(expensiveEnd) - x(expensiveStart)))
  .attr("height", height)
  .attr("fill", "#f97316")
  .attr("opacity", 0.08);

highlightLayer.append("rect")
  .attr("x", x(cheapStart))
  .attr("y", 0)
  .attr("width", Math.max(0, x(cheapEnd) - x(cheapStart)))
  .attr("height", height)
  .attr("fill", "#0ea5e9")
  .attr("opacity", 0.08);

  // ---------------------------------------------------------
// 2.3 Point markers + text callouts
// ---------------------------------------------------------
const anno = g.append("g")
.attr("class", "vis2-annotations")
.style("pointer-events", "none");

function addCallout({ x0, y0, text, color, dx = 14, dy = -14 }) {
  const pad = 8;

  // leader line (we'll update x2/y2 after we decide final label position)
  const leader = anno.append("line")
    .attr("x1", x0).attr("y1", y0)
    .attr("stroke", color)
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.9);

  const label = anno.append("g");

  const t = label.append("text")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .attr("dominant-baseline", "hanging")
    .text(text);

  // measure text box
  const tb = t.node().getBBox();

  // decide where to place it
  let tx = x0 + dx;
  let ty = y0 + dy;

  // if it would overflow right, flip to left
  // allow using the right margin space (gutter)
const rightGutter = margin.right - 20;   // how much of the right margin you want to allow
const maxX = width + rightGutter;        // instead of just width

  // if it would overflow left, clamp
  if (tx < 0) tx = 0;

  // if it would overflow bottom, move up
  if (ty + tb.height + pad > height) {
    ty = y0 - tb.height - 18;
  }
  // if it would overflow top, clamp
  if (ty < 0) ty = 0;

  // set label position
  label.attr("transform", `translate(${tx},${ty})`);

  // background rect behind text
  label.insert("rect", "text")
    .attr("x", tb.x - 6)
    .attr("y", tb.y - 4)
    .attr("width", tb.width + 12)
    .attr("height", tb.height + 8)
    .attr("rx", 6)
    .attr("fill", "white")
    .attr("stroke", color)
    .attr("stroke-width", 1)
    .attr("opacity", 0.95);

  // update leader to point to label corner-ish
  leader
    .attr("x2", tx)
    .attr("y2", ty);
}


// Most expensive day (highest max)
anno.append("circle")
.attr("cx", x(maxHighestRow.date))
.attr("cy", y(maxHighestRow.highest))
.attr("r", 7)
.attr("fill", "#f97316")
.attr("stroke", "white")
.attr("stroke-width", 2.5);

addCallout({
x0: x(maxHighestRow.date),
y0: y(maxHighestRow.highest),
color: "#f97316",
text: `Most expensive: $${maxHighestRow.highest.toLocaleString()} (${formatDate(maxHighestRow.date)})`,
dx: 14,
dy: -34
});

// Cheapest day (lowest min)
anno.append("circle")
.attr("cx", x(minLowestRow.date))
.attr("cy", y(minLowestRow.lowest))
.attr("r", 7)
.attr("fill", "#0ea5e9")
.attr("stroke", "white")
.attr("stroke-width", 2.5);

addCallout({
x0: x(minLowestRow.date),
y0: y(minLowestRow.lowest),
color: "#0ea5e9",
text: `Cheapest: $${minLowestRow.lowest.toLocaleString()} (${formatDate(minLowestRow.date)})`,
dx: 100,
dy: -18
});

  
      // Axes
      const xAxis = d3
        .axisBottom(x)
        .ticks(8)
        .tickFormat(d3.timeFormat("%b %Y"));
  
      const yAxis = d3
        .axisLeft(y)
        .ticks(8)
        .tickFormat((d) => `$${d}`);
  
      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);
  
      g.append("g").attr("class", "y-axis").call(yAxis);
  
      // Axis labels
      g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .text("Date");
  
      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .text("Ticket Price (CAD)");
  
      // Title (inside SVG, since your H2 is outside)
      g.append("text")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .attr("font-weight", "700")
        .text("Overview of Price Fluctuations");
  
      // Line generators
      const lineLowest = d3
        .line()
        .x((d) => x(d.date))
        .y((d) => y(d.lowest));
  
      const lineHighest = d3
        .line()
        .x((d) => x(d.date))
        .y((d) => y(d.highest));
  
      // Lines
      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#0ea5e9") // lowest
        .attr("stroke-width", 2.5)
        .attr("d", lineLowest);
  
      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#f97316") // highest
        .attr("stroke-width", 2.5)
        .attr("d", lineHighest);
  
      // Legend (outside plot, in right margin)
const legend = svg
.append("g")
.attr("transform", `translate(${margin.left + width + 20}, ${margin.top + 10})`);

legend.append("rect")
.attr("width", 12)
.attr("height", 12)
.attr("y", 0)
.attr("fill", "#0ea5e9");

legend.append("text")
.attr("x", 18)
.attr("y", 10)
.attr("font-size", 12)
.text("Lowest price");

legend.append("rect")
.attr("width", 12)
.attr("height", 12)
.attr("y", 22)
.attr("fill", "#f97316");

legend.append("text")
.attr("x", 18)
.attr("y", 32)
.attr("font-size", 12)
.text("Highest price");

  
      // ---------------------------------------------------------
      // 3. Tooltip
      // ---------------------------------------------------------
      const tooltip = container
        .append("div")
        .attr("class", "vis2-tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #cbd5f5")
        .style("border-radius", "6px")
        .style("padding", "12px 16px")
        .style("font-size", "14px")
        .style("line-height", "1.4")
        .style("box-shadow", "0 6px 18px rgba(15,23,42,0.18)")
        .style("pointer-events", "none")
        .style("display", "none")
        .style("z-index", 20);
  
      // Circles for hover (one set for lowest, one for highest)
      const pointRadius = 4;
  
      const allPoints = [
        ...data.map((d) => ({ ...d, type: "lowest" })),
        ...data.map((d) => ({ ...d, type: "highest" })),
      ];
  
      g.append("g")
        .selectAll("circle")
        .data(allPoints)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => y(d.type === "lowest" ? d.lowest : d.highest))
        .attr("r", pointRadius)
        .attr("fill", (d) => (d.type === "lowest" ? "#0ea5e9" : "#f97316"))
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
          const row = data.find((r) => r.date.getTime() === d.date.getTime());
          if (!row) return;
  
          const low = row.lowest.toLocaleString();
          const high = row.highest.toLocaleString();
  
          tooltip
            .style("display", "block")
            .html(
              `
            <div style="font-weight:700; font-size:15px; margin-bottom:6px;">
              ${formatDate(row.date)}
            </div>
            <div><b>Lowest price:</b> $${low}</div>
            <div><b>Highest price:</b> $${high}</div>
          `
            );
  
          d3.select(this).attr("r", pointRadius + 2);
          moveTooltip(event);
        })
        .on("mousemove", (event) => moveTooltip(event))
        .on("mouseleave", function () {
          tooltip.style("display", "none");
          d3.select(this).attr("r", pointRadius);
        });
  
      function moveTooltip(event) {
        const bounds = container.node().getBoundingClientRect();
        const xPos = event.clientX - bounds.left + 12;
        const yPos = event.clientY - bounds.top + 12;
  
        tooltip.style("left", `${xPos}px`).style("top", `${yPos}px`);
      }
    }
  })();

  
  
