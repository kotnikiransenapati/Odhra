import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  Loader2,
  Eye,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ParsedProduct {
  title: string;
  description: string;
  price: number;
  compare_at_price?: number;
  stock: number;
  sku?: string;
  category?: string;
  tags?: string[];
  isValid: boolean;
  errors: string[];
  rowNumber: number;
}

interface UploadStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

const SAMPLE_CSV = `title,description,price,compare_at_price,stock,sku,category,tags
"Premium Silk Scarf","Handwoven silk scarf with intricate patterns",2499,2999,50,SKU001,"Accessories","silk,handmade,premium"
"Organic Cotton T-Shirt","100% organic cotton, eco-friendly",999,1299,100,SKU002,"Clothing","cotton,organic,casual"`;

export function BulkProductUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps: UploadStep[] = [
    { id: 'upload', label: 'Upload File', status: currentStep === 0 ? 'active' : currentStep > 0 ? 'completed' : 'pending' },
    { id: 'validate', label: 'Validate Data', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending' },
    { id: 'preview', label: 'Preview', status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending' },
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

  const parseCSV = (csvText: string): ParsedProduct[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const products: ParsedProduct[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      // Parse CSV handling quoted values
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const product: Record<string, any> = {};
      headers.forEach((header, index) => {
        product[header] = values[index]?.replace(/"/g, '') || '';
      });
      
      const errors: string[] = [];
      
      // Validation
      if (!product.title) errors.push('Title is required');
      if (!product.price || isNaN(Number(product.price))) errors.push('Valid price is required');
      if (product.stock && isNaN(Number(product.stock))) errors.push('Stock must be a number');
      
      const price = Number(product.price) || 0;
      const compareAtPrice = product.compare_at_price ? Number(product.compare_at_price) : undefined;
      
      if (compareAtPrice && compareAtPrice <= price) {
        errors.push('Compare at price should be higher than price');
      }
      
      products.push({
        title: product.title || '',
        description: product.description || '',
        price,
        compare_at_price: compareAtPrice,
        stock: Number(product.stock) || 0,
        sku: product.sku || undefined,
        category: product.category || undefined,
        tags: product.tags ? product.tags.split(',').map((t: string) => t.trim()) : [],
        isValid: errors.length === 0,
        errors,
        rowNumber: i + 1,
      });
    }
    
    return products;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    setFile(selectedFile);
    setCurrentStep(1);
    
    try {
      const text = await selectedFile.text();
      const products = parseCSV(text);
      setParsedProducts(products);
      setCurrentStep(2);
      setShowPreview(true);
    } catch (error) {
      toast.error('Failed to parse CSV file');
      setCurrentStep(0);
    }
  };

  const importProducts = useMutation({
    mutationFn: async (products: ParsedProduct[]) => {
      if (!vendor) throw new Error('Vendor not found');
      
      const validProducts = products.filter(p => p.isValid);
      const results = { success: 0, failed: 0 };
      
      for (let i = 0; i < validProducts.length; i++) {
        const product = validProducts[i];
        
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
          sku: product.sku,
          category_id: category?.id,
          tags: product.tags,
          slug,
          is_active: true,
        });
        
        if (error) {
          results.failed++;
        } else {
          results.success++;
        }
        
        setUploadProgress(((i + 1) / validProducts.length) * 100);
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
    setIsUploading(true);
    setCurrentStep(3);
    await importProducts.mutateAsync(parsedProducts);
    setIsUploading(false);
  };

  const resetUpload = () => {
    setFile(null);
    setParsedProducts([]);
    setUploadProgress(0);
    setShowPreview(false);
    setCurrentStep(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_products.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validCount = parsedProducts.filter(p => p.isValid).length;
  const invalidCount = parsedProducts.filter(p => !p.isValid).length;

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
                step.status === 'completed' ? 'bg-green-500' : 'bg-muted'
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
                <Upload className="w-5 h-5" />
                Bulk Product Upload
              </CardTitle>
              <CardDescription>
                Upload a CSV file to import multiple products at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <FileSpreadsheet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <Badge variant="outline">CSV files only</Badge>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button variant="outline" onClick={downloadSampleCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview Import ({parsedProducts.length} products)
            </DialogTitle>
          </DialogHeader>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-500">{validCount}</p>
                <p className="text-sm text-muted-foreground">Valid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-red-500">{invalidCount}</p>
                <p className="text-sm text-muted-foreground">Invalid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{parsedProducts.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Products Table */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedProducts.map((product, i) => (
                  <TableRow key={i} className={!product.isValid ? 'bg-destructive/5' : ''}>
                    <TableCell>{product.rowNumber}</TableCell>
                    <TableCell className="font-medium">{product.title || '-'}</TableCell>
                    <TableCell>₹{product.price.toLocaleString()}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{product.category || '-'}</TableCell>
                    <TableCell>
                      {product.isValid ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          {product.errors[0]}
                        </Badge>
                      )}
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
              <Progress value={uploadProgress} />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetUpload} disabled={isUploading}>
              <Trash2 className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={validCount === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Import {validCount} Products
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
