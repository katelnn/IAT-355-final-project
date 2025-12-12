// =============================================================
// Gate E – Calendar Heatmap (HIGHEST Prices Only) WITH YEAR FIELD
// =============================================================

const HEATMAP_MONTH_LABELS_H = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const HEATMAP_DOW_LABELS_H = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function initHeatmapHighest() {
    const container = d3.select("#daily-heatmap-chart-highest");
    if (container.empty()) return;

    container.html("");
    container.style("position", "relative");
    container.style("overflow", "visible");

    const loading = container.append("p").text("Loading highest-price heatmap...");

    try {
        const [highestData, lowestData] = await Promise.all([
            d3.csv(highestPriceFile, d3.autoType),
            d3.csv(lowestPriceFile, d3.autoType)
        ]);

        const parseDate = d3.timeParse("%m/%d/%Y");
        const cellMap = new Map();

        highestData.forEach(d => {
            const dt = parseDate(d.date);
            if (!dt) return;

            const year = dt.getFullYear();
            const monthIndex = dt.getMonth();
            const dow = d.day_of_week;

            if (!HEATMAP_DOW_LABELS_H.includes(dow)) return;

            const key = `${monthIndex}|${dow}`;
            if (!cellMap.has(key)) {
                cellMap.set(key, {
                    monthIndex,
                    monthLabel: HEATMAP_MONTH_LABELS_H[monthIndex],
                    dayLabel: dow,
                    sum: 0,
                    count: 0,
                    years: new Set()
                });
            }

            const cell = cellMap.get(key);
            cell.sum += d.price;
            cell.count++;
            cell.years.add(year);
        });

        const cells = Array.from(cellMap.values()).map(c => ({
            ...c,
            avg: c.count ? c.sum / c.count : null,
            yearList: Array.from(c.years).sort()
        }));

        loading.remove();
        renderHeatmapHighest(container, cells);

    } catch (err) {
        console.error("Highest heatmap load error:", err);
        loading.text("Error loading visualization.");
    }
}

function renderHeatmapHighest(container, cells) {
    const margin = { top: 10, right: 90, bottom: 30, left: 30 };
    const width = 500;
    const height = 340;

    const decCells = cells.filter(c => c.monthIndex === 11);
    const decYears = new Set(decCells.flatMap(c => c.yearList));
    let monthOrder;

    if (decYears.size === 1 && [...decYears][0] === 2025) {
        monthOrder = ["Dec", ...HEATMAP_MONTH_LABELS_H.slice(0, 11)];
    } else {
        monthOrder = HEATMAP_MONTH_LABELS_H;
    }

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand()
        .domain(HEATMAP_DOW_LABELS_H)
        .range([0, innerWidth])
        .padding(0.05);

    const y = d3.scaleBand()
        .domain(monthOrder)
        .range([0, innerHeight])
        .padding(0.08);

    const minVal = d3.min(cells, d => d.avg);
    const maxVal = d3.max(cells, d => d.avg);

    const color = d3.scaleSequential().domain([minVal, maxVal]).interpolator(d3.interpolateYlGnBu);

    g.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    container.selectAll(".heatmap-tooltip-highest").remove();
    const tooltip = container.append("div")
        .attr("class", "heatmap-tooltip-highest")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ddd")
        .style("padding", "10px 12px")
        .style("border-radius", "8px")
        .style("pointer-events", "none")
        .style("font-size", "13px")
        .style("opacity", 0);

    g.selectAll("rect")
        .data(cells)
        .enter()
        .append("rect")
        .attr("x", d => x(d.dayLabel))
        .attr("y", d => y(d.monthLabel))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", d => color(d.avg))
        .on("mouseenter", function (event, d) {
            d3.select(this).attr("stroke", "#000").attr("stroke-width", 1.3);

            const box = container.node().getBoundingClientRect();
            const yearsText = d.yearList.length > 1
                ? `Years: ${d.yearList.join(", ")}`
                : `Year: ${d.yearList[0]}`;

            tooltip.html(`
          <strong>${d.monthLabel} – ${d.dayLabel}</strong><br>
          Avg Highest Price: $${d.avg.toFixed(0)}<br>
          ${yearsText}
        `)
                .style("left", (event.clientX - box.left + 16) + "px")
                .style("top", (event.clientY - box.top - 10) + "px")
                .style("opacity", 1);
        })
        .on("mousemove", function (event) {
            const box = container.node().getBoundingClientRect();
            tooltip.style("left", (event.clientX - box.left + 16) + "px")
                .style("top", (event.clientY - box.top - 10) + "px");
        })
        .on("mouseleave", function () {
            d3.select(this).attr("stroke", "none");
            tooltip.style("opacity", 0);
        });

    const legend = g.append("g").attr("transform", `translate(${innerWidth + 40}, 20)`);

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient")
        .attr("id", "grad-highest")
        .attr("x1", "0%").attr("x2", "0%")
        .attr("y1", "100%").attr("y2", "0%");

    grad.append("stop").attr("offset", "0%").attr("stop-color", color(minVal));
    grad.append("stop").attr("offset", "100%").attr("stop-color", color(maxVal));

    legend.append("rect").attr("width", 14).attr("height", 160).attr("fill", "url(#grad-highest)");

    legend.append("text").attr("x", 7).attr("y", -6).attr("text-anchor", "middle")
        .text(`High ($${maxVal.toFixed(0)})`);

    legend.append("text").attr("x", 7).attr("y", 176).attr("text-anchor", "middle")
        .text(`Low ($${minVal.toFixed(0)})`);

    window.heatmapHighest_yScale = y;
    window.heatmapHighest_overlay = g.append("g").attr("class", "heatmap-overlay-highest");

}

initHeatmapHighest();
