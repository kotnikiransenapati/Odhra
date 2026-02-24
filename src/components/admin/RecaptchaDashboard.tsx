import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIntegration, useUpdateIntegration } from '@/hooks/useIntegrationSettings';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import {
  Shield, Settings, Save, Loader2, CheckCircle, XCircle,
  AlertTriangle, Bot, UserCheck, Lock, TrendingUp, BarChart3,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export function RecaptchaDashboard() {
  const { isEnabled, config } = useIntegration('google_recaptcha');
  const updateIntegration = useUpdateIntegration();
  const [localConfig, setLocalConfig] = useState({
    site_key: config.site_key || '',
    score_threshold: config.score_threshold || '0.5',
  });

  // Fetch error logs related to recaptcha for analysis
  const { data: recaptchaLogs = [] } = useQuery({
    queryKey: ['recaptcha-admin-logs'],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .or('source.eq.recaptcha,function_name.eq.recaptcha-verify')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Simulated stats from logs
  const totalVerifications = recaptchaLogs.length;
  const passed = recaptchaLogs.filter(l => l.error_level === 'info' || l.message.includes('success')).length;
  const flagged = recaptchaLogs.filter(l => l.error_level === 'warning').length;
  const blocked = recaptchaLogs.filter(l => l.error_level === 'error').length;

  const pieData = [
    { name: 'Passed', value: passed || 1 },
    { name: 'Flagged', value: flagged },
    { name: 'Blocked', value: blocked },
  ].filter(d => d.value > 0);

  // Protected forms
  const protectedForms = [
    { name: 'Login', action: 'login', status: 'active' },
    { name: 'Sign Up', action: 'signup', status: 'active' },
    { name: 'Checkout', action: 'checkout', status: 'active' },
    { name: 'Contact Form', action: 'contact', status: 'active' },
    { name: 'Password Reset', action: 'reset_password', status: 'active' },
    { name: 'Review Submit', action: 'review_submit', status: 'active' },
  ];

  const threshold = parseFloat(localConfig.score_threshold) || 0.5;

  const handleSave = async () => {
    try {
      await updateIntegration.mutateAsync({ integration_key: 'google_recaptcha', config: localConfig });
      toast.success('reCAPTCHA configuration saved');
    } catch { toast.error('Failed to save'); }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateIntegration.mutateAsync({ integration_key: 'google_recaptcha', is_enabled: enabled });
      toast.success(`reCAPTCHA ${enabled ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> Google reCAPTCHA v3</h2>
          <p className="text-muted-foreground">Bot protection, score analysis, and form security management</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isEnabled ? 'default' : 'secondary'}>{isEnabled ? 'Active' : 'Inactive'}</Badge>
          <Switch checked={isEnabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forms">Protected Forms</TabsTrigger>
          <TabsTrigger value="logs">Verification Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Verifications', value: totalVerifications, icon: Shield, color: 'text-primary' },
              { label: 'Passed', value: passed, icon: UserCheck, color: 'text-success' },
              { label: 'Flagged', value: flagged, icon: AlertTriangle, color: 'text-warning' },
              { label: 'Blocked', value: blocked, icon: Bot, color: 'text-destructive' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Verification Results</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No verification data yet</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Score Threshold</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Current threshold</span>
                    <span className="text-lg font-bold">{threshold}</span>
                  </div>
                  <Slider
                    value={[threshold * 100]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setLocalConfig(c => ({ ...c, score_threshold: (v / 100).toString() }))}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 (Permissive)</span>
                    <span>1.0 (Strict)</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-xs font-medium">Score Interpretation</p>
                  <p className="text-xs text-muted-foreground">1.0 = very likely human, 0.0 = very likely bot</p>
                  <p className="text-xs text-muted-foreground">Recommended: 0.5 for most use cases</p>
                </div>
                <Button onClick={handleSave} size="sm" className="gap-2">
                  <Save className="w-3 h-3" /> Save Threshold
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Protected Forms</CardTitle>
              <CardDescription>All forms with reCAPTCHA v3 protection enabled</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Action Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Behavior</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protectedForms.map(form => (
                    <TableRow key={form.action}>
                      <TableCell className="font-medium">{form.name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{form.action}</code></TableCell>
                      <TableCell>
                        <Badge variant="default" className="gap-1 text-xs">
                          <CheckCircle className="w-3 h-3" /> Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Score {'<'} {threshold} → blocked silently
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Verification Logs</CardTitle>
              <CardDescription>reCAPTCHA verification events from the backend</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recaptchaLogs.slice(0, 50).map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant={log.error_level === 'error' ? 'destructive' : log.error_level === 'warning' ? 'secondary' : 'outline'} className="text-xs">
                          {log.error_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">{log.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.source || log.function_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'MMM dd HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                  {recaptchaLogs.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No verification logs yet. Logs will appear after reCAPTCHA processes requests.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" /> reCAPTCHA Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Site Key</Label>
                <Input value={localConfig.site_key} onChange={e => setLocalConfig(c => ({ ...c, site_key: e.target.value }))} placeholder="6Lxxxxxxxxxxxxxxxxx" />
                <p className="text-xs text-muted-foreground">reCAPTCHA v3 site key from Google Console</p>
              </div>
              <div className="space-y-2">
                <Label>Score Threshold</Label>
                <Input value={localConfig.score_threshold} onChange={e => setLocalConfig(c => ({ ...c, score_threshold: e.target.value }))} placeholder="0.5" />
                <p className="text-xs text-muted-foreground">Minimum score (0-1). Lower = more permissive, higher = stricter</p>
              </div>
              <Separator />
              <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">Backend Secret Required</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The <code className="bg-muted px-1 rounded">RECAPTCHA_SECRET_KEY</code> must be configured as a backend secret for server-side verification.
                </p>
              </div>
              <Button onClick={handleSave} disabled={updateIntegration.isPending} className="gap-2">
                {updateIntegration.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Setup Instructions</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google reCAPTCHA Admin</a></li>
                <li>Register a new site with reCAPTCHA v3</li>
                <li>Copy the <strong>Site Key</strong> and paste above</li>
                <li>Copy the <strong>Secret Key</strong> and add it as a backend secret named <code>RECAPTCHA_SECRET_KEY</code></li>
                <li>Enable the integration using the toggle at the top</li>
              </ol>
              <p className="text-xs">reCAPTCHA v3 runs invisibly — no user interaction required. It scores each request from 0 (bot) to 1 (human).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
