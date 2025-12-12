// =============================================
// Gate B — overviewOverYear.js (SCROLLY VERSION)
// FIXED: Scoped to avoid global variable collisions
// =============================================

(() => {

  // ---------------------------------------------
  // STATE (LOCAL TO GATE B ONLY)
  // ---------------------------------------------
  let mergedData = [];

  let svg, width, height, margin;
  let x0, x1, y, xAxis, yAxis;
  let timeScale, brush, brushG;
  let sliderTrack, startPlane, endPlane;

  const planeSize = 30;
  const parseDate = d3.timeParse("%m/%d/%Y");

  const START_DATE = new Date("2025-11-01");
  const END_DATE   = new Date("2026-11-30");

  let isZoomed = false;

  // ---------------------------------------------
  // PUBLIC API (USED BY stepScrolling.js)
  // ---------------------------------------------
  window.zoomToDecember = function () {
    if (isZoomed || !timeScale) return;

    const start = new Date("2025-11-11");
    const end   = new Date("2025-12-31");

    svg.select(".custom-brush")
      .call(brush.move, [timeScale(start), timeScale(end)]);

    showAnnotation();
    isZoomed = true;
  };

  window.resetZoom = function () {
    if (!isZoomed || !timeScale) return;

    svg.select(".custom-brush")
      .call(brush.move, timeScale.range());

    hideAnnotation();
    isZoomed = false;
  };

  // ---------------------------------------------
  // INIT
  // ---------------------------------------------
  initDailyBarChart();

  async function initDailyBarChart() {
    const container = d3.select("#daily-bar-chart");
    container.html("");
    container.style("position", "relative");

    margin = { top: 30, right: 30, bottom: 90, left: 70 };
    width  = 1000 - margin.left - margin.right;
    height = 500  - margin.top  - margin.bottom;

    svg = container.append("svg")
      .attr("width",  width + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    await loadData();
    setupScales();
    drawAxes();
    drawLegend();
    drawBarsAnimated(mergedData);
    initBrush();
  }

  // ---------------------------------------------
  // DATA
  // ---------------------------------------------
  async function loadData() {
    const [highRaw, lowRaw] = await Promise.all([
      d3.csv("data/Flights_From_Vancouver_to_Toronto_HighestPrice_clean.csv"),
      d3.csv("data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv")
    ]);

    const byDate = new Map();

    highRaw.forEach(d => {
      byDate.set(d.date, {
        date: parseDate(d.date),
        label: d.date,
        highest: +d.price
      });
    });

    lowRaw.forEach(d => {
      if (byDate.has(d.date)) {
        byDate.get(d.date).lowest = +d.price;
      }
    });

    mergedData = Array.from(byDate.values())
      .filter(d => d.date)
      .sort((a, b) => a.date - b.date);
  }

  // ---------------------------------------------
  // SCALES & AXES
  // ---------------------------------------------
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
      .tickValues(mergedData.filter((_, i) => i % 7 === 0).map(d => d.label));

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(-65)")
      .attr("text-anchor", "end");

    yAxis = d3.axisLeft(y).ticks(10);
    svg.append("g").call(yAxis);
  }

  // ---------------------------------------------
  // BARS
  // ---------------------------------------------
  function drawBarsAnimated(data) {
    const groups = svg.selectAll(".day-group")
      .data(data, d => d.label);

    groups.exit().remove();

    const enter = groups.enter()
      .append("g")
      .attr("class", "day-group")
      .attr("transform", d => `translate(${x0(d.label)},0)`);

    const merged = enter.merge(groups);

    const bars = merged.selectAll("rect")
      .data(d => ["lowest","highest"].map(t => ({
        type: t,
        value: d[t],
        label: d.label
      })));

    bars.enter()
      .append("rect")
      .attr("x", d => x1(d.type))
      .attr("width", x1.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", d => d.type === "lowest" ? "#0ea5e9" : "#f97316")
      .on("mouseover", showTooltip)
      .on("mouseout", hideTooltip)
      .transition()
      .duration(400)
      .attr("y", d => y(d.value))
      .attr("height", d => height - y(d.value));

    bars
      .transition()
      .duration(400)
      .attr("x", d => x1(d.type))
      .attr("y", d => y(d.value))
      .attr("height", d => height - y(d.value));

    bars.exit().remove();
  }

  // ---------------------------------------------
  // TOOLTIP
  // ---------------------------------------------
  function showTooltip(event, d) {
    d3.select("body")
      .append("div")
      .attr("id", "bar-tooltip")
      .style("position", "absolute")
      .style("left", event.pageX + 12 + "px")
      .style("top",  event.pageY - 30 + "px")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "white")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .html(`
        <strong>${d.label}</strong><br>
        ${d.type === "lowest" ? "Lowest" : "Highest"}: $${d.value}
      `);
  }

  function hideTooltip() {
    d3.select("#bar-tooltip").remove();
  }

  // ---------------------------------------------
  // BRUSH
  // ---------------------------------------------
  function initBrush() {
    brush = d3.brushX()
      .extent([[0,0],[width,40]])
      .on("brush end", brushed);

    brushG = svg.append("g")
      .attr("class", "custom-brush")
      .attr("transform", "translate(0,-50)")
      .call(brush);

    brushG.selectAll(".handle").remove();

    sliderTrack = brushG.append("rect")
      .attr("y",10)
      .attr("height",20)
      .attr("width",width)
      .attr("fill","#ddd");

    startPlane = brushG.append("image")
      .attr("href","assets/airplane.png")
      .attr("width",planeSize)
      .attr("height",planeSize)
      .attr("y",5);

    endPlane = brushG.append("image")
      .attr("href","assets/airplane.png")
      .attr("width",planeSize)
      .attr("height",planeSize)
      .attr("y",5);

    brushG.call(brush.move, timeScale.range());
  }

  function brushed(event) {
    const [a,b] = event.selection ?? timeScale.range();
    sliderTrack.attr("x",a).attr("width",b-a);
    startPlane.attr("x", a - planeSize/2);
    endPlane.attr("x", b - planeSize/2);

    const start = timeScale.invert(a);
    const end   = timeScale.invert(b);

    drawBarsAnimated(
      mergedData.filter(d => d.date >= start && d.date <= end)
    );
  }

  // ---------------------------------------------
  // ANNOTATION
  // ---------------------------------------------
  function showAnnotation() {
    if (document.getElementById("gateB-annotation")) return;

    d3.select("#daily-bar-chart")
      .append("div")
      .attr("id","gateB-annotation")
      .style("position","absolute")
      .style("top","10px")
      .style("left","10px")
      .style("background","rgba(255,255,255,0.9)")
      .style("padding","12px 16px")
      .style("border-radius","8px")
      .html(`
        <strong>December Price Pattern</strong><br>
        Ticket prices fluctuate significantly through December 2025.
      `);
  }

  function hideAnnotation() {
    d3.select("#gateB-annotation").remove();
  }

  function drawLegend() {
    const l = svg.append("g").attr("transform",`translate(${width-150},10)`);
    l.append("rect").attr("width",12).attr("height",12).attr("fill","#0ea5e9");
    l.append("text").attr("x",18).attr("y",10).text("Lowest");
    l.append("rect").attr("y",22).attr("width",12).attr("height",12).attr("fill","#f97316");
    l.append("text").attr("x",18).attr("y",32).text("Highest");
  }

})();
