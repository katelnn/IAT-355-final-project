// =============================================
// Gate F — Time of Day Scatter (Gate E–style API)
// =============================================

(() => {

  let svg, g, xScale, yScale;
  let innerWidth, innerHeight;

  //  Exposed for gateFDesc.js
  window.tod_xScale = null;
  window.tod_overlay = null;

  async function initTimeOfDayVis() {
    const container = d3.select("#tod-scatter-chart");
    if (container.empty()) return;

    container.html("");

    const [highestData, lowestData] = await Promise.all([
      d3.csv(highestPriceFile, d3.autoType),
      d3.csv(lowestPriceFile, d3.autoType)
    ]);

    const parseTime = d3.timeParse("%H:%M");

    function hourValue(d) {
      const t = d.depart_time instanceof Date
        ? d.depart_time
        : parseTime(d.depart_time);
      return t ? t.getHours() + t.getMinutes() / 60 : null;
    }

    const points = [];

    lowestData.forEach(d => {
      const h = hourValue(d);
      if (h != null && !isNaN(d.price)) {
        points.push({
          type: "lowest",
          hour: h,
          price: +d.price,
          airline: d.airline,
          date: d.date
        });
      }
    });

    highestData.forEach(d => {
      const h = hourValue(d);
      if (h != null && !isNaN(d.price)) {
        points.push({
          type: "highest",
          hour: h,
          price: +d.price,
          airline: d.airline,
          date: d.date
        });
      }
    });

    render(container, points);
  }

  function render(container, points) {
    const margin = { top: 20, right: 30, bottom: 52, left: 72 };
    const width = 720;
    const height = 320;

    // Tooltip (reuse your bc-tooltip class)
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


    svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    innerWidth = width - margin.left - margin.right;
    innerHeight = height - margin.top - margin.bottom;

    g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // ------------------
    // Scales
    // ------------------
    xScale = d3.scaleLinear()
      .domain([0, 24])
      .range([0, innerWidth]);

    yScale = d3.scaleLinear()
      .domain([0, d3.max(points, d => d.price) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // Expose for gateFDesc.js
    window.tod_xScale = xScale;

    // ------------------
    // Axes
    // ------------------
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(8)
          .tickFormat(h => {
            const hr = Math.round(h);
            const suf = hr < 12 ? "am" : "pm";
            const disp = hr % 12 === 0 ? 12 : hr % 12;
            return `${disp}${suf}`;
          })
      );

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => `$${Math.round(d)}`));

    // ------------------
    // Overlay layer (for Gate F highlights)
    // ------------------
    window.tod_overlay = g.append("g")
      .attr("class", "gateF-overlay")
      .style("pointer-events", "none");

    // ------------------
    // Points
    // ------------------
    g.selectAll(".tod-point")
      .data(points)
      .enter()
      .append("circle")
      .attr("class", "tod-point")
      .attr("cx", d => xScale(d.hour))
      .attr("cy", d => yScale(d.price))
      .attr("r", 4)
      .attr("fill", d => d.type === "lowest" ? "#0ea5e9" : "#f97316")
      .attr("fill-opacity", 0.7)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", 5.5);

        const hour = Math.floor(d.hour);
        const minutes = Math.round((d.hour - hour) * 60);
        const suffix = hour < 12 ? "am" : "pm";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const timeLabel = `${displayHour}:${minutes.toString().padStart(2, "0")}${suffix}`;

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

  }

  initTimeOfDayVis();

})();
