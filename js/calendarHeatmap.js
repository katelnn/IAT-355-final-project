// =============================
// SECTION 4: Calendar heatmap – day of week vs month. 
// FUTURE PLANS: make another heatmap for the highest prices. 
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
  
initDailyHeatmapVis();