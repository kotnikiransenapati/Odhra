import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useFrequentlyBoughtTogether } from '@/hooks/useProductAnalytics';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface FrequentlyBoughtTogetherProps {
  productId: string;
  currentProduct: {
    id: string;
    title: string;
    price: number;
    image?: string;
  };
}

export function FrequentlyBoughtTogether({ productId, currentProduct }: FrequentlyBoughtTogetherProps) {
  const { data: associations, isLoading } = useFrequentlyBoughtTogether(productId, 3);
  const { addItem } = useCart();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set([productId]));

  if (isLoading || !associations?.length) {
    return null;
  }

  const products = [
    {
      id: currentProduct.id,
      title: currentProduct.title,
      price: currentProduct.price,
      image: currentProduct.image
    },
    ...associations.map(a => {
      const product = (a as any).products;
      return {
        id: product?.id || '',
        title: product?.title || '',
        price: product?.price || 0,
        image: product?.product_images?.find((img: any) => img.is_primary)?.url || 
               product?.product_images?.[0]?.url
      };
    })
  ].filter(p => p.id);

  const toggleProduct = (productIdToToggle: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productIdToToggle)) {
      // Don't allow deselecting the current product
      if (productIdToToggle !== productId) {
        newSelected.delete(productIdToToggle);
      }
    } else {
      newSelected.add(productIdToToggle);
    }
    setSelectedProducts(newSelected);
  };

  const totalPrice = products
    .filter(p => selectedProducts.has(p.id))
    .reduce((sum, p) => sum + p.price, 0);

  const handleAddAllToCart = async () => {
    const productsToAdd = products.filter(p => selectedProducts.has(p.id));
    for (const product of productsToAdd) {
      await addItem(product.id, 1);
    }
    toast.success(`Added ${productsToAdd.length} items to cart`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Frequently Bought Together</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {products.map((product, index) => (
            <div key={product.id} className="flex items-center gap-2">
              <div 
                className={`relative p-2 border rounded-lg cursor-pointer transition-all ${
                  selectedProducts.has(product.id) 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() => toggleProduct(product.id)}
              >
                <Checkbox
                  checked={selectedProducts.has(product.id)}
                  className="absolute top-2 left-2 z-10"
                  disabled={product.id === productId}
                />
                <img
                  src={product.image || '/placeholder.svg'}
                  alt={product.title}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="mt-2 text-center">
                  <p className="text-xs font-medium truncate max-w-[80px]">{product.title}</p>
                  <p className="text-sm font-bold">₹{product.price.toLocaleString()}</p>
                </div>
              </div>
              {index < products.length - 1 && (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Total for {selectedProducts.size} items:</p>
            <p className="text-xl font-bold">₹{totalPrice.toLocaleString()}</p>
            {products.length > 1 && (
              <p className="text-xs text-success font-semibold mt-0.5">
                Buy together & save on shipping!
              </p>
            )}
          </div>
          <Button onClick={handleAddAllToCart} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Add All to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
