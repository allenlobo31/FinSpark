import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { api } from '../lib/api';

export default function LateralMovementGraph() {
  const svgRef = useRef();
  const containerRef = useRef();
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    api.lateralMovement()
      .then(data => {
        if (!containerRef.current || !data.nodes.length) {
          setLoading(false);
          setIsEmpty(true);
          return;
        }

        const width = containerRef.current.clientWidth;
        const height = 420;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
          .attr('width', width)
          .attr('height', height);

        // Defs for glow effects
        const defs = svg.append('defs');
        const filter = defs.append('filter').attr('id', 'node-glow');
        filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Color palette for white theme
        const nodeColors = {
          user: '#3b82f6',
          database: '#10b981',
          file: '#7c3aed',
        };

        const linkColors = {
          query: 'rgba(59, 130, 246, 0.25)',
          file_access: 'rgba(124, 58, 237, 0.25)',
        };

        // Simulation setup
        const simulation = d3.forceSimulation(data.nodes)
          .force('link', d3.forceLink(data.edges).id(d => d.id).distance(110))
          .force('charge', d3.forceManyBody().strength(-250))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collide', d3.forceCollide().radius(35));

        // Links
        const link = svg.append('g')
          .selectAll('line')
          .data(data.edges)
          .join('line')
          .attr('stroke', d => linkColors[d.type] || 'rgba(148, 163, 184, 0.3)')
          .attr('stroke-width', d => Math.min(Math.max(d.weight / 4, 1.5), 4))
          .attr('stroke-linecap', 'round');

        // Nodes
        const node = svg.append('g')
          .selectAll('circle')
          .data(data.nodes)
          .join('circle')
          .attr('r', d => d.type === 'user' ? 10 : 7)
          .attr('fill', d => nodeColors[d.type] || '#94a3b8')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5)
          .attr('filter', 'url(#node-glow)')
          .style('cursor', 'grab')
          .call(drag(simulation));

        // Labels
        const label = svg.append('g')
          .selectAll('text')
          .data(data.nodes)
          .join('text')
          .text(d => d.label || d.id)
          .attr('font-size', '11px')
          .attr('font-family', 'Inter, sans-serif')
          .attr('font-weight', '500')
          .attr('fill', '#475569')
          .attr('dx', 14)
          .attr('dy', 4);

        simulation.on('tick', () => {
          link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

          node
            .attr('cx', d => Math.max(14, Math.min(width - 14, d.x)))
            .attr('cy', d => Math.max(14, Math.min(height - 14, d.y)));

          label
            .attr('x', d => Math.max(14, Math.min(width - 14, d.x)))
            .attr('y', d => Math.max(14, Math.min(height - 14, d.y)));
        });

        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load graph data', err);
        setLoading(false);
        setIsEmpty(true);
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

  // Legend items
  const legendItems = [
    { color: '#3b82f6', label: 'Users' },
    { color: '#10b981', label: 'DB Tables' },
    { color: '#7c3aed', label: 'Files' },
  ];

  return (
    <div className="card" ref={containerRef} style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">Lateral Movement Topology</h3>
          <div className="card-subtitle">Interactive access pattern graph — drag nodes to explore</div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {legendItems.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
              <span style={{ 
                width: 10, 
                height: 10, 
                borderRadius: '50%', 
                background: item.color,
                display: 'inline-block',
                border: '2px solid white',
                boxShadow: '0 0 0 1px ' + item.color + '40'
              }}></span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="loading-container" style={{ height: 420 }}>
          <div className="spinner"></div>Loading topology...
        </div>
      ) : isEmpty ? (
        <div className="empty-state" style={{ height: 420 }}>
          <div className="icon">🌐</div>
          <div style={{ fontWeight: 600 }}>No Topology Data</div>
          <div>Generate activity to see the access pattern graph.</div>
        </div>
      ) : (
        <svg ref={svgRef}></svg>
      )}
    </div>
  );
}
