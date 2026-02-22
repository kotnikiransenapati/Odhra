import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Eye,
  Trash2,
  ArrowRight,
  Edit2,
  Save,
  X,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface ExtractedProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price?: number;
  stock: number;
  weight?: string;
  sku?: string;
  category?: string;
  tags?: string[];
  isValid: boolean;
  errors: string[];
  isSelected: boolean;
  rawText?: string;
}

interface UploadStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export function PDFProductUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseProgress, setParseProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingProduct, setEditingProduct] = useState<ExtractedProduct | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  
  const steps: UploadStep[] = [
    { id: 'upload', label: 'Upload PDF', status: currentStep === 0 ? 'active' : currentStep > 0 ? 'completed' : 'pending' },
    { id: 'extract', label: 'Extract Data', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending' },
    { id: 'review', label: 'Review & Edit', status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending' },
    { id: 'import', label: 'Import', status: currentStep === 3 ? 'active' : 'pending' },
  ];

  // Fetch vendor and categories
  const { data: vendor } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-upload'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true);
      return data || [];
    },
  });

  // Parse PDF and extract products using document parsing
  const parsePDFContent = async (pdfFile: File): Promise<ExtractedProduct[]> => {
    setParseProgress(10);
    
    // Read file as base64 for processing
    const arrayBuffer = await pdfFile.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    setParseProgress(30);
    
    // Use edge function to extract product data from PDF
    const { data, error } = await supabase.functions.invoke('extract-pdf-products', {
      body: { 
        pdfBase64: base64,
        fileName: pdfFile.name 
      },
    });
    
    setParseProgress(80);
    
    if (error) {
      throw new Error('Failed to extract products from PDF');
    }
    
    setParseProgress(100);
    
    // Validate and structure extracted products
    const products: ExtractedProduct[] = (data?.products || []).map((p: any, index: number) => {
      const errors: string[] = [];
      
      if (!p.title || p.title.trim() === '') errors.push('Title is required');
      if (!p.price || isNaN(Number(p.price)) || Number(p.price) <= 0) errors.push('Valid price is required');
      if (p.stock !== undefined && isNaN(Number(p.stock))) errors.push('Stock must be a number');
      if (p.compare_at_price && Number(p.compare_at_price) <= Number(p.price)) {
        errors.push('Compare at price should be higher than price');
      }
      
      return {
        id: `pdf-${Date.now()}-${index}`,
        title: p.title?.trim() || '',
        description: p.description?.trim() || '',
        price: Number(p.price) || 0,
        compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : undefined,
        stock: Number(p.stock) || 0,
        weight: p.weight?.toString() || '',
        sku: p.sku || '',
        category: p.category || '',
        tags: Array.isArray(p.tags) ? p.tags : (p.tags?.split(',').map((t: string) => t.trim()) || []),
        isValid: errors.length === 0,
        errors,
        isSelected: errors.length === 0,
        rawText: p.rawText || '',
      };
    });
    
    return products;
  };

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
    setCurrentStep(1);
    setIsParsing(true);
    setParseProgress(0);
    
    try {
      const products = await parsePDFContent(selectedFile);
      
      if (products.length === 0) {
        toast.error('No products found in PDF. Please ensure the PDF contains product data in a structured format.');
        setCurrentStep(0);
        setIsParsing(false);
        return;
      }
      
      setExtractedProducts(products);
      setCurrentStep(2);
      setShowPreview(true);
      toast.success(`Extracted ${products.length} products from PDF`);
    } catch (error: any) {
      console.error('PDF parsing error:', error);
      toast.error(error.message || 'Failed to parse PDF file');
      setCurrentStep(0);
    } finally {
      setIsParsing(false);
    }
  };

  const handleEditProduct = (product: ExtractedProduct) => {
    setEditingProduct({ ...product });
    setShowEditSheet(true);
  };

  const handleSaveEdit = () => {
    if (!editingProduct) return;
    
    // Re-validate
    const errors: string[] = [];
    if (!editingProduct.title.trim()) errors.push('Title is required');
    if (!editingProduct.price || editingProduct.price <= 0) errors.push('Valid price is required');
    if (editingProduct.compare_at_price && editingProduct.compare_at_price <= editingProduct.price) {
      errors.push('Compare at price should be higher than price');
    }
    
    const updatedProduct = {
      ...editingProduct,
      isValid: errors.length === 0,
      errors,
      isSelected: errors.length === 0 && editingProduct.isSelected,
    };
    
    setExtractedProducts(prev => 
      prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    );
    
    setShowEditSheet(false);
    setEditingProduct(null);
    toast.success('Product updated');
  };

  const handleToggleSelect = (productId: string) => {
    setExtractedProducts(prev =>
      prev.map(p => p.id === productId ? { ...p, isSelected: !p.isSelected } : p)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setExtractedProducts(prev =>
      prev.map(p => ({ ...p, isSelected: p.isValid && selected }))
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setExtractedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const importProducts = useMutation({
    mutationFn: async (products: ExtractedProduct[]) => {
      if (!vendor) throw new Error('Vendor not found');
      
      const selectedProducts = products.filter(p => p.isSelected && p.isValid);
      const results = { success: 0, failed: 0 };
      
      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i];
        
        // Find category by name
        const category = categories.find(
          c => c.name.toLowerCase() === product.category?.toLowerCase() || 
               c.slug.toLowerCase() === product.category?.toLowerCase()
        );
        
        // Generate slug
        const slug = `${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`;
        
        const { error } = await supabase.from('products').insert({
          vendor_id: vendor.id,
          title: product.title,
          description: product.description,
          price: product.price,
          compare_at_price: product.compare_at_price,
          stock: product.stock,
          sku: product.sku || null,
          category_id: category?.id || null,
          tags: product.tags,
          slug,
          is_active: true,
        });
        
        if (error) {
          console.error('Insert error:', error);
          results.failed++;
        } else {
          results.success++;
        }
        
        setUploadProgress(((i + 1) / selectedProducts.length) * 100);
      }
      
      return results;
    },
    onSuccess: (results) => {
      toast.success(`Imported ${results.success} products successfully`);
      if (results.failed > 0) {
        toast.warning(`${results.failed} products failed to import`);
      }
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      resetUpload();
    },
    onError: (error) => {
      toast.error('Failed to import products');
      console.error(error);
    },
  });

  const handleImport = async () => {
    const selectedCount = extractedProducts.filter(p => p.isSelected && p.isValid).length;
    if (selectedCount === 0) {
      toast.error('No valid products selected for import');
      return;
    }
    
    setIsUploading(true);
    setCurrentStep(3);
    await importProducts.mutateAsync(extractedProducts);
    setIsUploading(false);
  };

  const resetUpload = () => {
    setFile(null);
    setExtractedProducts([]);
    setUploadProgress(0);
    setParseProgress(0);
    setShowPreview(false);
    setCurrentStep(0);
    setEditingProduct(null);
    setShowEditSheet(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = extractedProducts.filter(p => p.isValid).length;
  const invalidCount = extractedProducts.filter(p => !p.isValid).length;
  const selectedCount = extractedProducts.filter(p => p.isSelected && p.isValid).length;

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-2">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors
                ${step.status === 'completed' ? 'bg-success text-success-foreground' : 
                  step.status === 'active' ? 'bg-accent text-accent-foreground' : 
                  step.status === 'error' ? 'bg-destructive text-destructive-foreground' :
                  'bg-muted text-muted-foreground'}
              `}>
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  i + 1
                )}
              </div>
              <span className="text-xs font-medium">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                step.status === 'completed' ? 'bg-success' : 'bg-muted'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Upload Area */}
      {currentStep === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                PDF Product Upload
              </CardTitle>
              <CardDescription>
                Upload a PDF file containing product catalog, price list, or invoice to extract products automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Drop your PDF file here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <Badge variant="outline">PDF files only (max 20MB)</Badge>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload PDF file"
              />
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Supported PDF Formats
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Product catalogs with tables</li>
                  <li>• Price lists with product names and prices</li>
                  <li>• Invoices with item details</li>
                  <li>• Any PDF with structured product information</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Parsing Progress */}
      {currentStep === 1 && isParsing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-accent mb-4" />
                <h3 className="text-lg font-semibold">Extracting Products from PDF</h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing document structure and extracting product data...
                </p>
              </div>
              <Progress value={parseProgress} className="h-2" aria-label="PDF parsing progress" />
              <p className="text-center text-sm text-muted-foreground mt-2">
                {parseProgress}% complete
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Review Extracted Products ({extractedProducts.length} found)
            </DialogTitle>
          </DialogHeader>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{extractedProducts.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-success">{validCount}</p>
                <p className="text-sm text-muted-foreground">Valid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-destructive">{invalidCount}</p>
                <p className="text-sm text-muted-foreground">Need Review</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-accent">{selectedCount}</p>
                <p className="text-sm text-muted-foreground">Selected</p>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSelectAll(true)}
            >
              Select All Valid
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSelectAll(false)}
            >
              Deselect All
            </Button>
          </div>

          {/* Products Table */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedProducts.map((product) => (
                  <TableRow 
                    key={product.id} 
                    className={!product.isValid ? 'bg-destructive/5' : ''}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={product.isSelected}
                        onChange={() => handleToggleSelect(product.id)}
                        disabled={!product.isValid}
                        className="h-4 w-4 rounded border-input"
                        aria-label={`Select ${product.title}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {product.title || <span className="text-muted-foreground italic">No title</span>}
                    </TableCell>
                    <TableCell>
                      {product.price > 0 ? `₹${product.price.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>{product.stock || 0}</TableCell>
                    <TableCell>{product.weight || '-'}</TableCell>
                    <TableCell>{product.category || '-'}</TableCell>
                    <TableCell>
                      {product.isValid ? (
                        <Badge variant="default" className="bg-success">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="cursor-help" title={product.errors.join(', ')}>
                          <XCircle className="w-3 h-3 mr-1" />
                          {product.errors.length} issue{product.errors.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEditProduct(product)}
                          aria-label={`Edit ${product.title}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveProduct(product.id)}
                          aria-label={`Remove ${product.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing products...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} aria-label="Import progress" />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetUpload} disabled={isUploading}>
              <Trash2 className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={selectedCount === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Import {selectedCount} Products
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Product</SheetTitle>
          </SheetHeader>
          
          {editingProduct && (
            <div className="space-y-4 mt-6">
              {editingProduct.errors.length > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-1">Issues to fix:</p>
                  <ul className="text-sm text-destructive/80 list-disc list-inside">
                    {editingProduct.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit-title">Product Title *</Label>
                <Input
                  id="edit-title"
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  placeholder="Enter product title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price (₹) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-compare-price">Compare at Price</Label>
                  <Input
                    id="edit-compare-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.compare_at_price || ''}
                    onChange={(e) => setEditingProduct({ 
                      ...editingProduct, 
                      compare_at_price: e.target.value ? Number(e.target.value) : undefined 
                    })}
                    placeholder="Original price"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stock</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min="0"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Weight</Label>
                  <Input
                    id="edit-weight"
                    value={editingProduct.weight || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, weight: e.target.value })}
                    placeholder="e.g., 500g, 1kg"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU</Label>
                <Input
                  id="edit-sku"
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  placeholder="Product SKU"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingProduct.category || ''}
                  onValueChange={(value) => setEditingProduct({ ...editingProduct, category: value })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  value={editingProduct.tags?.join(', ') || ''}
                  onChange={(e) => setEditingProduct({ 
                    ...editingProduct, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                  })}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              
              {editingProduct.rawText && (
                <div className="space-y-2">
                  <Label>Original Text from PDF</Label>
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground max-h-32 overflow-y-auto">
                    {editingProduct.rawText}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEditSheet(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
