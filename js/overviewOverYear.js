// =============================
// SECTION 2.1: bar graph throughout the year -> future plans: instead of making the slider about cheapest & highest, make it a tick box instead. Then the cheapest-highest slider can be more for years. 
// =============================

async function initDailyBarChart() {
  const container = d3.select("#daily-bar-chart");
  if (container.empty()) return;

  container.html("");

  const margin = { top: 30, right: 30, bottom: 90, left: 70 };
  const width  = 1000 - margin.left - margin.right;
  const height = 500  - margin.top  - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const parseDate = d3.timeParse("%m/%d/%Y");

  const [highestRaw, lowestRaw] = await Promise.all([
    d3.csv("data/Flights_From_Vancouver_to_Toronto_HighestPrice_clean.csv"),
    d3.csv("data/Flights_From_Vancouver_to_Toronto_LowestPrice_clean.csv")
  ]);


  const highest = highestRaw.map(d => ({
    date: parseDate(d.date),
    label: d.date,   
    price: +d.price
  })).filter(d => d.date && !isNaN(d.price));

  const lowest = lowestRaw.map(d => ({
    date: parseDate(d.date),
    label: d.date,
    price: +d.price
  })).filter(d => d.date && !isNaN(d.price));

  
  const merged = highest.map(h => {
    const match = lowest.find(l => l.label === h.label);
    return {
      label: h.label,
      date: h.date,
      highest: h.price,
      lowest: match ? match.price : null
    };
  });

 
  const x0 = d3.scaleBand()
    .domain(merged.map(d => d.label))
    .range([0, width])
    .padding(0.2);

  
  const x1 = d3.scaleBand()
    .domain(["lowest", "highest"])
    .range([0, x0.bandwidth()])
    .padding(0.05);


  const y = d3.scaleLinear()
    .domain([0, 2400])
    .range([height, 0]);

  const xAxis = d3.axisBottom(x0)
    .tickValues(
      merged
        .filter((_, i) => i % 7 === 0) 
        .map(d => d.label)
    );

  const yAxis = d3.axisLeft(y)
    .tickValues(d3.range(0, 2401, 200));


  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-65)")
    .attr("dx", "-0.8em")
    .attr("dy", "0.15em");



  svg.append("g").call(yAxis);

  
  const color = {
    lowest: "#0ea5e9",   
    highest: "#f97316"   
  };


  const groups = svg
    .selectAll(".day-group")
    .data(merged)
    .enter()
    .append("g")
    .attr("class", "day-group")
    .attr("transform", d => `translate(${x0(d.label)},0)`);


  const types = ["lowest", "highest"];

  groups.selectAll("rect")
    .data(d => types.map(t => ({ type: t, value: d[t] })))
    .enter()
    .append("rect")
    .attr("class", d => d.type === "lowest" ? "bar-lowest" : "bar-highest") 
    .attr("x", d => x1(d.type))
    .attr("y", d => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.value))
    .attr("fill", d => color[d.type]);

  
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 160}, 10)`);

  legend.append("rect")
    .attr("x", 0).attr("y", 0)
    .attr("width", 12).attr("height", 12)
    .attr("fill", color.lowest);

  legend.append("text")
    .attr("x", 20).attr("y", 10)
    .text("Lowest Price");

  legend.append("rect")
    .attr("x", 0).attr("y", 22)
    .attr("width", 12).attr("height", 12)
    .attr("fill", color.highest);

  legend.append("text")
    .attr("x", 20).attr("y", 32)
    .text("Highest Price");

  // ==============================
  // slider logic
  // ==============================

  const lowestBars  = svg.selectAll(".bar-lowest");
  const highestBars = svg.selectAll(".bar-highest");


  lowestBars.style("opacity", 1);
  highestBars.style("opacity", 0.15);

  const slider = document.getElementById("price-mode-slider");
  const plane  = document.getElementById("plane-handle");
  
  const trackWrapper = document.querySelector(".slider-track-wrapper");
  if (trackWrapper && slider) {
    trackWrapper.style.height = `${height}px`;
    slider.style.height = `${height}px`;
  }

function updateMode(rawValue) {
  const v = Number(rawValue);

  const slider = document.getElementById("price-mode-slider");
  const maxVal = slider ? Number(slider.max) || 1 : 1;
  const t = Math.min(Math.max(v / maxVal, 0), 1);


  const lowestOpacity  = 1 - 0.85 * t;  
  const highestOpacity = 0.15 + 0.85 * t; 

  lowestBars
    .transition()
    .duration(150)
    .style("opacity", lowestOpacity);

  highestBars
    .transition()
    .duration(150)
    .style("opacity", highestOpacity);

  
  if (plane) {
    const pct = 100 - t * 100; 
    plane.style.top = `${pct}%`;
  }
}

  if (slider) {
    updateMode(+slider.value);

    slider.addEventListener("input", e => {
      const v = +e.target.value; 
      updateMode(v);
    });
  }
}

initDailyBarChart();