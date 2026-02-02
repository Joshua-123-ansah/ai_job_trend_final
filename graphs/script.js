const CSV_PATH = "../ai_job_trends_dataset.csv";

const impactLevels = ["Low", "Moderate", "High"];
const impactLookup = new Map([
  ["Low", 1],
  ["Moderate", 2],
  ["High", 3],
]);
const trendColor = new Map([
  ["Job Creation", "#2ecc71"],
  ["Job Loss", "#e74c3c"],
]);

const svg = d3.select("#viz");
const tooltip = d3.select("#tooltip");
const trendFilterEl = document.querySelector("#trend-filter");
const impactButtons = document.querySelectorAll(".pill-toggle__btn");
const jobListEl = document.querySelector("#job-list");
const detailCountEl = document.querySelector("#details-count");

const margin = { top: 52, right: 56, bottom: 76, left: 220 };
let width = 0;
let height = 0;

const xScale = d3.scalePoint().domain([1, 2, 3]).padding(0.7);
const yScale = d3.scaleLinear();
const sizeScale = d3.scaleSqrt().range([12, 72]);

const axisBottom = svg.append("g").attr("class", "axis axis--x");
const axisLeft = svg.append("g").attr("class", "axis axis--y");
const gridLines = svg.append("g").attr("class", "grid-lines");
const zeroLine = svg.append("g").attr("class", "zero-line");
const bubblesGroup = svg.append("g").attr("class", "bubbles");
const axisTitleGroup = svg.append("g").attr("class", "axis-titles");

const xAxisTitle = axisTitleGroup
  .append("text")
  .attr("class", "axis-title axis-title--x")
  .attr("text-anchor", "middle")
  .text("AI Impact Intensity (Low → High)");

const yAxisTitle = axisTitleGroup
  .append("text")
  .attr("class", "axis-title axis-title--y")
  .attr("text-anchor", "middle")
  .text("Net Job Change % (2024–2030)");

setupDefs();
setupBackground();

const state = {
  trend: "all",
  impact: "all",
  summary: [],
  jobsByIndustry: new Map(),
  selectedIndustry: null,
};

window.addEventListener("resize", () => {
  computeDimensions();
  renderAxes();
  drawBubbles(false);
});

trendFilterEl.addEventListener("change", (event) => {
  state.trend = event.target.value;
  drawBubbles(true);
});

impactButtons.forEach((button) => {
  button.addEventListener("click", () => {
    impactButtons.forEach((btn) => btn.classList.remove("is-active"));
    button.classList.add("is-active");
    state.impact = button.dataset.impact;
    drawBubbles(true);
  });
});

d3.csv(CSV_PATH, (row) => ({
  JobTitle: row["Job Title"],
  Industry: row["Industry"],
  JobOpenings2024: +row["Job Openings (2024)"] || 0,
  ProjectedOpenings2030: +row["Projected Openings (2030)"] || 0,
  ImpactLevel: row["AI Impact Level"],
}))
  .then((rows) => {
    const summary = buildIndustrySummary(rows);
    const jobsByIndustry = d3.group(rows, (d) => d.Industry);

    state.summary = summary;
    state.jobsByIndustry = jobsByIndustry;

    const yExtent = d3.extent(summary, (d) => d.jobChangePct);
    const defaultPadding = 5;
    yScale
      .domain([
        Math.min(yExtent[0] ?? -defaultPadding, -defaultPadding),
        Math.max(yExtent[1] ?? defaultPadding, defaultPadding),
      ])
      .nice();

    sizeScale.domain([0, d3.max(summary, (d) => d.absJobChangePct) || 20]);

    computeDimensions();
    renderAxes();
    drawBubbles(false);
  })
  .catch((error) => {
    console.error("Data load failed:", error);
    tooltip
      .classed("is-visible", true)
      .style("left", "50%")
      .style("top", "50%")
      .html(
        `<div class="tooltip__heading">Dataset unavailable</div>
         <div>We couldn't load <strong>${CSV_PATH}</strong>. Make sure the CSV sits one directory above <strong>jsversion/</strong> and reload.</div>`
      );
  });

function buildIndustrySummary(rows) {
  const grouped = d3.group(rows, (d) => d.Industry);

  return Array.from(grouped, ([industry, records]) => {
    const jobChange = d3.sum(
      records,
      (d) => d.ProjectedOpenings2030 - d.JobOpenings2024
    );
    const openings2024 = d3.sum(records, (d) => d.JobOpenings2024);
    const jobChangePct = openings2024
      ? ((jobChange / openings2024) * 100)
      : 0;
    const impactLevel = mostCommon(records.map((d) => d.ImpactLevel));

    return {
      industry,
      impactLevel,
      impactNumeric: impactLookup.get(impactLevel) ?? 0,
      jobChange,
      jobChangePct,
      absJobChangePct: Math.abs(jobChangePct),
      trend: jobChangePct >= 0 ? "Job Creation" : "Job Loss",
    };
  }).sort((a, b) => d3.ascending(a.impactNumeric, b.impactNumeric));
}

function mostCommon(values) {
  const counts = d3.rollup(values, (arr) => arr.length, (value) => value);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : "Unknown";
}

function computeDimensions() {
  const container = svg.node().parentElement;
  const nodeWidth = container.clientWidth || 960;
  const nodeHeight = container.clientHeight || 600;

  width = Math.max(nodeWidth - margin.left - margin.right, 320);
  height = Math.max(nodeHeight - margin.top - margin.bottom, 320);

  svg
    .attr("width", nodeWidth)
    .attr("height", nodeHeight)
    .attr("viewBox", `0 0 ${nodeWidth} ${nodeHeight}`);

  xScale.range([margin.left, margin.left + width]);
  yScale.range([margin.top + height, margin.top]);

  axisBottom.attr("transform", `translate(0, ${margin.top + height})`);
  axisLeft.attr("transform", `translate(${margin.left}, 0)`);

  xAxisTitle.attr(
    "transform",
    `translate(${margin.left + width / 2}, ${margin.top + height + 56})`
  );
  yAxisTitle.attr(
    "transform",
    `translate(${margin.left - 72}, ${margin.top + height / 2}) rotate(-90)`
  );

  svg
    .select(".plot-background")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width)
    .attr("height", height);
}

function renderAxes() {
  const axisTransition = d3
    .transition()
    .duration(600)
    .ease(d3.easeCubicOut);

  axisBottom
    .transition(axisTransition)
    .call(
      d3
        .axisBottom(xScale)
        .tickFormat((d) => impactLevels[d - 1] || d)
    )
    .selectAll("text")
    .style("font-size", "0.95rem")
    .style("font-weight", 600)
    .style("fill", "#4c5773");

  axisLeft
    .transition(axisTransition)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(7)
        .tickFormat((d) => `${d3.format(".1f")(d)}%`)
    )
    .selectAll("text")
    .style("font-size", "0.9rem")
    .style("fill", "#4c5773");

  axisBottom.selectAll("path,line").attr("opacity", 0.35);
  axisLeft.selectAll("path,line").attr("opacity", 0.35);

  gridLines
    .transition(axisTransition)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(7)
        .tickSize(-width)
        .tickFormat("")
    )
    .selectAll("line")
    .attr("stroke", "rgba(76,87,115,0.12)")
    .attr("stroke-dasharray", "4 8");

  gridLines.select(".domain").remove();

  zeroLine
    .selectAll("line")
    .data([0])
    .join("line")
    .attr("x1", margin.left)
    .attr("x2", margin.left + width)
    .transition(axisTransition)
    .attr("y1", (d) => yScale(d))
    .attr("y2", (d) => yScale(d))
    .attr("stroke", "rgba(108,92,231,0.35)")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "10 10");
}

function drawBubbles(withAnimation) {
  const filtered = state.summary.filter((d) => {
    const matchesTrend =
      state.trend === "all" || d.trend === state.trend;
    const matchesImpact =
      state.impact === "all" || d.impactLevel === state.impact;
    return matchesTrend && matchesImpact;
  });

  const bubbleTransition = d3
    .transition("bubbles")
    .duration(withAnimation ? 650 : 850)
    .ease(d3.easeCubicOut);

  const bubbleJoin = bubblesGroup
    .selectAll(".bubble")
    .data(filtered, (d) => d.industry);

  const bubbleEnter = bubbleJoin
    .enter()
    .append("g")
    .attr("class", "bubble")
    .attr(
      "transform",
      (d) => `translate(${xScale(d.impactNumeric)}, ${margin.top + height})`
    )
    .style("opacity", 0);

  bubbleEnter
    .append("circle")
    .attr("r", 0)
    .attr("fill", (d) => trendColor.get(d.trend))
    .attr("fill-opacity", 0.9)
    .attr("stroke", "rgba(15,19,30,0.16)")
    .attr("stroke-width", 1.5)
    .style("filter", "url(#bubbleShadow)");

  bubbleEnter
    .append("text")
    .attr("class", "bubble__label")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("fill", "#fff")
    .style("font-size", "0.75rem")
    .style("font-weight", 600)
    .style("pointer-events", "none")
    .style("opacity", 0)
    .text((d) => d.industry.split(" ")[0]);

  bubbleEnter
    .merge(bubbleJoin)
    .transition(bubbleTransition)
    .style("opacity", 1)
    .attr(
      "transform",
      (d) => `translate(${xScale(d.impactNumeric)}, ${yScale(d.jobChangePct)})`
    );

  bubblesGroup
    .selectAll(".bubble circle")
    .transition(bubbleTransition)
    .attr("r", (d) => sizeScale(d.absJobChangePct))
    .attr("fill", (d) => trendColor.get(d.trend));

  bubblesGroup
    .selectAll(".bubble__label")
    .transition(bubbleTransition)
    .style("opacity", 1)
    .style(
      "font-size",
      (d) => `${Math.max(0.6, 1 - sizeScale(d.absJobChangePct) / 160)}rem`
    );

  bubbleJoin
    .exit()
    .transition(bubbleTransition)
    .style("opacity", 0)
    .attr(
      "transform",
      (d) => `translate(${xScale(d.impactNumeric)}, ${margin.top + height})`
    )
    .remove();

  svg
    .selectAll(".bubble")
    .on("mouseenter", (event, datum) => bubbleMouseEnter(event, datum))
    .on("mousemove", (event, datum) => bubbleMouseMove(event, datum))
    .on("mouseleave", (event, datum) => bubbleMouseLeave(event, datum))
    .on("click", (event, datum) => bubbleClick(event, datum));

  highlightSelectedBubble();
}

function bubbleMouseEnter(event, d) {
  const circle = d3.select(this).select("circle");

  circle
    .attr("stroke-width", 2.5)
    .attr("stroke", "rgba(15,19,30,0.38)")
    .transition()
    .duration(220)
    .attr("r", sizeScale(d.absJobChangePct) * 1.15);

  d3.select(this)
    .raise()
    .select(".bubble__label")
    .transition()
    .duration(220)
    .style("font-size", "0.95rem");

  setBubbleFocus(d.industry);

  tooltip
    .classed("is-visible", true)
    .style("display", "block")
    .style("opacity", 1)
    .html(
      `<div class="tooltip__heading">${d.industry}</div>
       <div class="tooltip__row"><span>Trend</span><span>${d.trend}</span></div>
       <div class="tooltip__row"><span>AI Impact Intensity (Low → High)</span><span>${d.impactLevel}</span></div>
       <div class="tooltip__row"><span>Net Job Change % (2030–2024)</span><span>${d3.format("+.1f")(d.jobChangePct)}%</span></div>
       <div class="tooltip__row"><span>Abs Job Change %</span><span>${d3.format(".1f")(d.absJobChangePct)}%</span></div>`
    );

  positionTooltip(event, d);
}

function bubbleMouseMove(event, d) {
  positionTooltip(event, d);
}

function bubbleMouseLeave(event, d) {
  const circle = d3.select(this).select("circle");

  if (state.selectedIndustry !== d.industry) {
    circle
      .transition()
      .duration(220)
      .attr("r", sizeScale(d.absJobChangePct))
      .attr("stroke-width", 1.5)
      .attr("stroke", "rgba(15,19,30,0.16)");
  }

  d3.select(this)
    .select(".bubble__label")
    .transition()
    .duration(220)
    .style(
      "font-size",
      (d) => `${Math.max(0.6, 1 - sizeScale(d.absJobChangePct) / 160)}rem`
    );

  tooltip.classed("is-visible", false).style("opacity", 0).style("display", "none");

  setBubbleFocus(null);
}

function bubbleClick(event, d) {
  state.selectedIndustry =
    state.selectedIndustry === d.industry ? null : d.industry;

  highlightSelectedBubble();
  updateJobList();

  setBubbleFocus(null);
}

function highlightSelectedBubble() {
  if (!state.selectedIndustry) {
    detailCountEl.textContent = "Click a bubble to view job titles.";
    jobListEl.innerHTML = "";
  }

  setBubbleFocus(null);
}

function updateJobList() {
  jobListEl.innerHTML = "";

  if (!state.selectedIndustry) {
    return;
  }

  const jobs = state.jobsByIndustry.get(state.selectedIndustry) || [];
  const uniqueJobs = Array.from(new Set(jobs.map((d) => d.JobTitle))).sort();

  detailCountEl.textContent = `${state.selectedIndustry} • ${uniqueJobs.length} roles`;

  if (uniqueJobs.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "details__empty";
    emptyState.textContent = "No job titles found for this industry.";
    jobListEl.appendChild(emptyState);
    return;
  }

  uniqueJobs.forEach((job) => {
    const item = document.createElement("div");
    item.className = "details__item";
    item.textContent = job;
    jobListEl.appendChild(item);
  });
}

function setupDefs() {
  const defs = svg.append("defs");

  const gradient = defs
    .append("linearGradient")
    .attr("id", "bgGradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");

  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "rgba(108,92,231,0.28)");

  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "rgba(46,204,113,0.18)");

  defs
    .append("filter")
    .attr("id", "bubbleShadow")
    .attr("x", "-40%")
    .attr("width", "180%")
    .attr("y", "-40%")
    .attr("height", "180%")
    .append("feDropShadow")
    .attr("dx", 0)
    .attr("dy", 12)
    .attr("stdDeviation", 12)
    .attr("flood-opacity", 0.24);

  defs
    .append("filter")
    .attr("id", "bubbleShadowStrong")
    .attr("x", "-50%")
    .attr("width", "200%")
    .attr("y", "-50%")
    .attr("height", "200%")
    .append("feDropShadow")
    .attr("dx", 0)
    .attr("dy", 14)
    .attr("stdDeviation", 16)
    .attr("flood-opacity", 0.35);
}

function setupBackground() {
  svg
    .insert("rect", ":first-child")
    .attr("class", "plot-background")
    .attr("rx", 26)
    .attr("ry", 26)
    .attr("fill", "url(#bgGradient)")
    .attr("fill-opacity", 0.55)
    .attr("pointer-events", "none");
}

function setBubbleFocus(activeIndustry) {
  const dimOthers = Boolean(activeIndustry);
  const targetIndustry = activeIndustry || state.selectedIndustry || null;

  bubblesGroup.selectAll(".bubble").each(function (datum) {
    const circle = d3.select(this).select("circle");
    const label = d3.select(this).select(".bubble__label");

    const isActive = Boolean(targetIndustry && datum.industry === targetIndustry);
    const isDimmed = dimOthers && !isActive;

    circle
      .interrupt()
      .transition()
      .duration(200)
      .attr("fill-opacity", isActive ? 0.95 : isDimmed ? 0.18 : 0.85)
      .attr("stroke-width", isActive ? 3 : 1.5)
      .attr("stroke", isActive ? "rgba(15,19,30,0.45)" : "rgba(15,19,30,0.16)")
      .style("filter", isActive ? "url(#bubbleShadowStrong)" : "url(#bubbleShadow)");

    label
      .interrupt()
      .transition()
      .duration(200)
      .style("opacity", isActive ? 1 : isDimmed ? 0.3 : 0.75)
      .style("font-weight", isActive ? 700 : 600);
  });
}

function positionTooltip(event, datum) {
  const containerRect = svg.node().parentElement.getBoundingClientRect();
  const tooltipNode = tooltip.node();
  const tooltipWidth = tooltipNode.offsetWidth;
  const tooltipHeight = tooltipNode.offsetHeight;
  const pointerX = event.clientX - containerRect.left;
  const pointerY = event.clientY - containerRect.top;

  const radius = datum ? sizeScale(datum.absJobChangePct) : 0;
  const offset = Math.max(radius, 20) + 16;

  let left = pointerX + offset;
  let top = pointerY - tooltipHeight - offset;

  if (top < 0) {
    top = pointerY + offset;
  }

  if (left + tooltipWidth > containerRect.width) {
    left = pointerX - tooltipWidth - offset;
  }

  left = Math.max(0, Math.min(left, containerRect.width - tooltipWidth));
  top = Math.max(0, Math.min(top, containerRect.height - tooltipHeight));

  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

