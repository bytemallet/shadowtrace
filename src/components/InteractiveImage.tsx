import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Target, Upload } from 'lucide-react';

export interface ClickPoint {
  x: number;  // percentage
  y: number;  // percentage
  type: 'object-bottom' | 'object-top' | 'shadow-tip';
  label: string;
  // Store actual display dimensions for accurate pixel calculations
  imageDisplayWidth?: number;
  imageDisplayHeight?: number;
}

interface InteractiveImageProps {
  imageSrc: string;
  onPointsChange: (points: ClickPoint[]) => void;
  onImageReplace?: () => void;
}

const POINT_CONFIGS = [
  { type: 'object-bottom' as const, label: 'Object Bottom', color: 'hsl(195 100% 50%)', order: 1 },
  { type: 'object-top' as const, label: 'Object Top', color: 'hsl(180 100% 50%)', order: 2 },
  { type: 'shadow-tip' as const, label: 'Shadow Tip', color: 'hsl(290 100% 70%)', order: 3 },
];

export const InteractiveImage: React.FC<InteractiveImageProps> = ({
  imageSrc,
  onPointsChange,
  onImageReplace,
}) => {
  const [points, setPoints] = useState<ClickPoint[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (currentStep >= POINT_CONFIGS.length) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Debug: Log the actual pixel coordinates and image dimensions to match HTML approach
    const absoluteX = e.clientX - rect.left;
    const absoluteY = e.clientY - rect.top;
    console.log(`DEBUG React Click: Absolute coords: (${absoluteX.toFixed(1)}, ${absoluteY.toFixed(1)}), Image display size: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}, Percentage: (${x.toFixed(1)}%, ${y.toFixed(1)}%)`);
    
    // Store the actual display dimensions for more accurate calculations
    if (imageRef.current) {
      const actualWidth = rect.width;
      const actualHeight = rect.height;
      console.log(`DEBUG React: Image actual display dimensions: ${actualWidth}x${actualHeight}`);
    }

    const config = POINT_CONFIGS[currentStep];
    const newPoint: ClickPoint = {
      x,
      y,
      type: config.type,
      label: config.label,
      // Store actual display dimensions for accurate pixel conversion
      imageDisplayWidth: rect.width,
      imageDisplayHeight: rect.height,
    };

    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    setCurrentStep(currentStep + 1);
    onPointsChange(newPoints);
  };

  const handleReset = () => {
    setPoints([]);
    setCurrentStep(0);
    onPointsChange([]);
  };

  const getCurrentInstruction = () => {
    if (currentStep >= POINT_CONFIGS.length) {
      return "All points marked! Ready for analysis.";
    }
    return `Click on: ${POINT_CONFIGS[currentStep].label}`;
  };

  return (
    <Card className="cyber-border relative overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-cyber-primary" />
            <div>
              <h3 className="text-sm font-semibold">Mark Reference Points</h3>
              <p className="text-xs text-muted-foreground">
                {getCurrentInstruction()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {onImageReplace && (
              <Button
                variant="cyber-ghost"
                size="sm"
                onClick={onImageReplace}
              >
                <Upload className="w-4 h-4" />
                Replace
              </Button>
            )}
            <Button
              variant="cyber-ghost"
              size="sm"
              onClick={handleReset}
              disabled={points.length === 0}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
        
        {/* Progress indicators */}
        <div className="flex gap-2 mt-3">
          {POINT_CONFIGS.map((config, index) => (
            <div
              key={config.type}
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                index < currentStep
                  ? 'bg-cyber-primary'
                  : index === currentStep
                  ? 'bg-cyber-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
      
      <div ref={containerRef} className="relative">
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Image for shadow analysis"
          className="w-full h-auto cursor-crosshair select-none"
          onClick={handleImageClick}
          draggable={false}
        />
        
        {/* Point markers */}
        {points.map((point, index) => {
          const config = POINT_CONFIGS.find(c => c.type === point.type);
          return (
            <div
              key={`${point.type}-${index}`}
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
              }}
            >
              {/* Outer glow */}
              <div
                className="absolute w-8 h-8 rounded-full animate-pulse"
                style={{
                  background: `radial-gradient(circle, ${config?.color}40, transparent 70%)`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
              
              {/* Main point */}
              <div
                className="w-4 h-4 rounded-full border-2 border-background shadow-lg relative z-10"
                style={{
                  backgroundColor: config?.color,
                  boxShadow: `0 0 12px ${config?.color}80`,
                }}
              />
              
              {/* Label */}
              <div
                className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-background/90 px-2 py-1 rounded text-xs font-mono border whitespace-nowrap"
                style={{ borderColor: config?.color }}
              >
                {config?.order}. {point.label}
              </div>
            </div>
          );
        })}
        
        {/* Grid overlay for precision */}
        <div className="absolute inset-0 pointer-events-none opacity-20 cyber-grid" />
      </div>
    </Card>
  );
};