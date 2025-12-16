// =============================================================
// CONFIG
// =============================================================
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

// State
let regionSeries = [];
let mapChart = null;
let currentProvince = BC_NAME;

// =============================================================
// LOAD CSV
// =============================================================
document.addEventListener("DOMContentLoaded", async () => {

  // Wait for DOM to fully exist
  await new Promise(r => setTimeout(r, 50));

  const raw = await d3.csv(CSV_PATH, d3.autoType);
  const locationField = "Location of residence at the time of admission";

  const totalsByYear = {};
  YEARS.forEach(y => {
    totalsByYear[y] = d3.sum(raw, r => (typeof r[y] === "number" ? r[y] : 0));
  });

  regionSeries = raw.map(r => {
    const name = r[locationField];
    const share = YEARS.map(y => ({
      year: +y,
      value: totalsByYear[y] ? (r[y] / totalsByYear[y]) : 0,
      count: r[y] || 0,
      total: totalsByYear[y],
      name
    }));
    return { name, share };
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

  const dataForMap = regionSeries.map(r => {
    const key = PROVINCE_KEY_MAP[r.name];
    if (!key) return null;

    return {
      "hc-key": key,
      value: d3.mean(r.share, d => d.value),
      name: r.name.replace(", origin", ""),
      csvName: r.name,
      isOntario: r.name === "Ontario, origin"
    };
  }).filter(Boolean);

  mapChart = Highcharts.mapChart("map-container", {
    chart: { map: topology },
    title: { text: "Share of Ontario Undergraduates by Province of Origin (2012–2021)" },
    subtitle: { text: "Click a province to view its trend in the line chart." },

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
      borderColor: "#333",
      borderWidth: 0.8,
      dataLabels: {
        enabled: true,
        format: "{point.name}",
        style: {
          fontSize: "11px",
          fontWeight: "bold",
          color: "black",
          textOutline: "2px solid rgba(255,255,255,0.8)"
        }
      },
      point: {
        events: {
          click: function () {
            if (!this.options.isOntario) onProvinceClick(this.csvName);
          }
        }
      }
    }]
  });

  // Disable Ontario
  mapChart.series[0].points.forEach(pt => {
    if (pt.options.isOntario) {
      pt.update({ color: "#d1d5db", enableMouseTracking: false });
    }
  });
}

// =============================================================
// PROVINCE -> LINE CHART
// =============================================================
function onProvinceClick(name) {
  currentProvince = name;
  updateLineChart(name);
}

// =============================================================
// D3 LINE CHART + TOOLTIP
// =============================================================
let svg, g, xScale, yScale, lineGen, tooltipBox;

function initLineChart() {
  const width = 520;
  const height = 420;
  const margin = { top: 20, right: 40, bottom: 50, left: 70 };

  const container = d3.select("#trend-container")
    .style("position", "relative");

  svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  tooltipBox = container.append("div")
    .attr("class", "trend-tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "16px 20px")
    .style("border-radius", "6px")
    .style("box-shadow", "0 6px 18px rgba(0,0,0,0.15)")
    .style("font-family", "Inter")
    .style("display", "none")
    .style("z-index", 50)
    .style("pointer-events", "none");

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

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  g.append("g")
    .call(d3.axisLeft(yScale).tickFormat(d3.format(".1%")));

    // X-axis label
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 8)
    .attr("text-anchor", "middle")
    .attr("fill", "#0f172a")
    .attr("font-size", "14px")
    .attr("font-weight", 500)
    .text("Graduation Year");

  // Y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("fill", "#0f172a")
    .attr("font-size", "14px")
    .attr("font-weight", 500)
    .text("Share of Ontario undergraduates");

  
  lineGen = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value));

  g.append("path")
    .attr("class", "trend-line")
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 3);

  g.append("g").attr("class", "trend-points");
}

// =============================================================
// UPDATE LINE CHART + FIXED TOOLTIP + FIXED MERGE ORDER
// =============================================================
function updateLineChart(name) {
  const series = regionSeries.find(r => r.name === name);
  if (!series) return;

  const data = series.share;
  const pointsGroup = g.select(".trend-points");

  // Update line
  g.select(".trend-line")
    .datum(data)
    .transition().duration(600)
    .attr("d", lineGen);

  // ENTER  
  const enter = pointsGroup.selectAll("circle")
    .data(data, d => d.year)
    .enter()
    .append("circle")
    .attr("fill", "#2563eb")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("r", 0);

  // UPDATE + ENTER MERGED
  const circles = enter.merge(pointsGroup.selectAll("circle"));

  circles
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.value))
    .on("mouseenter", showHoverCard)
    .on("mousemove", moveHoverCard)
    .on("mouseleave", hideHoverCard)
    .transition().duration(600)
    .attr("r", 6);

  pointsGroup.selectAll("circle")
    .data(data, d => d.year)
    .exit()
    .remove();

  
}


// =============================================================
// TOOLTIP (FIXED POSITIONING)
// =============================================================
function showHoverCard(event, d) {
  const pct = (d.value * 100).toFixed(2);
  const regionPretty = d.name.replace(", origin", "");

  tooltipBox
    .style("display", "block")
    .html(`
      <div style="font-size:20px;font-weight:700;margin-bottom:10px">${regionPretty}</div>
      <div><b>Year:</b> ${d.year}</div>
      <div><b>Students from ${regionPretty} in Ontario:</b> ${d.count.toLocaleString()}</div>
      <div><b>Total Students in Ontario:</b> ${d.total.toLocaleString()}</div>
      <div><b>Percentage:</b> ${pct}%</div>
    `);

  moveHoverCard(event);
}

function moveHoverCard(event) {
  const box = document.querySelector("#trend-container").getBoundingClientRect();
  tooltipBox
    .style("left", `${event.clientX - box.left + 20}px`)
    .style("top", `${event.clientY - box.top + 20}px`);
}

function hideHoverCard() {
  tooltipBox.style("display", "none");
}
