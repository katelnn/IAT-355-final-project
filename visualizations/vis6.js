// =====================================
// vis6.js — Ticket Prices by Time of Day (Scatterplot)
// Cheapest vs Most Expensive
// Tuned typography: smaller + less bold (title, legend, callouts)
// =====================================

(function () {
  const LOWEST_CSV = "data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv";
  const HIGHEST_CSV = "data/Flights_From_Vancouver_to_Toronto_HighestPrice_clean.csv";

  const container = d3.select("#chart-tod");
  if (container.empty()) {
    console.error("❌ #chart-tod not found");
    return;
  }

  container.selectAll("*").remove();
  container.style("position", "relative");

  // Room on the RIGHT for legend + the “Lowest …” callout
  const margin = { top: 78, right: 260, bottom: 75, left: 90 };
  const width = 900 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = container
    .append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #ddd")
    .style("padding", "8px 12px")
    .style("border-radius", "8px")
    .style("font-size", "13px")
    .style("box-shadow", "0 6px 18px rgba(15,23,42,0.15)")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // ---------- Helpers ----------
  function parseHour(timeStr) {
    if (!timeStr) return null;
    const cleaned = String(timeStr).trim().toLowerCase();
    const parts = cleaned.split(":").map(Number);

    if (parts.length >= 1 && !isNaN(parts[0])) {
      const h = parts[0];
      const m = !isNaN(parts[1]) ? parts[1] : 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h + m / 60;
    }

    const d = new Date(cleaned);
    if (!isNaN(d)) return d.getHours() + d.getMinutes() / 60;

    return null;
  }

  function formatHourLabel(h) {
    if (h === 0) return "12am";
    if (h < 12) return `${h}am`;
    if (h === 12) return "12pm";
    return `${h - 12}pm`;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // ---------- Load Data ----------
  Promise.all([d3.csv(LOWEST_CSV, d3.autoType), d3.csv(HIGHEST_CSV, d3.autoType)])
    .then(([lowestRaw, highestRaw]) => {
      function process(raw, type) {
        return raw
          .map((d) => {
            const hour = parseHour(d.depart_time);
            const price = +d.price;
            if (hour === null || isNaN(price)) return null;
            return { hour, price, type };
          })
          .filter(Boolean);
      }

      const data = [...process(lowestRaw, "lowest"), ...process(highestRaw, "highest")];
      if (!data.length) return;

      drawScatter(data);
    })
    .catch((err) => console.error("❌ vis6.js: CSV load failed:", err));

  // ---------- Draw Scatterplot ----------
  function drawScatter(data) {
    const lowestOnly = data.filter((d) => d.type === "lowest");
    const highestOnly = data.filter((d) => d.type === "highest");

    const minLowest = d3.least(lowestOnly, (d) => d.price);
    const maxHighest = d3.greatest(highestOnly, (d) => d.price);

    const x = d3.scaleLinear().domain([0, 23]).range([0, width]);
    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(data, (d) => d.price) || 0) * 1.05])
      .nice()
      .range([height, 0]);

    // ------------------------------
    // Background highlights (behind points)
    // ------------------------------
    const highlightLayer = g
      .append("g")
      .attr("class", "vis6-highlights")
      .style("pointer-events", "none");

    highlightLayer
      .append("rect")
      .attr("x", x(7))
      .attr("y", 0)
      .attr("width", x(11) - x(7))
      .attr("height", height)
      .attr("fill", "#f97316")
      .attr("opacity", 0.07);

    highlightLayer
      .append("rect")
      .attr("x", x(22))
      .attr("y", 0)
      .attr("width", x(23) - x(22) + 12)
      .attr("height", height)
      .attr("fill", "#38bdf8")
      .attr("opacity", 0.06);

    // ------------------------------
    // Axes
    // ------------------------------
    const xAxis = d3
      .axisBottom(x)
      .tickValues(d3.range(0, 24, 2))
      .tickFormat(formatHourLabel);

    const yAxis = d3.axisLeft(y).ticks(8).tickFormat((d) => `$${d}`);

    g.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
    g.append("g").call(yAxis);

    // Axis labels
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + 58)
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
      .attr("font-weight", 600)
      .text("Departure Time");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -65)
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
      .attr("font-weight", 600)
      .text("Ticket Price (CAD)");

    // Title (smaller + less bold)
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .attr("font-size", 22)
      .attr("font-weight", 700)
      .text("Ticket Prices by Time of Day");

    // ------------------------------
    // Points
    // ------------------------------
    g.selectAll(".price-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "price-point")
      .attr("cx", (d) => x(d.hour))
      .attr("cy", (d) => y(d.price))
      .attr("r", 6)
      .attr("fill", (d) => (d.type === "lowest" ? "#38bdf8" : "#fb923c"))
      .attr("opacity", 0.85)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.2)
      .on("mouseenter", (event, d) => {
        tooltip
          .html(
            `
            <div style="font-weight:800; margin-bottom:4px;">
              ${d.type === "lowest" ? "Cheapest" : "Most Expensive"}
            </div>
            <div><b>Time:</b> ${formatHourLabel(Math.floor(d.hour))}</div>
            <div><b>Price:</b> $${d.price.toLocaleString()}</div>
          `
          )
          .style("opacity", 1);
      })
      .on("mousemove", (event) => {
        const box = container.node().getBoundingClientRect();
        tooltip
          .style("left", event.clientX - box.left + 12 + "px")
          .style("top", event.clientY - box.top - 12 + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    // ------------------------------
    // Legend (smaller text)
    // ------------------------------
    const legend = g.append("g").attr("transform", `translate(${width + 40}, 70)`);

    legend.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 7).attr("fill", "#38bdf8");
    legend.append("text").attr("x", 16).attr("y", 5).attr("font-size", 18).attr("font-weight", 500).text("Cheapest");

    legend.append("circle").attr("cx", 0).attr("cy", 30).attr("r", 7).attr("fill", "#fb923c");
    legend.append("text").attr("x", 16).attr("y", 35).attr("font-size", 18).attr("font-weight", 500).text("Most Expensive");

    // ------------------------------
    // Annotations (smaller + less bold)
    // ------------------------------
    const anno = g.append("g").attr("class", "vis6-annotations").style("pointer-events", "none");

    function addCalloutAt({ x0, y0, xLabel, yLabel, text, color }) {
      anno.append("line")
        .attr("x1", x0).attr("y1", y0)
        .attr("x2", xLabel).attr("y2", yLabel)
        .attr("stroke", color)
        .attr("stroke-width", 1.4)
        .attr("opacity", 0.95);

      const tag = anno.append("g").attr("transform", `translate(${xLabel},${yLabel})`);

      tag.append("text")
        .attr("font-size", 12.5)
        .attr("font-weight", 600)
        .attr("dominant-baseline", "middle")
        .text(text);

      const bbox = tag.node().getBBox();
      const pillR = (bbox.height + 12) / 2;

      tag.insert("rect", "text")
        .attr("x", bbox.x - 10)
        .attr("y", bbox.y - 6)
        .attr("width", bbox.width + 20)
        .attr("height", bbox.height + 12)
        .attr("rx", pillR)
        .attr("fill", "white")
        .attr("stroke", color)
        .attr("stroke-width", 1.1)
        .attr("opacity", 0.96);
    }

    // Morning label (above plot)
    {
      const x0 = (x(7) + x(11)) / 2;
      const y0 = 10;
      addCalloutAt({
        x0,
        y0,
        xLabel: x(7) + 14,
        yLabel: -18,
        color: "#f97316",
        text: "Morning (7–11am): pricier cluster",
      });
    }

    // Peak label
    if (maxHighest) {
      const px = x(maxHighest.hour);
      const py = y(maxHighest.price);

      anno.append("circle")
        .attr("cx", px).attr("cy", py)
        .attr("r", 8.5)
        .attr("fill", "#fb923c")
        .attr("stroke", "white")
        .attr("stroke-width", 3);

      addCalloutAt({
        x0: px,
        y0: py,
        xLabel: clamp(px + 42, 40, width - 10),
        yLabel: clamp(py - 26, 20, height - 20),
        color: "#f97316",
        text: `Peak: $${maxHighest.price.toLocaleString()} (${formatHourLabel(Math.floor(maxHighest.hour))})`,
      });
    }

    // Lowest label (in right margin)
    if (minLowest) {
      const lx = x(minLowest.hour);
      const ly = y(minLowest.price);

      anno.append("circle")
        .attr("cx", lx).attr("cy", ly)
        .attr("r", 8.5)
        .attr("fill", "#38bdf8")
        .attr("stroke", "white")
        .attr("stroke-width", 3);

      addCalloutAt({
        x0: lx,
        y0: ly,
        xLabel: width + 40,
        yLabel: clamp(ly + 10, 20, height - 20),
        color: "#38bdf8",
        text: `Lowest: $${minLowest.price.toLocaleString()} (${formatHourLabel(Math.floor(minLowest.hour))})`,
      });
    }
  }
})();
