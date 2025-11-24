// =============================
// SECTION 1: Ontario undergrads by region (your existing chart)
// =============================

const csvFilePath = "data/number_of_undergrads_graduates_in_ontario.csv";
const containerId = "bc-share-chart";

const YEARS = [
  "2012", "2013", "2014", "2015", "2016",
  "2017", "2018", "2019", "2020", "2021"
];

let seriesData = [];
let allYMax = 0;

async function initBCShareVis() {
  const container = d3.select(`#${containerId}`);
  container.html("");

  const loading = container.append("p").text("Loading data...");

  try {
    const rawData = await d3.csv(csvFilePath, d3.autoType);

    if (!rawData || rawData.length === 0) {
      loading.text("No data found in CSV.");
      return;
    }

    const rows = rawData.filter(
      d =>
        d["Location of residence at the time of admission"] !== "Ontario, origin"
    );

    // Regions (without Ontario)
    const regions = rows.map(
      d => d["Location of residence at the time of admission"]
    );

    // Total Ontario students per year (all regions, including Ontario)
    const totalsByYear = {};
    YEARS.forEach(year => {
      totalsByYear[year] = d3.sum(rawData, d => {
        const v = d[year];
        return typeof v === "number" ? v : 0;
      });
    });

    // Build a series for each region (no Ontario)
    seriesData = rows.map(row => {
      const regionName = row["Location of residence at the time of admission"];

      const values = YEARS.map(year => {
        const students = typeof row[year] === "number" ? row[year] : 0;
        const total = totalsByYear[year] || 0;
        const percentage = total > 0 ? (students / total) * 100 : 0;

        return {
          year: +year,
          students,
          total,
          percentage
        };
      });

      return { region: regionName, values };
    });

    // y-axis max across non-Ontario regions
    allYMax =
      d3.max(seriesData, s =>
        d3.max(s.values, v => v.percentage)
      ) * 1.1;

    loading.remove();

    setupRegionSelect(regions);
    updateChart("British Columbia, origin");
  } catch (err) {
    console.error("Error loading or processing data:", err);
    loading.text("Error loading visualization. Check console for details.");
  }
}

function setupRegionSelect(regions) {
  const select = d3.select("#region-select");
  if (select.empty()) return; 

  select.html("");

  select
    .append("option")
    .attr("value", "All")
    .text("All Regions");

  regions.forEach(regionName => {
    select
      .append("option")
      .attr("value", regionName)
      .text(regionName.replace(", origin", ""));
  });

  select.property("value", "British Columbia, origin");

  select.on("change", function () {
    const selected = this.value;
    updateChart(selected);
  });
}

function updateChart(selectedRegion) {
  const container = d3.select(`#${containerId}`);
  container.html("");

  const visibleSeries =
    selectedRegion === "All"
      ? seriesData
      : seriesData.filter(s => s.region === selectedRegion);

  renderRegionChart(container, visibleSeries);
}

function renderRegionChart(container, seriesList) {
  const margin = { top: 20, right: 24, bottom: 48, left: 72 };
  const width = 720;
  const height = 320;

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(YEARS, y => +y))
    .range([0, innerWidth]);

  const y = d3
    .scaleLinear()
    .domain([0, allYMax])
    .nice()
    .range([innerHeight, 0]);

  const xAxis = d3.axisBottom(x).ticks(YEARS.length).tickFormat(d3.format("d"));
  const yAxis = d3
    .axisLeft(y)
    .ticks(5)
    .tickFormat(d => d.toFixed(1) + "%");

  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", innerWidth / 2)
    .attr("y", 36)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .attr("font-weight", "600")
    .text("Graduation Year");

  g.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -52)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .attr("font-weight", "600")
    .text("Percentage of Total Students (%)");

  const line = d3
    .line()
    .x(d => x(d.year))
    .y(d => y(d.percentage))
    .curve(d3.curveMonotoneX);

  const colorScale = d3
    .scaleOrdinal()
    .domain(seriesData.map(s => s.region))
    .range(d3.schemeTableau10);

  g.selectAll(".line")
    .data(seriesList)
    .enter()
    .append("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", d => colorScale(d.region))
    .attr("stroke-width", seriesList.length === 1 ? 3 : 2)
    .attr("d", d => line(d.values));

  d3.select("body").selectAll(".bc-tooltip").remove();

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "bc-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "#ffffff")
    .style("border", "1px solid #e5e7eb")
    .style("box-shadow", "0 10px 25px rgba(15, 23, 42, 0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px 12px")
    .style("font-size", "13px")
    .style("line-height", "1.4")
    .style("color", "#0f172a")
    .style("opacity", 0);

  const allPoints = seriesList.flatMap(s =>
    s.values.map(v => ({ ...v, region: s.region }))
  );

  g.selectAll(".point")
    .data(allPoints)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.percentage))
    .attr("r", 4.5)
    .attr("fill", d => colorScale(d.region))
    .attr("stroke", d => colorScale(d.region))
    .attr("stroke-width", 1.5)
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("r", 6);

      const regionLabel = d.region.replace(", origin", "");

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${regionLabel}</strong><br/>
           Year: ${d.year}<br/>
           Students from ${regionLabel} in Ontario: ${d.students}<br/>
           Total students in Ontario: ${d.total}<br/>
           Percentage: ${d.percentage.toFixed(2)}%`
        );

      tooltip
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", function () {
      d3.select(this).attr("r", 4.5);
      tooltip.style("opacity", 0);
    });
}

// =============================
// SECTION 2: Monthly cheapest vs most expensive flight prices
// =============================

const highestPriceFile =
  "data/Flights_From_Vancouver_to_Toronto_HighestPrice_clean.csv";
const lowestPriceFile =
  "data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

async function initMonthlyPriceVis() {
  const container = d3.select("#monthly-price-chart");
  if (container.empty()) return;

  container.html("");
  const loading = container.append("p").text("Loading flight prices...");

  try {
    const [highestData, lowestData] = await Promise.all([
      d3.csv(highestPriceFile, d3.autoType),
      d3.csv(lowestPriceFile, d3.autoType)
    ]);

    const parseDate = d3.timeParse("%m/%d/%Y");

    function getMonthIndex(d) {
      if (d.date instanceof Date) return d.date.getMonth();
      const dt = parseDate(d.date);
      return dt ? dt.getMonth() : null;
    }

    const monthly = d3.range(12).map(m => ({
      month: m,
      lowestSum: 0,
      lowestCount: 0,
      highestSum: 0,
      highestCount: 0
    }));

    lowestData.forEach(d => {
      const m = getMonthIndex(d);
      if (m == null) return;
      monthly[m].lowestSum += d.price;
      monthly[m].lowestCount += 1;
    });

    highestData.forEach(d => {
      const m = getMonthIndex(d);
      if (m == null) return;
      monthly[m].highestSum += d.price;
      monthly[m].highestCount += 1;
    });

    const monthlyData = monthly
      .filter(d => d.lowestCount > 0 || d.highestCount > 0)
      .map(d => ({
        month: d.month,
        label: MONTH_LABELS[d.month],
        avgLowest:
          d.lowestCount > 0 ? d.lowestSum / d.lowestCount : null,
        avgHighest:
          d.highestCount > 0 ? d.highestSum / d.highestCount : null
      }));

    loading.remove();
    renderMonthlyPriceChart(container, monthlyData);
  } catch (err) {
    console.error("Error loading flight price data:", err);
    loading.text("Error loading price visualization. Check console.");
  }
}

function renderMonthlyPriceChart(container, data) {
  const margin = { top: 20, right: 24, bottom: 48, left: 72 };
  const width = 720;
  const height = 320;

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain([0, data.length - 1])
    .range([0, innerWidth]);

  const allPrices = data.flatMap(d => [d.avgLowest, d.avgHighest]);
  const maxPrice = d3.max(allPrices);
  const y = d3
    .scaleLinear()
    .domain([0, maxPrice * 1.1])
    .nice()
    .range([innerHeight, 0]);

  const xAxis = d3
    .axisBottom(x)
    .ticks(data.length)
    .tickFormat(i => data[i] ? data[i].label : "");

  const yAxis = d3
    .axisLeft(y)
    .ticks(6)
    .tickFormat(d => `$${Math.round(d)}`);

  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", innerWidth / 2)
    .attr("y", 36)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .attr("font-weight", "600")
    .text("Month");

  g.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -52)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .attr("font-weight", "600")
    .text("Average Ticket Price (CAD)");

  const lineCheapest = d3
    .line()
    .x((d, i) => x(i))
    .y(d => y(d.avgLowest))
    .defined(d => d.avgLowest != null)
    .curve(d3.curveMonotoneX);

  const lineMostExpensive = d3
    .line()
    .x((d, i) => x(i))
    .y(d => y(d.avgHighest))
    .defined(d => d.avgHighest != null)
    .curve(d3.curveMonotoneX);

  const colorCheapest = "#0ea5e9";   
  const colorHighest = "#f97316";    

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", colorCheapest)
    .attr("stroke-width", 3)
    .attr("d", lineCheapest);

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", colorHighest)
    .attr("stroke-width", 3)
    .attr("d", lineMostExpensive);

  // legend
  const legend = g
    .append("g")
    .attr("transform", `translate(${innerWidth - 180}, 8)`);

  legend
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", colorCheapest);

  legend
    .append("text")
    .attr("x", 18)
    .attr("y", 10)
    .attr("font-size", 12)
    .text("Average lowest price");

  legend
    .append("rect")
    .attr("x", 0)
    .attr("y", 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", colorHighest);

  legend
    .append("text")
    .attr("x", 18)
    .attr("y", 30)
    .attr("font-size", 12)
    .text("Average highest price");

  // points + tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "bc-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "#ffffff")
    .style("border", "1px solid #e5e7eb")
    .style("box-shadow", "0 10px 25px rgba(15, 23, 42, 0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px 12px")
    .style("font-size", "13px")
    .style("line-height", "1.4")
    .style("color", "#0f172a")
    .style("opacity", 0);

  const allPointData = [];

  data.forEach((d, i) => {
    if (d.avgLowest != null) {
      allPointData.push({
        line: "lowest",
        monthIndex: i,
        label: d.label,
        price: d.avgLowest
      });
    }
    if (d.avgHighest != null) {
      allPointData.push({
        line: "highest",
        monthIndex: i,
        label: d.label,
        price: d.avgHighest
      });
    }
  });

  g.selectAll(".price-point")
    .data(allPointData)
    .enter()
    .append("circle")
    .attr("class", "price-point")
    .attr("cx", d => x(d.monthIndex))
    .attr("cy", d => y(d.price))
    .attr("r", 4.5)
    .attr("fill", d => (d.line === "lowest" ? colorCheapest : colorHighest))
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5)
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("r", 6);

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.label}</strong><br/>
           Line: ${d.line === "lowest" ? "Average lowest price" : "Average highest price"}<br/>
           Average price: $${d.price.toFixed(0)}`
        );

      tooltip
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", function () {
      d3.select(this).attr("r", 4.5);
      tooltip.style("opacity", 0);
    });
}

// =============================
// SECTION 3: Weekly cheapest vs most expensive flight prices
// =============================

async function initWeeklyPriceVis() {
  const container = d3.select("#weekly-price-chart");
  if (container.empty()) return;

  container.html("");
  const loading = container.append("p").text("Loading weekly prices...");

  try {
    const [highestData, lowestData] = await Promise.all([
      d3.csv(highestPriceFile, d3.autoType),
      d3.csv(lowestPriceFile, d3.autoType)
    ]);

    // Collect all weeks that appear in either dataset
    const weekSet = new Set();

    lowestData.forEach(d => {
      if (d.week_of_month != null) weekSet.add(d.week_of_month);
    });

    highestData.forEach(d => {
      if (d.week_of_month != null) weekSet.add(d.week_of_month);
    });

    const weeks = Array.from(weekSet).sort(d3.ascending);

    const weeklyData = weeks.map(week => {
      const lows = lowestData.filter(d => d.week_of_month === week);
      const highs = highestData.filter(d => d.week_of_month === week);

      const avgLowest =
        lows.length > 0 ? d3.mean(lows, d => d.price) : null;
      const avgHighest =
        highs.length > 0 ? d3.mean(highs, d => d.price) : null;

      return {
        week,
        label: `Week ${week}`,
        avgLowest,
        avgHighest
      };
    });

    loading.remove();
    renderWeeklyPriceChart(container, weeklyData);
  } catch (err) {
    console.error("Error loading weekly price data:", err);
    loading.text("Error loading weekly price visualization. Check console.");
  }
}

function renderWeeklyPriceChart(container, data) {
  const margin = { top: 20, right: 24, bottom: 48, left: 72 };
  const width = 720;
  const height = 320;

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X is weeks as categories
  const x0 = d3
    .scaleBand()
    .domain(data.map(d => d.label))
    .range([0, innerWidth])
    .padding(0.2);

  // Inner band for lowest vs highest within each week
  const x1 = d3
    .scaleBand()
    .domain(["lowest", "highest"])
    .range([0, x0.bandwidth()])
    .padding(0.05);

  const allPrices = data.flatMap(d => [d.avgLowest, d.avgHighest]);
  const maxPrice = d3.max(allPrices);
  const y = d3
    .scaleLinear()
    .domain([0, maxPrice * 1.1])
    .nice()
    .range([innerHeight, 0]);

  const xAxis = d3.axisBottom(x0);
  const yAxis = d3
    .axisLeft(y)
    .ticks(6)
    .tickFormat(d => `$${Math.round(d)}`);

  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(xAxis)
    .selectAll("text")
    .attr("dy", "1.2em");

  g.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -52)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .attr("font-weight", "600")
    .text("Average Ticket Price (CAD)");

  const colorCheapest = "#0ea5e9"; 
  const colorHighest = "#f97316";

  const groups = g
    .selectAll(".week-group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "week-group")
    .attr("transform", d => `translate(${x0(d.label)},0)`);

  
  const barsData = [];

  data.forEach(d => {
    if (d.avgLowest != null) {
      barsData.push({
        type: "lowest",
        label: d.label,
        week: d.week,
        value: d.avgLowest
      });
    }
    if (d.avgHighest != null) {
      barsData.push({
        type: "highest",
        label: d.label,
        week: d.week,
        value: d.avgHighest
      });
    }
  });

  // Tooltip
  d3.select("body").selectAll(".bc-tooltip").remove();

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "bc-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "#ffffff")
    .style("border", "1px solid #e5e7eb")
    .style("box-shadow", "0 10px 25px rgba(15, 23, 42, 0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px 12px")
    .style("font-size", "13px")
    .style("line-height", "1.4")
    .style("color", "#0f172a")
    .style("opacity", 0);

  groups
    .selectAll("rect")
    .data(d => barsData.filter(b => b.label === d.label))
    .enter()
    .append("rect")
    .attr("x", d => x1(d.type))
    .attr("y", d => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", d => innerHeight - y(d.value))
    .attr("fill", d =>
      d.type === "lowest" ? colorCheapest : colorHighest
    )
    .on("mouseenter", function (event, d) {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.label}</strong><br/>
           Line: ${
             d.type === "lowest"
               ? "Average lowest price"
               : "Average highest price"
           }<br/>
           Average price: $${d.value.toFixed(0)}`
        );

      tooltip
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", function () {
      tooltip.style("opacity", 0);
    });

  // Legend (same colors as monthly chart)
  const legend = g
    .append("g")
    .attr("transform", `translate(${innerWidth - 200}, 8)`);

  legend
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", colorCheapest);

  legend
    .append("text")
    .attr("x", 18)
    .attr("y", 10)
    .attr("font-size", 12)
    .text("Average lowest price");

  legend
    .append("rect")
    .attr("x", 0)
    .attr("y", 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", colorHighest);

  legend
    .append("text")
    .attr("x", 18)
    .attr("y", 30)
    .attr("font-size", 12)
    .text("Average highest price");
}

// =============================
// SECTION 4: Calendar heatmap – day of week vs month
// =============================

// Local constants just for this section (avoid global dependency issues)
const HEATMAP_MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const HEATMAP_DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function initDailyHeatmapVis() {
  const container = d3.select("#daily-heatmap-chart");
  if (container.empty()) return;

  container.html("");
  const loading = container.append("p").text("Loading day-of-week prices...");

  try {
    const [highestData, lowestData] = await Promise.all([
      d3.csv(highestPriceFile, d3.autoType),
      d3.csv(lowestPriceFile, d3.autoType)
    ]);

    const parseDate = d3.timeParse("%m/%d/%Y");

    function getMonthIndex(d) {
      const dt = d.date instanceof Date ? d.date : parseDate(d.date);
      return dt ? dt.getMonth() : null; // 0–11
    }

    const cellMap = new Map();

    function addToCells(data, kind) {
      data.forEach(d => {
        const m = getMonthIndex(d);
        const dayLabel = d.day_of_week;
        if (m == null || !HEATMAP_DOW_LABELS.includes(dayLabel)) return;

        const key = `${m}|${dayLabel}`;
        if (!cellMap.has(key)) {
          cellMap.set(key, {
            monthIndex: m,
            monthLabel: HEATMAP_MONTH_LABELS[m],
            dayLabel,
            lowestSum: 0,
            lowestCount: 0,
            highestSum: 0,
            highestCount: 0
          });
        }
        const cell = cellMap.get(key);

        if (kind === "lowest") {
          cell.lowestSum += d.price;
          cell.lowestCount += 1;
        } else if (kind === "highest") {
          cell.highestSum += d.price;
          cell.highestCount += 1;
        }
      });
    }

    addToCells(lowestData, "lowest");
    addToCells(highestData, "highest");

    const cells = Array.from(cellMap.values()).map(c => ({
      ...c,
      avgLowest:
        c.lowestCount > 0 ? c.lowestSum / c.lowestCount : null,
      avgHighest:
        c.highestCount > 0 ? c.highestSum / c.highestCount : null
    }));

    const validCells = cells.filter(c => c.avgLowest != null);

    if (validCells.length === 0) {
      loading.text("No valid day-of-week data found.");
      return;
    }

    loading.remove();
    renderDailyHeatmapChart(container, validCells);
  } catch (err) {
    console.error("Error loading daily heatmap data:", err);
    loading.text("Error loading day-of-week visualization. Check console.");
  }
}

function renderDailyHeatmapChart(container, cells) {
  const margin = { top: 24, right: 180, bottom: 48, left: 96 };
  const width = 720;
  const height = 320;

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const monthsUsed = Array.from(
    new Set(cells.map(c => c.monthIndex))
  ).sort((a, b) => a - b);
  const monthLabelsUsed = monthsUsed.map(m => HEATMAP_MONTH_LABELS[m]);

  const x = d3
    .scaleBand()
    .domain(HEATMAP_DOW_LABELS)
    .range([0, innerWidth])
    .padding(0.05);

  const y = d3
    .scaleBand()
    .domain(monthLabelsUsed)
    .range([0, innerHeight])
    .padding(0.08);

  const minPrice = d3.min(cells, c => c.avgLowest);
  const maxPrice = d3.max(cells, c => c.avgLowest);

  const color = d3
    .scaleSequential()
    .domain([minPrice, maxPrice])
    .interpolator(d3.interpolateYlGnBu);

  // Axes
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y);

  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", innerWidth / 2)
    .attr("y", 36)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .attr("font-weight", "600")
    .text("Day of the week");

  g.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -72)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .attr("font-weight", "600")
    .text("Month");

  d3.select("body").selectAll(".bc-tooltip").remove();

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "bc-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "#ffffff")
    .style("border", "1px solid #e5e7eb")
    .style("box-shadow", "0 10px 25px rgba(15, 23, 42, 0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px 12px")
    .style("font-size", "13px")
    .style("line-height", "1.4")
    .style("color", "#0f172a")
    .style("opacity", 0);

  // Heatmap cells
  g.selectAll("rect")
    .data(cells)
    .enter()
    .append("rect")
    .attr("x", d => x(d.dayLabel))
    .attr("y", d => y(d.monthLabel))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("fill", d => color(d.avgLowest))
    .on("mouseenter", function (event, d) {
      d3.select(this)
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 1.2);

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.monthLabel} – ${d.dayLabel}</strong><br/>
           Avg lowest price: $${d.avgLowest.toFixed(0)}<br/>
           ${
             d.avgHighest != null
               ? `Avg highest price: $${d.avgHighest.toFixed(0)}<br/>`
               : ""
           }`
        )
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", function () {
      d3.select(this).attr("stroke", "none");
      tooltip.style("opacity", 0);
    });

const legendWidth = 14;      // skinny vertical bar
const legendHeight = 160;    // tall legend

const legend = g
  .append("g")
  .attr("transform", `translate(${innerWidth + 40}, 20)`); // right side

const defs = svg.append("defs");
const gradientId = "price-gradient";

const gradient = defs
  .append("linearGradient")
  .attr("id", gradientId)
  .attr("x1", "0%")
  .attr("x2", "0%")
  .attr("y1", "100%")  // bottom
  .attr("y2", "0%");   // top

gradient
  .append("stop")
  .attr("offset", "0%")          // bottom
  .attr("stop-color", color(minPrice));

gradient
  .append("stop")
  .attr("offset", "100%")        // top
  .attr("stop-color", color(maxPrice));

legend
  .append("rect")
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .attr("fill", `url(#${gradientId})`)
  .attr("rx", 3)
  .attr("ry", 3);

legend
  .append("text")
  .attr("x", legendWidth / 2)
  .attr("y", -6)
  .attr("font-size", 11)
  .attr("text-anchor", "middle")
  .text(`Highest ($${maxPrice.toFixed(0)})`);

legend
  .append("text")
  .attr("x", legendWidth / 2)
  .attr("y", legendHeight + 16)
  .attr("font-size", 11)
  .attr("text-anchor", "middle")
  .text(`Lowest ($${minPrice.toFixed(0)})`);
  }

// =============================
// SECTION 5: Scatterplot – ticket price vs time of day
// =============================

async function initTimeOfDayVis() {
  const container = d3.select("#tod-scatter-chart");
  if (container.empty()) return;

  container.html("");
  const loading = container.append("p").text("Loading time-of-day prices...");

  try {
    const [highestData, lowestData] = await Promise.all([
      d3.csv(highestPriceFile, d3.autoType),
      d3.csv(lowestPriceFile, d3.autoType)
    ]);

    const parseTimeOfDay = d3.timeParse("%H:%M");

    function getHourNumber(d) {
      const dt =
        d.depart_time instanceof Date
          ? d.depart_time
          : parseTimeOfDay(d.depart_time);
      if (!dt) return null;
      return dt.getHours() + dt.getMinutes() / 60; // 0–24
    }

    const points = [];

    lowestData.forEach(d => {
      const hour = getHourNumber(d);
      if (hour == null || isNaN(d.price)) return;
      points.push({
        type: "lowest",
        price: +d.price,
        hour,
        airline: d.airline,
        date: d.date
      });
    });

    highestData.forEach(d => {
      const hour = getHourNumber(d);
      if (hour == null || isNaN(d.price)) return;
      points.push({
        type: "highest",
        price: +d.price,
        hour,
        airline: d.airline,
        date: d.date
      });
    });

    if (points.length === 0) {
      loading.text("No valid time-of-day data found.");
      return;
    }

    loading.remove();
    renderTimeOfDayScatter(container, points);
  } catch (err) {
    console.error("Error loading time-of-day data:", err);
    loading.text("Error loading time-of-day visualization. Check console.");
  }
}

function renderTimeOfDayScatter(container, points) {
  const margin = { top: 20, right: 32, bottom: 52, left: 72 };
  const width = 720;
  const height = 320;

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X is time of day (hours, 0–24)
  const x = d3
    .scaleLinear()
    .domain([0, 24])
    .range([0, innerWidth]);

  // Y is ticket price
  const maxPrice = d3.max(points, d => d.price);
  const y = d3
    .scaleLinear()
    .domain([0, maxPrice * 1.1])
    .nice()
    .range([innerHeight, 0]);

  const xAxis = d3
    .axisBottom(x)
    .ticks(8)
    .tickFormat(h => {
      const hour = Math.round(h);
      const suffix = hour < 12 ? "am" : "pm";
      const display =
        hour % 12 === 0 ? 12 : hour % 12; // 0 -> 12am, 13 -> 1pm
      return `${display}${suffix}`;
    });

  const yAxis = d3
    .axisLeft(y)
    .ticks(6)
    .tickFormat(d => `$${Math.round(d)}`);

  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", innerWidth / 2)
    .attr("y", 40)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .attr("font-weight", "600")
    .text("Departure time of day");

  g.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -52)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .attr("font-weight", "600")
    .text("Ticket price (CAD)");

  const colorLowest = "#0ea5e9";  
  const colorHighest = "#f97316"; 

  // Tooltip
  d3.select("body").selectAll(".bc-tooltip").remove();

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "bc-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "#ffffff")
    .style("border", "1px solid #e5e7eb")
    .style("box-shadow", "0 10px 25px rgba(15, 23, 42, 0.1)")
    .style("border-radius", "8px")
    .style("padding", "10px 12px")
    .style("font-size", "13px")
    .style("line-height", "1.4")
    .style("color", "#0f172a")
    .style("opacity", 0);

  // Points
  g.selectAll(".tod-point")
    .data(points)
    .enter()
    .append("circle")
    .attr("class", "tod-point")
    .attr("cx", d => x(d.hour))
    .attr("cy", d => y(d.price))
    .attr("r", 4)
    .attr("fill", d =>
      d.type === "lowest" ? colorLowest : colorHighest
    )
    .attr("fill-opacity", 0.7)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1)
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("r", 5.5);

      const hour = Math.floor(d.hour);
      const minutes = Math.round((d.hour - hour) * 60);
      const suffix = hour < 12 ? "am" : "pm";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const timeLabel = `${displayHour}:${minutes
        .toString()
        .padStart(2, "0")}${suffix}`;

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.type === "lowest" ? "Lowest-price search" : "Highest-price search"}</strong><br/>
           Date: ${d.date}<br/>
           Airline: ${d.airline}<br/>
           Departure: ${timeLabel}<br/>
           Price: $${d.price.toFixed(0)}`
        )
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", function () {
      d3.select(this).attr("r", 4);
      tooltip.style("opacity", 0);
    });

  // Legend
  const legend = g
    .append("g")
    .attr("transform", `translate(${innerWidth - 150}, 10)`);

  legend
    .append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", 5)
    .attr("fill", colorLowest)
    .attr("fill-opacity", 0.7);

  legend
    .append("text")
    .attr("x", 10)
    .attr("y", 4)
    .attr("font-size", 12)
    .text("Lowest price searches");

  legend
    .append("circle")
    .attr("cx", 0)
    .attr("cy", 20)
    .attr("r", 5)
    .attr("fill", colorHighest)
    .attr("fill-opacity", 0.7);

  legend
    .append("text")
    .attr("x", 10)
    .attr("y", 24)
    .attr("font-size", 12)
    .text("Highest price searches");
}

// =============================
// Initialize visualizations
// =============================

document.addEventListener("DOMContentLoaded", () => {
  initBCShareVis();
  initMonthlyPriceVis();
  initWeeklyPriceVis();
  initDailyHeatmapVis();
  initTimeOfDayVis();
});


