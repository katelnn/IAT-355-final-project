
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
 
initTimeOfDayVis();


