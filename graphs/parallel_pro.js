// set education scale from lowest to highest
const educationScale = ["High School","Associate Degree","Bachelor’s Degree","Master’s Degree","PhD"];

// helper to blend colors
function colorInterpolate(t) {
  t = Math.max(0, Math.min(1, t));
  if (t <= 0.5) return d3.interpolateRgb("#c43424", "#e1e394")(t*2);
  return d3.interpolateRgb("#e1e394", "#71c795")((t-0.5)*2);
}
const fmt = d3.format(",");


function ParallelCanvas(containerSelector, config) {
  const container = d3.select(containerSelector);
  const width = config.width;
  const height = config.height;
  const inner = { top: 36, right: 110, bottom: 18, left: 48 };
  const chartW = width - inner.left - inner.right;
  const chartH = height - inner.top - inner.bottom;

  // create canvas and svg layers
  container.selectAll("*").remove();
  const canvas = container.append("canvas")
    .attr("width", width).attr("height", height)
    .style("width", width + "px").style("height", height + "px")
    .node();

  const ctx = canvas.getContext("2d");
  const DPR = window.devicePixelRatio || 1;
  if (DPR !== 1) {
    canvas.width = Math.round(width * DPR);
    canvas.height = Math.round(height * DPR);
    ctx.scale(DPR, DPR);
  }

  const svg = container.append("svg")
    .attr("width", width).attr("height", height)
    .style("position","absolute").style("left","0").style("top","0");

  // main group for axes/brushes
  const g = svg.append("g").attr("transform", `translate(${inner.left},${inner.top})`);

  // data and dims
  let data = config.data;
  let dims = config.dims.slice();
  const categoricalMap = config.categoricalMap || {};

  // compute yscales and color vals
  const yScales = {};
  let jobMin = 0, jobMax = 1, jobMid = 0.5;
  function computeYScales() {
    dims.forEach(dim => {
      const vals = data.map(d => +d[dim]);
      let domain = [0, 1];
      if (vals.length > 0) domain = d3.extent(vals);
      yScales[dim] = d3.scaleLinear().domain(domain).nice().range([chartH, 0]);
    });
    const jc = data.map(d => +d.JobChange);
    if (jc.length > 0) {
      jobMin = d3.min(jc);
      jobMax = d3.max(jc);
    } else {
      jobMin = 0; jobMax = 1;
    }
    jobMid = (jobMin + jobMax) / 2;
  }
  computeYScales();

  let xScale = d3.scalePoint().domain(dims).range([0, chartW]).padding(0.5);

  let activeRanges = {};

  // precompute line coordinates
  function precomputePoints() {
    data.forEach(d => {
      d._coords = dims.map(dim => {
        const x = xScale(dim);
        let y = yScales[dim](+d[dim]);
        return { dim, x, y };
      });
    });
  }
  precomputePoints();

  // drawing parameters
  const baseAlpha = 0.45;
  const lineWidth = 1.2;
  let hoveredDatum = null;

  // brush objects per dim
  const brushMap = {};
  dims.forEach(dim => {
    brushMap[dim] = d3.brushY().extent([[-14,0],[14,chartH]]).on("brush end", onBrush);
  });
  // draw axes and interactive labels via redrawAxes
  redrawAxes();

  // legend
  const legendX = inner.left + chartW + 50;
  const legendW = 20;
  const gradientId = `grad-${containerSelector.replace("#","")}-${Math.random().toString(36).slice(2,8)}`;
  svg.append("defs").append("linearGradient")
    .attr("id", gradientId)
    .attr("x1","0%").attr("x2","0%").attr("y1","0%").attr("y2","100%")
    .selectAll("stop")
    .data([
      {offset:"0%", color:"#71c795"},
      {offset:"50%", color:"#e1e394"},
      {offset:"100%", color:"#c43424"}
    ]).enter().append("stop")
    .attr("offset", d => d.offset).attr("stop-color", d => d.color);

  const legendGroup = svg.append("g").attr("transform", `translate(${legendX},${inner.top})`);
  legendGroup.append("rect")
    .attr("x",0).attr("y",0).attr("width", legendW).attr("height", chartH)
    .style("fill", `url(#${gradientId})`).style("stroke","#ddd").style("rx",4);

  legendGroup.append("text")
    .attr("x", legendW+10)
    .attr("y", 6)
    .text(fmt(jobMax))
    .attr("class","legend-label")
    .attr("dominant-baseline","hanging");
  legendGroup.append("text")
    .attr("x", legendW+10)
    .attr("y", chartH/2 - 6)
    .text(fmt((jobMin+jobMax)/2))
    .attr("class","legend-label")
    .attr("dominant-baseline","central");
  legendGroup.append("text")
    .attr("x", legendW+10)
    .attr("y", chartH - 6)
    .text(fmt(jobMin))
    .attr("class","legend-label")
    .attr("dominant-baseline","auto");
  legendGroup.append("text")
    .attr("x", 50)
    .attr("y", -12)
    .text("Job Change")
    .attr("class","legend-label")
    .style("font-weight","700");

  // reposition axis groups (handles enter/update/exit)
  function redrawAxes() {
    const axisSel = g.selectAll(".axisGroup").data(dims, d => d);
    // remove any old groups
    axisSel.exit().remove();

    // create enter groups
    const enterG = axisSel.enter().append("g").attr("class","axisGroup").attr("transform", d => `translate(${xScale(d)},0)`);
    enterG.each(function(dim){
      const ag = d3.select(this);
      const axis = d3.axisLeft(yScales[dim]).ticks(6);
      if (categoricalMap[dim]) {
        const map = categoricalMap[dim];
        axis.tickValues(map.indices).tickFormat(i => map.labels[i]);
      }
      ag.append("g").attr("class","axis").call(axis);
      ag.append("text").attr("class","dimension-label").attr("y",-12).attr("text-anchor","middle")
        .text(categoricalMap[dim] ? categoricalMap[dim].title : dim)
        .style("cursor","grab");
      ag.append("g").attr("class","brushGroup").call(brushMap[dim]);
    });

    // merged selection (enter + update)
    const merged = enterG.merge(axisSel);
    merged.attr("transform", d => `translate(${xScale(d)},0)`);

    // update axes and labels for all groups
    merged.select(".axis").each(function(dim){
      const axis = d3.axisLeft(yScales[dim]).ticks(6);
      if (categoricalMap[dim]) {
        const map = categoricalMap[dim];
        axis.tickValues(map.indices).tickFormat(i => map.labels[i]);
      }
      d3.select(this).call(axis);
    });

    merged.select(".dimension-label")
      .text(d => categoricalMap[d] ? categoricalMap[d].title : d)
      .style("cursor","grab")
      .call(d3.drag()
        .on("start", function(event){ d3.select(this).attr("opacity",0.6); })
        .on("drag", function(event, d){
          const px = d3.pointer(event, svg.node())[0];
          d3.select(this).attr("transform", `translate(${px - inner.left - xScale(d)},0)`);
        })
        .on("end", function(event, d){
          d3.select(this).attr("transform", null).attr("opacity",1);
          const mouseX = d3.pointer(event, svg.node())[0] - inner.left;
          const clamped = Math.max(0, Math.min(chartW, mouseX));
          const distances = dims.map(dimName => ({dim: dimName, dist: Math.abs(xScale(dimName) - clamped)}));
          distances.sort((a,b) => a.dist - b.dist);
          const nearest = distances[0].dim;
          const from = dims.indexOf(d);
          const to = dims.indexOf(nearest);
          if (from !== to) {
            dims.splice(from,1);
            dims.splice(to,0,d);
            xScale.domain(dims);
            computeYScales();
            redrawAxes();
            precomputePoints();
            scheduleRender();
          }
        })
      );
  }

  // precompute coordinates initially
  precomputePoints();

  // call to rerender
  let needsRender = false;
  function scheduleRender() {
    if (!needsRender) {
      needsRender = true;
      requestAnimationFrame(render);
    }
  }

  function passesBrush(d) {
    for (const k in activeRanges) {
      if (!activeRanges[k]) continue;
      const v = +d[k];
      const [mn, mx] = activeRanges[k];
      if (v < mn || v > mx) return false;
    }
    return true;
  }

  // render
  function render() {
    needsRender = false;
    // clear canvas
    ctx.clearRect(0, 0, width, height);
    // translate to inner origin
    ctx.save();
    ctx.translate(inner.left, inner.top);

    // draw all lines (fast)
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.globalCompositeOperation = 'source-over';
    for (let i=0, n=data.length; i<n; ++i) {
      const d = data[i];
      if (!passesBrush(d)) continue;
      // main path
      const denom = (jobMax - jobMin) || 1;
      const t = (d.JobChange - jobMin) / denom;
      const col = colorInterpolate(Math.max(0, Math.min(1,t)));
      ctx.strokeStyle = col || "#777";
      ctx.globalAlpha = (hoveredDatum && hoveredDatum !== d) ? 0.06 : baseAlpha;
      ctx.beginPath();
      const coords = d._coords;
      for (let j=0; j<coords.length; ++j) {
        const p = coords[j];
        if (j===0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // highlighted line
    if (hoveredDatum && passesBrush(hoveredDatum)) {
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 2.6;
      const denomH = (jobMax - jobMin) || 1;
      const t = (hoveredDatum.JobChange - jobMin) / denomH;
      const colH = colorInterpolate(Math.max(0, Math.min(1,t)));
      ctx.strokeStyle = colH || "#111";
      ctx.beginPath();
      const cs = hoveredDatum._coords;
      for (let j=0;j<cs.length;++j) {
        const p = cs[j];
        if (j===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.lineWidth = lineWidth;
    }
    // restore
    ctx.restore();
  }

  // initial render
  scheduleRender();

  // handle axis brush select
  function onBrush(event) {
    // recompute activeRanges from all brushes
    activeRanges = {};
    g.selectAll(".axisGroup").each(function(dim) {
      const s = d3.brushSelection(d3.select(this).select(".brushGroup").node());
      if (s) {
        // s = [y0, y1] pixels relative to group
        // convert to domain range
        const minVal = yScales[dim].invert(s[1]);
        const maxVal = yScales[dim].invert(s[0]);
        activeRanges[dim] = [minVal, maxVal];
      }
    });
    scheduleRender();
  }

  return {
    // redrawn based on selected vals
    redraw(newData) {
      if (newData) data = newData;
      computeYScales();
      xScale.domain(dims);
      precomputePoints();
      g.selectAll(".brushGroup").each(function(dim){ d3.select(this).call(brushMap[dim].move, null); });
      activeRanges = {};
      redrawAxes();
      scheduleRender();
    }
  };
}

// load csv
d3.csv("data/ai_job_trends_dataset.csv").then(raw => {
  raw.forEach((d,i) => {
    d.JobOpen2024 = +d["Job Openings (2024)"];
    d.JobOpen2030 = +d["Projected Openings (2030)"];
    d.JobChange = d.JobOpen2030 - d.JobOpen2024;
    d.Experience = +d["Experience Required (Years)"];
    d.Automation = +d["Automation Risk (%)"];
    d.Salary = +d["Median Salary (USD)"];
    d.RequiredEducationVal = educationScale.indexOf(d["Required Education"]);
    d._id = i;
  });


  // calc agg data for con graph
  const eduAgg = educationScale.map((label, idx) => {
    const rows = raw.filter(d => d.RequiredEducationVal === idx);
    const sumJobOpen2024 = d3.sum(rows, d => +d.JobOpen2024);
    const sumJobOpen2030 = d3.sum(rows, d => +d.JobOpen2030);
    const sumJobChange = d3.sum(rows, d => +d.JobChange);
    const avgExperience = d3.mean(rows, d => +d.Experience);
    const avgAutomation = d3.mean(rows, d => +d.Automation);
    const avgSalary = d3.mean(rows, d => +d.Salary);
    return {
      RequiredEducationVal: idx,
      JobOpen2024: sumJobOpen2024,
      JobOpen2030: sumJobOpen2030,
      JobChange: sumJobChange,
      Experience: avgExperience,
      Automation: avgAutomation,
      Salary: avgSalary,
      DegreeLabel: label
    };
  });

  const eduDims = ["JobOpen2024","JobOpen2030","JobChange","Experience","Automation","Salary","RequiredEducationVal"];
  const eduCategorical = { "RequiredEducationVal": { indices: [0,1,2,3,4], labels: educationScale, title: "Required Education" } };

  function makeProSamples(rows, perGroup=100) {
    const samples = [];
    for (let idx = 0; idx < educationScale.length; ++idx) {
      const group = rows.filter(r => r.RequiredEducationVal === idx);
      const pool = d3.shuffle(group.slice());
      for (let i = 0; i < perGroup; ++i) {
        const src = pool[i];
        const copy = Object.assign({}, src);
        copy._id = `${idx}-${i}`;
        samples.push(copy);
      }
    }
    return samples;
  }

  const proAgg = makeProSamples(raw, 100);
  const pro = ParallelCanvas("#pro-container", {
    width: 1000, height: 550, data: proAgg, dims: eduDims, categoricalMap: eduCategorical
  });
});
