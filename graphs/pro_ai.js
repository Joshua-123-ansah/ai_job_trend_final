const margin = {top: 30, right: 75, bottom: 60, left: 75};
const width = 580 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

var svg = d3.select("#pro_ai_svg")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const xScale = d3.scaleLinear()
                 .range([0, width]);
const yScale = d3.scaleLinear()
                  .range([height, 0]);

// Tooltips reference from hw 3
var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

function parseIndustryFocus(industries) {
    var industryArray = industries.split(',');

    for (let i = 0; i < industryArray.length; i++) {
        industryArray[i] = industryArray[i].trim()
    }

    return industryArray
}

function parseHighlight(industries, selectedIndustry) {
    return industries.includes(selectedIndustry)
}

d3.csv("data/Layoff_Trend_Analyzed_30_Years_Final.csv").then(data => {
    var allIndustries = new Set();

    data.forEach(function(d) { 
        d.year = +d.Year;
        d.job_growth = +d.Job_Sector_Growth;
        d.ai_job_percentage = +d.AI_Job_Percentage;
        d.industry_focus = parseIndustryFocus(d.Industry_Focus);

        d.industry_focus.forEach(function(d){
            allIndustries.add(d)
        });
    });

    var industry_attribute = document.getElementById("select_industry");

    allIndustries.forEach(function(d){
        var newElement = document.createElement("option");
        newElement.textContent = d;
        newElement.value = d;
        industry_attribute.appendChild(newElement);
    });

    xScale.domain(d3.extent(data, function(d) { return d.ai_job_percentage; }));
    yScale.domain([d3.min(data, function(d) { return d.year; }), d3.max(data, function(d) { return d.year; })]);


    // https://d3js.org/d3-shape/symbol
    const triangles = svg.selectAll("dot")
        .data(data)
        .enter().append("path")
        .attr("d", d3.symbol(d3.symbolTriangle))
        .attr("transform", function(d) {
            const amountShifted = d.job_growth / 150;
            return "translate(" + (xScale(d.ai_job_percentage)) + "," + (yScale(d.year)) + ") translate(" + (3.5 * amountShifted) + ",0) scale(" + amountShifted + ",1) rotate(90)"; 
        })
        .attr("fill", "black");

    const circles = svg.selectAll("dot")
        .data(data)
        .enter().append("circle")
        .attr("r", 6)
        .attr("cx", function(d) { return xScale(d.ai_job_percentage); })
        .attr("cy", function(d) { return yScale(d.year); })
        .attr("fill", "black")
        // tooltips from hw 3
        .on("mousemove", function(event, d) {
            var message = "Job Growth: " + d.job_growth + " Million\n(length of 'comet' tail)"
            div.transition()
               .duration(200)
               .style("opacity", 1);
            div.html(message)
               .style("left", (event.pageX) + "px")
               .style("top", (event.pageY -28) + "px");
        })
        .on("mouseout", function(d) {
            div.transition()
               .duration(300)
               .style("opacity", 0);
        })

    function updateColoring() {
        circles
            .attr("fill", function(d) { return parseHighlight(d.industry_focus, industry_attribute.value) ? "blue" : "gray"; })
            .attr("r", function(d) { return parseHighlight(d.industry_focus, industry_attribute.value) ? 10 : 6; })
        triangles
            .attr("fill", function(d) { return parseHighlight(d.industry_focus, industry_attribute.value) ? "blue" : "gray"; })
    }

    industry_attribute.addEventListener("change", updateColoring);

    const xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(function(d) {
            return d + "%";
        });
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    const yAxis = d3.axisLeft(yScale)
        .tickFormat(function(d) {
            return d;
        });
    svg.append("g")
        .call(yAxis);

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .text("AI Job Percentage");

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", -(height / 2))
        .attr("y", -55)
        .text("Year")
        .attr("transform", "rotate(-90)");
});
