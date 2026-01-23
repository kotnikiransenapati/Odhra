import React from 'react';
import { LayoutGrid, Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ViewMode } from '@/hooks/useViewMode';
import { cn } from '@/lib/utils';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
  showLabels?: boolean;
}

const viewModes: { value: ViewMode; icon: React.ReactNode; label: string; description: string }[] = [
  { 
    value: 'grid', 
    icon: <LayoutGrid className="w-4 h-4" />, 
    label: 'Grid',
    description: 'Standard grid view - balanced detail and overview'
  },
  { 
    value: 'compact', 
    icon: <Grid3X3 className="w-4 h-4" />, 
    label: 'Compact',
    description: 'See more products at once - great for browsing'
  },
  { 
    value: 'list', 
    icon: <List className="w-4 h-4" />, 
    label: 'List',
    description: 'Detailed list view - easy comparison'
  },
];

export function ViewModeToggle({ 
  viewMode, 
  onViewModeChange, 
  className,
  showLabels = false 
}: ViewModeToggleProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex items-center border border-border rounded-lg bg-background/50 backdrop-blur-sm", className)}>
        {viewModes.map((mode) => (
          <Tooltip key={mode.value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={showLabels ? "sm" : "icon"}
                className={cn(
                  "transition-all duration-200",
                  viewMode === mode.value 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'hover:bg-secondary',
                  showLabels && "gap-1.5 px-3"
                )}
                onClick={() => onViewModeChange(mode.value)}
                aria-label={mode.description}
                aria-pressed={viewMode === mode.value}
              >
                {mode.icon}
                {showLabels && <span className="text-xs">{mode.label}</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="font-medium">{mode.label}</p>
              <p className="text-xs text-muted-foreground">{mode.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
