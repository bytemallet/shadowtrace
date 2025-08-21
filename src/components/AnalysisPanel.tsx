import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Calculator, Clock } from 'lucide-react';
import { ClickPoint } from './InteractiveImage';

interface AnalysisPanelProps {
  points: ClickPoint[];
  onAnalyze: (date: Date, time: string) => void;
  isAnalyzing: boolean;
  measurements?: {
    objectHeight: number;
    shadowLength: number;
  } | null;
  analysisMode?: 'first' | 'second';
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  points,
  onAnalyze,
  isAnalyzing,
  measurements,
  analysisMode = 'first',
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('12:00');
  
  // Reset date/time when analysis mode changes
  useEffect(() => {
    setSelectedDate('');
    setSelectedTime('12:00');
  }, [analysisMode]);

  const handleAnalyze = () => {
    if (selectedDate) {
      // CRITICAL: Force UTC parsing like HTML version (add 'Z' suffix)
      const dateString = selectedDate + 'T' + selectedTime + 'Z';
      const date = new Date(dateString);
      console.log(`DEBUG: Original input: ${selectedDate} ${selectedTime}, Parsed as UTC: ${date.toISOString()}`);
      onAnalyze(date, selectedTime);
    }
  };

  const isReady = points.length === 3 && selectedDate;

  return (
    <Card className="cyber-border">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${analysisMode === 'first' ? 'bg-cyber-primary/10' : 'bg-cyber-secondary/10'}`}>
            <Calculator className={`w-5 h-5 ${analysisMode === 'first' ? 'text-cyber-primary' : 'text-cyber-secondary'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {analysisMode === 'first' ? 'First Photo' : 'Second Photo'} Analysis
            </h3>
            <p className="text-sm text-muted-foreground">
              {analysisMode === 'first' 
                ? 'Geometric location estimation via shadow triangulation'
                : 'Second photo analysis for intersection precision'
              }
            </p>
          </div>
        </div>

        {/* Measurements display */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Reference Points</Label>
          
          {/* Show measurements when available */}
          {measurements ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded bg-muted/50 border border-border/50">
                  <div className="text-muted-foreground mb-1">Object Height</div>
                  <div className="font-mono text-cyber-primary">
                    {measurements.objectHeight.toFixed(0)}px
                  </div>
                </div>
                <div className="p-2 rounded bg-muted/50 border border-border/50">
                  <div className="text-muted-foreground mb-1">Shadow Length</div>
                  <div className="font-mono text-cyber-secondary">
                    {measurements.shadowLength.toFixed(0)}px
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Mark all three points on the image to see measurements
            </div>
          )}
        </div>

        {/* Date and time inputs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photo-date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Photo Date *
            </Label>
            <Input
              id="photo-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="cyber-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Approximate Time (UTC)
            </Label>
            <Input
              id="photo-time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="cyber-border"
            />
          </div>
        </div>


        {/* Analyze button */}
        <Button
          variant="cyber-solid"
          size="lg"
          className="w-full"
          onClick={handleAnalyze}
          disabled={!isReady || isAnalyzing}
        >
          <MapPin className="w-4 h-4" />
          {isAnalyzing ? 'Analyzing...' : 'Estimate Location'}
        </Button>

        {!isReady && (
          <p className="text-xs text-center text-muted-foreground">
            {points.length < 3 
              ? `Mark ${3 - points.length} more point${3 - points.length === 1 ? '' : 's'} on the image`
              : 'Select the photo date to continue'
            }
          </p>
        )}
      </div>
    </Card>
  );
};