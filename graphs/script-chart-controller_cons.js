let currentChartModule = null;
let currentChartType = "creation";

// Wait for DOM to be ready
function initController() {
  const chartSelector = document.querySelectorAll("#chart-selector button");
  const impactButtons = document.querySelectorAll("#impact-filter .pill-toggle__btn");
  const legendItem = document.querySelector("#legend-item");
  const legendSwatch = legendItem.querySelector(".legend-color__swatch");
  const legendText = legendItem.querySelector("span:last-child");
  const svg = d3.select("#viz");

  // Initialize with job creation chart
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

  // Update legend
  if (chartType === "loss") {
    legendSwatch.className = "legend-color__swatch legend-color__swatch--loss";
    legendText.textContent = "Job loss";
  } else {
    legendSwatch.className = "legend-color__swatch legend-color__swatch--loss";
    legendText.textContent = "Job loss";
  }

  // Remove old script if exists first
  const oldScript = document.querySelector('script[src*="script-job-"]');
  if (oldScript) {
    oldScript.remove();
  }

  // Clear SVG completely
  svg.selectAll("*").remove();

  // Reset impact filter to "all" when switching charts
  impactButtons.forEach((btn) => {
    btn.classList.remove("is-active");
    if (btn.dataset.impact === "all") {
      btn.classList.add("is-active");
    }
  });

  // Wait a bit longer to ensure everything is cleared and ready
  setTimeout(() => {
    // Load the appropriate chart script with cache busting
    const script = document.createElement("script");
    script.type = "module";
    const timestamp = Date.now();
    script.src = chartType === "loss" 
      ? `graphs/script-job-creation.js?v=${timestamp}` 
      : `graphs/script-job-loss.js?v=${timestamp}`;
    
    // Add new script
    document.body.appendChild(script);
  }, 100);
}

// Export for chart scripts to use
window.chartController = {
  getCurrentChartType: () => currentChartType,
};

