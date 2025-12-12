// ======================================================
// SECTION 3: Monthly cheapest vs most expensive flight prices
// With Scrollytelling-style Annotations (Gate C)
// ======================================================

const highestPriceFile =
  "data/Flights_From_Vancouver_to_Toronto_HighestPrice_clean.csv";
const lowestPriceFile =
  "data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

let monthlyDataGlobal = [];
let monthSvg, xMonthScale, yMonthScale;

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
        avgLowest: d.lowestCount > 0 ? d.lowestSum / d.lowestCount : null,
        avgHighest: d.highestCount > 0 ? d.highestSum / d.highestCount : null
      }));

    monthlyDataGlobal = monthlyData;

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

  monthSvg = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  xMonthScale = d3.scaleLinear()
    .domain([0, data.length - 1])
    .range([0, innerWidth]);

  const allPrices = data.flatMap(d => [d.avgLowest, d.avgHighest]);
  const maxPrice = d3.max(allPrices);

  yMonthScale = d3.scaleLinear()
    .domain([0, maxPrice * 1.1])
    .nice()
    .range([innerHeight, 0]);

  const xAxis = d3.axisBottom(xMonthScale)
    .ticks(data.length)
    .tickFormat(i => data[i] ? data[i].label : "");

  const yAxis = d3.axisLeft(yMonthScale)
    .ticks(6)
    .tickFormat(d => `$${Math.round(d)}`);

  monthSvg.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(xAxis);

  monthSvg.append("g")
    .call(yAxis);

  // Lines
  const lineLowest = d3.line()
    .x((d, i) => xMonthScale(i))
    .y(d => yMonthScale(d.avgLowest))
    .defined(d => d.avgLowest != null)
    .curve(d3.curveMonotoneX);

  const lineHighest = d3.line()
    .x((d, i) => xMonthScale(i))
    .y(d => yMonthScale(d.avgHighest))
    .defined(d => d.avgHighest != null)
    .curve(d3.curveMonotoneX);

  monthSvg.append("path")
    .datum(data)
    .attr("class", "line-lowest")
    .attr("fill", "none")
    .attr("stroke", "#0ea5e9")
    .attr("stroke-width", 3)
    .attr("d", lineLowest);

  monthSvg.append("path")
    .datum(data)
    .attr("class", "line-highest")
    .attr("fill", "none")
    .attr("stroke", "#f97316")
    .attr("stroke-width", 3)
    .attr("d", lineHighest);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "month-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "10px")
    .style("opacity", 0);

  const allPoints = [];

  data.forEach((d, i) => {
    if (d.avgLowest != null)
      allPoints.push({
        line: "Lowest",
        monthIndex: i,
        month: d.label,
        price: d.avgLowest
      });
    if (d.avgHighest != null)
      allPoints.push({
        line: "Highest",
        monthIndex: i,
        month: d.label,
        price: d.avgHighest
      });
  });

  // Draw points
  monthSvg.selectAll(".month-point")
    .data(allPoints)
    .enter()
    .append("circle")
    .attr("class", "month-point")
    .attr("cx", d => xMonthScale(d.monthIndex))
    .attr("cy", d => yMonthScale(d.price))
    .attr("r", 5)
    .attr("fill", d => d.line === "Lowest" ? "#0ea5e9" : "#f97316")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("r", 7);

      tooltip.style("opacity", 1)
        .html(`
          <strong>Month:</strong> ${d.month}<br/>
          <strong>Price Type:</strong> ${d.line}<br/>
          <strong>Average Price:</strong> $${d.price.toFixed(0)}
        `)
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY + "px");
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 16 + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseleave", function () {
      d3.select(this).attr("r", 5);
      tooltip.style("opacity", 0);
    });
}


// ======================================================
// ANNOTATION UTILITIES FOR SCROLL-TRIGGERED EVENTS
// ======================================================

function clearMonthAnnotations() {
  monthSvg.selectAll(".month-annotation").remove();
  monthSvg.selectAll(".month-rect").remove();
}


// ------------------------------------------------------
// 1) Winter Annotation (Nov + Dec)
// ------------------------------------------------------
function showWinterAnnotation() {
  console.log("wintermonths triggered");
  clearMonthAnnotations();

  const winterMonths = [10, 11]; // November, December

  const x0 = xMonthScale(winterMonths[0]);
  const x1 = xMonthScale(winterMonths[1]);
  const width = x1 - x0 + 40;
  const height = yMonthScale(0);

  monthSvg.append("rect")
    .attr("class", "month-rect")
    .attr("x", x0 - 20)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "rgba(30, 136, 229, 0.25)");

  const annotation = monthSvg.append("g")
    .attr("class", "month-annotation")
    .attr("transform", `translate(${x0}, 40)`);

  annotation.append("rect")
    .attr("width", 450)
    .attr("height", 45)
    .attr("x", -425)
    .attr("y", -15)
    .attr("fill", "rgba(30, 136, 229, 0.7)")
    .attr("rx", 6);

  annotation.append("text")
    .attr("x", -200)
    .attr("y", 10)
    .attr("fill", "white")
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .text("Ticket prices generally increase in November and December.");
}


// ------------------------------------------------------
// 2) Summer Annotation (Jun, Jul, Aug)
// ------------------------------------------------------
function showSummerAnnotation() {
  console.log("summermonths triggered")

  clearMonthAnnotations();

  const summerMonths = [5, 6, 7];

  const x0 = xMonthScale(summerMonths[0]);
  const x2 = xMonthScale(summerMonths[2]);
  const width = x2 - x0 + 40;
  const height = yMonthScale(0);

  monthSvg.append("rect")
    .attr("class", "month-rect")
    .attr("x", x0 - 20)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "rgba(30, 136, 229, 0.25)");

  const annotation = monthSvg.append("g")
    .attr("class", "month-annotation")
    .attr("transform", `translate(${x0}, 40)`);

  annotation.append("rect")
    .attr("width", 450)
    .attr("height", 45)
    .attr("x", -225)
    .attr("y", -15)
    .attr("fill", "rgba(30, 136, 229, 0.7)")
    .attr("rx", 6);

  annotation.append("text")
    .attr("x", 0)
    .attr("y", 10)
    .attr("fill", "white")
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .text("There is a slight ticket price increase during summer months.");
}

initMonthlyPriceVis();
