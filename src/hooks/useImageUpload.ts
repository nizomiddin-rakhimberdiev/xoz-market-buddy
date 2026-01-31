import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadResult {
  url: string;
  path: string;
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (file: File, productId: string): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        toast.error('Faqat rasm fayllarini yuklash mumkin');
        return null;
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('Rasm hajmi 5MB dan oshmasligi kerak');
        return null;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      setProgress(30);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error('Rasm yuklashda xatolik yuz berdi');
        return null;
      }

      setProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Rasm yuklashda xatolik yuz berdi');
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const deleteImage = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('product-images')
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Rasmni o\'chirishda xatolik');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Rasmni o\'chirishda xatolik');
      return false;
    }
  };

  return {
    uploadImage,
    deleteImage,
    isUploading,
    progress,
  };
}
