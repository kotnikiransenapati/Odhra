import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckCircle2, XCircle, Loader2, Eye, Trash2, ArrowRight, ArrowLeft,
  Edit2, Save, X, AlertTriangle, Upload, Image as ImageIcon, Plus, Hash,
  GripVertical, Package, ChevronLeft, ChevronRight, ZoomIn, Layers, Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
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
  assignedProduct: number | null; // product group number
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
}

// Steps
const STEPS = [
  { id: 'upload', label: 'Upload PDF' },
  { id: 'preview', label: 'Preview Pages' },
  { id: 'assign', label: 'Group Images' },
  { id: 'details', label: 'Add Details' },
  { id: 'import', label: 'Import' },
];

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
  const [editingGroup, setEditingGroup] = useState<number | null>(null);

  // Fetch vendor and categories
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

  // ===== STEP 1: Upload & Render PDF pages to images =====
  const renderPDFPages = useCallback(async (pdfFile: File) => {
    setIsParsing(true);
    setParseProgress(5);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Use CDN worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await pdfFile.arrayBuffer();
      setParseProgress(15);

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const images: PDFPageImage[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2; // High resolution
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
      toast.error('Failed to render PDF pages: ' + (error.message || 'Unknown error'));
      setCurrentStep(0);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    setFile(selectedFile);
    await renderPDFPages(selectedFile);
  };

  // ===== STEP 2: Preview & Select pages =====
  const togglePageSelection = (pageNumber: number) => {
    setPageImages(prev =>
      prev.map(p => p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p)
    );
  };

  const selectAllPages = () => {
    setPageImages(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const deselectAllPages = () => {
    setPageImages(prev => prev.map(p => ({ ...p, selected: false, assignedProduct: null })));
    setProductGroups([]);
    setNextGroupNumber(1);
  };

  const selectedPages = pageImages.filter(p => p.selected);

  // ===== STEP 3: Assign images to product groups =====
  const createNewProductGroup = () => {
    const selectedUnassigned = pageImages.filter(p => p.selected && p.assignedProduct === null);
    if (selectedUnassigned.length === 0) {
      toast.error('Select at least one unassigned image first');
      return;
    }

    // Temporarily select pages by checking which ones are "checked" in the assign step
    // We use a different mechanism: user checks pages then clicks "Create Group"
  };

  const assignPagesToGroup = (pageNumbers: number[], groupNumber: number) => {
    setPageImages(prev =>
      prev.map(p => pageNumbers.includes(p.pageNumber)
        ? { ...p, assignedProduct: groupNumber, selected: true }
        : p
      )
    );

    // Update product group's image list
    setProductGroups(prev => {
      const existing = prev.find(g => g.groupNumber === groupNumber);
      if (existing) {
        return prev.map(g =>
          g.groupNumber === groupNumber
            ? { ...g, imagePageNumbers: [...new Set([...g.imagePageNumbers, ...pageNumbers])] }
            : g
        );
      }
      return [
        ...prev,
        {
          groupNumber,
          title: `Product ${groupNumber}`,
          description: '',
          price: 0,
          stock: 0,
          weight: '',
          sku: '',
          category: '',
          tags: [],
          imagePageNumbers: pageNumbers,
        },
      ];
    });
  };

  const removePageFromGroup = (pageNumber: number) => {
    const page = pageImages.find(p => p.pageNumber === pageNumber);
    if (!page?.assignedProduct) return;

    const groupNum = page.assignedProduct;
    setPageImages(prev =>
      prev.map(p => p.pageNumber === pageNumber ? { ...p, assignedProduct: null } : p)
    );
    setProductGroups(prev =>
      prev.map(g =>
        g.groupNumber === groupNum
          ? { ...g, imagePageNumbers: g.imagePageNumbers.filter(pn => pn !== pageNumber) }
          : g
      ).filter(g => g.imagePageNumbers.length > 0)
    );
  };

  const deleteProductGroup = (groupNumber: number) => {
    setPageImages(prev =>
      prev.map(p => p.assignedProduct === groupNumber ? { ...p, assignedProduct: null } : p)
    );
    setProductGroups(prev => prev.filter(g => g.groupNumber !== groupNumber));
  };

  // ===== STEP 4: Product details =====
  const updateProductGroup = (groupNumber: number, updates: Partial<ProductGroup>) => {
    setProductGroups(prev =>
      prev.map(g => g.groupNumber === groupNumber ? { ...g, ...updates } : g)
    );
  };

  // ===== STEP 5: Import =====
  const importProducts = useMutation({
    mutationFn: async () => {
      if (!vendor) throw new Error('Vendor not found');

      const results = { success: 0, failed: 0 };

      for (let i = 0; i < productGroups.length; i++) {
        const group = productGroups[i];
        if (!group.title || group.price <= 0) {
          results.failed++;
          continue;
        }

        try {
          // Upload images to storage
          const imageUrls: string[] = [];
          for (const pageNum of group.imagePageNumbers) {
            const page = pageImages.find(p => p.pageNumber === pageNum);
            if (!page) continue;

            // Convert data URL to blob
            const response = await fetch(page.dataUrl);
            const blob = await response.blob();
            const fileName = `${vendor.id}/${Date.now()}-p${pageNum}.jpg`;

            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, blob, { contentType: 'image/jpeg' });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);
              imageUrls.push(urlData.publicUrl);
            }
          }

          const slug = `${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`;
          const category = categories.find(
            c => c.name.toLowerCase() === group.category?.toLowerCase() ||
                 c.slug.toLowerCase() === group.category?.toLowerCase()
          );

          const { error } = await supabase.from('products').insert({
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
            images: imageUrls,
            image_url: imageUrls[0] || null,
          });

          if (error) {
            console.error('Product insert error:', error);
            results.failed++;
          } else {
            results.success++;
          }
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
    onError: (err: any) => {
      toast.error(err.message || 'Import failed');
    },
  });

  const resetAll = () => {
    setFile(null);
    setPageImages([]);
    setProductGroups([]);
    setCurrentStep(0);
    setParseProgress(0);
    setImportProgress(0);
    setNextGroupNumber(1);
    setEditingGroup(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validation for step navigation
  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1: return pageImages.length > 0;
      case 2: return pageImages.some(p => p.selected);
      case 3: return productGroups.length > 0 && productGroups.every(g => g.imagePageNumbers.length > 0);
      case 4: return productGroups.every(g => g.title && g.price > 0);
      default: return true;
    }
  };

  // Color palette for product group badges
  const groupColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-violet-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500',
    'bg-teal-500', 'bg-indigo-500', 'bg-lime-500', 'bg-fuchsia-500',
  ];
  const getGroupColor = (num: number) => groupColors[(num - 1) % groupColors.length];

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
                ${i < currentStep ? 'bg-primary text-primary-foreground' :
                  i === currentStep ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' :
                  'bg-muted text-muted-foreground'}
              `}>
                {i < currentStep ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
              </div>
              <span className="text-xs font-medium text-muted-foreground">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
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
                  Upload a PDF containing product images. Each page will be rendered as a preview so you can group images into products.
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

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload PDF catalog"
                />

                <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <Layers className="w-4 h-4" /> How it works
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Upload a PDF with product images (catalogs, lookbooks, etc.)</li>
                    <li>Preview all pages and select relevant images</li>
                    <li>Number & group images — assign multiple images to the same product</li>
                    <li>Add product details (title, price, description, etc.)</li>
                    <li>Import all products with images in one go</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== PARSING PROGRESS ===== */}
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
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Preview Pages ({pageImages.length} pages)
                    </CardTitle>
                    <CardDescription>Select the pages that contain product images you want to import</CardDescription>
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
                      <img
                        src={page.dataUrl}
                        alt={`Page ${page.pageNumber}`}
                        className="w-full aspect-[3/4] object-cover"
                        loading="lazy"
                      />
                      {/* Page number badge */}
                      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-xs font-bold px-2 py-0.5 rounded">
                        Page {page.pageNumber}
                      </div>
                      {/* Selection overlay */}
                      {page.selected && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-primary drop-shadow-lg" />
                        </div>
                      )}
                      {/* Zoom button */}
                      <Button
                        size="icon"
                        variant="secondary"
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
                    <Button
                      onClick={() => setCurrentStep(2)}
                      disabled={selectedPages.length === 0}
                    >
                      Group Images <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== STEP 2: ASSIGN/GROUP IMAGES ===== */}
        {currentStep === 2 && (
          <motion.div key="assign" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="w-5 h-5" />
                      Group Images into Products
                    </CardTitle>
                    <CardDescription>
                      Click images to select them, then click "Create Product Group" to assign them to a product number.
                      Multiple images can belong to the same product.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      const checkedPages = pageImages.filter(p => p.selected && p.assignedProduct === null);
                      if (checkedPages.length === 0) {
                        toast.error('Select unassigned images first (click on them)');
                        return;
                      }
                      const groupNum = nextGroupNumber;
                      assignPagesToGroup(checkedPages.map(p => p.pageNumber), groupNum);
                      setNextGroupNumber(groupNum + 1);
                      // Deselect for next batch
                      setPageImages(prev => prev.map(p =>
                        checkedPages.some(cp => cp.pageNumber === p.pageNumber)
                          ? { ...p, selected: true } // keep selected but now assigned
                          : p
                      ));
                      toast.success(`Product #${groupNum} created with ${checkedPages.length} image(s)`);
                    }}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Create Product Group #{nextGroupNumber}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Image grid with group badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                  {pageImages.filter(p => p.selected || p.assignedProduct !== null).map(page => (
                    <div
                      key={page.pageNumber}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        page.assignedProduct
                          ? 'border-primary/50 opacity-90'
                          : page.selected
                            ? 'border-accent ring-2 ring-accent/30'
                            : 'border-border'
                      }`}
                      onClick={() => {
                        if (!page.assignedProduct) {
                          togglePageSelection(page.pageNumber);
                        }
                      }}
                    >
                      <img
                        src={page.dataUrl}
                        alt={`Page ${page.pageNumber}`}
                        className="w-full aspect-[3/4] object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-xs font-bold px-2 py-0.5 rounded">
                        P{page.pageNumber}
                      </div>

                      {/* Product group badge */}
                      {page.assignedProduct && (
                        <div className={`absolute top-2 right-2 ${getGroupColor(page.assignedProduct)} text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1`}>
                          <Package className="w-3 h-3" /> #{page.assignedProduct}
                        </div>
                      )}

                      {/* Unassigned selected indicator */}
                      {!page.assignedProduct && page.selected && (
                        <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
                          <div className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                            ✓ Selected
                          </div>
                        </div>
                      )}

                      {/* Remove from group */}
                      {page.assignedProduct && (
                        <Button
                          size="icon"
                          variant="destructive"
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
                        <Card key={group.groupNumber} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={`${getGroupColor(group.groupNumber)} text-white`}>
                              Product #{group.groupNumber}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive"
                              onClick={() => deleteProductGroup(group.groupNumber)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="flex gap-1 overflow-x-auto">
                            {group.imagePageNumbers.map(pn => {
                              const img = pageImages.find(p => p.pageNumber === pn);
                              return img ? (
                                <img
                                  key={pn}
                                  src={img.dataUrl}
                                  alt={`P${pn}`}
                                  className="w-12 h-16 object-cover rounded border shrink-0"
                                />
                              ) : null;
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.imagePageNumbers.length} image(s)
                          </p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    disabled={productGroups.length === 0}
                  >
                    Add Product Details <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== STEP 3: ADD DETAILS ===== */}
        {currentStep === 3 && (
          <motion.div key="details" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5" />
                  Product Details ({productGroups.length} products)
                </CardTitle>
                <CardDescription>Add title, price, description and other details for each product</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[65vh]">
                  <div className="space-y-6 pr-4">
                    {productGroups.map((group, idx) => (
                      <Card key={group.groupNumber} className="p-4 border-l-4" style={{ borderLeftColor: `hsl(${(group.groupNumber * 47) % 360}, 70%, 55%)` }}>
                        <div className="flex items-start gap-4">
                          {/* Image thumbnails */}
                          <div className="shrink-0 flex flex-col gap-1">
                            {group.imagePageNumbers.slice(0, 3).map(pn => {
                              const img = pageImages.find(p => p.pageNumber === pn);
                              return img ? (
                                <img
                                  key={pn}
                                  src={img.dataUrl}
                                  alt={`P${pn}`}
                                  className="w-20 h-24 object-cover rounded border cursor-pointer hover:ring-2 ring-primary"
                                  onClick={() => setZoomedImage(img.dataUrl)}
                                />
                              ) : null;
                            })}
                            {group.imagePageNumbers.length > 3 && (
                              <div className="w-20 h-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                +{group.imagePageNumbers.length - 3} more
                              </div>
                            )}
                          </div>

                          {/* Form fields */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${getGroupColor(group.groupNumber)} text-white`}>
                                Product #{group.groupNumber}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {group.imagePageNumbers.length} image(s)
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Title *</Label>
                                <Input
                                  value={group.title}
                                  onChange={e => updateProductGroup(group.groupNumber, { title: e.target.value })}
                                  placeholder="Product name"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Price (₹) *</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={group.price || ''}
                                    onChange={e => updateProductGroup(group.groupNumber, { price: Number(e.target.value) })}
                                    placeholder="0"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Compare Price</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={group.compare_at_price || ''}
                                    onChange={e => updateProductGroup(group.groupNumber, { compare_at_price: Number(e.target.value) || undefined })}
                                    placeholder="MRP"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs">Description</Label>
                              <Textarea
                                value={group.description}
                                onChange={e => updateProductGroup(group.groupNumber, { description: e.target.value })}
                                placeholder="Product description..."
                                rows={2}
                              />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Stock</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={group.stock || ''}
                                  onChange={e => updateProductGroup(group.groupNumber, { stock: Number(e.target.value) })}
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Weight</Label>
                                <Input
                                  value={group.weight}
                                  onChange={e => updateProductGroup(group.groupNumber, { weight: e.target.value })}
                                  placeholder="500g"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">SKU</Label>
                                <Input
                                  value={group.sku}
                                  onChange={e => updateProductGroup(group.groupNumber, { sku: e.target.value })}
                                  placeholder="SKU-001"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Category</Label>
                                <Select
                                  value={group.category}
                                  onValueChange={v => updateProductGroup(group.groupNumber, { category: v })}
                                >
                                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                                  <SelectContent>
                                    {categories.map(c => (
                                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs flex items-center gap-1"><Tag className="w-3 h-3" /> Tags (comma-separated)</Label>
                              <Input
                                value={group.tags.join(', ')}
                                onChange={e => updateProductGroup(group.groupNumber, {
                                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                                })}
                                placeholder="tag1, tag2"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Validation */}
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
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => {
                      const incomplete = productGroups.filter(g => !g.title || g.price <= 0);
                      if (incomplete.length > 0) {
                        toast.error(`${incomplete.length} product(s) missing title or price`);
                        return;
                      }
                      setCurrentStep(4);
                    }}
                  >
                    Review & Import <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== STEP 4: IMPORT ===== */}
        {currentStep === 4 && (
          <motion.div key="import" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Ready to Import ({productGroups.length} Products)
                </CardTitle>
                <CardDescription>Review and confirm import. Images will be uploaded and products created.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {productGroups.map(group => (
                    <Card key={group.groupNumber} className="p-3">
                      <div className="flex gap-3">
                        <div className="shrink-0">
                          {group.imagePageNumbers[0] && (
                            <img
                              src={pageImages.find(p => p.pageNumber === group.imagePageNumbers[0])?.dataUrl}
                              alt={group.title}
                              className="w-16 h-20 object-cover rounded"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{group.title}</h4>
                          <p className="text-sm text-primary font-bold">₹{group.price.toLocaleString()}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            <span>{group.imagePageNumbers.length} img</span>
                            <span>Stock: {group.stock}</span>
                            {group.category && <span>{group.category}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 h-fit">#{group.groupNumber}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                {isImporting && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading images & creating products...
                      </span>
                      <span>{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(3)} disabled={isImporting}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => {
                      setIsImporting(true);
                      importProducts.mutate();
                    }}
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
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {zoomedImage && (
            <img src={zoomedImage} alt="Zoomed preview" className="w-full h-full object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
