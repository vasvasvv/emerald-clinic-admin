import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ToothRecord } from '@/types/dental';

interface ToothProps {
  number: number;
  isUpper: boolean;
  record?: ToothRecord;
  onClick: () => void;
  alignBottom?: boolean;
  compact?: boolean;
  mobile?: boolean;
}

const TOOTH_IMAGE_MAP: Record<number, { imageNumber: number; mirrored: boolean }> = {
  18: { imageNumber: 1, mirrored: false },
  17: { imageNumber: 2, mirrored: false },
  16: { imageNumber: 3, mirrored: false },
  15: { imageNumber: 4, mirrored: false },
  14: { imageNumber: 5, mirrored: false },
  13: { imageNumber: 6, mirrored: false },
  12: { imageNumber: 7, mirrored: false },
  11: { imageNumber: 8, mirrored: false },
  21: { imageNumber: 8, mirrored: true },
  22: { imageNumber: 7, mirrored: true },
  23: { imageNumber: 6, mirrored: true },
  24: { imageNumber: 5, mirrored: true },
  25: { imageNumber: 4, mirrored: true },
  26: { imageNumber: 3, mirrored: true },
  27: { imageNumber: 2, mirrored: true },
  28: { imageNumber: 1, mirrored: true },
  48: { imageNumber: 24, mirrored: false },
  47: { imageNumber: 23, mirrored: false },
  46: { imageNumber: 22, mirrored: false },
  45: { imageNumber: 22, mirrored: false },
  44: { imageNumber: 21, mirrored: false },
  43: { imageNumber: 20, mirrored: false },
  42: { imageNumber: 19, mirrored: false },
  41: { imageNumber: 18, mirrored: false },
  31: { imageNumber: 18, mirrored: true },
  32: { imageNumber: 19, mirrored: true },
  33: { imageNumber: 20, mirrored: true },
  34: { imageNumber: 21, mirrored: true },
  35: { imageNumber: 22, mirrored: true },
  36: { imageNumber: 22, mirrored: true },
  37: { imageNumber: 23, mirrored: true },
  38: { imageNumber: 24, mirrored: true },
};

function getToothImage(toothNumber: number, isUpper: boolean) {
  const mapped = TOOTH_IMAGE_MAP[toothNumber];
  if (mapped) return mapped;
  return isUpper ? { imageNumber: 8, mirrored: false } : { imageNumber: 18, mirrored: false };
}

export function Tooth({
  number,
  isUpper,
  record,
  onClick,
  alignBottom = false,
  compact = false,
  mobile = false,
}: ToothProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasIssue = Boolean(record && (record.description || record.notes || record.files.length > 0));
  const { imageNumber, mirrored } = getToothImage(number, isUpper);
  const imagePath = `/teeth/${imageNumber}.png`;
  const canvasWidth = mobile ? 45 : compact ? 78 : 60;
  const canvasHeight = mobile ? 75 : compact ? 135 : 105;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempContext = tempCanvas.getContext('2d');
      if (!tempContext) return;

      tempContext.drawImage(image, 0, 0);
      const imageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
      let minX = tempCanvas.width;
      let minY = tempCanvas.height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < tempCanvas.height; y += 1) {
        for (let x = 0; x < tempCanvas.width; x += 1) {
          const index = (y * tempCanvas.width + x) * 4;
          if (imageData[index + 3] > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (maxX < minX || maxY < minY) {
        minX = 0;
        minY = 0;
        maxX = tempCanvas.width - 1;
        maxY = tempCanvas.height - 1;
      }

      context.save();
      if (mirrored) {
        context.translate(canvasWidth, 0);
        context.scale(-1, 1);
      }

      context.drawImage(image, minX, minY, maxX - minX + 1, maxY - minY + 1, 0, 0, canvasWidth, canvasHeight);
      context.restore();

      if (hasIssue) {
        const painted = context.getImageData(0, 0, canvasWidth, canvasHeight);
        const data = painted.data;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index + 3] > 0) {
            data[index] = Math.min(255, data[index] * 0.8 + 239 * 0.2);
            data[index + 1] = Math.min(255, data[index + 1] * 0.8 + 68 * 0.2);
            data[index + 2] = Math.min(255, data[index + 2] * 0.8 + 68 * 0.2);
          }
        }
        context.putImageData(painted, 0, 0);
      }

      setIsLoaded(true);
    };

    image.src = imagePath;
  }, [canvasHeight, canvasWidth, hasIssue, imagePath, mirrored]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);
    const pixel = context.getImageData(x, y, 1, 1).data;

    if (pixel[3] > 10) onClick();
  };

  return (
    <div
      className={cn(
        'flex flex-none flex-col items-center',
        mobile ? 'w-[calc(100%/16)] min-w-0 md:w-[38px]' : compact ? 'w-[38px] md:w-[45px]' : 'w-[23px] md:w-[30px]',
        alignBottom ? 'justify-end' : 'justify-start',
      )}
    >
      {isUpper && (
        <span
          className={cn(
            'w-full text-center font-medium leading-none text-muted-foreground',
            mobile ? 'text-[8px] md:text-[10px]' : compact ? 'text-[10px] md:text-xs' : 'text-[8px] md:text-[10px]',
          )}
        >
          {number}
        </span>
      )}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleClick}
        className={cn(
          mobile
            ? 'block h-[48px] w-full flex-none cursor-pointer transition-transform duration-200 hover:scale-105 md:h-[90px] md:w-[38px]'
            : compact
              ? 'block h-[90px] w-[38px] flex-none cursor-pointer transition-transform duration-200 hover:scale-105 md:h-[120px] md:w-[45px]'
              : 'block h-[70px] w-[23px] flex-none cursor-pointer transition-transform duration-200 hover:scale-105 md:h-[90px] md:w-[30px]',
          !isLoaded && 'opacity-0',
        )}
        style={{ imageRendering: 'auto' }}
      />
      {!isUpper && (
        <span
          className={cn(
            'w-full text-center font-medium leading-none text-muted-foreground',
            mobile ? 'text-[8px] md:text-[10px]' : compact ? 'text-[10px] md:text-xs' : 'text-[8px] md:text-[10px]',
          )}
        >
          {number}
        </span>
      )}
    </div>
  );
}
