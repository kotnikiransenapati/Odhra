import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import {
  ArrowLeft,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Inbox,
  HelpCircle,
  Package,
  CreditCard,
  Truck,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';

const ticketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Please provide more details (at least 20 characters)'),
  category: z.string().min(1, 'Please select a category'),
  priority: z.string().default('medium'),
  order_id: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

const categories = [
  { value: 'order', label: 'Order Issues', icon: Package },
  { value: 'payment', label: 'Payment & Billing', icon: CreditCard },
  { value: 'shipping', label: 'Shipping & Delivery', icon: Truck },
  { value: 'returns', label: 'Returns & Refunds', icon: RotateCcw },
  { value: 'account', label: 'Account Settings', icon: Settings },
  { value: 'general', label: 'General Inquiry', icon: HelpCircle },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'open':
      return { color: 'bg-info', icon: Clock, label: 'Open' };
    case 'in_progress':
      return { color: 'bg-warning', icon: MessageSquare, label: 'In Progress' };
    case 'resolved':
      return { color: 'bg-success', icon: CheckCircle, label: 'Resolved' };
    case 'closed':
      return { color: 'bg-muted-foreground', icon: CheckCircle, label: 'Closed' };
    default:
      return { color: 'bg-muted-foreground', icon: AlertCircle, label: status };
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-destructive text-destructive-foreground';
    case 'medium':
      return 'bg-warning text-warning-foreground';
    case 'low':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export default function Support() {
  const [searchParams] = useSearchParams();
  const { tickets, isLoading, createTicket, isCreating } = useSupportTickets();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Get URL parameters for pre-filling
  const orderIdFromUrl = searchParams.get('order_id');
  const categoryFromUrl = searchParams.get('category');

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: categoryFromUrl || '',
      priority: 'medium',
      order_id: orderIdFromUrl || undefined,
    },
  });

  // Auto-open dialog if coming from order page
  useEffect(() => {
    if (orderIdFromUrl && categoryFromUrl) {
      form.setValue('category', categoryFromUrl);
      form.setValue('order_id', orderIdFromUrl);
      form.setValue('subject', `Help needed with order`);
      setIsDialogOpen(true);
    }
  }, [orderIdFromUrl, categoryFromUrl, form]);

  const onSubmit = async (data: TicketFormValues) => {
    await createTicket({
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority: data.priority,
      order_id: data.order_id,
    });
    form.reset();
    setIsDialogOpen(false);
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return ticket.status === 'open' || ticket.status === 'in_progress';
    if (activeTab === 'resolved') return ticket.status === 'resolved' || ticket.status === 'closed';
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Account
              </Link>
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display-sm md:text-display-md font-bold">Support Center</h1>
                <p className="text-muted-foreground mt-1">
                  Get help with your orders, account, or any questions
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" /> New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Describe your issue and we'll get back to you as soon as possible.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    <div className="flex items-center gap-2">
                                      <cat.icon className="w-4 h-4" />
                                      {cat.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief description of your issue" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Please provide as much detail as possible..."
                                className="min-h-[120px] resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low - General inquiry</SelectItem>
                                <SelectItem value="medium">Medium - Need assistance</SelectItem>
                                <SelectItem value="high">High - Urgent issue</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isCreating}>
                          {isCreating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Ticket'
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {/* Quick Help Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
          >
            {categories.map((cat) => (
              <Card
                key={cat.value}
                className="cursor-pointer hover:border-accent transition-colors"
                onClick={() => {
                  form.setValue('category', cat.value);
                  setIsDialogOpen(true);
                }}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <cat.icon className="w-5 h-5 text-accent" />
                  </div>
                  <span className="font-medium text-sm">{cat.label}</span>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Tickets List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Your Tickets
                </CardTitle>
                <CardDescription>
                  Track and manage your support requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="all">All ({tickets.length})</TabsTrigger>
                    <TabsTrigger value="open">
                      Open ({tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length})
                    </TabsTrigger>
                    <TabsTrigger value="resolved">
                      Resolved ({tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length})
                    </TabsTrigger>
                  </TabsList>

                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))}
                      </div>
                    ) : filteredTickets.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <Inbox className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
                        <p className="text-muted-foreground mb-4">
                          {activeTab === 'all'
                            ? "You haven't created any support tickets yet"
                            : `No ${activeTab} tickets`}
                        </p>
                        <Button onClick={() => setIsDialogOpen(true)}>
                          Create Your First Ticket
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                      >
                        {filteredTickets.map((ticket) => {
                          const statusConfig = getStatusConfig(ticket.status);
                          const StatusIcon = statusConfig.icon;
                          const category = categories.find((c) => c.value === ticket.category);
                          const CategoryIcon = category?.icon || HelpCircle;

                          return (
                            <Link
                              key={ticket.id}
                              to={`/support/${ticket.id}`}
                              className="block"
                            >
                              <motion.div
                                whileHover={{ scale: 1.01 }}
                                className="p-4 rounded-xl border bg-card hover:border-accent transition-all"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                      <CategoryIcon className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {ticket.ticket_number}
                                        </span>
                                        <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                                          {ticket.priority}
                                        </Badge>
                                      </div>
                                      <h4 className="font-semibold line-clamp-1">
                                        {ticket.subject}
                                      </h4>
                                      <p className="text-sm text-muted-foreground line-clamp-1">
                                        {ticket.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <Badge
                                      variant="outline"
                                      className={`${statusConfig.color} text-primary-foreground border-none`}
                                    >
                                      <StatusIcon className="w-3 h-3 mr-1" />
                                      {statusConfig.label}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
