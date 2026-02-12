import { useRef, useState } from 'react';
import { Upload, X, ImageIcon, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface PendingImage {
  id: string;
  file: File;
  preview: string;
  isMain: boolean;
}

interface CreateImageUploaderProps {
  images: PendingImage[];
  onChange: (images: PendingImage[]) => void;
}

export function CreateImageUploader({ images, onChange }: CreateImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: PendingImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" rasm fayli emas`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" 5MB dan katta`);
        continue;
      }

      newImages.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        isMain: images.length === 0 && newImages.length === 0,
      });
    }

    onChange([...images, ...newImages]);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    // If we removed the main image, make the first one main
    if (updated.length > 0 && !updated.some((img) => img.isMain)) {
      updated[0].isMain = true;
    }
    onChange(updated);
  };

  const handleSetMain = (id: string) => {
    const updated = images.map((img) => ({
      ...img,
      isMain: img.id === id,
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Rasmlar</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-3 h-3 mr-1" />
          Yuklash
        </Button>
      </div>

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Rasm qo'shish uchun bosing</p>
          <p className="text-xs text-muted-foreground mt-1">JPEG, PNG · Max 5MB</p>
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className={cn(
                'relative aspect-square rounded-xl overflow-hidden border-2 group cursor-pointer',
                img.isMain ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
              )}
              onClick={() => handleSetMain(img.id)}
            >
              <img
                src={img.preview}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="w-7 h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(img.id);
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              {img.isMain && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" />
                  Asosiy
                </span>
              )}
            </div>
          ))}
          {/* Add more button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
