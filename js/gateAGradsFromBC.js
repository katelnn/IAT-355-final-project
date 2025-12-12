// =============================================================
// Gate A — Ontario undergrads by origin (Canada Map + Line Chart)
// Interactions:
// 1) Map click selects province -> updates line chart
// 2) Line chart shows circular points; hover point -> annotation box (disappears on mouseleave)
// 3) When #gateA is in focus -> auto-select BC + show selection "animation"
// 4) BC 2021 callout (circle + text) appears only for BC, disappears when another province selected
// =============================================================

// ----------------------------
// Config
// ----------------------------
const CSV_PATH = "data/number_of_undergrads_graduates_in_ontario.csv";
const YEARS = ["2012","2013","2014","2015","2016","2017","2018","2019","2020","2021"];

const PROVINCE_KEY_MAP = {
  "Newfoundland and Labrador, origin": "ca-nl",
  "Prince Edward Island, origin": "ca-pe",
  "Nova Scotia, origin": "ca-ns",
  "New Brunswick, origin": "ca-nb",
  "Quebec, origin": "ca-qc",
  "Ontario, origin": "ca-on",
  "Manitoba, origin": "ca-mb",
  "Saskatchewan, origin": "ca-sk",
  "Alberta, origin": "ca-ab",
  "British Columbia, origin": "ca-bc",
  "Territories, origin": "ca-yt"
};

const BC_NAME = "British Columbia, origin";
const BC_YEAR_HIGHLIGHT = 2021;

const CHART_W = 480;
const CHART_H = 400;
const M = { top: 30, right: 20, bottom: 40, left: 60 };

// ----------------------------
// State
// ----------------------------
let regionSeries = [];      // [{ name, share:[{year,value,count,total}] }]
let mapChart = null;        // Highcharts instance

let svg, g;
let xScale, yScale, lineGen;
let innerW, innerH;

let currentRegionName = "ALL";
let bcPoint2021 = null;     // Data point object for BC 2021

// Hover annotation DOM (disappears on mouseleave)
let hoverBox = null;

// BC callout on chart (SVG group; persists while BC selected)
let bcCalloutLayer = null;

// Gate A focus observer
let gateAObserver = null;

// ----------------------------
// Boot
// ----------------------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadOntarioData();

  // Cache the BC 2021 datapoint for the callout
  const bcSeries = regionSeries.find(r => r.name === BC_NAME);
  bcPoint2021 = bcSeries ? bcSeries.share.find(d => d.year === BC_YEAR_HIGHLIGHT) : null;

  initLineChart();
  await initCanadaMap();

  // Start on ALL (chart visible + points visible)
  setRegion("ALL", { fromAuto: false });

  // Auto-select BC when #gateA enters focus
  setupGateAFocusAutoSelect();
});

// =============================================================
// Data loader
// =============================================================
async function loadOntarioData() {
  const raw = await d3.csv(CSV_PATH, d3.autoType);
  if (!raw || raw.length === 0) {
    console.error("Gate A: CSV missing or empty:", CSV_PATH);
    return;
  }

  const locationField = "Location of residence at the time of admission";

  // Totals by year for share calculation
  const totalsByYear = {};
  YEARS.forEach(y => {
    totalsByYear[y] = d3.sum(raw, row => (typeof row[y] === "number" ? row[y] : 0));
  });

  regionSeries = raw
    .filter(row => row[locationField] !== "Ontario, origin") // exclude Ontario origin
    .map(row => {
      const name = row[locationField];

      const share = YEARS.map(y => {
        const year = +y;
        const count = typeof row[y] === "number" ? row[y] : 0;
        const total = totalsByYear[y] || 0;
        const value = total > 0 ? (count / total) : 0;

        return { year, value, count, total, name };
      });

      return { name, share };
    });
}

// =============================================================
// Line chart (D3)
// =============================================================
function initLineChart() {
  const container = d3.select("#bc-share-chart");
  container.html("");
  container.style("position", "relative"); // for hoverBox absolute positioning

  // Hover annotation box (DOM overlay)
  hoverBox = container
    .append("div")
    .attr("class", "bc-hover-annotation")
    .style("position", "absolute")
    .style("top", "10px")
    .style("left", "10px")
    .style("display", "none")
    .style("background", "#fff")
    .style("border", "1px solid #111")
    .style("box-shadow", "0 6px 18px rgba(0,0,0,0.12)")
    .style("padding", "14px 16px")
    .style("font-size", "18px")
    .style("line-height", "1.35")
    .style("z-index", 5);

  svg = container.append("svg")
    .attr("width", CHART_W)
    .attr("height", CHART_H);

  g = svg.append("g")
    .attr("transform", `translate(${M.left},${M.top})`);

  innerW = CHART_W - M.left - M.right;
  innerH = CHART_H - M.top - M.bottom;

  xScale = d3.scaleLinear()
    .domain(d3.extent(YEARS, d => +d))
    .range([0, innerW]);

  const maxSingle = d3.max(regionSeries, r => d3.max(r.share, d => d.value)) || 0;
  // Provide headroom so points aren’t squashed
  const maxShare = Math.max(maxSingle, 0.02);

  yScale = d3.scaleLinear()
    .domain([0, maxShare * 1.15])
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).tickFormat(d3.format(".1%")));

  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 32)
    .attr("text-anchor", "middle")
    .text("Graduation Year");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("Share of Ontario undergrads");

  lineGen = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value));

  // layers
  g.append("path").attr("class", "bc-line").attr("fill", "none");
  g.append("g").attr("class", "bc-points");
  bcCalloutLayer = g.append("g").attr("class", "bc-callout-layer");
}

function setRegion(name, opts = { fromAuto: false }) {
  currentRegionName = name;

  // Clear any callouts when changing region away from BC
  if (name !== BC_NAME) clearBCCallout();

  // Clear hover annotation on region change
  hideHoverAnnotation();

  const dataToPlot = getSeriesForRegion(name);

  // line
  g.select(".bc-line")
    .datum(dataToPlot)
    .transition()
    .duration(600)
    .attr("stroke", name === "ALL" ? "#9aa5b1" : "#1e88e5")
    .attr("stroke-width", name === "ALL" ? 1.8 : 2.6)
    .attr("d", lineGen);

  // points (always visible)
  const pts = g.select(".bc-points")
    .selectAll("circle")
    .data(dataToPlot, d => d.year);

  pts.enter()
    .append("circle")
    .attr("class", "bc-point")
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.value))
    .attr("r", 0)
    .attr("fill", name === "ALL" ? "#9aa5b1" : "#1e88e5")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.2)
    .style("cursor", name === "ALL" ? "default" : "pointer")
    .on("mouseenter", (event, d) => {
      if (currentRegionName === "ALL") return; // no hover annotation in ALL mode
      d3.select(event.currentTarget).attr("r", 7).attr("stroke-width", 2.2);
      showHoverAnnotation(event, d);
    })
    .on("mousemove", (event, d) => {
      if (currentRegionName === "ALL") return;
      moveHoverAnnotation(event);
    })
    .on("mouseleave", (event) => {
      if (currentRegionName === "ALL") return;
      d3.select(event.currentTarget).attr("r", 5).attr("stroke-width", 1.2);
      hideHoverAnnotation();
    })
    .merge(pts)
    .transition()
    .duration(600)
    .attr("fill", name === "ALL" ? "#9aa5b1" : "#1e88e5")
    .style("cursor", name === "ALL" ? "default" : "pointer")
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.value))
    .attr("r", name === "ALL" ? 3.5 : 5);

  pts.exit().remove();

  // If BC selected, show the 2021 callout
  if (name === BC_NAME) {
    showBCCallout();
  }
}

function getSeriesForRegion(name) {
  if (name === "ALL") {
    // Aggregate shares across origins (not super meaningful, but keeps chart populated)
    return YEARS.map(y => {
      const year = +y;
      const sumShare = regionSeries.reduce((acc, r) => {
        const v = r.share.find(d => d.year === year);
        return acc + (v ? v.value : 0);
      }, 0);
      return { year, value: sumShare, count: null, total: null, name: "ALL" };
    });
  }

  const r = regionSeries.find(r => r.name === name);
  return r ? r.share : [];
}

// ----------------------------
// Hover annotation (disappears on mouseleave)
// ----------------------------
function showHoverAnnotation(event, d) {
  if (!hoverBox) return;

  const pct = (d.value * 100).toFixed(2);
  const regionPretty = (d.name || "").replace(", origin", "");

  // Match your screenshot-style content
  hoverBox.html(`
    <div style="font-size: 17px; font-weight: 800; margin-bottom: 14px;">
      ${regionPretty}
    </div>
    <div><strong>Year:</strong> ${d.year}</div>
    <div><strong>Students from ${regionPretty} in Ontario:</strong> ${d.count?.toLocaleString?.() ?? "—"}</div>
    <div><strong>Total Students in Ontario:</strong> ${d.total?.toLocaleString?.() ?? "—"}</div>
    <div><strong>Percentage:</strong> ${pct}%</div>
  `);

  hoverBox.style("display", "block");
  moveHoverAnnotation(event);
}

function moveHoverAnnotation(event) {
  if (!hoverBox) return;
  const container = document.querySelector("#bc-share-chart");
  if (!container) return;

  const box = container.getBoundingClientRect();
  const x = event.clientX - box.left + 16;
  const y = event.clientY - box.top + 16;

  hoverBox.style("left", `${x}px`).style("top", `${y}px`);
}

function hideHoverAnnotation() {
  if (!hoverBox) return;
  hoverBox.style("display", "none");
}

// ----------------------------
// BC 2021 Callout (circle + text) — persists only while BC selected
// ----------------------------
function showBCCallout() {
  if (!bcCalloutLayer || !bcPoint2021) return;

  clearBCCallout();

  const x = xScale(bcPoint2021.year);
  const y = yScale(bcPoint2021.value);

  // highlight ring on the datapoint
  bcCalloutLayer.append("circle")
    .attr("class", "bc-callout")
    .attr("cx", x)
    .attr("cy", y)
    .attr("r", 10)
    .attr("fill", "rgba(255,255,255,0.35)")
    .attr("stroke", "#ff9800")
    .attr("stroke-width", 2);

  const text = `In 2021, ${(bcPoint2021.value * 100).toFixed(2)}% of Ontario graduates were originally from BC.`;

  const boxW = 230;
  const boxH = 70;
  const boxX = x - boxW - 10;
  const boxY = y - boxH - 10;

  const group = bcCalloutLayer.append("g")
    .attr("class", "bc-callout");

  group.append("rect")
    .attr("x", boxX)
    .attr("y", boxY)
    .attr("width", boxW)
    .attr("height", boxH)
    .attr("rx", 6)
    .attr("fill", "rgba(30, 136, 229, 0.95)")
    .attr("stroke", "#1e88e5");

  const t = group.append("text")
    .attr("x", boxX + 12)
    .attr("y", boxY + 22)
    .attr("fill", "#fff")
    .attr("font-size", "14px");

  wrapSvgText(t, boxW - 24, text);
}

function clearBCCallout() {
  if (!bcCalloutLayer) return;
  bcCalloutLayer.selectAll(".bc-callout").remove();
}

function wrapSvgText(textSel, width, fullText) {
  const words = fullText.split(/\s+/);
  let line = [];
  let lineNumber = 0;
  const lineHeight = 1.2;

  const x = +textSel.attr("x");
  const y = +textSel.attr("y");

  let tspan = textSel.text(null)
    .append("tspan")
    .attr("x", x)
    .attr("y", y);

  for (const w of words) {
    line.push(w);
    tspan.text(line.join(" "));
    if (tspan.node().getComputedTextLength() > width) {
      line.pop();
      tspan.text(line.join(" "));
      line = [w];
      tspan = textSel.append("tspan")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", `${(++lineNumber) * lineHeight}em`)
        .text(w);
    }
  }
}

// =============================================================
// Canada map (Highcharts)
// =============================================================
async function initCanadaMap() {
  if (typeof Highcharts === "undefined" || !Highcharts.mapChart) {
    console.error("Gate A: Highcharts Maps not loaded (highmaps.js missing).");
    return;
  }

  const topology = await fetch(
    "https://code.highcharts.com/mapdata/countries/ca/ca-all.topo.json"
  ).then(r => r.json());

  const mapData = regionSeries
    .map(r => {
      const key = PROVINCE_KEY_MAP[r.name];
      if (!key) return null;

      const avgShare = r.share.reduce((acc, d) => acc + d.value, 0) / r.share.length;
      return {
        "hc-key": key,
        value: avgShare,
        name: r.name.replace(", origin", ""),
        csvName: r.name
      };
    })
    .filter(Boolean);

  mapChart = Highcharts.mapChart("canada-map", {
    chart: { map: topology },
    title: { text: "Where do Ontario undergrads come from?" },
    subtitle: { text: "Click a province to view its trend in the line chart." },

    accessibility: { enabled: false }, // removes that warning (optional)

    mapNavigation: {
      enabled: true,
      buttonOptions: { verticalAlign: "bottom" }
    },

    colorAxis: {
      min: 0,
      labels: { format: "{value:.2f}" }
    },

    tooltip: {
      pointFormat:
        "<b>{point.name}</b><br/>Avg share of Ontario grads: <b>{point.value:.2%}</b>"
    },

    series: [{
      data: mapData,
      name: "Avg share of Ontario undergrads",
      joinBy: "hc-key",
      allowPointSelect: true,
      states: {
        select: { color: "#BADA55", borderWidth: 1 }
      },
      dataLabels: {
        enabled: true,
        format: "{point.name}",
        style: { fontSize: "9px" }
      },
      point: {
        events: {
          click: function () {
            // select clicked province (and unselect others)
            selectProvince(this.csvName, { fromAuto: false });
          }
        }
      }
    }]
  });
}

// Select province on map + update chart
function selectProvince(csvName, { fromAuto }) {
  if (!mapChart) return;

  // Unselect all others and select this one
  mapChart.series[0].points.forEach(p => {
    p.select(p.options.csvName === csvName, true);
  });

  // Small “animation”: briefly set hover state
  const pt = mapChart.series[0].points.find(p => p.options.csvName === csvName);
  if (pt) {
    pt.setState("hover");
    setTimeout(() => pt.setState(""), 500);
  }

  // Update chart
  setRegion(csvName, { fromAuto });

  // If selecting anything other than BC, ensure BC callout is gone (already handled in setRegion)
  if (csvName !== BC_NAME) clearBCCallout();
}

// =============================================================
// Auto-select BC when #gateA in focus
// =============================================================
function setupGateAFocusAutoSelect() {
  const gateA = document.querySelector("#gateA");
  if (!gateA) return;

  // Disconnect old observer if any
  if (gateAObserver) gateAObserver.disconnect();

  gateAObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        // When Gate A is in focus -> select BC
        // (only if map exists and we’re not already showing BC)
        if (mapChart && currentRegionName !== BC_NAME) {
          selectProvince(BC_NAME, { fromAuto: true });
        }
      }
    }
  }, { threshold: 0.6 });

  gateAObserver.observe(gateA);
}
