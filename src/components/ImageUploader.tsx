import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  uploadedImage: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  uploadedImage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageUpload(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageUpload(files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (uploadedImage) {
    return (
      <Card className="cyber-border relative overflow-hidden">
        <img
          src={uploadedImage}
          alt="Uploaded for shadow analysis"
          className="w-full h-auto max-h-96 object-contain"
        />
        <div className="absolute top-2 right-2">
          <Button
            variant="cyber-ghost"
            size="sm"
            onClick={handleButtonClick}
          >
            <Upload className="w-4 h-4" />
            Replace
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`cyber-border border-dashed border-2 p-8 transition-all duration-300 cursor-pointer ${
        isDragOver ? 'border-cyber-primary bg-cyber-primary/5' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-full bg-cyber-primary/10">
          <ImageIcon className="w-8 h-8 text-cyber-primary" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Upload Target Image
          </h3>
          <p className="text-muted-foreground mb-4">
            Drop your image here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports JPG, PNG, WebP formats
          </p>
        </div>
        
        <Button variant="cyber" className="mt-2">
          <Upload className="w-4 h-4" />
          Select Image
        </Button>
      </div>
    </Card>
  );
};