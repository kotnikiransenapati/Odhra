import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Package, MapPin, Truck, Plus, RefreshCw, Search,
  CheckCircle2, Clock, AlertCircle, ArrowRight,
} from 'lucide-react';
import {
  useIndiaPostShipments, useCreateIndiaPostShipment, useUpdateIndiaPostStatus,
  useIndiaPostRateCards, useIndiaPostPincode, type IndiaPostShipment,
} from '@/hooks/useIndiaPost';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  booked: { label: 'Booked', color: 'bg-blue-100 text-blue-800', icon: <Package className="w-3 h-3" /> },
  dispatched: { label: 'Dispatched', color: 'bg-indigo-100 text-indigo-800', icon: <Truck className="w-3 h-3" /> },
  in_transit: { label: 'In Transit', color: 'bg-yellow-100 text-yellow-800', icon: <ArrowRight className="w-3 h-3" /> },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800', icon: <Truck className="w-3 h-3" /> },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="w-3 h-3" /> },
  returned: { label: 'Returned', color: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-muted-foreground', icon: <Clock className="w-3 h-3" /> };
  return (
    <Badge variant="outline" className={`${cfg.color} gap-1 text-xs`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

function CreateShipmentDialog() {
  const [open, setOpen] = useState(false);
  const createShipment = useCreateIndiaPostShipment();
  const [form, setForm] = useState({
    consignment_number: '',
    article_type: 'speed_post',
    sender_name: '',
    sender_pincode: '',
    receiver_name: '',
    receiver_pincode: '',
    weight_grams: 500,
    declared_value: 0,
    cod_amount: 0,
  });

  const handleSubmit = async () => {
    if (!form.consignment_number || !form.sender_pincode || !form.receiver_pincode) {
      toast.error('Please fill required fields');
      return;
    }
    await createShipment.mutateAsync(form);
    setOpen(false);
    setForm({ consignment_number: '', article_type: 'speed_post', sender_name: '', sender_pincode: '', receiver_name: '', receiver_pincode: '', weight_grams: 500, declared_value: 0, cod_amount: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Add Shipment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create India Post Shipment</DialogTitle>
          <DialogDescription>Enter consignment details to start tracking</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Consignment Number *</Label>
            <Input value={form.consignment_number} onChange={e => setForm({ ...form, consignment_number: e.target.value })} placeholder="EE123456789IN" />
          </div>
          <div>
            <Label>Service Type</Label>
            <Select value={form.article_type} onValueChange={v => setForm({ ...form, article_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="speed_post">Speed Post</SelectItem>
                <SelectItem value="registered_post">Registered Post</SelectItem>
                <SelectItem value="ems_speed_post">EMS Speed Post</SelectItem>
                <SelectItem value="business_parcel">Business Parcel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Weight (grams)</Label>
            <Input type="number" value={form.weight_grams} onChange={e => setForm({ ...form, weight_grams: +e.target.value })} />
          </div>
          <div>
            <Label>Sender Name</Label>
            <Input value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value })} />
          </div>
          <div>
            <Label>Sender Pincode *</Label>
            <Input value={form.sender_pincode} onChange={e => setForm({ ...form, sender_pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} maxLength={6} />
          </div>
          <div>
            <Label>Receiver Name</Label>
            <Input value={form.receiver_name} onChange={e => setForm({ ...form, receiver_name: e.target.value })} />
          </div>
          <div>
            <Label>Receiver Pincode *</Label>
            <Input value={form.receiver_pincode} onChange={e => setForm({ ...form, receiver_pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} maxLength={6} />
          </div>
          <div>
            <Label>Declared Value (₹)</Label>
            <Input type="number" value={form.declared_value} onChange={e => setForm({ ...form, declared_value: +e.target.value })} />
          </div>
          <div>
            <Label>COD Amount (₹)</Label>
            <Input type="number" value={form.cod_amount} onChange={e => setForm({ ...form, cod_amount: +e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createShipment.isPending}>
            {createShipment.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateStatusDialog({ shipment }: { shipment: IndiaPostShipment }) {
  const [open, setOpen] = useState(false);
  const updateStatus = useUpdateIndiaPostStatus();
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const handleUpdate = async () => {
    if (!status) return;
    await updateStatus.mutateAsync({
      consignment_number: shipment.consignment_number,
      status,
      location,
      description: description || undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><RefreshCw className="w-3 h-3 mr-1" /> Update</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Status — {shipment.consignment_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City / Post Office" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional details" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={!status || updateStatus.isPending}>
            {updateStatus.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PincodeChecker() {
  const [pin, setPin] = useState('');
  const [checkPin, setCheckPin] = useState('');
  const { data, isLoading } = useIndiaPostPincode(checkPin);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Pincode Serviceability</CardTitle>
        <CardDescription>Check India Post delivery coverage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit pincode" maxLength={6} />
          <Button onClick={() => setCheckPin(pin)} disabled={pin.length !== 6 || isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        {data && (
          <div className="p-3 rounded-lg border space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{data.office_name || data.pincode}</span>
              <Badge variant={data.is_serviceable ? 'default' : 'destructive'}>
                {data.is_serviceable ? 'Serviceable' : 'Not Serviceable'}
              </Badge>
            </div>
            {data.district && <p className="text-muted-foreground">{data.district}, {data.state}</p>}
            {data.office_type && <p className="text-muted-foreground">Type: {data.office_type}</p>}
            {data.services_available?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {data.services_available.map(s => (
                  <Badge key={s} variant="outline" className="text-xs">{s.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RateCardsTable() {
  const { data: rates, isLoading } = useIndiaPostRateCards();

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="rounded-md border overflow-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Weight Slab</TableHead>
            <TableHead>Base Rate</TableHead>
            <TableHead>+500g</TableHead>
            <TableHead>COD</TableHead>
            <TableHead>Days</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates?.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-xs">{r.service_type.replace(/_/g, ' ')}</TableCell>
              <TableCell className="text-xs">{r.zone.replace(/_/g, ' ')}</TableCell>
              <TableCell className="text-xs">{r.weight_slab_min_grams}-{r.weight_slab_max_grams}g</TableCell>
              <TableCell className="text-xs">₹{r.base_rate}</TableCell>
              <TableCell className="text-xs">₹{r.additional_per_500g}</TableCell>
              <TableCell className="text-xs">₹{r.cod_charge}</TableCell>
              <TableCell className="text-xs">{r.estimated_days_min}-{r.estimated_days_max}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function IndiaPostManager() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: shipments = [], isLoading } = useIndiaPostShipments(statusFilter ? { status: statusFilter } : undefined);

  const stats = {
    total: shipments.length,
    booked: shipments.filter(s => s.current_status === 'booked').length,
    inTransit: shipments.filter(s => ['dispatched', 'in_transit', 'out_for_delivery'].includes(s.current_status)).length,
    delivered: shipments.filter(s => s.current_status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> India Post Delivery
          </h2>
          <p className="text-muted-foreground text-sm">Track and manage shipments via India Post</p>
        </div>
        <CreateShipmentDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Shipments', value: stats.total, icon: <Package className="w-5 h-5 text-primary" /> },
          { label: 'Booked', value: stats.booked, icon: <Clock className="w-5 h-5 text-primary/70" /> },
          { label: 'In Transit', value: stats.inTransit, icon: <Truck className="w-5 h-5 text-accent-foreground" /> },
          { label: 'Delivered', value: stats.delivered, icon: <CheckCircle2 className="w-5 h-5 text-primary" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="shipments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="pincode">Pincode Check</TabsTrigger>
          <TabsTrigger value="rates">Rate Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="shipments">
          {/* Filter bar */}
          <div className="flex gap-2 mb-4">
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : shipments.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No shipments found</CardContent></Card>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consignment #</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Booked</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.consignment_number}</TableCell>
                      <TableCell className="text-xs capitalize">{s.article_type?.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-sm">{s.receiver_name || '—'}</TableCell>
                      <TableCell className="text-sm">{s.destination_pincode || s.receiver_pincode || '—'}</TableCell>
                      <TableCell><StatusBadge status={s.current_status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.booking_date ? format(new Date(s.booking_date), 'dd MMM yyyy') : format(new Date(s.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell><UpdateStatusDialog shipment={s} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pincode">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PincodeChecker />
          </div>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">India Post Rate Cards</CardTitle>
              <CardDescription>Pre-configured rates by service type, zone, and weight</CardDescription>
            </CardHeader>
            <CardContent>
              <RateCardsTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
