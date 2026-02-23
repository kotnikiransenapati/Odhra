import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Loader2, Eye, Trash2, ArrowRight, ArrowLeft,
  Edit2, AlertTriangle, Upload, Image as ImageIcon, Plus, Hash,
  Package, ZoomIn, Layers, Tag, X, Palette, Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types
interface PDFPageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  selected: boolean;
  assignedProduct: number | null;
}

interface ProductVariation {
  id: string;
  optionName: string; // e.g., "Size", "Color"
  optionValue: string; // e.g., "XL", "Red"
  priceAdjustment: number;
  stock: number;
  sku: string;
  imagePageNumber: number | null; // optional variant-specific image
}

interface ProductGroup {
  groupNumber: number;
  title: string;
  description: string;
  price: number;
  compare_at_price?: number;
  stock: number;
  weight: string;
  sku: string;
  category: string;
  tags: string[];
  imagePageNumbers: number[];
  hasVariations: boolean;
  variationTypes: string[]; // e.g., ["Size", "Color"]
  variations: ProductVariation[];
}

const STEPS = [
  { id: 'upload', label: 'Upload PDF' },
  { id: 'preview', label: 'Preview Pages' },
  { id: 'assign', label: 'Group Images' },
  { id: 'details', label: 'Product Details' },
  { id: 'variations', label: 'Variations' },
  { id: 'import', label: 'Import' },
];

const COMMON_VARIATION_TYPES = ['Size', 'Color', 'Material', 'Style', 'Weight', 'Pack Size', 'Flavor'];

const GROUP_COLORS = [
  'hsl(210, 70%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(40, 80%, 50%)', 'hsl(350, 70%, 55%)',
  'hsl(270, 60%, 55%)', 'hsl(185, 65%, 45%)', 'hsl(25, 80%, 55%)', 'hsl(330, 60%, 55%)',
  'hsl(170, 55%, 45%)', 'hsl(240, 55%, 55%)', 'hsl(80, 60%, 45%)', 'hsl(300, 55%, 55%)',
];

function getGroupColor(num: number) { return GROUP_COLORS[(num - 1) % GROUP_COLORS.length]; }
function getGroupBgClass(num: number) {
  const classes = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-violet-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500',
    'bg-teal-500', 'bg-indigo-500', 'bg-lime-500', 'bg-fuchsia-500',
  ];
  return classes[(num - 1) % classes.length];
}

export function PDFImageCatalogUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [pageImages, setPageImages] = useState<PDFPageImage[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [nextGroupNumber, setNextGroupNumber] = useState(1);
  const [activeGroupForAssign, setActiveGroupForAssign] = useState<number | null>(null);

  const { data: vendor } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('vendors').select('*').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-upload'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name, slug').eq('is_active', true);
      return data || [];
    },
  });

  // ===== PDF Rendering =====
  const renderPDFPages = useCallback(async (pdfFile: File) => {
    setIsParsing(true);
    setParseProgress(5);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Use the worker from the installed package via CDN with correct version
      const workerVersion = pdfjsLib.version;
      // Try multiple CDN sources for reliability
      const workerUrls = [
        `https://unpkg.com/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`,
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`,
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${workerVersion}/pdf.worker.min.mjs`,
      ];
      
      // Use the first available CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrls[0];
      
      // Disable worker as fallback if CDN fails
      let pdf;
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        setParseProgress(15);
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      } catch (workerError: any) {
        console.warn('PDF worker failed, retrying with fallback CDN...', workerError.message);
        // Try next CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrls[1];
        try {
          const arrayBuffer = await pdfFile.arrayBuffer();
          setParseProgress(15);
          pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        } catch (workerError2: any) {
          console.warn('Second CDN failed, disabling worker...', workerError2.message);
          // Disable worker entirely as last resort
          pdfjsLib.GlobalWorkerOptions.workerSrc = '';
          const arrayBuffer = await pdfFile.arrayBuffer();
          setParseProgress(15);
          pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true } as any).promise;
        }
      }
      const totalPages = pdf.numPages;
      const images: PDFPageImage[] = [];
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        images.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          width: viewport.width,
          height: viewport.height,
          selected: false,
          assignedProduct: null,
        });
        setParseProgress(15 + Math.round((i / totalPages) * 80));
      }
      setPageImages(images);
      setParseProgress(100);
      setCurrentStep(1);
      toast.success(`Rendered ${totalPages} pages from PDF`);
    } catch (error: any) {
      console.error('PDF rendering error:', error);
      toast.error('Failed to render PDF: ' + (error.message || 'Unknown error'));
      setCurrentStep(0);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) { toast.error('Please upload a PDF file'); return; }
    if (selectedFile.size > 20 * 1024 * 1024) { toast.error('File size must be less than 20MB'); return; }
    setFile(selectedFile);
    await renderPDFPages(selectedFile);
  };

  // ===== Page Selection =====
  const togglePageSelection = (pageNumber: number) => {
    setPageImages(prev => prev.map(p => p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p));
  };
  const selectAllPages = () => setPageImages(prev => prev.map(p => ({ ...p, selected: true })));
  const deselectAllPages = () => {
    setPageImages(prev => prev.map(p => ({ ...p, selected: false, assignedProduct: null })));
    setProductGroups([]);
    setNextGroupNumber(1);
  };
  const selectedPages = pageImages.filter(p => p.selected);

  // ===== Grouping =====
  const createNewGroup = () => {
    const groupNum = nextGroupNumber;
    setProductGroups(prev => [...prev, {
      groupNumber: groupNum,
      title: `Product ${groupNum}`,
      description: '',
      price: 0,
      stock: 0,
      weight: '',
      sku: '',
      category: '',
      tags: [],
      imagePageNumbers: [],
      hasVariations: false,
      variationTypes: [],
      variations: [],
    }]);
    setNextGroupNumber(groupNum + 1);
    setActiveGroupForAssign(groupNum);
    toast.success(`Product #${groupNum} created — now click images to assign them`);
  };

  const assignPageToGroup = (pageNumber: number, groupNumber: number) => {
    // Remove from any existing group first
    setPageImages(prev => prev.map(p =>
      p.pageNumber === pageNumber ? { ...p, assignedProduct: groupNumber, selected: true } : p
    ));
    setProductGroups(prev => prev.map(g => {
      if (g.groupNumber === groupNumber) {
        const pages = [...new Set([...g.imagePageNumbers, pageNumber])];
        return { ...g, imagePageNumbers: pages };
      }
      // Remove from other groups
      return { ...g, imagePageNumbers: g.imagePageNumbers.filter(pn => pn !== pageNumber) };
    }));
  };

  const removePageFromGroup = (pageNumber: number) => {
    const page = pageImages.find(p => p.pageNumber === pageNumber);
    if (!page?.assignedProduct) return;
    const groupNum = page.assignedProduct;
    setPageImages(prev => prev.map(p => p.pageNumber === pageNumber ? { ...p, assignedProduct: null } : p));
    setProductGroups(prev => prev.map(g =>
      g.groupNumber === groupNum
        ? { ...g, imagePageNumbers: g.imagePageNumbers.filter(pn => pn !== pageNumber) }
        : g
    ));
  };

  const deleteProductGroup = (groupNumber: number) => {
    setPageImages(prev => prev.map(p => p.assignedProduct === groupNumber ? { ...p, assignedProduct: null } : p));
    setProductGroups(prev => prev.filter(g => g.groupNumber !== groupNumber));
    if (activeGroupForAssign === groupNumber) setActiveGroupForAssign(null);
  };

  // ===== Product Details =====
  const updateProductGroup = (groupNumber: number, updates: Partial<ProductGroup>) => {
    setProductGroups(prev => prev.map(g => g.groupNumber === groupNumber ? { ...g, ...updates } : g));
  };

  // ===== Variations =====
  const addVariationType = (groupNumber: number, typeName: string) => {
    setProductGroups(prev => prev.map(g => {
      if (g.groupNumber !== groupNumber) return g;
      if (g.variationTypes.includes(typeName)) return g;
      return { ...g, variationTypes: [...g.variationTypes, typeName] };
    }));
  };

  const removeVariationType = (groupNumber: number, typeName: string) => {
    setProductGroups(prev => prev.map(g => {
      if (g.groupNumber !== groupNumber) return g;
      return {
        ...g,
        variationTypes: g.variationTypes.filter(t => t !== typeName),
        variations: g.variations.filter(v => v.optionName !== typeName),
      };
    }));
  };

  const addVariation = (groupNumber: number, optionName: string) => {
    const id = `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setProductGroups(prev => prev.map(g => {
      if (g.groupNumber !== groupNumber) return g;
      return {
        ...g,
        variations: [...g.variations, {
          id,
          optionName,
          optionValue: '',
          priceAdjustment: 0,
          stock: g.stock || 0,
          sku: '',
          imagePageNumber: null,
        }],
      };
    }));
  };

  const updateVariation = (groupNumber: number, varId: string, updates: Partial<ProductVariation>) => {
    setProductGroups(prev => prev.map(g => {
      if (g.groupNumber !== groupNumber) return g;
      return {
        ...g,
        variations: g.variations.map(v => v.id === varId ? { ...v, ...updates } : v),
      };
    }));
  };

  const removeVariation = (groupNumber: number, varId: string) => {
    setProductGroups(prev => prev.map(g => {
      if (g.groupNumber !== groupNumber) return g;
      return { ...g, variations: g.variations.filter(v => v.id !== varId) };
    }));
  };

  const duplicateVariationsToAll = (sourceGroupNumber: number) => {
    const source = productGroups.find(g => g.groupNumber === sourceGroupNumber);
    if (!source) return;
    setProductGroups(prev => prev.map(g => {
      if (g.groupNumber === sourceGroupNumber || !g.hasVariations) return g;
      return {
        ...g,
        variationTypes: [...source.variationTypes],
        variations: source.variations.map(v => ({
          ...v,
          id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          imagePageNumber: null,
        })),
      };
    }));
    toast.success('Variation structure copied to all products with variations enabled');
  };

  // ===== Import =====
  const importProducts = useMutation({
    mutationFn: async () => {
      if (!vendor) throw new Error('Vendor not found');
      const results = { success: 0, failed: 0 };

      for (let i = 0; i < productGroups.length; i++) {
        const group = productGroups[i];
        if (!group.title || group.price <= 0) { results.failed++; continue; }

        try {
          // Upload images
          const imageUrls: string[] = [];
          for (const pageNum of group.imagePageNumbers) {
            const page = pageImages.find(p => p.pageNumber === pageNum);
            if (!page) continue;
            const response = await fetch(page.dataUrl);
            const blob = await response.blob();
            const fileName = `${vendor.id}/${Date.now()}-p${pageNum}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from('product-images').upload(fileName, blob, { contentType: 'image/jpeg' });
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
              imageUrls.push(urlData.publicUrl);
            }
          }

          const slug = `${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`;
          const category = categories.find(
            c => c.name.toLowerCase() === group.category?.toLowerCase() || c.slug.toLowerCase() === group.category?.toLowerCase()
          );

          // Build variants JSON for products table
          const variantsJson = group.hasVariations && group.variations.length > 0
            ? group.variationTypes.map(type => ({
                name: type,
                values: [...new Set(group.variations.filter(v => v.optionName === type).map(v => v.optionValue).filter(Boolean))],
              }))
            : null;

          const { data: insertedProduct, error } = await supabase.from('products').insert({
            vendor_id: vendor.id,
            title: group.title,
            description: group.description,
            price: group.price,
            compare_at_price: group.compare_at_price || null,
            stock: group.stock,
            sku: group.sku || null,
            category_id: category?.id || null,
            tags: group.tags.length > 0 ? group.tags : null,
            slug,
            is_active: true,
            variants: variantsJson,
          }).select('id').single();

          if (error || !insertedProduct) {
            console.error('Product insert error:', error);
            results.failed++;
            continue;
          }

          // Insert product_variants rows
          if (group.hasVariations && group.variations.length > 0) {
            const variantRows = group.variations.filter(v => v.optionValue).map(v => {
              // Find variant image URL
              let variantImageUrl: string | null = null;
              if (v.imagePageNumber) {
                const pageIdx = group.imagePageNumbers.indexOf(v.imagePageNumber);
                if (pageIdx >= 0 && imageUrls[pageIdx]) variantImageUrl = imageUrls[pageIdx];
              }
              return {
                product_id: insertedProduct.id,
                option_values: { [v.optionName]: v.optionValue } as Record<string, string>,
                price_adjustment: v.priceAdjustment || 0,
                stock: v.stock || 0,
                sku: v.sku || null,
                image_url: variantImageUrl,
                is_active: true,
              };
            });

            if (variantRows.length > 0) {
              const { error: varError } = await supabase.from('product_variants').insert(variantRows);
              if (varError) console.error('Variant insert error:', varError);
            }
          }

          // Insert product_images rows
          if (imageUrls.length > 0) {
            const imgRows = imageUrls.map((url, idx) => ({
              product_id: insertedProduct.id,
              url,
              is_primary: idx === 0,
              sort_order: idx,
            }));
            await supabase.from('product_images').insert(imgRows);
          }

          results.success++;
        } catch (err) {
          console.error('Import error:', err);
          results.failed++;
        }
        setImportProgress(((i + 1) / productGroups.length) * 100);
      }
      return results;
    },
    onSuccess: (results) => {
      toast.success(`Imported ${results.success} products successfully`);
      if (results.failed > 0) toast.warning(`${results.failed} products failed`);
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      resetAll();
    },
    onError: (err: any) => toast.error(err.message || 'Import failed'),
  });

  const resetAll = () => {
    setFile(null);
    setPageImages([]);
    setProductGroups([]);
    setCurrentStep(0);
    setParseProgress(0);
    setImportProgress(0);
    setNextGroupNumber(1);
    setActiveGroupForAssign(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1: return pageImages.length > 0;
      case 2: return pageImages.some(p => p.selected);
      case 3: return productGroups.length > 0 && productGroups.every(g => g.imagePageNumbers.length > 0);
      case 4: return productGroups.every(g => g.title && g.price > 0);
      case 5: return productGroups.every(g =>
        !g.hasVariations || (g.variations.length > 0 && g.variations.every(v => v.optionValue))
      );
      default: return true;
    }
  };

  const productsWithVariations = productGroups.filter(g => g.hasVariations);
  const productsWithoutVariations = productGroups.filter(g => !g.hasVariations);

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all
                ${i < currentStep ? 'bg-primary text-primary-foreground' :
                  i === currentStep ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' :
                  'bg-muted text-muted-foreground'}
              `}>
                {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground hidden sm:block">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ===== STEP 0: UPLOAD ===== */}
        {currentStep === 0 && !isParsing && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Image Catalog PDF Upload
                </CardTitle>
                <CardDescription>
                  Upload a product catalog PDF. Each page becomes a selectable image you can group into products with variations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-lg font-semibold mb-1">Drop your image catalog PDF</p>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
                  <Badge variant="outline">PDF with product images • Max 20MB</Badge>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" aria-label="Upload PDF catalog" />
                <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-sm"><Layers className="w-4 h-4" /> How it works</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Upload a PDF with product images (catalogs, lookbooks, etc.)</li>
                    <li>Preview all pages and select relevant images</li>
                    <li>Create product groups and assign images by clicking</li>
                    <li>Add product details (title, price, description, etc.)</li>
                    <li>Add variations (Size, Color, etc.) for each product</li>
                    <li>Import all products with images & variants in one go</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== PARSING ===== */}
        {isParsing && (
          <motion.div key="parsing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardContent className="pt-8 pb-8">
                <div className="text-center mb-6">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                  <h3 className="text-lg font-semibold">Rendering PDF Pages</h3>
                  <p className="text-sm text-muted-foreground">Converting each page to high-quality images...</p>
                </div>
                <Progress value={parseProgress} className="h-2 max-w-md mx-auto" />
                <p className="text-center text-sm text-muted-foreground mt-2">{parseProgress}%</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== STEP 1: PREVIEW PAGES ===== */}
        {currentStep === 1 && (
          <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5" /> Preview Pages ({pageImages.length})</CardTitle>
                    <CardDescription>Select the pages that contain product images</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllPages}>Select All</Button>
                    <Button variant="outline" size="sm" onClick={deselectAllPages}>Clear</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {pageImages.map(page => (
                    <div
                      key={page.pageNumber}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        page.selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => togglePageSelection(page.pageNumber)}
                    >
                      <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className="w-full aspect-[3/4] object-cover" loading="lazy" />
                      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-xs font-bold px-2 py-0.5 rounded">
                        Page {page.pageNumber}
                      </div>
                      {page.selected && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-primary drop-shadow-lg" />
                        </div>
                      )}
                      <Button
                        size="icon" variant="secondary"
                        className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => { e.stopPropagation(); setZoomedImage(page.dataUrl); }}
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{selectedPages.length} of {pageImages.length} pages selected</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={resetAll}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                    <Button onClick={() => setCurrentStep(2)} disabled={selectedPages.length === 0}>
                      Group Images <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== STEP 2: GROUP IMAGES ===== */}
        {currentStep === 2 && (
          <motion.div key="assign" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Hash className="w-5 h-5" /> Group Images into Products</CardTitle>
                    <CardDescription>
                      Create product groups, then click images to assign them. Select a group first, then click images to add.
                    </CardDescription>
                  </div>
                  <Button onClick={createNewGroup} className="shrink-0">
                    <Plus className="w-4 h-4 mr-1" /> New Product #{nextGroupNumber}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Active group selector */}
                {productGroups.length > 0 && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Assign images to:</p>
                    <div className="flex flex-wrap gap-2">
                      {productGroups.map(g => (
                        <Button
                          key={g.groupNumber}
                          size="sm"
                          variant={activeGroupForAssign === g.groupNumber ? 'default' : 'outline'}
                          onClick={() => setActiveGroupForAssign(g.groupNumber)}
                          className="gap-1.5"
                          style={activeGroupForAssign === g.groupNumber ? { backgroundColor: getGroupColor(g.groupNumber) } : {}}
                        >
                          <Package className="w-3.5 h-3.5" />
                          Product #{g.groupNumber}
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                            {g.imagePageNumbers.length}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                  {pageImages.filter(p => p.selected || p.assignedProduct !== null).map(page => (
                    <div
                      key={page.pageNumber}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        page.assignedProduct
                          ? 'opacity-90'
                          : activeGroupForAssign
                            ? 'border-border hover:border-primary/50 hover:ring-2 hover:ring-primary/20'
                            : 'border-border'
                      }`}
                      style={page.assignedProduct ? { borderColor: getGroupColor(page.assignedProduct) } : {}}
                      onClick={() => {
                        if (page.assignedProduct) return; // already assigned
                        if (!activeGroupForAssign) {
                          toast.error('Create or select a product group first');
                          return;
                        }
                        assignPageToGroup(page.pageNumber, activeGroupForAssign);
                      }}
                    >
                      <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className="w-full aspect-[3/4] object-cover" loading="lazy" />
                      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-xs font-bold px-2 py-0.5 rounded">
                        P{page.pageNumber}
                      </div>

                      {page.assignedProduct && (
                        <div
                          className="absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
                          style={{ backgroundColor: getGroupColor(page.assignedProduct) }}
                        >
                          <Package className="w-3 h-3" /> #{page.assignedProduct}
                        </div>
                      )}

                      {!page.assignedProduct && activeGroupForAssign && (
                        <div className="absolute inset-0 bg-background/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                            + Add to #{activeGroupForAssign}
                          </div>
                        </div>
                      )}

                      {page.assignedProduct && (
                        <Button
                          size="icon" variant="destructive"
                          className="absolute bottom-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => { e.stopPropagation(); removePageFromGroup(page.pageNumber); }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Product Groups Summary */}
                {productGroups.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Product Groups ({productGroups.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {productGroups.map(group => (
                        <Card key={group.groupNumber} className="p-3 border-l-4" style={{ borderLeftColor: getGroupColor(group.groupNumber) }}>
                          <div className="flex items-center justify-between mb-2">
                            <Badge style={{ backgroundColor: getGroupColor(group.groupNumber) }} className="text-white">
                              Product #{group.groupNumber}
                            </Badge>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteProductGroup(group.groupNumber)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          {group.imagePageNumbers.length > 0 ? (
                            <div className="flex gap-1 overflow-x-auto">
                              {group.imagePageNumbers.map(pn => {
                                const img = pageImages.find(p => p.pageNumber === pn);
                                return img ? (
                                  <img key={pn} src={img.dataUrl} alt={`P${pn}`} className="w-12 h-16 object-cover rounded border shrink-0" />
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No images assigned yet</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{group.imagePageNumbers.length} image(s)</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                  <Button
                    onClick={() => {
                      const emptyGroups = productGroups.filter(g => g.imagePageNumbers.length === 0);
                      if (emptyGroups.length > 0) {
                        toast.error(`${emptyGroups.length} group(s) have no images assigned`);
                        return;
                      }
                      setCurrentStep(3);
                    }}
                    disabled={productGroups.length === 0}
                  >
                    Add Product Details <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== STEP 3: PRODUCT DETAILS ===== */}
        {currentStep === 3 && (
          <motion.div key="details" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Edit2 className="w-5 h-5" /> Product Details ({productGroups.length} products)</CardTitle>
                <CardDescription>Add title, price, description. Toggle variations for products that have multiple options.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[65vh]">
                  <div className="space-y-6 pr-4">
                    {productGroups.map(group => (
                      <Card key={group.groupNumber} className="p-4 border-l-4" style={{ borderLeftColor: getGroupColor(group.groupNumber) }}>
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 flex flex-col gap-1">
                            {group.imagePageNumbers.slice(0, 3).map(pn => {
                              const img = pageImages.find(p => p.pageNumber === pn);
                              return img ? (
                                <img key={pn} src={img.dataUrl} alt={`P${pn}`} className="w-20 h-24 object-cover rounded border cursor-pointer hover:ring-2 ring-primary" onClick={() => setZoomedImage(img.dataUrl)} />
                              ) : null;
                            })}
                            {group.imagePageNumbers.length > 3 && (
                              <div className="w-20 h-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">+{group.imagePageNumbers.length - 3} more</div>
                            )}
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge style={{ backgroundColor: getGroupColor(group.groupNumber) }} className="text-white">
                                Product #{group.groupNumber}
                              </Badge>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`var-toggle-${group.groupNumber}`} className="text-xs text-muted-foreground cursor-pointer">
                                  <Palette className="w-3.5 h-3.5 inline mr-1" />
                                  Has Variations
                                </Label>
                                <Switch
                                  id={`var-toggle-${group.groupNumber}`}
                                  checked={group.hasVariations}
                                  onCheckedChange={v => updateProductGroup(group.groupNumber, { hasVariations: v })}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Title *</Label>
                                <Input value={group.title} onChange={e => updateProductGroup(group.groupNumber, { title: e.target.value })} placeholder="Product name" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Price (₹) *</Label>
                                  <Input type="number" min="0" step="0.01" value={group.price || ''} onChange={e => updateProductGroup(group.groupNumber, { price: Number(e.target.value) })} placeholder="0" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Compare Price</Label>
                                  <Input type="number" min="0" value={group.compare_at_price || ''} onChange={e => updateProductGroup(group.groupNumber, { compare_at_price: Number(e.target.value) || undefined })} placeholder="MRP" />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs">Description</Label>
                              <Textarea value={group.description} onChange={e => updateProductGroup(group.groupNumber, { description: e.target.value })} placeholder="Product description..." rows={2} />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Stock</Label>
                                <Input type="number" min="0" value={group.stock || ''} onChange={e => updateProductGroup(group.groupNumber, { stock: Number(e.target.value) })} placeholder="0" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Weight</Label>
                                <Input value={group.weight} onChange={e => updateProductGroup(group.groupNumber, { weight: e.target.value })} placeholder="500g" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">SKU</Label>
                                <Input value={group.sku} onChange={e => updateProductGroup(group.groupNumber, { sku: e.target.value })} placeholder="SKU-001" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Category</Label>
                                <Select value={group.category} onValueChange={v => updateProductGroup(group.groupNumber, { category: v })}>
                                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                                  <SelectContent>
                                    {categories.map(c => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs flex items-center gap-1"><Tag className="w-3 h-3" /> Tags (comma-separated)</Label>
                              <Input value={group.tags.join(', ')} onChange={e => updateProductGroup(group.groupNumber, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="tag1, tag2" />
                            </div>

                            {group.hasVariations && (
                              <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground flex items-center gap-1.5">
                                <Palette className="w-3.5 h-3.5" />
                                Variations will be configured in the next step
                              </div>
                            )}
                          </div>
                        </div>

                        {(!group.title || group.price <= 0) && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {!group.title ? 'Title is required' : 'Price must be greater than 0'}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                  <Button
                    onClick={() => {
                      const incomplete = productGroups.filter(g => !g.title || g.price <= 0);
                      if (incomplete.length > 0) { toast.error(`${incomplete.length} product(s) missing title or price`); return; }
                      // Skip variations step if no products have variations
                      if (!productGroups.some(g => g.hasVariations)) { setCurrentStep(5); return; }
                      setCurrentStep(4);
                    }}
                  >
                    {productGroups.some(g => g.hasVariations) ? 'Configure Variations' : 'Review & Import'}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== STEP 4: VARIATIONS ===== */}
        {currentStep === 4 && (
          <motion.div key="variations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Product Variations</CardTitle>
                <CardDescription>
                  Add Size, Color, and other variations for each product. Set stock & price adjustments per variant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[65vh]">
                  <div className="space-y-8 pr-4">
                    {productGroups.filter(g => g.hasVariations).map((group, gIdx) => (
                      <div key={group.groupNumber} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {group.imagePageNumbers[0] && (
                              <img
                                src={pageImages.find(p => p.pageNumber === group.imagePageNumbers[0])?.dataUrl}
                                alt={group.title}
                                className="w-12 h-16 object-cover rounded border"
                              />
                            )}
                            <div>
                              <Badge style={{ backgroundColor: getGroupColor(group.groupNumber) }} className="text-white mb-1">
                                Product #{group.groupNumber}
                              </Badge>
                              <p className="font-semibold text-sm">{group.title}</p>
                              <p className="text-xs text-muted-foreground">Base: ₹{group.price.toLocaleString()}</p>
                            </div>
                          </div>
                          {gIdx === 0 && productsWithVariations.length > 1 && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => duplicateVariationsToAll(group.groupNumber)}
                              className="gap-1.5"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copy to All
                            </Button>
                          )}
                        </div>

                        {/* Variation Type Selector */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Variation Types</Label>
                          <div className="flex flex-wrap gap-2">
                            {COMMON_VARIATION_TYPES.map(type => {
                              const isActive = group.variationTypes.includes(type);
                              return (
                                <Button
                                  key={type}
                                  size="sm"
                                  variant={isActive ? 'default' : 'outline'}
                                  className="h-7 text-xs"
                                  onClick={() => isActive ? removeVariationType(group.groupNumber, type) : addVariationType(group.groupNumber, type)}
                                >
                                  {isActive && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {type}
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Variations per type */}
                        {group.variationTypes.map(type => {
                          const typeVariations = group.variations.filter(v => v.optionName === type);
                          return (
                            <div key={type} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">{type} Options</Label>
                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => addVariation(group.groupNumber, type)}>
                                  <Plus className="w-3 h-3" /> Add {type}
                                </Button>
                              </div>

                              {typeVariations.length === 0 && (
                                <p className="text-xs text-muted-foreground italic py-2">No {type.toLowerCase()} options added yet. Click "Add {type}" above.</p>
                              )}

                              <div className="space-y-2">
                                {typeVariations.map(variant => (
                                  <div key={variant.id} className="flex items-center gap-2 bg-background p-2 rounded border">
                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      <Input
                                        className="h-8 text-xs"
                                        placeholder={`${type} value (e.g. ${type === 'Size' ? 'XL' : type === 'Color' ? 'Red' : 'Option'})`}
                                        value={variant.optionValue}
                                        onChange={e => updateVariation(group.groupNumber, variant.id, { optionValue: e.target.value })}
                                      />
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹±</span>
                                        <Input
                                          className="h-8 text-xs pl-7"
                                          type="number"
                                          placeholder="0"
                                          value={variant.priceAdjustment || ''}
                                          onChange={e => updateVariation(group.groupNumber, variant.id, { priceAdjustment: Number(e.target.value) })}
                                        />
                                      </div>
                                      <Input
                                        className="h-8 text-xs"
                                        type="number"
                                        placeholder="Stock"
                                        min="0"
                                        value={variant.stock || ''}
                                        onChange={e => updateVariation(group.groupNumber, variant.id, { stock: Number(e.target.value) })}
                                      />
                                      <Input
                                        className="h-8 text-xs"
                                        placeholder="SKU"
                                        value={variant.sku}
                                        onChange={e => updateVariation(group.groupNumber, variant.id, { sku: e.target.value })}
                                      />
                                    </div>

                                    {/* Variant image picker */}
                                    <Select
                                      value={variant.imagePageNumber?.toString() || 'none'}
                                      onValueChange={v => updateVariation(group.groupNumber, variant.id, { imagePageNumber: v === 'none' ? null : Number(v) })}
                                    >
                                      <SelectTrigger className="h-8 w-20 text-xs">
                                        <SelectValue placeholder="Img" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No img</SelectItem>
                                        {group.imagePageNumbers.map(pn => (
                                          <SelectItem key={pn} value={pn.toString()}>P{pn}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeVariation(group.groupNumber, variant.id)}>
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {group.variations.length > 0 && (
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            {group.variations.filter(v => v.optionValue).length} variant(s) configured •
                            Price range: ₹{Math.min(group.price, ...group.variations.map(v => group.price + v.priceAdjustment)).toLocaleString()} — ₹{Math.max(group.price, ...group.variations.map(v => group.price + v.priceAdjustment)).toLocaleString()}
                          </div>
                        )}

                        {gIdx < productsWithVariations.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(3)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                  <Button
                    onClick={() => {
                      const invalid = productGroups.filter(g => g.hasVariations && g.variations.some(v => !v.optionValue));
                      if (invalid.length > 0) { toast.error('Some variations are missing option values'); return; }
                      setCurrentStep(5);
                    }}
                  >
                    Review & Import <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== STEP 5: IMPORT ===== */}
        {currentStep === 5 && (
          <motion.div key="import" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Ready to Import ({productGroups.length} Products)</CardTitle>
                <CardDescription>Review and confirm. Images will be uploaded, products and variants created.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {productGroups.map(group => (
                    <Card key={group.groupNumber} className="p-3 border-l-4" style={{ borderLeftColor: getGroupColor(group.groupNumber) }}>
                      <div className="flex gap-3">
                        <div className="shrink-0">
                          {group.imagePageNumbers[0] && (
                            <img src={pageImages.find(p => p.pageNumber === group.imagePageNumbers[0])?.dataUrl} alt={group.title} className="w-16 h-20 object-cover rounded" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{group.title}</h4>
                          <p className="text-sm text-primary font-bold">₹{group.price.toLocaleString()}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span>{group.imagePageNumbers.length} img</span>
                            <span>Stock: {group.stock}</span>
                            {group.category && <span>{group.category}</span>}
                          </div>
                          {group.hasVariations && group.variations.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {group.variationTypes.map(type => (
                                <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {type}: {group.variations.filter(v => v.optionName === type && v.optionValue).map(v => v.optionValue).join(', ')}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0 h-fit">#{group.groupNumber}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                {isImporting && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading images & creating products...</span>
                      <span>{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    if (productGroups.some(g => g.hasVariations)) setCurrentStep(4);
                    else setCurrentStep(3);
                  }} disabled={isImporting}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => { setIsImporting(true); importProducts.mutate(); }}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Import {productGroups.length} Products</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <DialogHeader className="sr-only"><DialogTitle>Image Preview</DialogTitle></DialogHeader>
          {zoomedImage && <img src={zoomedImage} alt="Zoomed preview" className="w-full h-full object-contain rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
