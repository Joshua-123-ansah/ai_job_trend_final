//margin1s
const width1 = 900;
const height1 = 400;
const margin1 = { top: 40, right: 120, bottom: 100, left: 80 };
const innerwidth1 = width1 - margin1.left - margin1.right;
const innerheight1 = height1 - margin1.top - margin1.bottom;

//industry groups, one overlaps between gain and loss graphs while other solely in gain graph. this was previously calculated
const overlapIndustries = ["Transportation", "Education", "Finance", "Retail", "Manufacturing", "Entertainment"];
const gainIndustries = ["IT", "Healthcare"];

//alphabetically sort each industry on x axis
const industryOrder = overlapIndustries.concat(gainIndustries).sort();

//ai impact levels and color scale
const impactLevels = ["Low", "Moderate", "High"];
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

//data for both charts
const growthData = [];
const lossData = [];

//load csv
d3.csv("data/ai_job_trends_dataset.csv").then(function (rows) {
    //read rows from csv
    rows.forEach(function (d) {
        d.y2024 = +d["Job Openings (2024)"];
        d.y2030 = +d["Projected Openings (2030)"];
    });

    const grouped = {};
    rows.forEach(function (row) {
        //read industry name and ai impact level from csv
        const industry = row["Industry"];
        const impact = row["AI Impact Level"];
        //set key to check for specific industry in relation to ai impact levels
        const key = industry + "/" + impact;

        //if that key doesnt exist yet, make new grouping
        if (!grouped[key]) {
            grouped[key] = {
                industry: industry,
                impact: impact,
                jobs2024: 0,
                jobs2030: 0
            };
        }
        grouped[key].jobs2024 += row.y2024;
        grouped[key].jobs2030 += row.y2030;
    });

    industryOrder.forEach(function (industry) {
        impactLevels.forEach(function (impact) {
            const key = industry + "/" + impact;
            const g = grouped[key];

            let percent = 0;
            if (g && g.jobs2024 !== 0) {
                percent = ((g.jobs2030 - g.jobs2024) / g.jobs2024) * 100;
            }
            //check if percentage is above or below 0. above means graphed on growth chart, below means graphed on loss chart
            if (percent > 0) {
                growthData.push({ industry: industry, impact: impact, value: percent });
                lossData.push({ industry: industry, impact: impact, value: 0 });
            }
            else if (percent < 0) {
                growthData.push({ industry: industry, impact: impact, value: 0 });
                lossData.push({ industry: industry, impact: impact, value: -percent });
            }
        });
    });

    drawChart("#job-loss-chart", lossData);
    drawChart("#job-growth-chart", growthData);
});

function drawChart(container, dataType) {
    //fill title and identify type based off specific container
    let chartTitle = "";
    let chartType = "";

    if (container === "#job-loss-chart") {
        chartTitle = "Percent Job Loss by Industry";
        chartType = "job loss";
    }
    else {
        chartTitle = "Percent Job Growth by Industry";
        chartType = "job growth";
    }

    //https://d3-graph-gallery.com/graph/barplot_grouped_basicWide.html
    const x0 = d3.scaleBand()
        .domain(industryOrder)
        .range([0, innerwidth1])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(impactLevels)
        .range([0, x0.bandwidth()])

    const y = d3.scaleLinear()
        .domain([0, (d3.max(dataType, function (d) { return d.value; })) * 1.3])
        .range([innerheight1, 0]);

    const svg = d3.select(container)
        .append("svg")
        .attr("width", width1)
        .attr("height", height1)
        .append("g")
        .attr("transform", "translate(" + margin1.left + "," + margin1.top + ")");

    svg.append("g")
        .attr("transform", "translate(0," + innerheight1 + ")")
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "start");

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(function (d) { return d + "%"; }));

    svg.append("text")
        .attr("x", innerwidth1 / 2)
        .attr("y", innerheight1 + 70)
        .attr("text-anchor", "middle")
        .text("Industry");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerheight1 / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Percent Change in Job Openings (2024–2030)");

    svg.append("text")
        .attr("x", innerwidth1 / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(chartTitle);

    //one bar per unique industy and impact level
    svg.selectAll("rect")
        .data(dataType)
        .enter()
        .append("rect")
        .attr("width", x1.bandwidth())
        .attr("height", function (d) { return innerheight1 - y(d.value); })
        .attr("x", function (d) { return x0(d.industry) + x1(d.impact); })
        .attr("y", function (d) { return y(d.value); })
        .attr("fill", function (d) { return colorScale(d.impact); })
        .on("mouseover", function (event, d) {
            tooltip
                .style("opacity", 1)
                .html("<strong>" + d.industry + "</strong><br>" + d.impact + " AI impact<br>" + d.value.toFixed(1) + "% " + chartType)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 25) + "px");
        })
        .on("mouseout", function () {
            tooltip
                .style("opacity", 0);
        });

    //legend
    svg.append("text")
        .attr("x", innerwidth1 + 8)
        .attr("y", 0)
        .text("AI Impact Level");
    
    svg.append("rect")
        .attr("x", innerwidth1 + 10)
        .attr("y", 10)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colorScale("Low"));

    svg.append("text")
        .attr("x", innerwidth1 + 25)
        .attr("y", 20)
        .text("Low");

    svg.append("rect")
        .attr("x", innerwidth1 + 10)
        .attr("y", 30)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colorScale("Moderate"));

    svg.append("text")
        .attr("x", innerwidth1 + 25)
        .attr("y", 40)
        .text("Moderate");

    svg.append("rect")
        .attr("x", innerwidth1 + 10)
        .attr("y", 50)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colorScale("High"));

    svg.append("text")
        .attr("x", innerwidth1 + 25)
        .attr("y", 60)
        .text("High");
}

//tooltips
const tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("background-color", "lightsteelblue")
    .style("border", "1px solid black")
    .style("padding", "4px")
    .style("opacity", 0);