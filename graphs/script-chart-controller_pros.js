let currentChartType = "creation";

function initController() {
  const chartSelector = document.querySelectorAll("#chart-selector button");
  const impactButtons = document.querySelectorAll("#impact-filter .pill-toggle__btn");
  const legendItem = document.querySelector("#legend-item");
  const legendSwatch = legendItem.querySelector(".legend-color__swatch");
  const legendText = legendItem.querySelector("span:last-child");
  const svg = d3.select("#viz");

  loadChart("creation", svg, legendSwatch, legendText, impactButtons);

  chartSelector.forEach((button) => {
    button.addEventListener("click", () => {
      chartSelector.forEach((btn) => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      const chartType = button.dataset.chart;
      loadChart(chartType, svg, legendSwatch, legendText, impactButtons);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initController);
} else {
  initController();
}

function loadChart(chartType, svg, legendSwatch, legendText, impactButtons) {
  currentChartType = chartType;

  if (chartType === "loss") {
    legendSwatch.className = "legend-color__swatch legend-color__swatch--loss";
    legendText.textContent = "Job loss";
  } else {
    legendSwatch.className = "legend-color__swatch legend-color__swatch--loss";
    legendText.textContent = "Job loss";
  }

  const oldScript = document.querySelector('script[src*="script-job-"]');
  if (oldScript) {
    oldScript.remove();
  }

  svg.selectAll("*").remove();

  const bubbleInfoPanel = d3.select(".bubble-info-panel");
  if (bubbleInfoPanel.node()) {
    bubbleInfoPanel.remove();
  }

  impactButtons.forEach((btn) => {
    btn.classList.remove("is-active");
    if (btn.dataset.impact === "all") {
      btn.classList.add("is-active");
    }
  });

  setTimeout(() => {
    const script = document.createElement("script");
    script.type = "module";
    const timestamp = Date.now();
    script.src = chartType === "creation" 
      ? `graphs/script-job-creation.js?v=${timestamp}` 
      : `graphs/script-job-loss.js?v=${timestamp}`;
    
    document.body.appendChild(script);
  }, 100);
}

window.chartController = {
  getCurrentChartType: () => currentChartType,
};

