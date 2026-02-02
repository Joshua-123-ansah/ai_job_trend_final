d3.csv('data/Layoff_Trend_Analyzed_30_Years_Final.csv').then(data => {
const cleanData = data.filter(d => d.Year && d.Layoffs).map(d => ({
    year: +d.Year,
    layoffs: +d.Layoffs,
    reason: d.Reason_for_Layoffs,
    industry: d.Industry_Focus,
    event: d.Global_Event,
    jobGrowth: +d['Job_Sector_Growth'],
    aiPercentage: +d['AI_Job_Percentage'],
    futureTrends: d.Future_Job_Trends
}));

const margin = { top: 20, right: 70, bottom: 60, left: 70 };
const width = window.innerWidth/2 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select('#chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const xScale = d3.scaleLinear()
    .domain(d3.extent(cleanData, d => d.year))
    .range([0, width]);

const yScaleLayoffs = d3.scaleLinear()
    .domain([0, d3.max(cleanData, d => d.layoffs) * 1.1])
    .range([height, 0]);

const yScaleAI = d3.scaleLinear()
    .domain([0, d3.max(cleanData, d => d.aiPercentage) * 1.1])
    .range([height, 0]);

svg.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScaleLayoffs).tickSize(-width).tickFormat(''));

svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

svg.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(yScaleLayoffs));

svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(${width},0)`)
    .call(d3.axisRight(yScaleAI));

svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('y', -50)
    .attr('x', -height / 2)
    .attr('text-anchor', 'middle')
    .text('Layoffs (Thousands)');

svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('y', width + 50)
    .attr('x', -height / 2)
    .attr('text-anchor', 'middle')
    .text('AI Job Percentage (%)');

svg.append('text')
    .attr('class', 'axis-label')
    .attr('y', height + 45)
    .attr('x', width / 2)
    .attr('text-anchor', 'middle')
    .text('Year');

const layoffLine = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScaleLayoffs(d.layoffs))
    .curve(d3.curveMonotoneX);

const aiLine = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScaleAI(d.aiPercentage))
    .curve(d3.curveMonotoneX);

svg.append('path')
    .datum(cleanData)
    .attr('class', 'line')
    .attr('d', layoffLine);

svg.append('path')
    .datum(cleanData)
    .attr('class', 'line ai-line')
    .attr('d', aiLine);

const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'line-chart-tooltip')
    .style('opacity', 0);

svg.selectAll('.dot')
    .data(cleanData)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScaleLayoffs(d.layoffs))
    .attr('r', 4)
    .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 6);
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
            <strong>${d.year}</strong>
            Layoffs: ${d.layoffs}K<br>
            AI Jobs: ${d.aiPercentage}%<br>
            Event: ${d.event}<br>
            Reason: ${d.reason}<br>
            Industry: ${d.industry}
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
        d3.select(this).attr('r', 4);
        tooltip.transition().duration(200).style('opacity', 0);
    });

svg.selectAll('.ai-dot')
    .data(cleanData)
    .enter()
    .append('circle')
    .attr('class', 'dot ai-dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScaleAI(d.aiPercentage))
    .attr('r', 4)
    .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 6);
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
            <strong>${d.year}</strong>
            AI Jobs: ${d.aiPercentage}%<br>
            Layoffs: ${d.layoffs}K<br>
            Future Trends: ${d.futureTrends}<br>
            Event: ${d.event}
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
        d3.select(this).attr('r', 4);
        tooltip.transition().duration(200).style('opacity', 0);
    });
});