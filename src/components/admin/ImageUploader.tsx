import { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductImageType {
  id: string;
  image_url: string;
  is_main: boolean;
  sort_order: number;
}

interface ImageUploaderProps {
  productId: string;
  images: ProductImageType[];
  onImagesChange: () => void;
}

export function ImageUploader({ productId, images, onImagesChange }: ImageUploaderProps) {
  const { uploadImage, isUploading, progress } = useImageUpload();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const result = await uploadImage(file, productId);

    if (result) {
      // Save to database
      const { error } = await supabase.from('product_images').insert({
        product_id: productId,
        image_url: result.url,
        is_main: images.length === 0, // First image is main
        sort_order: images.length,
      });

      if (error) {
        toast.error('Rasmni saqlashda xatolik');
        console.error(error);
      } else {
        toast.success('Rasm yuklandi');
        onImagesChange();
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (image: ProductImageType) => {
    setDeletingId(image.id);

    try {
      // Extract path from URL
      const urlParts = image.image_url.split('/product-images/');
      const path = urlParts[1];

      if (path) {
        // Delete from storage
        await supabase.storage.from('product-images').remove([path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', image.id);

      if (error) throw error;

      toast.success('Rasm o\'chirildi');
      onImagesChange();
    } catch (error) {
      console.error(error);
      toast.error('Rasmni o\'chirishda xatolik');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetMain = async (imageId: string) => {
    try {
      // Remove main from all
      await supabase
        .from('product_images')
        .update({ is_main: false })
        .eq('product_id', productId);

      // Set new main
      await supabase
        .from('product_images')
        .update({ is_main: true })
        .eq('id', imageId);

      toast.success('Asosiy rasm o\'zgartirildi');
      onImagesChange();
    } catch (error) {
      console.error(error);
      toast.error('Xatolik yuz berdi');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Rasmlar</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Yuklash
        </Button>
      </div>

      {isUploading && (
        <Progress value={progress} className="h-2" />
      )}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Rasmlar yo'q</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className={cn(
                'relative aspect-square rounded-xl overflow-hidden border-2 group',
                image.is_main ? 'border-primary' : 'border-transparent'
              )}
            >
              <img
                src={image.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.is_main && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetMain(image.id)}
                  >
                    Asosiy
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="w-8 h-8"
                  onClick={() => handleDelete(image)}
                  disabled={deletingId === image.id}
                >
                  {deletingId === image.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {image.is_main && (
                <span className="absolute top-1 left-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  Asosiy
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
