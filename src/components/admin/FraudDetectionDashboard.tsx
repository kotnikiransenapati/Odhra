import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Settings,
  Eye,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useFraudRules, 
  useFraudSignals, 
  useFlaggedOrders,
  useCreateFraudRule,
  useUpdateFraudRule,
  useUpdateFraudSignalStatus,
  FraudRule
} from '@/hooks/useFraudDetection';

const riskLevelColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const getRiskLevel = (score: number) => {
  if (score >= 80) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  cleared: 'bg-green-100 text-green-800',
  confirmed_fraud: 'bg-red-100 text-red-800'
};

export function FraudDetectionDashboard() {
  const [activeTab, setActiveTab] = useState('signals');
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    rule_type: 'velocity' as FraudRule['rule_type'],
    conditions: '{}',
    action: 'flag' as FraudRule['action'],
    risk_score_contribution: 20,
    is_active: true
  });

  const { data: rules, isLoading: rulesLoading } = useFraudRules();
  const { data: signals, isLoading: signalsLoading } = useFraudSignals();
  const { data: flaggedOrders, isLoading: ordersLoading } = useFlaggedOrders();

  const createRule = useCreateFraudRule();
  const updateRule = useUpdateFraudRule();
  const updateSignalStatus = useUpdateFraudSignalStatus();

  const handleCreateRule = async () => {
    try {
      await createRule.mutateAsync({
        ...newRule,
        conditions: JSON.parse(newRule.conditions)
      });
      setIsRuleDialogOpen(false);
      setNewRule({
        name: '',
        description: '',
        rule_type: 'velocity',
        conditions: '{}',
        action: 'flag',
        risk_score_contribution: 20,
        is_active: true
      });
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleToggleRule = async (rule: FraudRule) => {
    await updateRule.mutateAsync({
      id: rule.id,
      is_active: !rule.is_active
    });
  };

  const handleUpdateSignalStatus = async (signalId: string, status: 'cleared' | 'confirmed_fraud') => {
    await updateSignalStatus.mutateAsync({ signalId, status });
  };

  const pendingSignals = signals?.filter(s => s.status === 'pending') || [];
  const totalRiskScore = pendingSignals.reduce((sum, s) => sum + s.risk_score, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fraud Detection</h2>
          <p className="text-muted-foreground">Monitor and manage fraud signals</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Signals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSignals.length}</div>
            <p className="text-xs text-muted-foreground">Requires review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Orders</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flaggedOrders?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Orders held for review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Settings className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules?.filter(r => r.is_active).length || 0}</div>
            <p className="text-xs text-muted-foreground">Of {rules?.length || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingSignals.length > 0 ? Math.round(totalRiskScore / pendingSignals.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">For pending signals</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="signals">Fraud Signals</TabsTrigger>
          <TabsTrigger value="orders">Flagged Orders</TabsTrigger>
          <TabsTrigger value="rules">Detection Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Fraud Signals</CardTitle>
              <CardDescription>Review and take action on detected fraud signals</CardDescription>
            </CardHeader>
            <CardContent>
              {signalsLoading ? (
                <p className="text-muted-foreground">Loading signals...</p>
              ) : signals?.length === 0 ? (
                <p className="text-muted-foreground">No fraud signals detected</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signals?.map((signal) => (
                      <TableRow key={signal.id}>
                        <TableCell>
                          <Badge variant="outline">{signal.signal_type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {(signal as any).orders?.order_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className={`h-2 w-2 rounded-full ${riskLevelColors[getRiskLevel(signal.risk_score)]}`} 
                            />
                            {signal.risk_score}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[signal.status as keyof typeof statusColors]}>
                            {signal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(signal.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {signal.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateSignalStatus(signal.id, 'cleared')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Clear
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleUpdateSignalStatus(signal.id, 'confirmed_fraud')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Fraud
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Orders</CardTitle>
              <CardDescription>Orders that require manual review before processing</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <p className="text-muted-foreground">Loading orders...</p>
              ) : flaggedOrders?.length === 0 ? (
                <p className="text-muted-foreground">No flagged orders</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Fraud Status</TableHead>
                      <TableHead>Signals</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flaggedOrders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.order_number}</TableCell>
                        <TableCell>₹{order.total_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className={`h-2 w-2 rounded-full ${riskLevelColors[getRiskLevel(order.risk_score || 0)]}`} 
                            />
                            {order.risk_score || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.fraud_status === 'blocked' ? 'destructive' : 'secondary'}>
                            {order.fraud_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{(order as any).fraud_signals?.length || 0}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Detection Rules</CardTitle>
                <CardDescription>Configure fraud detection rules and thresholds</CardDescription>
              </div>
              <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Fraud Rule</DialogTitle>
                    <DialogDescription>
                      Define a new rule to detect fraudulent orders
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Rule Name</Label>
                      <Input
                        value={newRule.name}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                        placeholder="e.g., High velocity orders"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newRule.description}
                        onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                        placeholder="Describe what this rule detects"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Rule Type</Label>
                      <Select
                        value={newRule.rule_type}
                        onValueChange={(value) => setNewRule({ ...newRule, rule_type: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="velocity">Velocity</SelectItem>
                          <SelectItem value="amount">Amount</SelectItem>
                          <SelectItem value="address">Address</SelectItem>
                          <SelectItem value="device">Device</SelectItem>
                          <SelectItem value="pattern">Pattern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Conditions (JSON)</Label>
                      <Textarea
                        value={newRule.conditions}
                        onChange={(e) => setNewRule({ ...newRule, conditions: e.target.value })}
                        placeholder='{"max_orders_per_hour": 5}'
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Action</Label>
                      <Select
                        value={newRule.action}
                        onValueChange={(value) => setNewRule({ ...newRule, action: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flag">Flag for Review</SelectItem>
                          <SelectItem value="hold">Hold Order</SelectItem>
                          <SelectItem value="block">Block Order</SelectItem>
                          <SelectItem value="require_verification">Require Verification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Risk Score Contribution (0-100)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={newRule.risk_score_contribution}
                        onChange={(e) => setNewRule({ ...newRule, risk_score_contribution: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRule} disabled={createRule.isPending}>
                      Create Rule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <p className="text-muted-foreground">Loading rules...</p>
              ) : rules?.length === 0 ? (
                <p className="text-muted-foreground">No fraud rules configured</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules?.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rule.name}</p>
                            {rule.description && (
                              <p className="text-sm text-muted-foreground">{rule.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.rule_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.action === 'block' ? 'destructive' : 'secondary'}>
                            {rule.action}
                          </Badge>
                        </TableCell>
                        <TableCell>+{rule.risk_score_contribution}</TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={() => handleToggleRule(rule)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
