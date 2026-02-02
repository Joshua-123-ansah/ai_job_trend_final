d3.csv('data/ai_job_trends_dataset.csv').then(data => {
const cleanData = data.filter(d => 
    d['Median Salary (USD)'] && 
    d['Job Openings (2024)'] && 
    d['Projected Openings (2030)'] &&
    +d['Job Openings (2024)'] > 0
).map(d => ({
    salary: +d['Median Salary (USD)'],
    growthRatio: +d['Projected Openings (2030)'] / +d['Job Openings (2024)']
}));

const salaryMin = d3.min(cleanData, d => d.salary);
const salaryMax = d3.max(cleanData, d => d.salary);
const binSize = (salaryMax - salaryMin) / 20;
const salaryBins = [];

for (let i = 0; i < 20; i++) {
    const binStart = salaryMin + i * binSize;
    const binEnd = salaryMin + (i + 1) * binSize;
    const binData = cleanData.filter(d => d.salary >= binStart && d.salary < binEnd);
    
    if (binData.length > 0) {
        salaryBins.push({
            salaryCenter: (binStart + binEnd) / 2,
            avgGrowthRatio: d3.mean(binData, d => d.growthRatio),
            jobCount: binData.length,
            minSalary: binStart,
            maxSalary: binEnd
        });
    }
}

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
    .domain(d3.extent(salaryBins, d => d.salaryCenter))
    .nice()
    .range([0, width]);

const yScale = d3.scaleLinear()
    .domain([d3.min(salaryBins, d => d.avgGrowthRatio) * 0.9, d3.max(salaryBins, d => d.avgGrowthRatio) * 1.1])
    .range([height, 0]);

svg.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));

svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => '$' + d3.format(',.0f')(d)));

svg.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(yScale).tickFormat(d3.format('.2f')));

svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('y', -50)
    .attr('x', -height / 2)
    .attr('text-anchor', 'middle')
    .text('Average Job Growth Ratio (2030/2024)');

svg.append('text')
    .attr('class', 'axis-label')
    .attr('y', height + 45)
    .attr('x', width / 2)
    .attr('text-anchor', 'middle')
    .text('Median Salary (USD)');


const line = d3.line()
    .x(d => xScale(d.salaryCenter))
    .y(d => yScale(d.avgGrowthRatio))
    .curve(d3.curveMonotoneX);

svg.append('path')
    .datum(salaryBins)
    .attr('class', 'line')
    .attr('d', line);

const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'line-chart-tooltip')
    .style('opacity', 0);

svg.selectAll('.line-pro-dot')
    .data(salaryBins)
    .enter()
    .append('circle')
    .attr('class', 'line-pro-dot')
    .attr('cx', d => xScale(d.salaryCenter))
    .attr('cy', d => yScale(d.avgGrowthRatio))
    .attr('r', 6)
    .attr('fill', '#8C1D40')
    .attr('stroke', 'white')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 8).attr('fill', '#B81D3A');
        tooltip.style('opacity', 1)
            .html(`
                <strong>Salary Range: $${d3.format(',.0f')(d.minSalary)} - $${d3.format(',.0f')(d.maxSalary)}</strong><br>
                Average Salary: $${d3.format(',.0f')(d.salaryCenter)}<br>
                Average Growth Ratio: ${d.avgGrowthRatio.toFixed(2)}x<br>
                Jobs in Range: ${d.jobCount}
            `)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY + 15) + 'px');
    })
    .on('mouseout', function() {
        d3.select(this).attr('r', 6).attr('fill', '#8C1D40');
        tooltip.style('opacity', 0);
    });
});