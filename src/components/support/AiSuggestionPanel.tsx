import { Sparkles, AlertTriangle, Check, Copy, Loader2, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMarkAiSuggestion, useSupportCopilot, useTicketAiSuggestions } from '@/hooks/useSupportCopilot';
import { toast } from 'sonner';

interface AiSuggestionPanelProps {
  ticketId: string;
  mode?: 'admin_reply' | 'customer_self_help';
  onUseReply?: (reply: string) => void;
}

const toneLabels: Record<string, string> = {
  warm: 'Warm',
  concise: 'Concise',
  apologetic: 'Apologetic',
  premium: 'Premium',
};

export function AiSuggestionPanel({ ticketId, mode = 'admin_reply', onUseReply }: AiSuggestionPanelProps) {
  const { data: suggestions = [], isLoading } = useTicketAiSuggestions(ticketId);
  const copilot = useSupportCopilot(ticketId);
  const marker = useMarkAiSuggestion();
  const latest = suggestions.find((item) => item.status === 'draft') || suggestions[0];

  const generate = (tone: string) => {
    copilot.mutate({ mode, tone: `${toneLabels[tone] || tone}, factual, policy-safe` });
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-accent" />
              AI Support Copilot
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'admin_reply' ? 'Drafts agent replies from verified ticket context.' : 'Generates self-help guidance from your ticket context.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select onValueChange={generate} disabled={copilot.isPending}>
              <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Generate" /></SelectTrigger>
              <SelectContent>
                {Object.entries(toneLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={copilot.isPending} onClick={() => generate('warm')}>
              {copilot.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading suggestions…</p>
        ) : !latest ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Generate a context-aware suggestion for this ticket.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">{latest.sentiment}</Badge>
              <Badge variant={latest.urgency_score >= 70 ? 'destructive' : 'secondary'}>Urgency {latest.urgency_score}</Badge>
              <span className="text-xs text-muted-foreground">{latest.status}</span>
            </div>
            <Progress value={latest.urgency_score} className="h-1.5" />
            <div className="rounded-lg bg-background/80 border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
              <p className="text-sm">{latest.summary}</p>
            </div>
            <div className="rounded-lg bg-background border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Suggested reply</p>
              <p className="text-sm whitespace-pre-wrap">{latest.suggested_reply}</p>
            </div>
            {latest.recommended_actions?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Actions to verify</p>
                {latest.recommended_actions.map((action, index) => (
                  <div key={`${action}-${index}`} className="text-xs rounded-md bg-background/70 border px-2 py-1">{action}</div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {onUseReply && (
                <Button size="sm" className="gap-2" onClick={() => { onUseReply(latest.suggested_reply); marker.mutate({ id: latest.id, status: 'used', ticketId }); }}>
                  <Check className="w-3 h-3" /> Use reply
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-2" onClick={() => copy(latest.suggested_reply)}>
                <Copy className="w-3 h-3" /> Copy
              </Button>
              <Button size="sm" variant="ghost" className="gap-2" onClick={() => marker.mutate({ id: latest.id, status: 'dismissed', ticketId })}>
                <X className="w-3 h-3" /> Dismiss
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}