import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Loader2,
  ChevronRight,
  GripVertical,
  ImageIcon,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  children?: Category[];
}

export function CategoryManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: '',
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;

      // Build tree structure
      const buildTree = (items: Category[], parentId: string | null = null): Category[] => {
        return items
          .filter(item => item.parent_id === parentId)
          .map(item => ({
            ...item,
            children: buildTree(items, item.id),
          }));
      };

      return buildTree(data || []);
    },
  });

  const createCategory = useMutation({
    mutationFn: async (data: { name: string; slug: string; description: string; parent_id: string | null }) => {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: data.name,
          slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
          description: data.description || null,
          parent_id: data.parent_id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category created');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; slug: string; description: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category updated');
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category deleted');
    },
    onError: () => toast.error('Failed to delete category. It may have products or subcategories.'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category updated');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', slug: '', description: '', parent_id: '' });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingCategory) {
      updateCategory.mutate({
        id: editingCategory.id,
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
      });
    } else {
      createCategory.mutate({
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        parent_id: formData.parent_id || null,
      });
    }
  };

  const CategoryItem = ({ category, level = 0 }: { category: Category; level?: number }) => (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors`}
        style={{ marginLeft: level * 24 }}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
          {category.image_url ? (
            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{category.name}</p>
            {!category.is_active && (
              <Badge variant="outline" className="text-xs">Inactive</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">/{category.slug}</p>
        </div>
        {category.children && category.children.length > 0 && (
          <Badge variant="secondary">{category.children.length} sub</Badge>
        )}
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => deleteCategory.mutate(category.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
      {category.children?.map((child) => (
        <CategoryItem key={child.id} category={child} level={level + 1} />
      ))}
    </>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Flatten categories for parent selector
  const flattenCategories = (cats: Category[], level = 0): { id: string; name: string; level: number }[] => {
    return cats.flatMap(cat => [
      { id: cat.id, name: cat.name, level },
      ...(cat.children ? flattenCategories(cat.children, level + 1) : []),
    ]);
  };

  const flatCategories = flattenCategories(categories || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Category Manager</h2>
          <p className="text-muted-foreground">Organize your product categories</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingCategory(null); setIsDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="w-5 h-5" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories && categories.length > 0 ? (
            categories.map((category) => (
              <CategoryItem key={category.id} category={category} />
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No categories yet</p>
              <p className="text-sm">Create your first category to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="category-slug"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            {!editingCategory && (
              <div className="space-y-2">
                <Label>Parent Category</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                >
                  <option value="">None (Top Level)</option>
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {'—'.repeat(cat.level)} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
