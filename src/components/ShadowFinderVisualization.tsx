import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Zap } from 'lucide-react';
import { ShadowAnalysisResult } from '@/lib/shadowfinder';

interface ShadowFinderVisualizationProps {
  analysisData: ShadowAnalysisResult;
  knownTime: Date;
  measurements: {
    objectHeight: number;
    shadowLength: number;
  };
  // Second analysis for intersection mode
  secondAnalysisData?: ShadowAnalysisResult | null;
  secondKnownTime?: Date | null;
  secondMeasurements?: {
    objectHeight: number;
    shadowLength: number;
  } | null;
  mode?: 'single' | 'intersection';
}

export const ShadowFinderVisualization: React.FC<ShadowFinderVisualizationProps> = ({
  analysisData,
  knownTime,
  measurements,
  secondAnalysisData,
  secondKnownTime,
  secondMeasurements,
  mode = 'single',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !analysisData) return;
    
    // For intersection mode, we need both analyses
    if (mode === 'intersection' && (!secondAnalysisData || !secondKnownTime || !secondMeasurements)) {
      console.warn('Intersection mode requires second analysis data');
      return;
    }

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Small delay to ensure container is properly sized (like HTML version)
    setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight; // Dynamic height like HTML version
      
      console.log(`ShadowFinder React: Container dimensions: ${width}x${height}`);
      
      // Log the scaling comparison for debugging
      console.log(`ShadowFinder React: Scale factor vs HTML: ${(width / 360).toFixed(2)}x width, ${(height / 400).toFixed(2)}x height`);
      
      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height);

      // Create projection to match ShadowFinder's coordinate system exactly
      const scale = width / (2 * Math.PI);
      const translateX = width / 2;
      const translateY = height / 2;
      
      console.log(`ShadowFinder React: Projection parameters:`);
      console.log(`  Scale: ${scale}`);
      console.log(`  Translate: [${translateX}, ${translateY}]`);
      
      const projection = d3.geoEquirectangular()
        .scale(scale)  // Standard 1:1 degree-to-pixel ratio
        .translate([translateX, translateY])
        .center([0, 20])  // Slightly center on our main band latitude
        .precision(0.1);
        
      // Test coordinate for debugging
      const testCoord = projection([20, 40]);
      console.log(`ShadowFinder React: Test [20,40] -> [${testCoord?.[0]?.toFixed(1)}, ${testCoord?.[1]?.toFixed(1)}]`);

      // Create path generator
      const path = d3.geoPath().projection(projection);

      // Draw world map
      d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        .then((world: any) => {
          // Draw countries - much clearer and more visible
          svg.append('g')
            .selectAll('path')
            .data(topojson.feature(world, world.objects.countries).features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('fill', 'hsl(220 13% 35%)')      // Much lighter fill for better contrast
            .attr('stroke', 'hsl(220 13% 50%)')    // Brighter stroke for visibility
            .attr('stroke-width', 1.0);            // Thicker stroke for clarity

          // Draw graticules (grid lines) - much clearer for better geographic context
          const graticule = d3.geoGraticule();
          svg.append('path')
            .datum(graticule)
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', 'hsl(195 100% 60% / 0.4)')   // Brighter and more visible
            .attr('stroke-width', 0.5)                    // Thicker for clarity
            .attr('stroke-dasharray', '2,2');

          // CRITICAL: Draw shadow points AFTER map loads (like original HTML version)
          // This ensures proper coordinate alignment with the world map
          
          // Filter and draw shadow analysis points based on mode
          const firstVisiblePoints = analysisData.points.filter(d => 
            d.likelihood !== -1 && d.likelihood <= 0.15
          );
          
          const cellSize = 1.2; // Small cells for precision

          if (mode === 'single') {
            // Single donut visualization (existing logic)
            svg.selectAll('rect.first-analysis')
              .data(firstVisiblePoints)
              .enter()
              .append('rect')
              .attr('class', 'first-analysis')
              .attr('x', d => {
                const coords = projection([d.lng, d.lat]);
                return coords ? coords[0] - cellSize/2 : null;
              })
              .attr('y', d => {
                const coords = projection([d.lng, d.lat]);
                return coords ? coords[1] - cellSize/2 : null;
              })
              .attr('width', cellSize)
              .attr('height', cellSize)
              .attr('fill', d => {
                // Brighter, more vivid colors for single donut
                const likelihood = d.likelihood;
                if (likelihood <= 0.02) return '#FFFF33';      // Brighter yellow - ultra-precise
                else if (likelihood <= 0.05) return '#FFD700'; // Bright gold - very precise  
                else if (likelihood <= 0.08) return '#FF9500'; // Vivid orange - good
                else if (likelihood <= 0.12) return '#FF7F00'; // Bright orange-red - moderate
                else return '#FF6500';                         // Vivid orange - less probable
              })
              .attr('opacity', d => {
                // Bright but transparent - allows map to show through clearly
                const likelihood = d.likelihood;
                if (likelihood <= 0.02) return 0.85;     // Ultra-precise: very bright but transparent
                else if (likelihood <= 0.05) return 0.75; // Very precise: bright and visible
                else if (likelihood <= 0.08) return 0.65; // Good: clearly visible  
                else if (likelihood <= 0.12) return 0.55; // Moderate: visible
                else return 0.45;                        // Others: moderate but visible
              })
              .style('display', d => {
                // Hide the worst matches completely to create clean donut
                const likelihood = d.likelihood;
                return likelihood > 2.0 ? 'none' : 'block'; // Same threshold as HTML version
              });
          } else {
            // Dual donut intersection visualization
            const secondVisiblePoints = secondAnalysisData!.points.filter(d => 
              d.likelihood !== -1 && d.likelihood <= 0.15
            );
            
            // Create lookup for intersection calculation
            const firstPointsMap = new Map();
            firstVisiblePoints.forEach(point => {
              const key = `${point.lat.toFixed(1)},${point.lng.toFixed(1)}`;
              firstPointsMap.set(key, point);
            });
            
            // Find intersection points
            const intersectionPoints = [];
            secondVisiblePoints.forEach(secondPoint => {
              const key = `${secondPoint.lat.toFixed(1)},${secondPoint.lng.toFixed(1)}`;
              const firstPoint = firstPointsMap.get(key);
              if (firstPoint) {
                intersectionPoints.push({
                  ...secondPoint,
                  combinedLikelihood: Math.max(firstPoint.likelihood, secondPoint.likelihood),
                  isIntersection: true
                });
              }
            });
            
            // Draw first analysis (yellow/orange - slightly transparent)
            svg.selectAll('rect.first-analysis')
              .data(firstVisiblePoints)
              .enter()
              .append('rect')
              .attr('class', 'first-analysis')
              .attr('x', d => {
                const coords = projection([d.lng, d.lat]);
                return coords ? coords[0] - cellSize/2 : null;
              })
              .attr('y', d => {
                const coords = projection([d.lng, d.lat]);
                return coords ? coords[1] - cellSize/2 : null;
              })
              .attr('width', cellSize)
              .attr('height', cellSize)
              .attr('fill', d => {
                // Brighter yellow/orange for first photo (dual mode)
                const likelihood = d.likelihood;
                if (likelihood <= 0.02) return '#FFFF44';      // Brighter yellow
                else if (likelihood <= 0.05) return '#FFD700'; // Bright gold
                else if (likelihood <= 0.08) return '#FF9500'; // Vivid orange
                else if (likelihood <= 0.12) return '#FF7F00'; // Bright orange-red
                else return '#FF6500';                         // Vivid orange
              })
              .attr('opacity', d => {
                // Higher opacity for better visibility in dual mode
                const likelihood = d.likelihood;
                if (likelihood <= 0.02) return 0.6;      // More visible
                else if (likelihood <= 0.05) return 0.5; // Clear
                else if (likelihood <= 0.08) return 0.4;  // Moderate
                else if (likelihood <= 0.12) return 0.35; // Visible
                else return 0.3;                        // Subtle but clear
              })
              .style('display', d => {
                const likelihood = d.likelihood;
                return likelihood > 2.0 ? 'none' : 'block';
              });
              
            // Draw second analysis (blue/cyan)
            svg.selectAll('rect.second-analysis')
              .data(secondVisiblePoints)
              .enter()
              .append('rect')
              .attr('class', 'second-analysis')
              .attr('x', d => {
                const coords = projection([d.lng, d.lat]);
                return coords ? coords[0] - cellSize/2 : null;
              })
              .attr('y', d => {
                const coords = projection([d.lng, d.lat]);
                return coords ? coords[1] - cellSize/2 : null;
              })
              .attr('width', cellSize)
              .attr('height', cellSize)
              .attr('fill', d => {
                // Brighter cyan/blue for second photo (dual mode)
                const likelihood = d.likelihood;
                if (likelihood <= 0.02) return '#00FFFF';      // Bright cyan - ultra-precise
                else if (likelihood <= 0.05) return '#00E5FF'; // Bright light blue - very precise  
                else if (likelihood <= 0.08) return '#1E90FF'; // Dodger blue - good
                else if (likelihood <= 0.12) return '#4682B4'; // Steel blue - moderate
                else return '#4169E1';                         // Royal blue - less probable
              })
              .attr('opacity', d => {
                // Higher opacity for better visibility in dual mode
                const likelihood = d.likelihood;
                if (likelihood <= 0.02) return 0.6;      // More visible
                else if (likelihood <= 0.05) return 0.5; // Clear
                else if (likelihood <= 0.08) return 0.4;  // Moderate
                else if (likelihood <= 0.12) return 0.35; // Visible
                else return 0.3;                        // Subtle but clear
              })
              .style('display', d => {
                const likelihood = d.likelihood;
                return likelihood > 2.0 ? 'none' : 'block';
              });
              
            // Draw intersection points (bright green/white - most prominent)
            svg.selectAll('rect.intersection')
              .data(intersectionPoints)
              .enter()
              .append('rect')
              .attr('class', 'intersection')
              .attr('x', d => {
                const coords = projection([d.lng, d.lat]);
                return coords ? coords[0] - cellSize/2 : null;
              })
              .attr('y', d => {
                const coords = projection([d.lng, d.lat]);
                return coords ? coords[1] - cellSize/2 : null;
              })
              .attr('width', cellSize * 1.2) // Slightly larger for prominence
              .attr('height', cellSize * 1.2)
              .attr('fill', d => {
                const likelihood = d.combinedLikelihood;
                if (likelihood <= 0.02) return '#FFFFFF';      // White - ultra-precise intersection
                else if (likelihood <= 0.05) return '#00FF00'; // Bright green - very precise  
                else if (likelihood <= 0.08) return '#32CD32'; // Lime green - good
                else if (likelihood <= 0.12) return '#90EE90'; // Light green - moderate
                else return '#98FB98';                         // Pale green - less probable
              })
              .attr('opacity', d => {
                // High opacity for intersection - most important
                const likelihood = d.combinedLikelihood;
                if (likelihood <= 0.02) return 0.9;      // Ultra-precise: very visible
                else if (likelihood <= 0.05) return 0.8; // Very precise: prominent
                else if (likelihood <= 0.08) return 0.7;  // Good: clearly visible
                else if (likelihood <= 0.12) return 0.6; // Moderate: visible
                else return 0.5;                         // Others: moderate
              })
              .style('display', d => {
                const likelihood = d.combinedLikelihood;
                return likelihood > 2.0 ? 'none' : 'block';
              });
          }

          // Add title based on mode
          if (mode === 'single') {
            svg.append('text')
              .attr('x', width / 2)
              .attr('y', 20)
              .attr('text-anchor', 'middle')
              .style('font-size', '14px')
              .style('font-weight', 'bold')
              .style('fill', 'hsl(195 100% 50%)')
              .text(`Possible Locations at ${knownTime.toISOString().substring(0, 19).replace('T', ' ')} UTC`);

            // Add subtitle
            svg.append('text')
              .attr('x', width / 2)
              .attr('y', 40)
              .attr('text-anchor', 'middle')
              .style('font-size', '12px')
              .style('fill', 'hsl(215 20.2% 65.1%)')
              .text(`Object: ${measurements.objectHeight.toFixed(0)}px, Shadow: ${measurements.shadowLength.toFixed(0)}px (ShadowFinder Algorithm)`);
          } else {
            // Intersection mode titles
            svg.append('text')
              .attr('x', width / 2)
              .attr('y', 20)
              .attr('text-anchor', 'middle')
              .style('font-size', '14px')
              .style('font-weight', 'bold')
              .style('fill', 'hsl(195 100% 50%)')
              .text(`Intersection Analysis - Precise Location Estimate`);

            // Add subtitle with both times
            svg.append('text')
              .attr('x', width / 2)
              .attr('y', 35)
              .attr('text-anchor', 'middle')
              .style('font-size', '10px')
              .style('fill', 'hsl(215 20.2% 65.1%)')
              .text(`First: ${knownTime.toISOString().substring(0, 19).replace('T', ' ')} UTC`);
              
            svg.append('text')
              .attr('x', width / 2)
              .attr('y', 48)
              .attr('text-anchor', 'middle')
              .style('font-size', '10px')
              .style('fill', 'hsl(215 20.2% 65.1%)')
              .text(`Second: ${secondKnownTime!.toISOString().substring(0, 19).replace('T', ' ')} UTC`);
          }
        })
        .catch(error => {
          console.error('Error loading world map:', error);
        });
    }, 50); // Small delay like HTML version

  }, [analysisData, knownTime, measurements, secondAnalysisData, secondKnownTime, secondMeasurements, mode]);

  if (!analysisData) {
    return null;
  }

  return (
    <Card className="cyber-border overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyber-primary" />
            <div>
              <h3 className="text-sm font-semibold">
                {mode === 'single' ? 'ShadowFinder Analysis' : 'Dual Photo Intersection'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {mode === 'single' 
                  ? `Showing ${analysisData.statistics.visibleBandPoints} high-probability locations`
                  : `Intersection analysis for maximum precision`
                }
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="outline" className="border-cyber-primary/30 text-cyber-primary">
              <Zap className="w-3 h-3 mr-1" />
              {mode === 'single' 
                ? `${analysisData.statistics.ultraTightBandPoints} ultra-precise`
                : `Dual Photo Mode`
              }
            </Badge>
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="w-full" style={{ height: '600px', margin: '0 auto' }}>
        <svg ref={svgRef} className="w-full h-full bg-background"></svg>
      </div>
      
      <div className="p-4 border-t border-border/50">
        <div className="text-xs text-muted-foreground text-center">
          {mode === 'single' 
            ? 'Bright yellow shows ultra-precise matches. Orange areas show probable locations. Empty spaces indicate nighttime regions.'
            : 'White/Green areas show intersection of both analyses (highest precision). Yellow = First photo, Blue = Second photo. Empty spaces indicate nighttime regions.'
          }
        </div>
      </div>
    </Card>
  );
};