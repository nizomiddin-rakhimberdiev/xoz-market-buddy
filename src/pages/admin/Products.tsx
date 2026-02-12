import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Package, ImageIcon, Layers, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { CreateImageUploader, type PendingImage } from '@/components/admin/CreateImageUploader';
import { VariantManager } from '@/components/admin/VariantManager';
import { InlineVariantEditor, type VariantFormItem } from '@/components/admin/InlineVariantEditor';
import type { Product, Category, ProductImage, ProductVariant } from '@/types/database';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImageManager, setShowImageManager] = useState<string | null>(null);
  const [showVariantManager, setShowVariantManager] = useState<string | null>(null);
  const [formTab, setFormTab] = useState('info');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    sku: '',
    category_id: '',
    unit: 'dona' as 'dona' | 'kg' | 'quti' | 'paket',
    cost_price: '',
    price: '',
    old_price: '',
    stock_qty: '',
    min_order_qty: '1',
    step_qty: '1',
  });

  const [formVariants, setFormVariants] = useState<VariantFormItem[]>([]);
  const [formImages, setFormImages] = useState<PendingImage[]>([]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, category:categories(*), images:product_images(*), variants:product_variants(*)`)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Product & { images: ProductImage[]; variants: ProductVariant[] })[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Category[];
    },
  });

  const uploadPendingImages = async (productId: string, images: PendingImage[]) => {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const fileExt = img.file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, img.file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path);

      await supabase.from('product_images').insert({
        product_id: productId,
        image_url: urlData.publicUrl,
        is_main: img.isMain,
        sort_order: i,
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: async ({ data, variants, images }: { data: typeof formData; variants: VariantFormItem[]; images: PendingImage[] }) => {
      const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: data.name,
          slug,
          description: data.description || null,
          sku: data.sku || null,
          category_id: data.category_id || null,
          unit: data.unit,
          cost_price: Number(data.cost_price) || 0,
          price: Number(data.price) || 0,
          old_price: data.old_price ? Number(data.old_price) : null,
          stock_qty: Number(data.stock_qty) || 0,
          min_order_qty: Number(data.min_order_qty) || 1,
          step_qty: Number(data.step_qty) || 1,
        })
        .select('id')
        .single();
      
      if (productError) throw productError;

      // Upload images
      if (images.length > 0 && newProduct) {
        await uploadPendingImages(newProduct.id, images);
      }

      // Create variants
      if (variants.length > 0 && newProduct) {
        const variantsToInsert = variants.map(v => ({
          product_id: newProduct.id,
          name: v.name,
          price_override: v.price_override ? Number(v.price_override) : null,
          cost_price_override: v.cost_price_override ? Number(v.cost_price_override) : null,
          stock_qty: v.stock_qty ? Number(v.stock_qty) : 0,
          sku: v.sku || null,
          is_active: true,
        }));

        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(variantsToInsert);
        
        if (variantsError) throw variantsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Mahsulot qo\'shildi');
    },
    onError: (error: any) => {
      toast.error('Xatolik', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('products')
        .update({
          name: updateData.name,
          slug: updateData.slug,
          description: updateData.description || null,
          sku: updateData.sku || null,
          category_id: updateData.category_id || null,
          unit: updateData.unit,
          cost_price: Number(updateData.cost_price) || 0,
          price: Number(updateData.price) || 0,
          old_price: updateData.old_price ? Number(updateData.old_price) : null,
          stock_qty: Number(updateData.stock_qty) || 0,
          min_order_qty: Number(updateData.min_order_qty) || 1,
          step_qty: Number(updateData.step_qty) || 1,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Mahsulot yangilandi');
    },
    onError: (error: any) => {
      toast.error('Xatolik', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Mahsulot o\'chirildi');
    },
    onError: (error: any) => {
      toast.error('Xatolik', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      sku: '',
      category_id: '',
      unit: 'dona',
      cost_price: '',
      price: '',
      old_price: '',
      stock_qty: '',
      min_order_qty: '1',
      step_qty: '1',
    });
    setFormVariants([]);
    setFormImages([]);
    setEditingProduct(null);
    setFormTab('info');
  };

  const openEditDialog = (product: Product & { variants?: ProductVariant[] }) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      sku: product.sku || '',
      category_id: product.category_id || '',
      unit: product.unit,
      cost_price: String(product.cost_price),
      price: String(product.price),
      old_price: product.old_price ? String(product.old_price) : '',
      stock_qty: String(product.stock_qty),
      min_order_qty: String(product.min_order_qty),
      step_qty: String(product.step_qty),
    });
    const existingVariants: VariantFormItem[] = (product.variants || []).map(v => ({
      id: v.id,
      name: v.name,
      price_override: v.price_override?.toString() || '',
      cost_price_override: v.cost_price_override?.toString() || '',
      stock_qty: v.stock_qty?.toString() || '',
      sku: v.sku || '',
      is_new: false,
    }));
    setFormVariants(existingVariants);
    setFormImages([]);
    setFormTab('info');
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ ...formData, id: editingProduct.id });
    } else {
      createMutation.mutate({ data: formData, variants: formVariants, images: formImages });
    }
  };

  const getProductMainImage = (product: Product & { images: ProductImage[] }) => {
    return product.images?.find(img => img.is_main)?.image_url || product.images?.[0]?.image_url;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Mahsulotlar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {products?.length || 0} ta mahsulot
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Qo'shish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={formTab} onValueChange={setFormTab}>
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="info">Asosiy</TabsTrigger>
                <TabsTrigger value="images">
                  Rasmlar
                  {!editingProduct && formImages.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 w-5 p-0 justify-center text-[10px]">
                      {formImages.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="variants">
                  Variantlar
                  {formVariants.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 w-5 p-0 justify-center text-[10px]">
                      {formVariants.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit}>
                {/* Tab: Info */}
                <TabsContent value="info" className="space-y-4 mt-0">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nomi *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Mahsulot nomi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug</Label>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="avtomatik generatsiya"
                      />
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kategoriya</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Artikul (SKU)</Label>
                      <Input
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tavsif</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tannarx *</Label>
                      <Input
                        type="number"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sotuv narxi *</Label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Eski narx</Label>
                      <Input
                        type="number"
                        value={formData.old_price}
                        onChange={(e) => setFormData({ ...formData, old_price: e.target.value })}
                        placeholder="—"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Omborda</Label>
                      <Input
                        type="number"
                        value={formData.stock_qty}
                        onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min. buyurtma</Label>
                      <Input
                        type="number"
                        value={formData.min_order_qty}
                        onChange={(e) => setFormData({ ...formData, min_order_qty: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qadam</Label>
                      <Input
                        type="number"
                        value={formData.step_qty}
                        onChange={(e) => setFormData({ ...formData, step_qty: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Birlik</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) => setFormData({ ...formData, unit: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dona">Dona</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="quti">Quti</SelectItem>
                          <SelectItem value="paket">Paket</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Images */}
                <TabsContent value="images" className="mt-0">
                  {editingProduct ? (
                    <ImageUploader
                      productId={editingProduct.id}
                      images={products?.find(p => p.id === editingProduct.id)?.images || []}
                      onImagesChange={() => queryClient.invalidateQueries({ queryKey: ['admin-products'] })}
                    />
                  ) : (
                    <CreateImageUploader
                      images={formImages}
                      onChange={setFormImages}
                    />
                  )}
                </TabsContent>

                {/* Tab: Variants */}
                <TabsContent value="variants" className="mt-0">
                  {editingProduct ? (
                    <VariantManager
                      productId={editingProduct.id}
                      variants={products?.find(p => p.id === editingProduct.id)?.variants || []}
                      basePrice={products?.find(p => p.id === editingProduct.id)?.price || 0}
                      baseCostPrice={products?.find(p => p.id === editingProduct.id)?.cost_price || 0}
                      onVariantsChange={() => queryClient.invalidateQueries({ queryKey: ['admin-products'] })}
                    />
                  ) : (
                    <InlineVariantEditor
                      variants={formVariants}
                      onChange={setFormVariants}
                      basePrice={formData.price}
                      baseCostPrice={formData.cost_price}
                    />
                  )}
                </TabsContent>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Bekor
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingProduct ? 'Saqlash' : 'Qo\'shish'}
                  </Button>
                </div>
              </form>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mahsulot qidirish..."
          className="input-icon"
        />
      </div>

      {/* Products grid/cards */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))
        ) : products?.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Mahsulotlar topilmadi</p>
          </div>
        ) : (
          products?.map((product) => {
            const mainImage = getProductMainImage(product);
            const activeVariants = product.variants?.filter(v => v.is_active) || [];
            return (
              <div
                key={product.id}
                className="bg-card rounded-2xl p-4 flex items-center gap-4 group hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <button
                  onClick={() => setShowImageManager(product.id)}
                  className="shrink-0"
                >
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-14 h-14 rounded-xl object-cover hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    {product.category?.name && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {product.category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="font-bold text-primary">{formatPrice(product.price)}</span>
                    <span className="text-muted-foreground text-xs">
                      Tannarx: {formatPrice(product.cost_price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className={product.stock_qty > 0 ? 'text-success' : 'text-destructive'}>
                      {product.stock_qty} {product.unit}
                    </span>
                    {activeVariants.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {activeVariants.length} variant
                      </span>
                    )}
                    {product.sku && <span>SKU: {product.sku}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => openEditDialog(product)}
                    title="Tahrirlash"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Mahsulotni o\'chirishni xohlaysizmi?')) {
                        deleteMutation.mutate(product.id);
                      }
                    }}
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Manager Dialog (standalone for existing products) */}
      <Dialog open={!!showImageManager} onOpenChange={() => setShowImageManager(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Mahsulot rasmlari</DialogTitle>
          </DialogHeader>
          {showImageManager && (
            <ImageUploader
              productId={showImageManager}
              images={products?.find(p => p.id === showImageManager)?.images || []}
              onImagesChange={() => queryClient.invalidateQueries({ queryKey: ['admin-products'] })}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
