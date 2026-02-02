//modified version of other heatmap

d3.csv("data/ai_job_trends_dataset.csv").then(function(data) {

    //convert rows to ints
    data.forEach(function(d) {
        d["Projected Openings (2030)"] = +d["Projected Openings (2030)"]
        d["Automation Risk (%)"] = +d["Automation Risk (%)"]
    });

    createHeatmap(data);
});

//actually create heatmap
function createHeatmap(data) {

    const width = 1000;
    const height = 500;
    const margin = { top: 50, right: 50, bottom: 150, left: 100 };

    const svg = d3.select("#projected_openings_heatmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    //5 equal bins
    const bins = [0, 20, 40, 60, 80, 100];

    //loop through and assign each job to correct 
    data.forEach(function(d) {
        for (let i = 0; i < bins.length - 1; i++) {
            if (d["Automation Risk (%)"] >= bins[i] && d["Automation Risk (%)"] <= bins[i + 1]) 
            {
                d.bin = bins[i] + "-" + bins[i + 1] + "%";
                break;
            }
        }
    });

    const grouped = {};

    data.forEach(function(d) {

        //creates object for each ai impact level if doesnt exist
        if (!grouped[d["AI Impact Level"]]) 
        {
            grouped[d["AI Impact Level"]] = {};
        }

        //creates each bin for each ai impact level if doesnt exist
        if (!grouped[d["AI Impact Level"]][d.bin]) 
        {
            grouped[d["AI Impact Level"]][d.bin] = [];
        }

        //adds projected openings to array for that impact level and bin
        grouped[d["AI Impact Level"]][d.bin].push(d["Projected Openings (2030)"]);
    });

    const aggregated = [];

    //loop through each bin in each domain
    for (const ai_impact_level in grouped) {
        for (const bin in grouped[ai_impact_level]) {
            const values = grouped[ai_impact_level][bin];

            //find average for each bin in each domain
            let sum = 0;
            for (let i = 0; i < values.length; i++)
            {
                sum += values[i];
            }

            const mean = sum / values.length;

            //add average to aggregated
            aggregated.push({
                ai_impact_level: ai_impact_level,
                bin: bin,
                value: mean
            });
        }
    }

    //get list of ai_impact_levels
    const impact_levels = [];
    for (let i = 0; i < aggregated.length; i++) {
        if (!impact_levels.includes(aggregated[i].ai_impact_level))
        {
            impact_levels.push(aggregated[i].ai_impact_level);
        }
    }
    
    const binLabels = [
        "0-20%",
        "20-40%",
        "40-60%",
        "60-80%",
        "80-100%"
    ];

    const impact_levels_order = ["Low", "Moderate", "High"]

    //set up x scale
    const xScale = d3.scaleBand()
        .domain(impact_levels_order)
        .range([margin.left, width - margin.right - 200])
        .padding(0.01);

    //set up y scale
    const yScale = d3.scaleBand()
        .domain(binLabels)
        .range([margin.top, height - margin.bottom])
        .padding(0.01);

    //create color map 
    const projectedOpenings = aggregated.map(function(d) {return d.value});
    const minImpact = d3.min(projectedOpenings);
    const maxImpact = d3.max(projectedOpenings);

    const color = d3.scaleSequential()
        .interpolator(d3.interpolateYlGnBu)
        .domain([minImpact, maxImpact]);

    //create tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("color", "black")
        .style("border", "2px solid black")
        .style("border-radius", "5px")
        .style("pointer-events", "none");

    //draw squares in heatmap
    svg.selectAll("rect")
        .data(aggregated)
        .enter()
        .append("rect")
        .attr("x", function(d) {return xScale(d.ai_impact_level)})
        .attr("y", function(d) {return yScale(d.bin)})
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", function(d) {return color(d.value)})

        //show tooltip 
        .on("mousemove", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html("Projected Openings: " + Math.round(d.value))
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        });

    //x axis
    svg.append("g")
        .attr("transform", "translate(0," + (height - margin.bottom) + ")")
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", "12px");

    svg.append("text")
        .attr("x", width / 2 - 70)
        .attr("y", height - margin.bottom + 50)
        .attr("text-anchor", "middle")
        .text("AI Impact Level");

    //y axis
    svg.append("g")
        .attr("transform", "translate(" + margin.left + ",0)")
        .call(d3.axisLeft(yScale));

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2 + 50)
        .attr("y", margin.left - 70)
        .attr("text-anchor", "middle")
        .text("Automation Risk (%)")

    //legend setup 
    const colorScale = [d3.min(projectedOpenings), d3.max(projectedOpenings)];
    const legendWidth = 20;
    const legendHeight = 200;

    const legendScale = d3.scaleLinear()
        .domain(colorScale)
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(4)

    //make gradient, similar to example found online from visualcinnamon.com
    var defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    const stepCount = 10;

    gradient.selectAll("stop")
        .data(d3.range(stepCount + 1))
        .enter().append("stop")
        .attr("offset", function(d) {
            return (d / stepCount * 100) + "%"
        })
        .attr("stop-color", function(d) {
            return color(colorScale[0] + (d / stepCount) * (colorScale[1] - colorScale[0]));
        });

    const legendX = width - margin.right - 150;
    const legendY = margin.top;

    //draw legend
    const legend = svg.append("g")
        .attr("transform", "translate(" + legendX + "," + legendY + ")")

    //display gradient
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)")
        .style("stroke", "black")
        .style("stroke-width", 0.5);

    //legend axis
    legend.append("g")
        .attr("transform", "translate(" + legendWidth + ",0)")
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "12px");

    //legend title
    legend.append("text")
        .attr("x", -30)
        .attr("y", -10)
        .text("Projected Openings (2030)");

    //title
    svg.append("text")
        .attr("x", width / 2 - 70)
        .attr("y", margin.top / 2 + 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("Projected Openings (2030) by AI Impact Level and Automation Risk");
}


