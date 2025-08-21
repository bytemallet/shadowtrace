import React, { useState, useRef, useEffect } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { InteractiveImage, ClickPoint } from '@/components/InteractiveImage';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { ShadowFinderVisualization } from '@/components/ShadowFinderVisualization';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Zap, Send, Twitter, Github, Linkedin, Coffee } from 'lucide-react';
import { 
  analyzeShadowMeasurements, 
  calculateMeasurementsFromPixels, 
  convertPercentageToPixels,
  estimateBestLocation,
  type ShadowAnalysisResult
} from '@/lib/shadowfinder';

const Index = () => {
  // Analysis mode: 'first' or 'second'  
  const [analysisMode, setAnalysisMode] = useState<'first' | 'second'>('first');
  
  // First photo analysis
  const [firstUploadedFile, setFirstUploadedFile] = useState<File | null>(null);
  const [firstImageUrl, setFirstImageUrl] = useState<string | null>(null);
  const [firstPoints, setFirstPoints] = useState<ClickPoint[]>([]);
  const [firstAnalysisResult, setFirstAnalysisResult] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [firstShadowAnalysisData, setFirstShadowAnalysisData] = useState<ShadowAnalysisResult | null>(null);
  const [firstAnalysisDate, setFirstAnalysisDate] = useState<Date | null>(null);
  const [firstAnalysisMeasurements, setFirstAnalysisMeasurements] = useState<{
    objectHeight: number;
    shadowLength: number;
  } | null>(null);
  
  // Second photo analysis
  const [secondUploadedFile, setSecondUploadedFile] = useState<File | null>(null);
  const [secondImageUrl, setSecondImageUrl] = useState<string | null>(null);
  const [secondPoints, setSecondPoints] = useState<ClickPoint[]>([]);
  const [secondAnalysisResult, setSecondAnalysisResult] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [secondShadowAnalysisData, setSecondShadowAnalysisData] = useState<ShadowAnalysisResult | null>(null);
  const [secondAnalysisDate, setSecondAnalysisDate] = useState<Date | null>(null);
  const [secondAnalysisMeasurements, setSecondAnalysisMeasurements] = useState<{
    objectHeight: number;
    shadowLength: number;
  } | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Ref for auto-scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null);

  // Helper functions to get current state based on mode
  const getCurrentImageUrl = () => analysisMode === 'first' ? firstImageUrl : secondImageUrl;
  const getCurrentPoints = () => analysisMode === 'first' ? firstPoints : secondPoints;
  const getCurrentMeasurements = () => analysisMode === 'first' ? firstAnalysisMeasurements : secondAnalysisMeasurements;
  const getCurrentShadowAnalysisData = () => analysisMode === 'first' ? firstShadowAnalysisData : secondShadowAnalysisData;
  
  // Check if we should show second photo option
  const canShowSecondPhotoOption = firstShadowAnalysisData && !secondImageUrl && analysisMode === 'first';
  
  // Check if we have both analyses for intersection
  const hasBothAnalyses = firstShadowAnalysisData && secondShadowAnalysisData;

  // Auto-scroll to results when analysis completes
  useEffect(() => {
    const currentAnalysisData = getCurrentShadowAnalysisData();
    if (currentAnalysisData && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100); // Small delay to ensure rendering is complete
    }
  }, [firstShadowAnalysisData, secondShadowAnalysisData]);

  const handleImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    
    if (analysisMode === 'first') {
      setFirstUploadedFile(file);
      setFirstImageUrl(url);
      setFirstPoints([]);
      setFirstAnalysisResult(null);
      setFirstShadowAnalysisData(null);
      setFirstAnalysisDate(null);
      setFirstAnalysisMeasurements(null);
    } else {
      setSecondUploadedFile(file);
      setSecondImageUrl(url);
      setSecondPoints([]);
      setSecondAnalysisResult(null);
      setSecondShadowAnalysisData(null);
      setSecondAnalysisDate(null);
      setSecondAnalysisMeasurements(null);
    }
  };

  const handlePointsChange = (newPoints: ClickPoint[]) => {
    // Update points based on current mode
    if (analysisMode === 'first') {
      setFirstPoints(newPoints);
    } else {
      setSecondPoints(newPoints);
    }
    
    // Calculate measurements immediately when all 3 points are marked
    if (newPoints.length === 3) {
      const objectBottom = newPoints.find(p => p.type === 'object-bottom');
      const objectTop = newPoints.find(p => p.type === 'object-top');
      const shadowTip = newPoints.find(p => p.type === 'shadow-tip');
      
      if (objectBottom && objectTop && shadowTip && objectBottom.imageDisplayWidth && objectBottom.imageDisplayHeight) {
        // Convert percentage coordinates to pixels using actual display dimensions
        const objectBottomPixels = convertPercentageToPixels(objectBottom, objectBottom.imageDisplayWidth, objectBottom.imageDisplayHeight);
        const objectTopPixels = convertPercentageToPixels(objectTop, objectBottom.imageDisplayWidth, objectBottom.imageDisplayHeight);
        const shadowTipPixels = convertPercentageToPixels(shadowTip, objectBottom.imageDisplayWidth, objectBottom.imageDisplayHeight);
        
        // Calculate measurements
        const measurements = calculateMeasurementsFromPixels(
          objectBottomPixels,
          objectTopPixels,
          shadowTipPixels
        );
        
        // Update measurements based on current mode
        if (analysisMode === 'first') {
          setFirstAnalysisMeasurements(measurements);
        } else {
          setSecondAnalysisMeasurements(measurements);
        }
      }
    } else {
      // Clear measurements if not all points are marked
      if (analysisMode === 'first') {
        setFirstAnalysisMeasurements(null);
      } else {
        setSecondAnalysisMeasurements(null);
      }
    }
  };

  const performShadowAnalysis = async (date: Date, time: string): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    // Get current points based on analysis mode
    const currentPoints = getCurrentPoints();
    
    // Validate that we have all required points
    const objectBottom = currentPoints.find(p => p.type === 'object-bottom');
    const objectTop = currentPoints.find(p => p.type === 'object-top');
    const shadowTip = currentPoints.find(p => p.type === 'shadow-tip');
    
    if (!objectBottom || !objectTop || !shadowTip) {
      throw new Error('All three reference points must be marked');
    }
    
    // CRITICAL FIX: Use actual image display dimensions to match HTML version exactly
    // The HTML version uses the actual displayed image dimensions via getBoundingClientRect()
    const imageDisplayWidth = objectBottom.imageDisplayWidth || shadowTip.imageDisplayWidth || objectTop.imageDisplayWidth;
    const imageDisplayHeight = objectBottom.imageDisplayHeight || shadowTip.imageDisplayHeight || objectTop.imageDisplayHeight;
    
    if (!imageDisplayWidth || !imageDisplayHeight) {
      throw new Error('Could not determine image display dimensions');
    }
    
    console.log(`DEBUG React: Using actual image display dimensions: ${imageDisplayWidth}x${imageDisplayHeight}`);
    
    // Convert percentage coordinates to pixels using ACTUAL display dimensions
    const objectBottomPixels = convertPercentageToPixels(objectBottom, imageDisplayWidth, imageDisplayHeight);
    const objectTopPixels = convertPercentageToPixels(objectTop, imageDisplayWidth, imageDisplayHeight);
    const shadowTipPixels = convertPercentageToPixels(shadowTip, imageDisplayWidth, imageDisplayHeight);
    
    console.log('DEBUG React: Converted coordinates:', {
      objectBottom: objectBottomPixels,
      objectTop: objectTopPixels, 
      shadowTip: shadowTipPixels
    });
    
    // Calculate measurements
    const measurements = calculateMeasurementsFromPixels(
      objectBottomPixels,
      objectTopPixels,
      shadowTipPixels
    );
    
    console.log('DEBUG React: Shadow measurements:', measurements);
    console.log(`DEBUG React: Object height: ${measurements.objectHeight.toFixed(1)}, Shadow length: ${measurements.shadowLength.toFixed(1)}`);
    
    // Perform ShadowFinder analysis
    const analysisResult = analyzeShadowMeasurements({
      objectHeight: measurements.objectHeight,
      shadowLength: measurements.shadowLength,
      knownTime: date
    });
    
    // Store the full analysis data for visualization based on current mode
    if (analysisMode === 'first') {
      setFirstShadowAnalysisData(analysisResult);
      setFirstAnalysisDate(date);
      setFirstAnalysisMeasurements(measurements);
    } else {
      setSecondShadowAnalysisData(analysisResult);
      setSecondAnalysisDate(date);
      setSecondAnalysisMeasurements(measurements);
    }
    
    // Estimate best location
    const bestLocation = estimateBestLocation(analysisResult);
    
    return bestLocation;
  };

  const handleAnalyze = async (date: Date, time: string) => {
    setIsAnalyzing(true);
    
    try {
      const result = await performShadowAnalysis(date, time);
      
      // Store result based on current mode
      if (analysisMode === 'first') {
        setFirstAnalysisResult(result);
      } else {
        setSecondAnalysisResult(result);
      }
    } catch (error) {
      console.error('Shadow analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler to start second photo analysis
  const handleStartSecondPhoto = () => {
    setAnalysisMode('second');
  };

  // Handler to reset everything and start over
  const handleStartOver = () => {
    setAnalysisMode('first');
    
    // Clear first photo data
    setFirstUploadedFile(null);
    setFirstImageUrl(null);
    setFirstPoints([]);
    setFirstAnalysisResult(null);
    setFirstShadowAnalysisData(null);
    setFirstAnalysisDate(null);
    setFirstAnalysisMeasurements(null);
    
    // Clear second photo data  
    setSecondUploadedFile(null);
    setSecondImageUrl(null);
    setSecondPoints([]);
    setSecondAnalysisResult(null);
    setSecondShadowAnalysisData(null);
    setSecondAnalysisDate(null);
    setSecondAnalysisMeasurements(null);
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-primary/5 via-transparent to-cyber-secondary/5" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            {/* Mobile Layout */}
            <div className="flex flex-col gap-4 sm:hidden">
              {/* Top row: Logo + Title + DEMO */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyber-primary/10 cyber-glow">
                    <MapPin className="w-6 h-6 text-cyber-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold bg-gradient-to-r from-cyber-primary to-cyber-secondary bg-clip-text text-transparent">
                        ShadowTrace
                      </h1>
                      <Badge variant="outline" className="border-cyber-primary/30 text-cyber-primary text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        DEMO
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      OSINT Geolocation via Shadow Analysis
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Bottom row: Social Links */}
              <div className="flex items-center justify-center gap-1">
                <a 
                  href="https://t.me/hck4fun" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="https://twitter.com/hck4fun" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Twitter className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="https://github.com/bytemallet" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Github className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="https://linkedin.com/in/xaviermarrugat" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="https://ko-fi.com/bytemallet" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyber-primary to-cyber-secondary text-xs font-medium rounded-lg hover:shadow-lg transition-all duration-200 text-primary-foreground"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Buy me a coffee &lt;3</span>
                  <span className="xs:hidden">Coffee &lt;3</span>
                </a>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyber-primary/10 cyber-glow">
                  <MapPin className="w-6 h-6 text-cyber-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyber-primary to-cyber-secondary bg-clip-text text-transparent">
                      ShadowTrace
                    </h1>
                    <Badge variant="outline" className="border-cyber-primary/30 text-cyber-primary">
                      <Zap className="w-3 h-3 mr-1" />
                      DEMO
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    OSINT Geolocation via Shadow Analysis
                  </p>
                </div>
              </div>
              
              {/* Social Links */}
              <div className="flex items-center gap-2">
                <a 
                  href="https://t.me/hck4fun" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="https://twitter.com/hck4fun" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Twitter className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="https://github.com/bytemallet" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Github className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="https://linkedin.com/in/xaviermarrugat" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="https://ko-fi.com/bytemallet" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyber-primary to-cyber-secondary text-xs font-medium rounded-lg hover:shadow-lg transition-all duration-200 text-primary-foreground"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Buy me a coffee &lt;3</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left column - Image upload and interaction */}
            <div className="lg:col-span-2 space-y-6">
              {!getCurrentImageUrl() ? (
                <Card className="cyber-border p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold mb-2">
                          {analysisMode === 'first' ? 'First Photo' : 'Second Photo'} Analysis
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {analysisMode === 'first' 
                            ? 'Upload an image with clear shadows and identifiable objects for analysis'
                            : 'Upload a second image from the same location at a different time'
                          }
                        </p>
                      </div>
                      
                      {/* Analysis mode indicator */}
                      <div className="flex items-center gap-2">
                        {analysisMode === 'first' ? (
                          <Badge variant="outline" className="border-cyber-primary/30 text-cyber-primary">
                            First Photo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-cyber-secondary/30 text-cyber-secondary">
                            Second Photo
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <ImageUploader
                      onImageUpload={handleImageUpload}
                      uploadedImage={null}
                    />
                  </div>
                </Card>
              ) : (
                <InteractiveImage
                  imageSrc={getCurrentImageUrl()!}
                  onPointsChange={handlePointsChange}
                  onImageReplace={() => {
                    if (analysisMode === 'first') {
                      setFirstImageUrl(null);
                      setFirstUploadedFile(null);
                      setFirstPoints([]);
                      setFirstAnalysisResult(null);
                      setFirstShadowAnalysisData(null);
                      setFirstAnalysisDate(null);
                      setFirstAnalysisMeasurements(null);
                    } else {
                      setSecondImageUrl(null);
                      setSecondUploadedFile(null);
                      setSecondPoints([]);
                      setSecondAnalysisResult(null);
                      setSecondShadowAnalysisData(null);
                      setSecondAnalysisDate(null);
                      setSecondAnalysisMeasurements(null);
                    }
                  }}
                />
              )}

              {/* Add Second Photo option after first analysis */}
              {canShowSecondPhotoOption && (
                <Card className="cyber-border p-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-cyber-secondary/10 mx-auto">
                      <MapPin className="w-6 h-6 text-cyber-secondary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Increase Precision with Second Photo</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload a second photo from the same location at a different time to find the intersection of shadow analyses for higher accuracy.
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="cyber-solid"
                        onClick={handleStartSecondPhoto}
                        className="min-w-32"
                      >
                        Add Second Photo
                      </Button>
                      <Button
                        variant="cyber-outline"
                        onClick={handleStartOver}
                        className="min-w-32"
                      >
                        Start Over
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Show visualization based on analysis mode */}
              {getCurrentShadowAnalysisData() && (
                <div ref={resultsRef}>
                  <ShadowFinderVisualization
                    analysisData={hasBothAnalyses ? firstShadowAnalysisData! : getCurrentShadowAnalysisData()!}
                    knownTime={hasBothAnalyses ? firstAnalysisDate! : (analysisMode === 'first' ? firstAnalysisDate! : secondAnalysisDate!)}
                    measurements={hasBothAnalyses ? firstAnalysisMeasurements! : getCurrentMeasurements()!}
                    secondAnalysisData={hasBothAnalyses ? secondShadowAnalysisData : null}
                    secondKnownTime={hasBothAnalyses ? secondAnalysisDate : null}
                    secondMeasurements={hasBothAnalyses ? secondAnalysisMeasurements : null}
                    mode={hasBothAnalyses ? 'intersection' : 'single'}
                  />
                </div>
              )}

            </div>

            {/* Right column - Analysis panel */}
            <div className="space-y-6">
              <AnalysisPanel
                points={getCurrentPoints()}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                measurements={getCurrentMeasurements()}
                analysisMode={analysisMode}
              />

              {/* Info card */}
              <Card className="cyber-border p-6">
                <h3 className="font-semibold mb-4 text-cyber-primary">How it works</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyber-primary/20 flex items-center justify-center text-xs text-cyber-primary font-mono mt-0.5">
                      1
                    </div>
                    <p>Mark the base and top of a vertical object in the image</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyber-secondary/20 flex items-center justify-center text-xs text-cyber-secondary font-mono mt-0.5">
                      2
                    </div>
                    <p>Identify the tip of the object's shadow</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyber-accent/20 flex items-center justify-center text-xs text-cyber-accent font-mono mt-0.5">
                      3
                    </div>
                    <p>Enter the date and time the photo was taken</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono mt-0.5">
                      4
                    </div>
                    <p>Algorithm calculates sun angle and estimates location</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;