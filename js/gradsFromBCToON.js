// =============================
// SECTION 1: Ontario undergrads by region (your existing chart). Noticed that
// the animation starts as the page loads... make it so that when the scroll
// position's at this vis in particular.
// =============================

const CSV_PATH = "data/number_of_undergrads_graduates_in_ontario.csv";


const YEARS = ["2012","2013","2014","2015","2016","2017","2018","2019","2020","2021"];


const PROVINCE_KEY_MAP = {
  "Newfoundland and Labrador, origin": "ca-nl",
  "Prince Edward Island, origin":        "ca-pe",
  "Nova Scotia, origin":                 "ca-ns",
  "New Brunswick, origin":               "ca-nb",
  "Quebec, origin":                      "ca-qc",
  "Ontario, origin":                     "ca-on", 
  "Manitoba, origin":                    "ca-mb",
  "Saskatchewan, origin":                "ca-sk",
  "Alberta, origin":                     "ca-ab",
  "British Columbia, origin":            "ca-bc",
  "Territories, origin":                 "ca-yt"  
};

// =============================
// GLOBAL STATE
// =============================

// regionSeries: [
//   {
//     name: "British Columbia, origin",
//     share: [{ year: 2012, value: 0.013, count: 651, total: 50000 }, ...]
//   },
//   ...
// ]
let regionSeries = [];

let regionSelectEl;     
let bcSvg;           
let xScale, yScale;      
let lineGen;            

const BC_CHART_WIDTH  = 480;
const BC_CHART_HEIGHT = 260;
const BC_MARGIN = { top: 30, right: 20, bottom: 40, left: 60 };

// =============================
// ENTRY POINT
// =============================

document.addEventListener("DOMContentLoaded", async () => {
  regionSelectEl = document.getElementById("region-select");


  await loadOntarioData();


  initBCShareChart();


  initCanadaMap();
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

  
  const totalsByYear = {};
  YEARS.forEach(y => {
    totalsByYear[y] = d3.sum(raw, row => {
      const v = row[y];
      return typeof v === "number" ? v : 0;
    });
  });

  
  regionSeries = raw
    .filter(row => row[locationField] !== "Ontario, origin")
    .map(row => {
      const name = row[locationField];

      const share = YEARS.map(y => {
        const count = typeof row[y] === "number" ? row[y] : 0;
        const total = totalsByYear[y] || 0;
        const value = total > 0 ? count / total : 0;

        return {
          year: +y,
          value,  
          count,  
          total   
        };
      });

      return { name, share };
    });

  buildRegionSelect();
}

// =============================
// BUILD <SELECT> OPTIONS
// =============================

function buildRegionSelect() {
  if (!regionSelectEl) return;

  regionSelectEl.innerHTML = "";


  const allOpt = document.createElement("option");
  allOpt.value = "ALL";
  allOpt.textContent = "All Regions (except Ontario)";
  regionSelectEl.appendChild(allOpt);


  regionSeries.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.name;
    opt.textContent = r.name.replace(", origin", "");
    regionSelectEl.appendChild(opt);
  });


  regionSelectEl.value = "ALL";


  regionSelectEl.addEventListener("change", () => {
    updateBCShareChart(regionSelectEl.value);
  });
}

// =============================
// D3 LINE CHART (bc-share-chart)
// =============================

function initBCShareChart() {
  const container = d3.select("#bc-share-chart");
  container.html("");

  const svg = container
    .append("svg")
    .attr("width", BC_CHART_WIDTH)
    .attr("height", BC_CHART_HEIGHT);

  bcSvg = svg.append("g")
    .attr("transform", `translate(${BC_MARGIN.left},${BC_MARGIN.top})`);

  const innerWidth  = BC_CHART_WIDTH  - BC_MARGIN.left - BC_MARGIN.right;
  const innerHeight = BC_CHART_HEIGHT - BC_MARGIN.top  - BC_MARGIN.bottom;

  
  xScale = d3.scaleLinear()
    .domain(d3.extent(YEARS, d => +d))
    .range([0, innerWidth]);


  const maxSingleShare = d3.max(
    regionSeries,
    r => d3.max(r.share, s => s.value)
  ) || 0;

  
  const allLineValues = YEARS.map(y => {
    const yearNum = +y;
    const sumShare = regionSeries.reduce((acc, r) => {
      const s = r.share.find(v => v.year === yearNum);
      return acc + (s ? s.value : 0);
    }, 0);
    return sumShare;
  });

  const maxAllShare = d3.max(allLineValues) || 0;


  const maxShare = Math.max(maxSingleShare, maxAllShare) || 0.02;

  yScale = d3.scaleLinear()
    .domain([0, maxShare * 1.1])
    .nice()
    .range([innerHeight, 0]);


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


  updateBCShareChart("ALL");
}


function updateBCShareChart(selectedName) {
  if (!bcSvg || !lineGen) return;

  const innerWidth  = BC_CHART_WIDTH  - BC_MARGIN.left - BC_MARGIN.right;
  const innerHeight = BC_CHART_HEIGHT - BC_MARGIN.top  - BC_MARGIN.bottom;

  let dataToPlot = [];

  if (selectedName === "ALL") {
    
    YEARS.forEach(y => {
      const yearNum = +y;
      const sumShare = regionSeries.reduce((acc, r) => {
        const s = r.share.find(v => v.year === yearNum);
        return acc + (s ? s.value : 0);
      }, 0);

      dataToPlot.push({ year: yearNum, value: sumShare });
    });
  } else {
    const r = regionSeries.find(r => r.name === selectedName);
    if (!r) return;
    dataToPlot = r.share;
  }


  const lineSel = bcSvg.selectAll(".bc-line").data([dataToPlot]);

  lineSel
    .enter()
    .append("path")
    .attr("class", "bc-line")
    .merge(lineSel)
    .transition()
    .duration(600)
    .attr("fill", "none")
    .attr("stroke", "#1e88e5")
    .attr("stroke-width", 2.5)
    .attr("d", lineGen);

  lineSel.exit().remove();


  const points = bcSvg.selectAll(".bc-point").data(dataToPlot, d => d.year);

  points
    .enter()
    .append("circle")
    .attr("class", "bc-point")
    .attr("r", 3.5)
    .attr("fill", "#1e88e5")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1)
    .merge(points)
    .transition()
    .duration(600)
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.value));

  points.exit().remove();
}

// =============================
// HIGHCHARTS CANADA MAP (canada-map)
// =============================

async function initCanadaMap() {
  const containerId = "canada-map";

  // get TopoJSON
  const topology = await fetch(
    "https://code.highcharts.com/mapdata/countries/ca/ca-all.topo.json"
  ).then(res => res.json());

  
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

  Highcharts.mapChart(containerId, {
    chart: {
      map: topology
    },

    title: {
      text: "Where do Ontario undergrads come from?"
    },

    subtitle: {
      text: "Hover a province to update the line chart."
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
          hover: {
            color: "#BADA55"
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
            
            mouseOver: function () {
              const csvName = this.csvName; 

              
              if (regionSelectEl) {
                regionSelectEl.value = csvName;
              }

              
              if (typeof updateBCShareChart === "function") {
                updateBCShareChart(csvName);  
              }
            }
          }
        }
      }
    ]
  });
}

