import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Ruler, Info } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface SizeRow {
  size: string;
  chest?: string;
  waist?: string;
  hip?: string;
  length?: string;
  shoulder?: string;
  uk?: string;
  us?: string;
  eu?: string;
  [key: string]: string | undefined;
}

interface SizeGuideDialogProps {
  category?: string;
  trigger?: React.ReactNode;
}

const APPAREL_SIZES: SizeRow[] = [
  { size: 'XS', chest: '32-34', waist: '26-28', hip: '34-36', shoulder: '14', uk: '6', us: '2', eu: '34' },
  { size: 'S', chest: '34-36', waist: '28-30', hip: '36-38', shoulder: '15', uk: '8', us: '4', eu: '36' },
  { size: 'M', chest: '38-40', waist: '30-32', hip: '38-40', shoulder: '16', uk: '10', us: '6-8', eu: '38-40' },
  { size: 'L', chest: '40-42', waist: '32-34', hip: '40-42', shoulder: '17', uk: '12', us: '10', eu: '42' },
  { size: 'XL', chest: '42-44', waist: '34-36', hip: '42-44', shoulder: '18', uk: '14', us: '12', eu: '44' },
  { size: 'XXL', chest: '44-46', waist: '36-38', hip: '44-46', shoulder: '19', uk: '16', us: '14', eu: '46' },
];

const FOOTWEAR_SIZES: SizeRow[] = [
  { size: '6', uk: '6', us: '7', eu: '39' },
  { size: '7', uk: '7', us: '8', eu: '40' },
  { size: '8', uk: '8', us: '9', eu: '41-42' },
  { size: '9', uk: '9', us: '10', eu: '43' },
  { size: '10', uk: '10', us: '11', eu: '44' },
  { size: '11', uk: '11', us: '12', eu: '45' },
];

export function SizeGuideDialog({ category, trigger }: SizeGuideDialogProps) {
  const { isEnabled } = useFeatureFlag('size_guide');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const isFootwear = category?.toLowerCase().includes('shoe') || category?.toLowerCase().includes('footwear');
  const sizes = isFootwear ? FOOTWEAR_SIZES : APPAREL_SIZES;
  if (!isEnabled) return null;

  const convert = (val: string | undefined) => {
    if (!val || unit === 'in') return val;
    // Convert "32-34" format to cm
    return val.split('-').map(n => {
      const num = parseFloat(n);
      return isNaN(num) ? n : Math.round(num * 2.54).toString();
    }).join('-');
  };

  const bodyColumns = isFootwear
    ? [{ key: 'uk', label: 'UK' }, { key: 'us', label: 'US' }, { key: 'eu', label: 'EU' }]
    : [
        { key: 'chest', label: 'Chest' },
        { key: 'waist', label: 'Waist' },
        { key: 'hip', label: 'Hip' },
        { key: 'shoulder', label: 'Shoulder' },
      ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="link" size="sm" className="h-auto p-0 gap-1 text-muted-foreground hover:text-accent">
            <Ruler className="w-3.5 h-3.5" />
            Size Guide
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-accent" />
            Size Guide
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="chart" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="chart" className="flex-1">Size Chart</TabsTrigger>
            <TabsTrigger value="measure" className="flex-1">How to Measure</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-4 space-y-4">
            {/* Unit toggle */}
            {!isFootwear && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Unit:</span>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setUnit('in')}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${unit === 'in' ? 'bg-accent text-accent-foreground' : 'bg-background hover:bg-muted'}`}
                  >
                    Inches
                  </button>
                  <button
                    onClick={() => setUnit('cm')}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${unit === 'cm' ? 'bg-accent text-accent-foreground' : 'bg-background hover:bg-muted'}`}
                  >
                    CM
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-3 py-2.5 text-left font-semibold">Size</th>
                    {bodyColumns.map(col => (
                      <th key={col.key} className="px-3 py-2.5 text-center font-semibold">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((row, i) => (
                    <tr key={row.size} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-3 py-2.5 font-medium">
                        <Badge variant="outline" className="text-xs">{row.size}</Badge>
                      </td>
                      {bodyColumns.map(col => (
                        <td key={col.key} className="px-3 py-2.5 text-center text-muted-foreground">
                          {isFootwear ? row[col.key] : convert(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* International conversion for apparel */}
            {!isFootwear && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 text-xs font-semibold">International Conversion</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="px-3 py-2 text-left font-medium">Size</th>
                      <th className="px-3 py-2 text-center font-medium">UK</th>
                      <th className="px-3 py-2 text-center font-medium">US</th>
                      <th className="px-3 py-2 text-center font-medium">EU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizes.map((row, i) => (
                      <tr key={row.size} className={i % 2 === 0 ? '' : 'bg-muted/10'}>
                        <td className="px-3 py-2 font-medium">{row.size}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{row.uk}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{row.us}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{row.eu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="measure" className="mt-4 space-y-4">
            <div className="rounded-xl bg-muted/30 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">Use a soft measuring tape for accurate measurements. Measure over light clothing.</p>
              </div>

              {isFootwear ? (
                <div className="space-y-3">
                  <MeasureStep num={1} title="Stand on paper" desc="Place your foot flat on a sheet of paper against a wall." />
                  <MeasureStep num={2} title="Mark the length" desc="Mark the longest toe and the back of your heel." />
                  <MeasureStep num={3} title="Measure distance" desc="Measure the distance between the two marks in centimeters." />
                  <MeasureStep num={4} title="Find your size" desc="Match the measurement to the size chart above." />
                </div>
              ) : (
                <div className="space-y-3">
                  <MeasureStep num={1} title="Chest" desc="Measure around the fullest part of your chest, keeping the tape level." />
                  <MeasureStep num={2} title="Waist" desc="Measure around your natural waistline, keeping the tape comfortably loose." />
                  <MeasureStep num={3} title="Hip" desc="Measure around the fullest part of your hips, about 8 inches below waistline." />
                  <MeasureStep num={4} title="Shoulder" desc="Measure from one shoulder edge to the other across the back." />
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> If you're between sizes, we recommend going one size up for a comfortable fit.
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MeasureStep({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">
        {num}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
