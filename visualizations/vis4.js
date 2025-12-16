(() => {
  // =====================================
  // vis4.js — Week-of-Month Price Trend
  // Cheapest vs Most Expensive Flights
  // + Axis labels + Insight annotation box
  // + Auto highlights for key weeks
  // =====================================

  const V4_LOWEST_CSV =
    "data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv";
  const V4_HIGHEST_CSV =
    "data/Flights_From_Vancouver_to_Toronto_HighestPrice_clean.csv";

  const V4_WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

  // More bottom space for the annotation box
  const V4_margin = { top: 40, right: 190, bottom: 180, left: 80 };
  const V4_width = 1000 - V4_margin.left - V4_margin.right;
  const V4_height = 420 - V4_margin.top - V4_margin.bottom;

  const container = d3.select("#chart-weekly");

  if (container.empty()) {
    console.error("❌ vis4.js: #chart-weekly not found in HTML");
    return;
  }

  // IMPORTANT: clear old render if any
  container.selectAll("*").remove();
  container.style("position", "relative");

  const svgRoot = container
    .append("svg")
    .attr("width", V4_width + V4_margin.left + V4_margin.right)
    .attr("height", V4_height + V4_margin.top + V4_margin.bottom);

  const svg = svgRoot
    .append("g")
    .attr("transform", `translate(${V4_margin.left},${V4_margin.top})`);

  const tooltip = container
    .append("div")
    .style("position", "absolute")
    .style("background", "#ffffff")
    .style("border", "1px solid #111")
    .style("padding", "10px 14px")
    .style("border-radius", "6px")
    .style("font-size", "14px")
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
    .style("pointer-events", "none")
    .style("display", "none");

  function parseDateSafe(value) {
    if (!value) return null;
    const cleaned = String(value).trim();
    const parsed = d3.timeParse("%m/%d/%Y")(cleaned);
    return parsed || new Date(cleaned);
  }

  Promise.all([d3.csv(V4_LOWEST_CSV), d3.csv(V4_HIGHEST_CSV)])
    .then(([lowestRaw, highestRaw]) => {
      function process(raw, type) {
        return raw
          .map((d) => {
            const date = parseDateSafe(d.date);
            const price = +d.price;
            if (!date || isNaN(price)) return null;

            const week = Math.ceil(date.getDate() / 7); // 1–5
            return { week, price, type };
          })
          .filter(Boolean);
      }

      const combined = [
        ...process(lowestRaw, "lowest"),
        ...process(highestRaw, "highest"),
      ];

      if (combined.length === 0) {
        console.error(
          "❌ vis4.js: No valid rows after parsing. Check date format/paths."
        );
        return;
      }

      const grouped = d3.rollups(
        combined,
        (v) => d3.mean(v, (d) => d.price),
        (d) => d.week,
        (d) => d.type
      );

      const data = grouped
        .map(([week, values]) => {
          const row = { week, lowest: null, highest: null };
          values.forEach(([type, avg]) => {
            row[type] = avg;
          });
          return row;
        })
        .sort((a, b) => a.week - b.week);

      draw(data);
    })
    .catch((err) => {
      console.error("❌ vis4.js: CSV load failed:", err);
    });

  function draw(data) {
    const x0 = d3
      .scaleBand()
      .domain(data.map((d) => V4_WEEK_LABELS[d.week - 1]))
      .range([0, V4_width])
      .padding(0.25);

    const x1 = d3
      .scaleBand()
      .domain(["lowest", "highest"])
      .range([0, x0.bandwidth()])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(data, (d) => Math.max(d.lowest ?? 0, d.highest ?? 0)) || 0,
      ])
      .nice()
      .range([V4_height, 0]);

    // Axes
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${V4_height})`)
      .call(d3.axisBottom(x0).tickSizeOuter(0));

    svg
      .append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(8).tickFormat((d) => `$${d}`));

    // Axis labels
    svg
      .append("text")
      .attr("x", V4_width / 2)
      .attr("y", V4_height + 55)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .text("Week of Month");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -V4_height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .text("Average Ticket Price (CAD)");

    // Bars
    const groups = svg
      .selectAll(".v4-week-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "v4-week-group")
      .attr("transform", (d) =>
        `translate(${x0(V4_WEEK_LABELS[d.week - 1])},0)`
      );

    const bars = groups
      .selectAll("rect")
      .data((d) => [
        {
          week: d.week,
          type: "lowest",
          value: d.lowest,
          label: V4_WEEK_LABELS[d.week - 1],
        },
        {
          week: d.week,
          type: "highest",
          value: d.highest,
          label: V4_WEEK_LABELS[d.week - 1],
        },
      ])
      .enter()
      .append("rect")
      .attr("class", (d) => `v4-bar v4-${d.type}`)
      .attr("x", (d) => x1(d.type))
      .attr("y", (d) => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => V4_height - y(d.value))
      .attr("fill", (d) => (d.type === "lowest" ? "#3b82f6" : "#f97316"))
      .on("mouseenter", (event, d) => {
        tooltip
          .style("display", "block")
          .html(
            `
            <strong>${d.label}</strong><br/>
            ${d.type === "lowest" ? "Cheapest (avg)" : "Most expensive (avg)"}: $${d.value.toFixed(0)}
          `
          );

        moveTooltip(event);
      })
      .on("mousemove", (event) => moveTooltip(event))
      .on("mouseleave", () => tooltip.style("display", "none"));

    function moveTooltip(event) {
      const bounds = container.node().getBoundingClientRect();
      const xPos = event.clientX - bounds.left + 12;
      const yPos = event.clientY - bounds.top + 12;
      tooltip.style("left", `${xPos}px`).style("top", `${yPos}px`);
    }

    // Legend (in the right margin area)
    const legend = svgRoot
      .append("g")
      .attr(
        "transform",
        `translate(${V4_margin.left + V4_width + 20}, ${V4_margin.top + 10})`
      );

    legend
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", "#3b82f6");
    legend
      .append("text")
      .attr("x", 18)
      .attr("y", 11)
      .attr("font-size", 12)
      .text("Cheapest Price");

    legend
      .append("rect")
      .attr("y", 22)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", "#f97316");
    legend
      .append("text")
      .attr("x", 18)
      .attr("y", 33)
      .attr("font-size", 12)
      .text("Most Expensive Price");

    // ================================
    // Annotations (bottom insight box)
    // ================================
    const maxExp = d3.greatest(data.filter(d => d.highest != null), (d) => d.highest);
    const minCheap = d3.least(data.filter(d => d.lowest != null), (d) => d.lowest);

    // Highlight those bars with strokes
    bars
      .filter((d) => d.type === "highest" && maxExp && d.week === maxExp.week)
      .attr("stroke", "#111")
      .attr("stroke-width", 2.5);

    bars
      .filter((d) => d.type === "lowest" && minCheap && d.week === minCheap.week)
      .attr("stroke", "#111")
      .attr("stroke-width", 2.5);

    // Bottom annotation box (uses margin.bottom space)
    const notes = svg
      .append("g")
      .attr("class", "v4-annotation-box")
      .attr("transform", `translate(0, ${V4_height +110})`)
      .style("pointer-events", "none");

    notes
      .append("rect")
      .attr("x", 0)
      .attr("y", -28)
      .attr("width", V4_width)
      .attr("height", 90)
      .attr("rx", 10)
      .attr("fill", "white")
      .attr("opacity", 0.92);

    const spikeText =
      maxExp
        ? `Biggest spike: ${V4_WEEK_LABELS[maxExp.week - 1]} has the highest “Most Expensive” average (~$${maxExp.highest.toFixed(0)}).`
        : `Biggest spike: (not available)`;

    const cheapText =
      minCheap
        ? `Cheapest week on average: ${V4_WEEK_LABELS[minCheap.week - 1]} (~$${minCheap.lowest.toFixed(0)}).`
        : `Cheapest week on average: (not available)`;

    notes
      .append("text")
      .attr("x", 12)
      .attr("y", -4)
      .attr("font-size", 13)
      .attr("font-weight", 700)
      .text(spikeText);

    notes
      .append("text")
      .attr("x", 12)
      .attr("y", 18)
      .attr("font-size", 13)
      .text(cheapText);

    notes
      .append("text")
      .attr("x", 12)
      .attr("y", 38)
      .attr("font-size", 13)
      .text("Takeaway: cheap deals stay fairly similar across weeks, but mid-month can have higher premium-price risk.");
  }
})();
