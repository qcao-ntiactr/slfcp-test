import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface DashboardBarChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  colorPalette?: string[];
  yAxisLabel?: string;
}

const DashboardBarChart: React.FC<DashboardBarChartProps> = ({
  data,
  width,
  height,
  colorPalette = [],
  yAxisLabel,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = React.useState({
    width: width || 500,
    height: height || 300,
  });

  useEffect(() => {
    if (containerRef.current && !width && !height) {
      const observer = new ResizeObserver((_entries, _observer) => {
        if (containerRef.current) {
          setContainerSize({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      });
      observer.observe(containerRef.current);
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      return () => observer.disconnect();
    }
  }, [width, height]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = {
      top: 20,
      right: 40,
      bottom: 40,
      left: yAxisLabel === 'Commercial Entity' ? 150 : 230,
    };
    const innerWidth = containerSize.width - margin.left - margin.right;
    const innerHeight = containerSize.height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0 || data.length === 0) {
      return;
    }

    const maxValue = d3.max(data, (d) => d.value)!;
    const niceMax = Math.ceil(maxValue / 5) * 5;

    const x = d3
      .scaleLinear()
      .domain([0, niceMax])
      .nice()
      .range([0, innerWidth]);

    const y = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerHeight])
      .padding(0.3);

    const chart = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // --- Grid lines (behind bars)
    const gridTicks = x.ticks(5);
    chart
      .append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(gridTicks)
      .enter()
      .append('line')
      .attr('x1', (d) => x(d))
      .attr('x2', (d) => x(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#999')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 0.7)
      .attr('opacity', 0.4);

    // --- Bars
    chart
      .selectAll('rect.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', (d) => y(d.label)!)
      .attr('width', (d) => x(d.value))
      .attr('height', y.bandwidth())
      .attr('fill', (d, i) => {
        if (d.color) return d.color;
        if (colorPalette.length > 0)
          return colorPalette[i % colorPalette.length];
        return '#4a90e2';
      })
      .attr('rx', 3);

    // --- Y axis (tick labels)
    const yAxis = chart.append('g').call(d3.axisLeft(y).tickSize(0));

    yAxis
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .style('text-anchor', 'end');

    // measure max width of tick labels so we can put the axis label to the left of ALL of them
    const yAxisTextNodes = yAxis
      .selectAll<SVGTextElement, unknown>('text')
      .nodes();
    const maxTickLabelWidth =
      d3.max(yAxisTextNodes, (node) => node.getBBox().width) ?? 0;

    // --- X axis
    const xAxis = chart
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickSize(0)
          .tickFormat((d) => `${d}`)
      );

    xAxis.selectAll('text').attr('font-size', '12px').attr('fill', '#555');

    chart.selectAll('.domain').remove();

    // --- X axis label
    svg
      .append('text')
      .attr('x', containerSize.width / 2)
      .attr('y', containerSize.height - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '500')
      .attr('fill', '#000')
      .text('Number of Requests');

    // --- Y axis label (auto-spaced to the left of longest tick label)
    if (yAxisLabel) {
      const axisLabelPadding = 50; // space between tick labels and vertical label

      chart
        .append('text')
        .attr('class', 'y-axis-label')
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#000')
        .attr('font-weight', '500')
        .attr(
          'transform',
          `translate(${-maxTickLabelWidth - axisLabelPadding}, ${
            innerHeight / 2
          }) rotate(-90)`
        )
        .text(yAxisLabel);
    }
  }, [data, containerSize, colorPalette, yAxisLabel]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width={containerSize.width}
        height={containerSize.height}
      />
    </div>
  );
};

export default DashboardBarChart;
