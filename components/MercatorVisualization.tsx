import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Coordinates, PathType } from '../types';
import type { FeatureCollection } from 'geojson';

interface MercatorVisualizationProps {
  points: [Coordinates, Coordinates] | null;
  pathType: PathType;
}

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export const MercatorVisualization: React.FC<MercatorVisualizationProps> = ({ points, pathType }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const pathGeneratorRef = useRef<d3.GeoPath | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svgNode = svgRef.current;
    const { width, height } = svgNode.getBoundingClientRect();
    const svg = d3.select(svgNode);

    const projection = d3.geoMercator()
      .scale(width / (2 * Math.PI))
      .translate([width / 2, height / 2]);
    projectionRef.current = projection;

    const pathGenerator = d3.geoPath().projection(projection);
    pathGeneratorRef.current = pathGenerator;

    const g = svg.append('g');
    gRef.current = g.node();

    g.append('rect')
      .attr('class', 'ocean')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#111827');

    g.append('path')
      .attr('class', 'graticule')
      .datum(d3.geoGraticule10())
      .attr('d', pathGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(75, 85, 99, 0.5)');

    const countriesGroup = g.append('g').attr('class', 'countries');

    d3.json<any>(WORLD_ATLAS_URL).then(world => {
      if (!world || !world.objects || !world.objects.countries) {
        console.error("Invalid TopoJSON data loaded from " + WORLD_ATLAS_URL);
        return;
      }
      const land = topojson.feature(world, world.objects.countries) as unknown as FeatureCollection;
      countriesGroup.selectAll('path')
        .data(land.features)
        .enter().append('path')
        .attr('d', pathGenerator as any)
        .attr('fill', '#374151')
        .attr('stroke', '#4b5563')
        .attr('stroke-width', 0.5);
    });
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 18])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    return () => {
      svg.selectAll('*').remove();
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !gRef.current || !projectionRef.current || !pathGeneratorRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    const pathGenerator = pathGeneratorRef.current;
    const zoom = zoomRef.current;
    const { width, height } = svg.node()!.getBoundingClientRect();
    const projection = projectionRef.current;

    g.selectAll('.flight-path, .endpoint').remove();

    if (points) {
      const [start, end] = points;
      const startLonLat: [number, number] = [start.lon, start.lat];
      const endLonLat: [number, number] = [end.lon, end.lat];

      const currentZoom = d3.zoomTransform(svg.node()!);

      if (pathType === 'loxodromic') {
        const p1 = projection(startLonLat);
        const p2 = projection(endLonLat);

        if (p1 && p2) {
            g.append('line')
                .attr('class', 'flight-path')
                .attr('x1', p1[0])
                .attr('y1', p1[1])
                .attr('x2', p2[0])
                .attr('y2', p2[1])
                .attr('stroke', '#06B6D4')
                .attr('stroke-width', 2 / Math.sqrt(currentZoom.k));
        }
      } else { // orthodromic
        const route = {
          type: 'LineString' as const,
          coordinates: [startLonLat, endLonLat]
        };
        g.append('path')
          .datum(route)
          .attr('class', 'flight-path')
          .attr('d', pathGenerator)
          .attr('fill', 'none')
          .attr('stroke', '#06B6D4')
          .attr('stroke-width', 2 / Math.sqrt(currentZoom.k));
      }

      g.selectAll('.endpoint')
        .data([startLonLat, endLonLat])
        .enter().append('circle')
        .attr('class', 'endpoint')
        .attr('cx', d => projection(d)![0])
        .attr('cy', d => projection(d)![1])
        .attr('r', 5 / Math.sqrt(currentZoom.k))
        .attr('fill', '#f0f9ff')
        .attr('stroke', '#0ea5e9');

      // Auto-zoom and pan to fit the path
      const p1 = projection(startLonLat)!;
      const p2 = projection(endLonLat)!;
      const bounds: [[number, number], [number, number]] = [
          [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1])],
          [Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])]
      ];
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;
      const scale = Math.max(0.8, Math.min(18, 0.9 / Math.max(dx / width, dy / height)));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];

      svg.transition()
        .duration(1250)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    } else {
        // Reset view if points are cleared
        svg.transition()
           .duration(750)
           .call(zoom.transform, d3.zoomIdentity);
    }
    
    // Adjust stroke widths on zoom
    zoom.on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        const k = event.transform.k;
        g.selectAll('.flight-path').attr('stroke-width', 2 / Math.sqrt(k));
        g.selectAll('.endpoint').attr('r', 5 / Math.sqrt(k));
    });

  }, [points, pathType]);

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg shadow-inner border border-gray-700 overflow-hidden">
        <svg ref={svgRef} width="100%" height="100%"></svg>
    </div>
  );
};
