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

 initWeeklyPriceVis();