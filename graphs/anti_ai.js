const margin_two = {top: 30, right: 30, bottom: 30, left: 30};
const width_two = 700 - margin_two.left - margin_two.right;
const height_two = 720 - margin_two.top - margin_two.bottom;

var svg_two = d3.select("#anti_ai_svg")
    .append("svg")
    .attr("width", width_two + margin_two.left + margin_two.right)
    .attr("height", height_two + margin_two.top + margin_two.bottom)
    .append("g")
    .attr("transform", `translate(${margin_two.left},${margin_two.top})`);

d3.csv("data/Layoff_Trend_Analyzed_30_Years_Final.csv").then(data => {
    var allYears = [];
    var currentYears = [];

    var allLayoffs = [];
    var sumLayoffs = 0;

    var allAIJobPercentage = [];
    var sumAIJobPercentage = 0;

    var i = 0;
    data.forEach(function(d) {
        d.year = +d.Year;
        d.layoffs = +d.Layoffs;
        d.ai_job_percentage = +d.AI_Job_Percentage;

        currentYears.push(d.year);
        sumLayoffs += d.layoffs;
        sumAIJobPercentage += d.ai_job_percentage;

        i += 1;
        if (i == 5) {
            allYears.push(currentYears);
            currentYears = [];

            allLayoffs.push(sumLayoffs / 5);
            sumLayoffs = 0;

            allAIJobPercentage.push(sumAIJobPercentage / 5);
            sumAIJobPercentage = 0;

            i = 0;
        }
    });

    i = 0;
    var j = 0;
    data.forEach(function(d) {
        d.index = j;
        d.start_year = allYears[j][0];
        d.end_year = allYears[j][allYears[j].length - 1];
        d.avg_layoffs = allLayoffs[j];
        d.avg_ai_job_percentage = allAIJobPercentage[j];

        i += 1;
        if (i == 5) {
            i = 0;
            j += 1;
        }
    });

    var seen = new Set();

    const shortenedData = data.filter(function(d) {
        if (seen.has(d.start_year)) {
            return false;
        }

        seen.add(d.start_year);

        return true;
    });

    var currentIndex = 0;

    var back_button = document.getElementById("back_button")
    back_button.addEventListener("click", function(d) {
        if (currentIndex > 0) {
            currentIndex -= 1;
        }

        updateOpacity()
    });

    var next_button = document.getElementById("next_button")
    next_button.addEventListener("click", function(d) {
        if (currentIndex < shortenedData.length - 1) {
            currentIndex += 1;
        }

        updateOpacity()
    });

    const point = svg_two.selectAll("dot")
        .data(shortenedData)
        .enter().append("g")
        .attr("opacity", 0);

    point
        .append("circle")
        .attr("r", 250)
        .attr("cx", width_two / 2)
        .attr("cy", height_two / 2)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 7);

    point
        .append("circle")
        .attr("r", 7)
        .attr("cx", width_two / 2)
        .attr("cy", height_two / 2)
        .attr("fill", "black");

    point
        .append("rect")
        .attr("width", 220)
        .attr("height", 4)
        .attr("x", width_two / 2)
        .attr("y", height_two / 2 - 2)
        .attr("fill", "black")
        .attr("transform", function(d) { return "rotate(" + (-180 + (180 * (d.avg_ai_job_percentage * 0.01))) + ", " + (width_two / 2) + ", " + (height_two / 2) + ")"; });

    point
        .append("path")
        .attr("transform", "translate(" + width_two / 2 + ", " + height_two / 2 + ")")
        .attr("d", function(d) { 
            return d3.arc()({
                innerRadius: 270,
                outerRadius: 310,
                startAngle: ((Math.PI) - Math.PI * (d.avg_layoffs / d3.max(allLayoffs))),
                endAngle: ((Math.PI) + Math.PI * (d.avg_layoffs / d3.max(allLayoffs)))
            })
        });

    point
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", width_two / 2)
        .attr("y", height_two / 2 + 295)
        .attr("fill", "white")
        .attr("dominant-baseline", "middle")
        .text("Layoffs");

    point
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", width_two / 2 - 360)
        .attr("y", height_two / 2 + 5)
        .text("0%");

    point
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", width_two / 2)
        .attr("y", height_two / 2 - 350)
        .text("50%");
    
    point
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", width_two / 2 + 360)
        .attr("y", height_two / 2 + 5)
        .text("100%");
    
    point
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", width_two / 2)
        .attr("y", height_two / 2 + 50)
        .text("AI Job %");

    point
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", width_two / 2)
        .attr("y", height_two / 2 - 380)
        .text(function(d) { return d.start_year + " - " + d.end_year; });

    updateOpacity()

    function updateOpacity() {
        point.attr("opacity", function(d) { return d.index == currentIndex ? 1 : 0; });
    }
});
