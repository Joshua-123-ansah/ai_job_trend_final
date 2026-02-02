d3.csv("../data/From Data Entry to CEO The AI Job Threat Index.csv").then(function(data) {

    //convert rows to ints
    data.forEach(function(d) {
        d.Tasks = +d.Tasks;
        d.AI_Impact = parseFloat(d.AI_Impact.replace("%", ""));
    });

    createHeatmap(data);
});

//actually create heatmap
function createHeatmap(data) {

    const width = 1000;
    const height = 500;
    const margin = { top: 50, right: 50, bottom: 150, left: 100 };

    const svgheatmap = d3.select("#task_domain_heatmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    //found to be good bins when playing around with visualizations before converting to d3
    const bins = [1, 143, 218, 394, 697, 1387];

    //loop through and assign each job to correct 
    data.forEach(function(d) {
        for (let i = 0; i < bins.length - 1; i++) {
            if (d.Tasks >= bins[i] && d.Tasks <= bins[i + 1]) 
            {
                d.bin = "(" + bins[i] + ", " + bins[i + 1] + "]";
                break;
            }
        }
    });

    const grouped = {};

    data.forEach(function(d) {

        //creates object for each domain if doesnt exist
        if (!grouped[d.Domain]) 
        {
            grouped[d.Domain] = {};
        }

        //creates each bin for each domain if doesnt exist
        if (!grouped[d.Domain][d.bin]) 
        {
            grouped[d.Domain][d.bin] = [];
        }

        //adds ai impact to array for that domain and bin
        grouped[d.Domain][d.bin].push(d.AI_Impact);
    });

    const aggregated = [];

    //loop through each bin in each domain
    for (const domain in grouped) {
        for (const bin in grouped[domain]) {
            const values = grouped[domain][bin];

            //find average for each bin in each domain
            let sum = 0;
            for (let i = 0; i < values.length; i++)
            {
                sum += values[i];
            }

            const mean = sum / values.length;

            //add average to aggregated
            aggregated.push({
                domain: domain,
                bin: bin,
                value: mean
            });
        }
    }

    //get list of domains
    const domains = [];
    for (let i = 0; i < aggregated.length; i++) {
        if (!domains.includes(aggregated[i].domain))
        {
            domains.push(aggregated[i].domain);
        }
    }
    
    const binLabels = [
        "(1, 143]",
        "(143, 218]",
        "(218, 394]",
        "(394, 697]",
        "(697, 1387]"
    ];

    //set up x scale
    const xScale = d3.scaleBand()
        .domain(domains)
        .range([margin.left, width - margin.right - 200])
        .padding(0.01);

    //set up y scale
    const yScale = d3.scaleBand()
        .domain(binLabels)
        .range([margin.top, height - margin.bottom])
        .padding(0.01);

    //create color map 
    const aiImpact = aggregated.map(function(d) {return d.value});
    const minImpact = d3.min(aiImpact);
    const maxImpact = d3.max(aiImpact);

    const color = d3.scaleSequential()
        .interpolator(d3.interpolateYlOrRd)
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
    svgheatmap.selectAll("rect")
        .data(aggregated)
        .enter()
        .append("rect")
        .attr("x", function(d) {return xScale(d.domain)})
        .attr("y", function(d) {return yScale(d.bin)})
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", function(d) {return color(d.value)})

        //show tooltip 
        .on("mousemove", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html("AI Impact: " + Math.round(d.value) + "%")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        });

    //x axis
    svgheatmap.append("g")
        .attr("transform", "translate(0," + (height - margin.bottom) + ")")
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    svgheatmap.append("text")
        .attr("x", width / 2 - 70)
        .attr("y", height - margin.bottom + 130)
        .attr("text-anchor", "middle")
        .text("Domain");

    //y axis
    svgheatmap.append("g")
        .attr("transform", "translate(" + margin.left + ",0)")
        .call(d3.axisLeft(yScale));

    svgheatmap.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2 + 50)
        .attr("y", margin.left - 70)
        .attr("text-anchor", "middle")
        .text("Tasks")

    //legend setup 
    const colorScale = [d3.min(aiImpact), d3.max(aiImpact)];
    const legendWidth = 20;
    const legendHeight = 200;

    const legendScale = d3.scaleLinear()
        .domain(colorScale)
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(6)
        .tickFormat(function(d) { return d + "%"; });

    //make gradient, similar to example found online from visualcinnamon.com
    var defs = svgheatmap.append("defs");

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
    const legend = svgheatmap.append("g")
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
        .text("AI Impact (%)");

    //title
    svgheatmap.append("text")
        .attr("x", width / 2 - 70)
        .attr("y", margin.top / 2 + 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("AI Impact Level by Job Domain and Task Count");
}


