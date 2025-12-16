// =============================================================
// vis1.js — Context View
// Canada Map (Highcharts) + Responsive D3 Line Chart
// =============================================================

// -----------------------------
// CONFIG
// -----------------------------
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

// -----------------------------
// STATE
// -----------------------------
let regionSeries = [];
let mapChart = null;
let currentProvince = BC_NAME;

// D3 globals
let svg, g, xScale, yScale, lineGen, tooltipBox;

// =============================================================
// LOAD DATA
// =============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const raw = await d3.csv(CSV_PATH, d3.autoType);
  const locationField = "Location of residence at the time of admission";

  // Totals per year
  const totalsByYear = {};
  YEARS.forEach(y => {
    totalsByYear[y] = d3.sum(raw, r => (typeof r[y] === "number" ? r[y] : 0));
  });

  // Normalize to shares
  regionSeries = raw.map(r => {
    const name = r[locationField];
    return {
      name,
      share: YEARS.map(y => ({
        year: +y,
        value: totalsByYear[y] ? (r[y] / totalsByYear[y]) : 0,
        count: r[y] || 0,
        total: totalsByYear[y]
      }))
    };
  });

  initMap();
  initLineChart();
  updateLineChart(BC_NAME);
});

// =============================================================
// HIGHCHARTS MAP
// =============================================================
async function initMap() {
  const topology = await fetch(
    "https://code.highcharts.com/mapdata/countries/ca/ca-all.topo.json"
  ).then(r => r.json());

  const dataForMap = regionSeries
    .map(r => {
      const key = PROVINCE_KEY_MAP[r.name];
      if (!key) return null;

      return {
        "hc-key": key,
        value: d3.mean(r.share, d => d.value),
        name: r.name.replace(", origin", ""),
        csvName: r.name,
        isOntario: r.name === "Ontario, origin"
      };
    })
    .filter(Boolean);

  mapChart = Highcharts.mapChart("map-container", {
    chart: {
      map: topology,
      height: "100%"
    },
    title: {
      text: "Share of Ontario Undergraduates by Province of Origin (2012–2021)"
    },
    subtitle: {
      text: "Click a province to view its trend over time."
    },
    mapNavigation: { enabled: true },
    colorAxis: {
      min: 0,
      max: 0.02,
      stops: [
        [0, "#e0f2fe"],
        [0.5, "#60a5fa"],
        [1, "#1e3a8a"]
      ]
    },
    series: [{
      data: dataForMap,
      joinBy: "hc-key",
      borderColor: "#334155",
      borderWidth: 0.8,
      dataLabels: {
        enabled: true,
        format: "{point.name}",
        style: {
          fontSize: "11px",
          fontWeight: "600",
          textOutline: "2px solid rgba(255,255,255,0.85)"
        }
      },
      point: {
        events: {
          click() {
            if (!this.options.isOntario) {
              updateLineChart(this.options.csvName);
            }
          }
        }
      }
    }]
  });

  // Disable Ontario interactions
  mapChart.series[0].points.forEach(pt => {
    if (pt.options.isOntario) {
      pt.update({
        color: "#d1d5db",
        enableMouseTracking: false
      });
    }
  });
}

// =============================================================
// RESPONSIVE D3 LINE CHART
// =============================================================
function initLineChart() {
  const width = 520;
  const height = 420;
  const margin = { top: 24, right: 40, bottom: 56, left: 72 };

  const container = d3.select("#trend-container")
    .style("position", "relative");

  // ---- Responsive SVG ----
  svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
    .style("display", "block");

  g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  xScale = d3.scaleLinear()
    .domain(d3.extent(YEARS, d => +d))
    .range([0, innerW]);

  yScale = d3.scaleLinear()
    .domain([0, 0.03])
    .range([innerH, 0]);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  g.append("g")
    .call(d3.axisLeft(yScale).tickFormat(d3.format(".1%")));

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .attr("fill", "#0f172a")
    .text("Graduation Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .attr("fill", "#0f172a")
    .text("Share of Ontario undergraduates");

  // Line generator
  lineGen = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value));

  g.append("path")
    .attr("class", "trend-line")
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 3);

  g.append("g").attr("class", "trend-points");

  // Tooltip
  tooltipBox = container.append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #cbd5e1")
    .style("padding", "14px 18px")
    .style("border-radius", "8px")
    .style("box-shadow", "0 8px 24px rgba(15,23,42,0.18)")
    .style("font-size", "14px")
    .style("display", "none")
    .style("pointer-events", "none");
}

// =============================================================
// UPDATE LINE CHART
// =============================================================
function updateLineChart(name) {
  currentProvince = name;

  const series = regionSeries.find(r => r.name === name);
  if (!series) return;

  const data = series.share;
  const pointsGroup = g.select(".trend-points");

  // Update line
  g.select(".trend-line")
    .datum(data)
    .transition()
    .duration(600)
    .attr("d", lineGen);

  // JOIN
  const circles = pointsGroup.selectAll("circle")
    .data(data, d => d.year);

  // EXIT
  circles.exit().remove();

  // ENTER
  const enter = circles.enter()
    .append("circle")
    .attr("r", 0)
    .attr("fill", "#2563eb")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .on("mouseenter", showHoverCard)
    .on("mousemove", moveHoverCard)
    .on("mouseleave", hideHoverCard);

  // MERGE
  enter.merge(circles)
    .transition()
    .duration(600)
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.value))
    .attr("r", 6);
}

// =============================================================
// TOOLTIP HANDLERS
// =============================================================
function showHoverCard(event, d) {
  const pct = (d.value * 100).toFixed(2);
  const label = currentProvince.replace(", origin", "");

  tooltipBox
    .style("display", "block")
    .html(`
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">${label}</div>
      <div><b>Year:</b> ${d.year}</div>
      <div><b>Students:</b> ${d.count.toLocaleString()}</div>
      <div><b>Total in Ontario:</b> ${d.total.toLocaleString()}</div>
      <div><b>Share:</b> ${pct}%</div>
    `);

  moveHoverCard(event);
}

function moveHoverCard(event) {
  const box = document
    .querySelector("#trend-container")
    .getBoundingClientRect();

  tooltipBox
    .style("left", `${event.clientX - box.left + 16}px`)
    .style("top", `${event.clientY - box.top + 16}px`);
}

function hideHoverCard() {
  tooltipBox.style("display", "none");
}
