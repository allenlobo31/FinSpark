import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { api } from '../lib/api';

export default function LateralMovementGraph() {
  const svgRef = useRef();
  const containerRef = useRef();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.lateralMovement()
      .then(data => {
        if (!containerRef.current || !data.nodes.length) {
          setLoading(false);
          return;
        }

        const width = containerRef.current.clientWidth;
        const height = 400;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
          .attr('width', width)
          .attr('height', height);

        // Simulation setup
        const simulation = d3.forceSimulation(data.nodes)
          .force('link', d3.forceLink(data.edges).id(d => d.id).distance(100))
          .force('charge', d3.forceManyBody().strength(-200))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collide', d3.forceCollide().radius(30));

        // Links
        const link = svg.append('g')
          .selectAll('line')
          .data(data.edges)
          .join('line')
          .attr('stroke', d => d.type === 'query' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(139, 92, 246, 0.4)')
          .attr('stroke-width', d => Math.min(Math.max(d.weight / 5, 1), 5));

        // Nodes
        const node = svg.append('g')
          .selectAll('circle')
          .data(data.nodes)
          .join('circle')
          .attr('r', d => d.type === 'user' ? 8 : 6)
          .attr('fill', d => {
            if (d.type === 'user') return '#3b82f6';
            if (d.type === 'database') return '#10b981';
            return '#8b5cf6';
          })
          .call(drag(simulation));

        // Labels
        const label = svg.append('g')
          .selectAll('text')
          .data(data.nodes)
          .join('text')
          .text(d => d.label || d.id)
          .attr('font-size', '10px')
          .attr('fill', 'var(--text-secondary)')
          .attr('dx', 12)
          .attr('dy', 4);

        simulation.on('tick', () => {
          link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

          node
            .attr('cx', d => Math.max(10, Math.min(width - 10, d.x)))
            .attr('cy', d => Math.max(10, Math.min(height - 10, d.y)));

          label
            .attr('x', d => Math.max(10, Math.min(width - 10, d.x)))
            .attr('y', d => Math.max(10, Math.min(height - 10, d.y)));
        });

        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load graph data', err);
        setLoading(false);
      });
  }, []);

  // Drag utility for d3
  const drag = (simulation) => {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  };

  return (
    <div className="card" ref={containerRef}>
      <div className="card-header">
        <h3 className="card-title">Lateral Movement Topology</h3>
        <div className="card-subtitle">Nodes: Users (Blue), DB Tables (Green), Files (Purple)</div>
      </div>
      {loading ? (
        <div className="loading-container" style={{ height: 400 }}>
          <div className="spinner"></div>Loading topology...
        </div>
      ) : (
        <svg ref={svgRef}></svg>
      )}
    </div>
  );
}
