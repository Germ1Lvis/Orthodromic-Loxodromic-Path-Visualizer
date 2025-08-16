import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Coordinates, PathType } from '../types';
import type { FeatureCollection, LineString } from 'geojson';

interface GlobeVisualizationProps {
  points: [Coordinates, Coordinates] | null;
  pathType: PathType;
}

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export const GlobeVisualization: React.FC<GlobeVisualizationProps> = ({ points, pathType }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svgNode = svgRef.current;
    const { width, height } = svgNode.getBoundingClientRect();
    const svg = d3.select(svgNode);
    const sens = 0.25;

    const projection = d3.geoOrthographic()
      .scale(Math.min(width, height) / 2.2)
      .center([0, 0])
      .rotate([0, -20])
      .translate([width / 2, height / 2]);

    projectionRef.current = projection;
    
    const pathGenerator = d3.geoPath().projection(projection);

    svg.append('path')
        .attr('class', 'sphere')
        .datum({ type: 'Sphere' })
        .attr('d', pathGenerator)
        .attr('fill', 'rgba(17, 24, 39, 1)')
        .attr('stroke', '#4A5568')
        .attr('stroke-width', 0.5);

    svg.append('path')
        .attr('class', 'graticule')
        .datum(d3.geoGraticule10())
        .attr('d', pathGenerator)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(75, 85, 99, 0.5)');

    const countriesGroup = svg.append('g').attr('class', 'countries');

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
        .attr('stroke-width', 0.3);
    });

    const redrawElements = () => {
        const currentProjection = projectionRef.current;
        if (!currentProjection) return;
        
        const path = d3.geoPath().projection(currentProjection);
        svg.selectAll<SVGPathElement, any>("path").attr("d", path);
        
        svg.selectAll<SVGCircleElement, [number, number]>(".endpoint")
           .each(function(d) {
                const projected = currentProjection(d);
                const gdistance = d3.geoDistance(d, [-currentProjection.rotate()[0], -currentProjection.rotate()[1]]);
                const isVisible = gdistance <= Math.PI / 2;

                d3.select(this)
                  .attr('cx', projected ? projected[0] : null)
                  .attr('cy', projected ? projected[1] : null)
                  .style('display', isVisible ? 'inline' : 'none');
            });
    };
    
    const dragBehavior = d3.drag<SVGSVGElement, unknown>()
        .on('drag', (event) => {
            if (!projectionRef.current) return;
            const rotate = projectionRef.current.rotate();
            const k = sens / (projectionRef.current.scale() || 1);
            projectionRef.current.rotate([
                rotate[0] + event.dx * k * 100,
                rotate[1] - event.dy * k * 100
            ]);
            redrawElements();
        });

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.8, 10])
        .on('zoom', (event) => {
            if (!projectionRef.current) return;
            projectionRef.current.scale(Math.min(width, height) / 2.2 * event.transform.k);
            redrawElements();
        });
        
    svg.call(dragBehavior).call(zoomBehavior);

    return () => {
        svg.selectAll('*').remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!svgRef.current || !projectionRef.current) return;
    const svg = d3.select(svgRef.current);
    const projection = projectionRef.current;

    svg.selectAll('.flight-path, .endpoint').remove();

    if (points) {
        const [start, end] = points;
        const startLonLat: [number, number] = [start.lon, start.lat];
        const endLonLat: [number, number] = [end.lon, end.lat];
        
        let route: LineString;

        if (pathType === 'loxodromic') {
            const coords: [number, number][] = [];
            const numPoints = 50;
            const lat1 = (start.lat * Math.PI) / 180;
            const lat2 = (end.lat * Math.PI) / 180;
            const lon1 = (start.lon * Math.PI) / 180;
            let lon2 = (end.lon * Math.PI) / 180;

            if (Math.abs(lon2 - lon1) > Math.PI) {
                lon2 += (lon2 > lon1) ? -2 * Math.PI : 2 * Math.PI;
            }

            const dPsi = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));

            for (let i = 0; i <= numPoints; i++) {
                const f = i / numPoints;
                const lat_i = lat1 + (lat2 - lat1) * f;
                let lon_i;

                if (Math.abs(dPsi) < 1e-10) { // E-W line
                    lon_i = lon1 + (lon2 - lon1) * f;
                } else {
                    const psi_i = Math.log(Math.tan(lat_i / 2 + Math.PI / 4));
                    const psi1 = Math.log(Math.tan(lat1 / 2 + Math.PI / 4));
                    lon_i = lon1 + (lon2 - lon1) * (psi_i - psi1) / dPsi;
                }
                coords.push([(lon_i * 180) / Math.PI, (lat_i * 180) / Math.PI]);
            }
            route = { type: 'LineString', coordinates: coords };
        } else {
             route = {
                type: 'LineString',
                coordinates: [startLonLat, endLonLat]
            };
        }

        const pathGenerator = d3.geoPath().projection(projection);

        const flightPath = svg.append('path')
            .datum(route)
            .attr('class', 'flight-path')
            .attr('d', pathGenerator)
            .attr('fill', 'none')
            .attr('stroke', '#06B6D4')
            .attr('stroke-width', 2);
        
        const totalLength = flightPath.node()?.getTotalLength() || 0;
        flightPath.attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(1500)
            .ease(d3.easeCubic)
            .attr('stroke-dashoffset', 0);

        svg.selectAll('.endpoint')
            .data([startLonLat, endLonLat])
            .enter().append('circle')
            .attr('class', 'endpoint')
            .each(function(d) {
                const projected = projection(d as [number, number]);
                d3.select(this)
                    .attr('cx', projected ? projected[0] : null)
                    .attr('cy', projected ? projected[1] : null);
            })
            .attr('r', 0)
            .attr('fill', '#f0f9ff')
            .attr('stroke', '#0ea5e9')
            .attr('stroke-width', 2)
            .transition()
            .duration(500)
            .delay(1000)
            .attr('r', 5);

        const center = d3.geoInterpolate(startLonLat, endLonLat)(0.5);
        const targetRotation: [number, number] = [-center[0], -center[1]];
        
        d3.transition()
            .duration(1250)
            .tween('rotate', () => {
                const currentRotation = projection.rotate();
                const r = d3.interpolate(currentRotation, [targetRotation[0], targetRotation[1], currentRotation[2]]);
                return (t) => {
                    projection.rotate(r(t) as [number, number, number]);
                    const path = d3.geoPath().projection(projection);
                    svg.selectAll<SVGPathElement, any>('path').attr('d', path);
                    svg.selectAll<SVGCircleElement, [number, number]>(".endpoint")
                       .each(function(d) {
                            const projected = projection(d);
                            const gdistance = d3.geoDistance(d, [-projection.rotate()[0], -projection.rotate()[1]]);
                            const isVisible = gdistance <= Math.PI / 2;
            
                            d3.select(this)
                              .attr('cx', projected ? projected[0] : null)
                              .attr('cy', projected ? projected[1] : null)
                              .style('display', isVisible ? 'inline' : 'none');
                        });
                }
            });
    }

  }, [points, pathType]);

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg shadow-inner border border-gray-700 overflow-hidden">
        <svg ref={svgRef} width="100%" height="100%"></svg>
    </div>
  );
};