// =============================
// SECTION 3: Monthly cheapest vs most expensive flight prices
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

initMonthlyPriceVis();
