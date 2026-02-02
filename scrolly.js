const scroller = scrollama();

scroller
  .setup({
    step: ".step",
    offset: 0.6,
    threshold: 2,
    progress: true
  })
  .onStepEnter(response => {
    const step = response.element.dataset.step;
    
    d3.selectAll('.step')
      .classed("is-active", false)
      .style("opacity", 0.25);
    
    d3.selectAll("#main-vis .vis-block")
      .style("display", "none")
      .style("opacity", 0);
  
    d3.select(response.element)
      .classed("is-active", true)
      .style("opacity", 1);

    const target = d3.select(`#main-vis .vis-block[data-step="${step}"]`);
    if (target.node()) {
      target
        .style("display", "flex")
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .style("opacity", 1);
    }
  })
  .onStepProgress(response => {
    const progress = response.progress;
    d3.select(response.element)
      .style("opacity", 0.25 + (progress * 0.75));
  });
