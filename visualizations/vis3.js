// ================================
// vis3.js — Monthly Cheapest Flight Prices (Box Plot)
// Adds axis labels + callout annotations (cheapest vs most expensive month)
// ================================

document.addEventListener("DOMContentLoaded", () => {
  const CSV_PATH =
    "data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv";
  const parseDate = d3.timeParse("%m/%d/%Y");

  // Order to match your screenshot (Nov -> Oct)
  const MONTH_ORDER = [
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
  ];

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Give a bit more room for labels + callouts
  const margin = { top: 30, right: 40, bottom: 75, left: 80 };
  const width = 900 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const container = d3.select("#monthly-boxplot");
  if (container.empty()) {
    console.error("❌ vis3.js: #monthly-boxplot not found");
    return;
  }

  container.style("position", "relative");

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Tooltip
  const tooltip = container
    .append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #111")
    .style("padding", "10px 14px")
    .style("border-radius", "6px")
    .style("font-size", "14px")
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("z-index", 10);

  // ================================
  // Load & Prepare Data
  // ================================
  d3.csv(CSV_PATH).then((raw) => {
    const data = raw
      .map((d) => ({
        date: parseDate(d.date),
        price: +d.price,
      }))
      .filter((d) => d.date && d.price > 0);

    const byMonth = d3.group(data, (d) => d.date.getMonth());

    const boxData = Array.from(byMonth, ([month, values]) => {
      const prices = values.map((d) => d.price).sort(d3.ascending);
      return {
        month,
        monthName: MONTHS[month],
        q1: d3.quantile(prices, 0.25),
        median: d3.quantile(prices, 0.5),
        q3: d3.quantile(prices, 0.75),
        min: d3.min(prices),
        max: d3.max(prices),
      };
    });

    // Sort months to match the visual order (Nov -> Oct)
    boxData.sort(
      (a, b) =>
        MONTH_ORDER.indexOf(a.monthName) - MONTH_ORDER.indexOf(b.monthName)
    );

    drawBoxPlot(boxData);
  });

  // ================================
  // Draw Box Plot
  // ================================
  function drawBoxPlot(data) {
    // Scales
    const x = d3
      .scaleBand()
      .domain(MONTH_ORDER.filter((m) => data.some((d) => d.monthName === m)))
      .range([0, width])
      .padding(0.45);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.max)])
      .nice()
      .range([height, 0]);

    // Axes
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));

    svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(8).tickFormat((d) => `$${d}`));

    // Axis labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 55)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .text("Month");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .text("Daily Lowest Ticket Price (CAD)");

    // Boxes
    svg.selectAll(".box")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "box")
      .attr("x", (d) => x(d.monthName))
      .attr("y", (d) => y(d.q3))
      .attr("width", x.bandwidth())
      .attr("height", (d) => Math.max(0, y(d.q1) - y(d.q3)))
      .attr("fill", "#60a5fa")
      .on("mouseenter", (event, d) => {
        tooltip
          .style("display", "block")
          .html(`
            <strong>${d.monthName}</strong><br>
            Median: $${d.median.toFixed(0)}<br>
            Cheapest: $${d.min.toFixed(0)}<br>
            Most expensive: $${d.max.toFixed(0)}
          `);
      })
      .on("mousemove", (event) => {
        const box = container.node().getBoundingClientRect();
        tooltip
          .style("left", event.clientX - box.left + 16 + "px")
          .style("top", event.clientY - box.top - 12 + "px");
      })
      .on("mouseleave", () => tooltip.style("display", "none"));

    // Median line
    svg.selectAll(".median")
      .data(data)
      .enter()
      .append("line")
      .attr("class", "median")
      .attr("x1", (d) => x(d.monthName))
      .attr("x2", (d) => x(d.monthName) + x.bandwidth())
      .attr("y1", (d) => y(d.median))
      .attr("y2", (d) => y(d.median))
      .attr("stroke", "#111")
      .attr("stroke-width", 2);

    // Whiskers
    svg.selectAll(".whisker")
      .data(data)
      .enter()
      .append("line")
      .attr("class", "whisker")
      .attr("x1", (d) => x(d.monthName) + x.bandwidth() / 2)
      .attr("x2", (d) => x(d.monthName) + x.bandwidth() / 2)
      .attr("y1", (d) => y(d.min))
      .attr("y2", (d) => y(d.max))
      .attr("stroke", "#111");

    // ================================
    // Callout annotations (like vis2)
    // ================================
    const cheapestMonth = d3.least(data, (d) => d.median);
    const expensiveMonth = d3.greatest(data, (d) => d.median);

    const anno = svg.append("g")
      .attr("class", "vis3-annotations")
      .style("pointer-events", "none");

    function addCallout({ x0, y0, text, color, dx = 18, dy = -30 }) {
      anno.append("line")
        .attr("x1", x0).attr("y1", y0)
        .attr("x2", x0 + dx).attr("y2", y0 + dy)
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.9);

      const label = anno.append("g")
        .attr("transform", `translate(${x0 + dx},${y0 + dy})`);

      label.append("text")
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("dominant-baseline", "hanging")
        .text(text);

      const bbox = label.node().getBBox();
      label.insert("rect", "text")
        .attr("x", bbox.x - 6)
        .attr("y", bbox.y - 4)
        .attr("width", bbox.width + 12)
        .attr("height", bbox.height + 8)
        .attr("rx", 6)
        .attr("fill", "white")
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .attr("opacity", 0.95);
    }

    function medianPoint(d) {
      return {
        cx: x(d.monthName) + x.bandwidth() / 2,
        cy: y(d.median),
      };
    }

    // Cheapest month (lowest median)
    {
      const p = medianPoint(cheapestMonth);

      anno.append("circle")
        .attr("cx", p.cx)
        .attr("cy", p.cy)
        .attr("r", 6.5)
        .attr("fill", "#0ea5e9")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      addCallout({
        x0: p.cx,
        y0: p.cy,
        color: "#0ea5e9",
        text: `Cheapest month: ${cheapestMonth.monthName} (median ~$${cheapestMonth.median.toFixed(0)})`,
        dx: 18,
        dy: 12,
      });
    }

    // Most expensive month (highest median)
    {
      const p = medianPoint(expensiveMonth);

      anno.append("circle")
        .attr("cx", p.cx)
        .attr("cy", p.cy)
        .attr("r", 6.5)
        .attr("fill", "#f97316")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      addCallout({
        x0: p.cx,
        y0: p.cy,
        color: "#f97316",
        text: `Most expensive month: ${expensiveMonth.monthName} (median ~$${expensiveMonth.median.toFixed(0)})`,
        dx: 18,
        dy: -44,
      });
    }
  }
});
