// =============================
// FILE: js/gradsFromBCToON.js
// SECTION 1: Ontario undergrads by region (Map and Line Chart)
// Features: Click interaction, Scroll-Triggered Annotation, Detailed Tooltip
// =============================

const CSV_PATH = "data/number_of_undergrads_graduates_in_ontario.csv";
const YEARS = ["2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021"];

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

// =============================
// GLOBAL STATE
// =============================

let regionSeries = [];
let bcSvg;
let xScale, yScale;
let lineGen;
let mapChart; // Highcharts map instance
let BC_data_2021; // Stores the specific 2021 data point for the annotation

const BC_CHART_WIDTH = 480;
const BC_CHART_HEIGHT = 400; // Adjusted for better viewing space
const BC_MARGIN = { top: 30, right: 20, bottom: 40, left: 60 };

// =============================
// ENTRY POINT
// =============================

document.addEventListener("DOMContentLoaded", async () => {
  await loadOntarioData();

  // Find the specific 2021 BC data point for the scroll-trigger annotation
  const bcSeries = regionSeries.find(r => r.name === "British Columbia, origin");
  BC_data_2021 = bcSeries ? bcSeries.share.find(s => s.year === 2021) : null;

  initBCShareChart();
  initCanadaMap();

  // Note: Removed the immediate call to update chart from DOMContentLoaded.
  // The first chart view (ALL) is handled inside initBCShareChart.
});

// =============================
// LOAD CSV & PREPARE DATA
// =============================

async function loadOntarioData() {
  const raw = await d3.csv(CSV_PATH, d3.autoType);

  if (!raw || raw.length === 0) {
    console.error("CSV is empty or not found");
    return;
  }

  const locationField = "Location of residence at the time of admission";

  // Calculate total students per year (needed for percentage share)
  const totalsByYear = {};
  YEARS.forEach(y => {
    totalsByYear[y] = d3.sum(raw, row => {
      const v = row[y];
      return typeof v === "number" ? v : 0;
    });
  });

  // Structure data for D3 chart
  regionSeries = raw
    .filter(row => row[locationField] !== "Ontario, origin") // Exclude Ontario (internal migration)
    .map(row => {
      const name = row[locationField];

      const share = YEARS.map(y => {
        const count = typeof row[y] === "number" ? row[y] : 0;
        const total = totalsByYear[y] || 0;
        const value = total > 0 ? count / total : 0;

        return {
          year: +y,
          value,  // Share percentage (0.013)
          count,  // Actual number of students
          total  // Total students in Ontario that year
        };
      });

      return { name, share };
    });
}

// =============================
// D3 LINE CHART (bc-share-chart)
// UPDATED with Click Handlers (Task 3 & 4)
// =============================

function initBCShareChart() {
  const container = d3.select("#bc-share-chart");
  container.html("");

  // 1. Setup SVG and Margins
  const svg = container
    .append("svg")
    .attr("width", BC_CHART_WIDTH)
    .attr("height", BC_CHART_HEIGHT);

  bcSvg = svg.append("g")
    .attr("transform", `translate(${BC_MARGIN.left},${BC_MARGIN.top})`);

  const innerWidth = BC_CHART_WIDTH - BC_MARGIN.left - BC_MARGIN.right;
  const innerHeight = BC_CHART_HEIGHT - BC_MARGIN.top - BC_MARGIN.bottom;

  // 2. Define Scales
  xScale = d3.scaleLinear()
    .domain(d3.extent(YEARS, d => +d))
    .range([0, innerWidth]);

  const maxSingleShare = d3.max(regionSeries, r => d3.max(r.share, s => s.value)) || 0;

  const allLineValues = YEARS.map(y => {
    const yearNum = +y;
    return regionSeries.reduce((acc, r) => {
      const s = r.share.find(v => v.year === yearNum);
      return acc + (s ? s.value : 0);
    }, 0);
  });
  const maxAllShare = d3.max(allLineValues) || 0;
  const maxShare = Math.max(maxSingleShare, maxAllShare) || 0.02;

  yScale = d3.scaleLinear()
    .domain([0, maxShare * 1.1])
    .nice()
    .range([innerHeight, 0]);

  // 3. Draw Axes and Labels
  bcSvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  bcSvg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).tickFormat(d3.format(".1%")));

  bcSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 32)
    .attr("text-anchor", "middle")
    .text("Graduation Year");

  bcSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Share of Ontario undergrads");

  lineGen = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value));

  // 4. Initial Chart Render (Show ALL regions combined)
  updateBCShareChart("ALL");
}


function updateBCShareChart(selectedName) {
  if (!bcSvg || !lineGen) return;

  // Find the selected data or aggregate ALL
  let dataToPlot = [];
  let selectedRegion = "";

  if (selectedName === "ALL") {
    YEARS.forEach(y => {
      const yearNum = +y;
      const sumShare = regionSeries.reduce((acc, r) => {
        const s = r.share.find(v => v.year === yearNum);
        return acc + (s ? s.value : 0);
      }, 0);

      // Create dummy data point for ALL line
      dataToPlot.push({ year: yearNum, value: sumShare, count: null, total: null, name: "ALL" });
    });
    selectedRegion = "ALL";
  } else {
    const r = regionSeries.find(r => r.name === selectedName);
    if (!r) return;
    dataToPlot = r.share.map(d => ({ ...d, name: r.name }));
    selectedRegion = r.name;
  }

  // --- Line Drawing ---
  const lineSel = bcSvg.selectAll(".bc-line").data([dataToPlot]);

  lineSel
    .enter()
    .append("path")
    .attr("class", "bc-line")
    .merge(lineSel)
    .transition()
    .duration(600)
    .attr("fill", "none")
    .attr("stroke", selectedRegion === "ALL" ? "#90a4ae" : "#1e88e5")
    .attr("stroke-width", selectedRegion === "ALL" ? 1.5 : 2.5)
    .attr("d", lineGen);

  lineSel.exit().remove();

  // --- Point Drawing & Click Handlers (Task 3 & 4) ---
  const points = bcSvg.selectAll(".bc-point").data(dataToPlot, d => d.year);

  points
    .enter()
    .append("circle")
    .attr("class", "bc-point")
    .attr("fill", selectedRegion === "ALL" ? "#90a4ae" : "#1e88e5")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1)
    .style("cursor", "pointer")
    .merge(points)
    .transition()
    .duration(600)
    .attr("r", selectedRegion === "ALL" ? 2.5 : 4.5) // Smaller dots for ALL
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.value));

  // Re-attach interactive event handlers after transition
  bcSvg.selectAll(".bc-point")
    // REMOVE the .on("click", ...) handler

    // --- NEW MOUSEOVER HANDLER (Hover In) ---
    .on("mouseover", function (event, d) {
      if (d.name === "ALL") return; // Disable hover for aggregated ALL view

      // Highlight the hovered point
      d3.select(this).attr("stroke-width", 3).attr("r", 6);

      // Display persistent annotation (Task 4)
      displayAnnotation(event, d);
    })

    // --- NEW MOUSEOUT HANDLER (Hover Out) ---
    .on("mouseout", function () {
      // De-highlight the point (restore original style)
      d3.select(this).attr("stroke-width", 1).attr("r", 4.5);

      // Remove the persistent annotation when the mouse leaves
      // This calls a new utility function we need to add: hideAnnotation()
      hideAnnotation();
    });

  points.exit().remove();

  // Clear any persistent annotation when the chart updates to a new region
  bcSvg.select(".bc-annotation-details").remove();
}


/**
 * Creates and displays a persistent, detailed D3 annotation (Task 4)
 * @param {object} event - D3 event object.
 * @param {object} d - Data object for the clicked point.
 */
function displayAnnotation(event, d) {
  bcSvg.select(".bc-annotation-details").remove(); // Clear previous annotation

  // Calculate position for the annotation (e.g., top-right of the chart area)
  const innerWidth = BC_CHART_WIDTH - BC_MARGIN.left - BC_MARGIN.right;
  const xPos = innerWidth;
  const yPos = 10;

  // Format the annotation content
  const htmlContent = `
        <div style="font-size: 18px; font-weight: 700; color: #1e88e5; margin-bottom: 8px;">
            ${d.name.replace(", origin", "")}
        </div>
        <strong>Year:</strong> ${d.year}<br>
        <strong>Students from BC in Ontario:</strong> ${d.count.toLocaleString()}<br>
        <strong>Total Students in Ontario:</strong> ${d.total.toLocaleString()}<br>
        <strong>Percentage:</strong> ${(d.value * 100).toFixed(2)}%
    `;

  // Use an appended HTML foreign object or simple text
  const annotationGroup = bcSvg.append("foreignObject")
    .attr("class", "bc-annotation-details")
    .attr("x", xPos - 350) // Position near right edge
    .attr("y", yPos)
    .attr("width", 220)
    .attr("height", 200);

  annotationGroup.append("xhtml:div")
    .style("background", "white")
    .style("border", "1px solid #ddd")
    .style("padding", "10px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
    .html(htmlContent);
}


// =============================
// HIGHCHARTS CANADA MAP (canada-map)
// UPDATED with Click Handler (Task 3)
// =============================

async function initCanadaMap() {
  const containerId = "canada-map";

  // get TopoJSON (Highcharts mapping data)
  const topology = await fetch(
    "https://code.highcharts.com/mapdata/countries/ca/ca-all.topo.json"
  ).then(res => res.json());

  // Prepare map data (average share across all years)
  const mapData = regionSeries
    .map(r => {
      const key = PROVINCE_KEY_MAP[r.name];
      if (!key) return null;

      const avgShare =
        r.share.reduce((acc, d) => acc + d.value, 0) / r.share.length;

      return {
        "hc-key": key,
        value: avgShare,
        name: r.name.replace(", origin", ""),
        csvName: r.name
      };
    })
    .filter(d => d !== null);

  const mapInstance = Highcharts.mapChart(containerId, {
    chart: {
      map: topology
    },

    title: {
      text: "Where do Ontario undergrads come from?"
    },

    subtitle: {
      text: "Click a province to view its trend in the line chart." // Updated instruction
    },

    mapNavigation: {
      enabled: true,
      buttonOptions: {
        verticalAlign: "bottom"
      }
    },

    colorAxis: {
      min: 0,
      labels: {
        format: "{value:.2f}"
      }
    },

    tooltip: {
      pointFormat:
        "<b>{point.name}</b><br/>Avg share of Ontario grads: " +
        "<b>{point.value:.2%}</b>"
    },

    series: [
      {
        data: mapData,
        name: "Avg share of Ontario undergrads",
        joinBy: "hc-key",
        states: {
          select: { // Highlight on click/selection
            color: '#BADA55',
            borderWidth: 1
          }
        },
        dataLabels: {
          enabled: true,
          format: "{point.name}",
          style: {
            fontSize: "9px"
          }
        },
        point: {
          events: {
            // Replaced mouseOver with click handler (Task 3)
            click: function () {
              // Ensure only one point is selected at a time
              this.series.points.forEach(p => p.select(false, true));
              this.select(true, true);

              const csvName = this.csvName;
              updateBCShareChart(csvName);
            }
          }
        },
        allowPointSelect: true // Enables programmatic and manual selection
      }
    ]
  });

  mapChart = mapInstance; // Store the map instance globally
}


// =============================
// SCROLL-TRIGGERED AUTOMATION (Task 2)
// =============================

/**
 * Executes the scrollytelling action: selects BC, highlights the 2021 data point,
 * and displays the required annotation box.
 */
function triggerBCHighlight() {
  // Ensure data and charts are ready
  if (!mapChart || !bcSvg || !BC_data_2021) {
    console.warn("Charts not fully initialized for triggerBCHighlight.");
    return;
  }

  const bcName = "British Columbia, origin";

  // 1. Update the line chart to show only British Columbia's trend
  updateBCShareChart(bcName);

  // 2. Highlight British Columbia on the map
  mapChart.series[0].points.forEach(p => {
    if (p.options.csvName === bcName) {
      p.select(true, true);
    } else {
      p.select(false, true);
    }
  });

  // 3. Display specific annotation for the 2021 BC point (Task 2)
  const bcPoint2021 = BC_data_2021;

  // Remove previous annotation group if it exists
  bcSvg.selectAll(".bc-annotation-scroll").remove();

  // Calculate position for the 2021 point
  const xPos = xScale(bcPoint2021.year);
  const yPos = yScale(bcPoint2021.value);

  // Create a visual highlight circle for the 2021 point
  bcSvg.append("circle")
    .attr("class", "bc-annotation-scroll")
    .attr("cx", xPos)
    .attr("cy", yPos)
    .attr("r", 8)
    .attr("fill", "rgba(255, 255, 255, 0.4)")
    .attr("stroke", "#ff9800") // Orange highlight
    .attr("stroke-width", 2);

  // Create the annotation box 
  const annotationGroup = bcSvg.append("g")
    .attr("class", "bc-annotation-scroll")
    .attr("transform", `translate(${xPos}, ${yPos})`);

  const text = `In 2021, ${(bcPoint2021.value * 100).toFixed(2)}% of Ontario graduates were originally from BC.`;

  // Draw background rectangle
  annotationGroup.append("rect")
    .attr("x", -200)
    .attr("y", -100)
    .attr("width", 200)
    .attr("height", 70)
    .attr("fill", "rgba(30, 136, 229, 0.95)")
    .attr("stroke", "#1e88e5")
    .attr("rx", 5);

  // Draw text with word wrap utility
  annotationGroup.append("text")
    .attr("x", -100)
    .attr("y", -80)
    .attr("fill", "white")
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .call(wrapText, 190, text);
}


// =============================
// UTILITIES
// =============================

/**
 * Simple text wrapping utility for D3 (Needs d3 for text and tspan methods)
 */
function wrapText(text, width, fullText) {
  text.each(function () {
    const textElement = d3.select(this);
    const words = fullText.split(/\s+/).reverse();
    let word;
    let line = [];
    let lineNumber = 0;
    const lineHeight = 1.1;
    const x = textElement.attr("x");
    const y = textElement.attr("y");
    const dy = parseFloat(textElement.attr("dy")) || 0;
    let tspan = textElement.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = textElement.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}