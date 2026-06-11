import React, { useState, useMemo, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { haptic } from '@/lib/haptics';
import { useMyAdminPermissions } from '@/hooks/useAdminPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePendingReviewsCount } from '@/hooks/useAdmin';
import { useAdvancedAnalytics } from '@/hooks/useAdminAnalytics';
import {
  LayoutDashboard, Store, ShoppingCart, Wallet, Bell, ArrowLeft, Settings, Menu,
  MessageSquare, Package, Tags, FolderTree, Gift, Users, BarChart3, Palette,
  Shield, ShieldCheck, EyeOff, Search, ChevronDown, Sparkles, AlertTriangle, RotateCcw, Headphones,
  History, ToggleLeft, UserCog, Lock, TrendingUp, Zap, CreditCard, FileText,
  Truck, Calculator, Timer, PieChart, Target, ShoppingBag, Activity, TestTube,
  UserCheck, Megaphone, Image, Globe, Calendar, ClipboardList, Database, FileCode,
  Mail, Link2, Repeat, Clock, HardDrive, Webhook, Gauge, Wrench, Key, Siren,
  CalendarClock, Radio,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Lazy load ALL admin tab components for massive performance improvement
const EnhancedOverview = lazy(() => import('@/components/admin/EnhancedOverview').then(m => ({ default: m.EnhancedOverview })));
const AdvancedAnalytics = lazy(() => import('@/components/admin/AdvancedAnalytics').then(m => ({ default: m.AdvancedAnalytics })));
const VendorManagement = lazy(() => import('@/components/admin/VendorManagement').then(m => ({ default: m.VendorManagement })));
const EnhancedOrderManagement = lazy(() => import('@/components/admin/EnhancedOrderManagement').then(m => ({ default: m.EnhancedOrderManagement })));
const PayoutManagement = lazy(() => import('@/components/admin/PayoutManagement').then(m => ({ default: m.PayoutManagement })));
const ReviewModeration = lazy(() => import('@/components/admin/ReviewModeration').then(m => ({ default: m.ReviewModeration })));
const SystemSettings = lazy(() => import('@/components/admin/SystemSettings').then(m => ({ default: m.SystemSettings })));
const ProductCatalog = lazy(() => import('@/components/admin/ProductCatalog').then(m => ({ default: m.ProductCatalog })));
const CategoryManager = lazy(() => import('@/components/admin/CategoryManager').then(m => ({ default: m.CategoryManager })));
const PromotionsManager = lazy(() => import('@/components/admin/PromotionsManager').then(m => ({ default: m.PromotionsManager })));
const SpinWheelManager = lazy(() => import('@/components/admin/SpinWheelManager').then(m => ({ default: m.SpinWheelManager })));
const SpinWheelCodesManager = lazy(() => import('@/components/admin/SpinWheelCodesManager').then(m => ({ default: m.SpinWheelCodesManager })));
const EnhancedCustomerManagement = lazy(() => import('@/components/admin/EnhancedCustomerManagement').then(m => ({ default: m.EnhancedCustomerManagement })));
const NotificationCenter = lazy(() => import('@/components/admin/NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const AdminNotificationManager = lazy(() => import('@/components/admin/AdminNotificationManager').then(m => ({ default: m.AdminNotificationManager })));
const CMSManager = lazy(() => import('@/components/admin/CMSManager').then(m => ({ default: m.CMSManager })));
const SupportTicketManager = lazy(() => import('@/components/admin/SupportTicketManager').then(m => ({ default: m.SupportTicketManager })));
const AuditLogViewer = lazy(() => import('@/components/admin/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const ObservabilityDashboard = lazy(() => import('@/components/admin/ObservabilityDashboard').then(m => ({ default: m.ObservabilityDashboard })));
const BroadcastBannerManager = lazy(() => import('@/components/admin/BroadcastBannerManager').then(m => ({ default: m.BroadcastBannerManager })));
const AdminCommandPalette = lazy(() => import('@/components/admin/AdminCommandPalette').then(m => ({ default: m.AdminCommandPalette })));
const OrderSplitPane = lazy(() => import('@/components/admin/OrderSplitPane').then(m => ({ default: m.OrderSplitPane })));
const KycReviewQueue = lazy(() => import('@/components/admin/KycReviewQueue').then(m => ({ default: m.KycReviewQueue })));
const RoleSimulator = lazy(() => import('@/components/admin/RoleSimulator').then(m => ({ default: m.RoleSimulator })));
const LoyaltyManagement = lazy(() => import('@/components/admin/LoyaltyManagement').then(m => ({ default: m.LoyaltyManagement })));
const ReturnManagement = lazy(() => import('@/components/admin/ReturnManagement').then(m => ({ default: m.ReturnManagement })));
const DisputeManagement = lazy(() => import('@/components/admin/DisputeManagement').then(m => ({ default: m.DisputeManagement })));
const FeatureFlagsManager = lazy(() => import('@/components/admin/FeatureFlagsManager').then(m => ({ default: m.FeatureFlagsManager })));
const AdminManagement = lazy(() => import('@/components/admin/AdminManagement').then(m => ({ default: m.AdminManagement })));
const FlashSalesManager = lazy(() => import('@/components/admin/FlashSalesManager').then(m => ({ default: m.FlashSalesManager })));
const FraudDetectionDashboard = lazy(() => import('@/components/admin/FraudDetectionDashboard').then(m => ({ default: m.FraudDetectionDashboard })));
const LiveChatManager = lazy(() => import('@/components/admin/LiveChatManager').then(m => ({ default: m.LiveChatManager })));
const RefundManagement = lazy(() => import('@/components/admin/RefundManagement').then(m => ({ default: m.RefundManagement })));
const InvoiceManager = lazy(() => import('@/components/admin/InvoiceManager').then(m => ({ default: m.InvoiceManager })));
const ShippingManager = lazy(() => import('@/components/admin/ShippingManager').then(m => ({ default: m.ShippingManager })));
const TaxConfigManager = lazy(() => import('@/components/admin/TaxConfigManager').then(m => ({ default: m.TaxConfigManager })));
const SLAManager = lazy(() => import('@/components/admin/SLAManager').then(m => ({ default: m.SLAManager })));
const CustomerSegmentation = lazy(() => import('@/components/admin/CustomerSegmentation').then(m => ({ default: m.CustomerSegmentation })));
const VendorPerformanceDashboard = lazy(() => import('@/components/admin/VendorPerformanceDashboard').then(m => ({ default: m.VendorPerformanceDashboard })));
const AbandonedCartDashboard = lazy(() => import('@/components/admin/AbandonedCartDashboard').then(m => ({ default: m.AbandonedCartDashboard })));
const OrderTimelineAdmin = lazy(() => import('@/components/admin/OrderTimelineAdmin').then(m => ({ default: m.OrderTimelineAdmin })));
const ABTestingDashboard = lazy(() => import('@/components/admin/ABTestingDashboard').then(m => ({ default: m.ABTestingDashboard })));
const Customer360Admin = lazy(() => import('@/components/admin/Customer360Admin').then(m => ({ default: m.Customer360Admin })));
const ExportImportCenter = lazy(() => import('@/components/admin/ExportImportCenter').then(m => ({ default: m.ExportImportCenter })));
const PromoCodeHistory = lazy(() => import('@/components/admin/PromoCodeHistory').then(m => ({ default: m.PromoCodeHistory })));
const ErrorMonitoringDashboard = lazy(() => import('@/components/admin/ErrorMonitoringDashboard').then(m => ({ default: m.ErrorMonitoringDashboard })));
const VendorCommissionManager = lazy(() => import('@/components/admin/VendorCommissionManager').then(m => ({ default: m.VendorCommissionManager })));
const PaymentReconciliation = lazy(() => import('@/components/admin/PaymentReconciliation').then(m => ({ default: m.PaymentReconciliation })));
const InventoryAlertsDashboard = lazy(() => import('@/components/admin/InventoryAlertsDashboard').then(m => ({ default: m.InventoryAlertsDashboard })));
const StaffWorkloadDashboard = lazy(() => import('@/components/admin/StaffWorkloadDashboard').then(m => ({ default: m.StaffWorkloadDashboard })));
const ColorPaletteCustomizer = lazy(() => import('@/components/admin/ColorPaletteCustomizer').then(m => ({ default: m.ColorPaletteCustomizer })));
const HomepagePreview = lazy(() => import('@/components/admin/HomepagePreview').then(m => ({ default: m.HomepagePreview })));
const WhatsAppManager = lazy(() => import('@/components/admin/WhatsAppManager').then(m => ({ default: m.WhatsAppManager })));
const FunnelAnalyticsDashboard = lazy(() => import('@/components/admin/FunnelAnalyticsDashboard').then(m => ({ default: m.FunnelAnalyticsDashboard })));
const SourceCodeDocs = lazy(() => import('@/components/admin/SourceCodeDocs').then(m => ({ default: m.SourceCodeDocs })));
const TicketRealtimeNotification = lazy(() => import('@/components/admin/TicketRealtimeNotification').then(m => ({ default: m.TicketRealtimeNotification })));
const BehaviorAnalyticsDashboard = lazy(() => import('@/components/admin/BehaviorAnalyticsDashboard').then(m => ({ default: m.BehaviorAnalyticsDashboard })));
const FooterNewsletterManager = lazy(() => import('@/components/admin/FooterNewsletterManager').then(m => ({ default: m.FooterNewsletterManager })));
const IntegrationHub = lazy(() => import('@/components/admin/IntegrationHub').then(m => ({ default: m.IntegrationHub })));
const IndiaPostManager = lazy(() => import('@/components/admin/IndiaPostManager').then(m => ({ default: m.IndiaPostManager })));
const CampaignLinksDashboard = lazy(() => import('@/components/admin/CampaignLinksDashboard'));
const GA4Dashboard = lazy(() => import('@/components/admin/GA4Dashboard').then(m => ({ default: m.GA4Dashboard })));
const FBPixelDashboard = lazy(() => import('@/components/admin/FBPixelDashboard').then(m => ({ default: m.FBPixelDashboard })));
const RecaptchaDashboard = lazy(() => import('@/components/admin/RecaptchaDashboard').then(m => ({ default: m.RecaptchaDashboard })));
const SystemHealthDashboard = lazy(() => import('@/components/admin/SystemHealthDashboard').then(m => ({ default: m.SystemHealthDashboard })));
const VendorWalletDashboard = lazy(() => import('@/components/admin/VendorWalletDashboard').then(m => ({ default: m.VendorWalletDashboard })));
const CohortRetentionDashboard = lazy(() => import('@/components/admin/CohortRetentionDashboard').then(m => ({ default: m.CohortRetentionDashboard })));
const BackendHealthDashboard = lazy(() => import('@/components/admin/BackendHealthDashboard').then(m => ({ default: m.BackendHealthDashboard })));
const DeadLetterQueueViewer = lazy(() => import('@/components/admin/DeadLetterQueueViewer').then(m => ({ default: m.DeadLetterQueueViewer })));
const CronDashboard = lazy(() => import('@/components/admin/CronDashboard').then(m => ({ default: m.CronDashboard })));
const StorageUsageAnalyzer = lazy(() => import('@/components/admin/StorageUsageAnalyzer').then(m => ({ default: m.StorageUsageAnalyzer })));
const KillSwitchPanel = lazy(() => import('@/components/admin/KillSwitchPanel').then(m => ({ default: m.KillSwitchPanel })));
const WebhookExplorer = lazy(() => import('@/components/admin/WebhookExplorer').then(m => ({ default: m.WebhookExplorer })));
const CircuitBreakerPanel = lazy(() => import('@/components/admin/CircuitBreakerPanel').then(m => ({ default: m.CircuitBreakerPanel })));
const SystemHeartbeatDashboard = lazy(() => import('@/components/admin/SystemHeartbeatDashboard').then(m => ({ default: m.SystemHeartbeatDashboard })));
const EdgePerformanceDashboard = lazy(() => import('@/components/admin/EdgePerformanceDashboard').then(m => ({ default: m.EdgePerformanceDashboard })));
const MaintenanceModePanel = lazy(() => import('@/components/admin/MaintenanceModePanel').then(m => ({ default: m.MaintenanceModePanel })));
const SecretRotationTracker = lazy(() => import('@/components/admin/SecretRotationTracker').then(m => ({ default: m.SecretRotationTracker })));
const AnomalyAlertsPanel = lazy(() => import('@/components/admin/AnomalyAlertsPanel').then(m => ({ default: m.AnomalyAlertsPanel })));
const ReleaseNotesPublisher = lazy(() => import('@/components/admin/ReleaseNotesPublisher').then(m => ({ default: m.ReleaseNotesPublisher })));
const IncidentManagementPanel = lazy(() => import('@/components/admin/IncidentManagementPanel').then(m => ({ default: m.IncidentManagementPanel })));
const ComplianceExportCenter = lazy(() => import('@/components/admin/ComplianceExportCenter').then(m => ({ default: m.ComplianceExportCenter })));
const AdminSessionActivity = lazy(() => import('@/components/admin/AdminSessionActivity').then(m => ({ default: m.AdminSessionActivity })));
const ScheduledFeatureRollouts = lazy(() => import('@/components/admin/ScheduledFeatureRollouts').then(m => ({ default: m.ScheduledFeatureRollouts })));
const CustomerBroadcastOrchestrator = lazy(() => import('@/components/admin/CustomerBroadcastOrchestrator').then(m => ({ default: m.CustomerBroadcastOrchestrator })));
const ScheduledReportsBuilder = lazy(() => import('@/components/admin/ScheduledReportsBuilder').then(m => ({ default: m.ScheduledReportsBuilder })));
const WebhookReplayConsole = lazy(() => import('@/components/admin/WebhookReplayConsole').then(m => ({ default: m.WebhookReplayConsole })));
const BackupSnapshotsRegistry = lazy(() => import('@/components/admin/BackupSnapshotsRegistry').then(m => ({ default: m.BackupSnapshotsRegistry })));
const ApiRateLimitPolicies = lazy(() => import('@/components/admin/ApiRateLimitPolicies').then(m => ({ default: m.ApiRateLimitPolicies })));
const DataRetentionPolicies = lazy(() => import('@/components/admin/DataRetentionPolicies').then(m => ({ default: m.DataRetentionPolicies })));
const EmailDeliverabilityMonitor = lazy(() => import('@/components/admin/EmailDeliverabilityMonitor').then(m => ({ default: m.EmailDeliverabilityMonitor })));
const AdminIpAllowlist = lazy(() => import('@/components/admin/AdminIpAllowlist').then(m => ({ default: m.AdminIpAllowlist })));
const NotificationTemplatesRegistry = lazy(() => import('@/components/admin/NotificationTemplatesRegistry').then(m => ({ default: m.NotificationTemplatesRegistry })));
const OutboundWebhookSubscriptions = lazy(() => import('@/components/admin/OutboundWebhookSubscriptions').then(m => ({ default: m.OutboundWebhookSubscriptions })));
const ApiKeysManager = lazy(() => import('@/components/admin/ApiKeysManager').then(m => ({ default: m.ApiKeysManager })));
const LoginSecurityCenter = lazy(() => import('@/components/admin/LoginSecurityCenter').then(m => ({ default: m.LoginSecurityCenter })));
const SmsDeliverabilityMonitor = lazy(() => import('@/components/admin/SmsDeliverabilityMonitor').then(m => ({ default: m.SmsDeliverabilityMonitor })));
const PushDeliverabilityMonitor = lazy(() => import('@/components/admin/PushDeliverabilityMonitor').then(m => ({ default: m.PushDeliverabilityMonitor })));
const TwoFactorPolicyCenter = lazy(() => import('@/components/admin/TwoFactorPolicyCenter').then(m => ({ default: m.TwoFactorPolicyCenter })));
const ConsentLedgerCenter = lazy(() => import('@/components/admin/ConsentLedgerCenter').then(m => ({ default: m.ConsentLedgerCenter })));
const InboundWebhookAllowlist = lazy(() => import('@/components/admin/InboundWebhookAllowlist').then(m => ({ default: m.InboundWebhookAllowlist })));
const TrustedDevicesRegistry = lazy(() => import('@/components/admin/TrustedDevicesRegistry').then(m => ({ default: m.TrustedDevicesRegistry })));
const CaptchaVerificationMonitor = lazy(() => import('@/components/admin/CaptchaVerificationMonitor').then(m => ({ default: m.CaptchaVerificationMonitor })));
const GeoBlockRules = lazy(() => import('@/components/admin/GeoBlockRules').then(m => ({ default: m.GeoBlockRules })));
const AdminApprovalQueue = lazy(() => import('@/components/admin/AdminApprovalQueue').then(m => ({ default: m.AdminApprovalQueue })));
const SecurityEventLedger = lazy(() => import('@/components/admin/SecurityEventLedger').then(m => ({ default: m.SecurityEventLedger })));
const SecurityDetectionRules = lazy(() => import('@/components/admin/SecurityDetectionRules').then(m => ({ default: m.SecurityDetectionRules })));
const SecretRotationScheduler = lazy(() => import('@/components/admin/SecretRotationScheduler').then(m => ({ default: m.SecretRotationScheduler })));
const ApiKeyUsageAnalytics = lazy(() => import('@/components/admin/ApiKeyUsageAnalytics').then(m => ({ default: m.ApiKeyUsageAnalytics })));
const DataExportJobQueue = lazy(() => import('@/components/admin/DataExportJobQueue').then(m => ({ default: m.DataExportJobQueue })));
const BackupVerificationLog = lazy(() => import('@/components/admin/BackupVerificationLog').then(m => ({ default: m.BackupVerificationLog })));
const AdminNotificationPreferences = lazy(() => import('@/components/admin/AdminNotificationPreferences').then(m => ({ default: m.AdminNotificationPreferences })));
const ServiceHealthProbes = lazy(() => import('@/components/admin/ServiceHealthProbes').then(m => ({ default: m.ServiceHealthProbes })));
const ThreatIntelFeeds = lazy(() => import('@/components/admin/ThreatIntelFeeds').then(m => ({ default: m.ThreatIntelFeeds })));
const AdminActivityHeatmap = lazy(() => import('@/components/admin/AdminActivityHeatmap').then(m => ({ default: m.AdminActivityHeatmap })));
const EmailSuppressionList = lazy(() => import('@/components/admin/EmailSuppressionList').then(m => ({ default: m.EmailSuppressionList })));
const FeatureAdoptionDashboard = lazy(() => import('@/components/admin/FeatureAdoptionDashboard').then(m => ({ default: m.FeatureAdoptionDashboard })));

// Tab loading fallback
const TabLoader = () => (
  <div className="space-y-6" role="status" aria-label="Loading admin section">
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 max-w-[70vw]" />
      </div>
      <LoadingSpinner />
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-28 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-[420px] rounded-xl" />
    <span className="sr-only">Loading admin content</span>
  </div>
);

// Permission mapping for each admin section
const SECTION_PERMISSIONS: Record<string, string[]> = {
  'overview': ['view_dashboard'],
  'analytics': ['view_analytics'],
  'orders': ['view_orders'],
  'products': ['view_products'],
  'categories': ['manage_categories'],
  'vendors': ['view_vendors'],
  'customers': ['view_customers'],
  'reviews': ['moderate_reviews'],
  'payouts': ['view_payouts'],
  'returns': ['view_returns'],
  'disputes': ['manage_disputes'],
  'support': ['view_tickets'],
  'live-chat': ['manage_live_chat'],
  'cms': ['manage_cms'],
  'promotions': ['manage_promotions'],
  'loyalty': ['manage_loyalty'],
  'spinwheel': ['manage_spin_wheel'],
  'spinwheel-codes': ['manage_spin_wheel'],
  'flash-sales': ['manage_flash_sales'],
  'promo-history': ['manage_promotions'],
  'email-campaigns': ['send_notifications'],
  'push-notifications': ['send_notifications'],
  'admin-management': ['manage_admins'],
  'fraud-detection': ['view_fraud_detection'],
  'feature-flags': ['manage_feature_flags'],
  'audit-logs': ['view_audit_log'],
  'settings': ['view_settings'],
  'refunds': ['manage_refunds'],
  'invoices': ['manage_invoices'],
  'shipping': ['manage_shipping'],
  'indiapost': ['manage_indiapost'],
  'tax-config': ['manage_tax'],
  'sla-management': ['manage_sla'],
  'customer-segments': ['manage_segments'],
  'vendor-performance': ['manage_vendor_performance'],
  'abandoned-carts': ['manage_abandoned_carts'],
  'order-timeline': ['view_order_timeline'],
  'ab-testing': ['manage_ab_testing'],
  'customer-360': ['view_customer_360'],
  'export-import': ['manage_export_import'],
  'error-monitoring': ['view_error_monitoring'],
  'vendor-commissions': ['manage_commissions'],
  'payment-reconciliation': ['manage_reconciliation'],
  'inventory-alerts': ['manage_inventory_alerts'],
  'staff-workload': ['manage_staff_workload'],
  'color-palette': ['manage_theme'],
  'whatsapp': ['manage_whatsapp'],
  'funnel-analytics': ['view_funnel_analytics'],
  'behavior-analytics': ['view_behavior_analytics'],
  'newsletter-contacts': ['manage_newsletter'],
  'campaign-links': ['manage_campaign_links'],
  'ga4-analytics': ['view_ga4'],
  'fb-pixel': ['view_fb_pixel'],
  'recaptcha': ['manage_recaptcha'],
  'source-code': ['manage_admins'],
  'integrations': ['manage_integrations'],
  'homepage-preview': ['view_homepage_preview'],
  'system-health': ['view_error_monitoring'],
  'vendor-wallets': ['view_payouts'],
  'cohort-retention': ['view_analytics'],
  'dlq-monitor': ['view_error_monitoring'],
  'cron-dashboard': ['view_error_monitoring'],
  'storage-usage': ['view_error_monitoring'],
  'webhook-explorer': ['view_error_monitoring'],
  'circuit-breakers': ['manage_feature_flags'],
  'anomaly-alerts': ['view_error_monitoring'],
  'release-notes': ['manage_cms'],
  'incidents': ['view_error_monitoring'],
  'compliance-exports': ['manage_admins'],
  'admin-sessions': ['manage_admins'],
  'scheduled-rollouts': ['manage_feature_flags'],
  'customer-broadcasts': ['send_notifications'],
  'scheduled-reports': ['view_analytics'],
  'webhook-replay': ['view_error_monitoring'],
  'backup-snapshots': ['manage_admins'],
  'rate-limit-policies': ['manage_admins'],
  'data-retention': ['manage_admins'],
  'email-deliverability': ['view_error_monitoring'],
  'admin-ip-allowlist': ['manage_admins'],
  'notification-templates': ['send_notifications'],
  'outbound-webhooks': ['manage_admins'],
  'api-keys': ['manage_admins'],
  'login-security': ['manage_admins'],
  'sms-deliverability': ['view_error_monitoring'],
  'push-deliverability': ['view_error_monitoring'],
  'two-factor-policies': ['manage_admins'],
  'consent-ledger': ['manage_admins'],
  'inbound-webhook-allowlist': ['manage_admins'],
  'trusted-devices': ['manage_admins'],
  'captcha-monitor': ['view_error_monitoring'],
  'geo-blocks': ['manage_admins'],
  'admin-approvals': ['manage_admins'],
  'security-ledger': ['view_error_monitoring'],
  'security-detections': ['manage_admins'],
  'rotation-scheduler': ['manage_admins'],
  'api-key-usage': ['view_error_monitoring'],
  'data-export-jobs': ['manage_admins'],
  'backup-verifications': ['manage_admins'],
  'admin-notif-prefs': [],
  'service-probes': ['view_error_monitoring'],
  'threat-intel': ['manage_admins'],
  'activity-heatmap': ['view_audit_log'],
};

// Navigation structure
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: boolean;
  permissions?: string[];
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, permissions: ['view_dashboard'] },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, permissions: ['view_analytics'] },
      { id: 'behavior-analytics', label: 'Behavior Tracker', icon: Activity, permissions: ['view_behavior_analytics'] },
      { id: 'cohort-retention', label: 'Cohort Retention', icon: Repeat, permissions: ['view_analytics'] },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    items: [
      { id: 'orders', label: 'Orders', icon: ShoppingCart, permissions: ['view_orders'] },
      { id: 'orders-split', label: 'Orders (Split View)', icon: ShoppingCart, permissions: ['view_orders'] },
      { id: 'order-timeline', label: 'Order Activity', icon: Activity, permissions: ['view_order_timeline'] },
      { id: 'products', label: 'Products', icon: Package, permissions: ['view_products'] },
      { id: 'categories', label: 'Categories', icon: FolderTree, permissions: ['manage_categories'] },
      { id: 'refunds', label: 'Refunds', icon: CreditCard, permissions: ['manage_refunds'] },
      { id: 'invoices', label: 'Invoices', icon: FileText, permissions: ['manage_invoices'] },
      { id: 'shipping', label: 'Shipping & Logistics', icon: Truck, permissions: ['manage_shipping'] },
      { id: 'indiapost', label: 'India Post', icon: Package, permissions: ['manage_indiapost'] },
      { id: 'tax-config', label: 'Tax Configuration', icon: Calculator, permissions: ['manage_tax'] },
    ],
  },
  {
    id: 'users',
    label: 'Users & Vendors',
    items: [
      { id: 'vendors', label: 'Vendors', icon: Store, permissions: ['view_vendors'] },
      { id: 'vendor-performance', label: 'Vendor Scorecard', icon: Target, permissions: ['manage_vendor_performance'] },
      { id: 'kyc-queue', label: 'KYC Review Queue', icon: ShieldCheck, permissions: ['manage_vendors'] },
      { id: 'customers', label: 'Customers', icon: Users, permissions: ['view_customers'] },
      { id: 'customer-segments', label: 'Segments', icon: PieChart, permissions: ['manage_segments'] },
      { id: 'customer-360', label: 'Customer 360°', icon: UserCheck, permissions: ['view_customer_360'] },
      { id: 'reviews', label: 'Reviews', icon: MessageSquare, badge: true, permissions: ['moderate_reviews'] },
      { id: 'payouts', label: 'Payouts', icon: Wallet, permissions: ['view_payouts'] },
      { id: 'vendor-wallets', label: 'Vendor Wallets', icon: Wallet, permissions: ['view_payouts'] },
      { id: 'returns', label: 'Returns', icon: RotateCcw, permissions: ['view_returns'] },
      { id: 'disputes', label: 'Disputes', icon: AlertTriangle, permissions: ['manage_disputes'] },
      { id: 'support', label: 'Support Tickets', icon: Headphones, permissions: ['view_tickets'] },
      { id: 'sla-management', label: 'SLA & Templates', icon: Timer, permissions: ['manage_sla'] },
      { id: 'live-chat', label: 'Live Chat', icon: MessageSquare, permissions: ['manage_live_chat'] },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      { id: 'cms', label: 'Homepage CMS', icon: Palette, permissions: ['manage_cms'] },
      { id: 'promotions', label: 'Promotions', icon: Tags, permissions: ['manage_promotions'] },
      { id: 'loyalty', label: 'Loyalty & Rewards', icon: Gift, permissions: ['manage_loyalty'] },
      { id: 'spinwheel', label: 'Spin Wheel', icon: Gift, permissions: ['manage_spin_wheel'] },
      { id: 'spinwheel-codes', label: 'Spin Codes', icon: RotateCcw, permissions: ['manage_spin_wheel'] },
      { id: 'flash-sales', label: 'Flash Sales', icon: Zap, permissions: ['manage_flash_sales'] },
      { id: 'promo-history', label: 'Code History', icon: ClipboardList, permissions: ['manage_promotions'] },
      { id: 'abandoned-carts', label: 'Abandoned Carts', icon: ShoppingBag, permissions: ['manage_abandoned_carts'] },
      { id: 'ab-testing', label: 'A/B Testing', icon: TestTube, permissions: ['manage_ab_testing'] },
      { id: 'campaign-links', label: 'Campaign Links', icon: Link2, permissions: ['manage_campaign_links'] },
      { id: 'email-campaigns', label: 'Email Campaigns', icon: Bell, permissions: ['send_notifications'] },
      { id: 'push-notifications', label: 'Push Notifications', icon: Bell, permissions: ['send_notifications'] },
      { id: 'customer-broadcasts', label: 'Customer Broadcasts', icon: Radio, permissions: ['send_notifications'] },
      { id: 'newsletter-contacts', label: 'Newsletter & Contacts', icon: Mail, permissions: ['manage_newsletter'] },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, permissions: ['manage_whatsapp'] },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'admin-management', label: 'Admin Team', icon: UserCog, permissions: ['manage_admins'] },
      { id: 'vendor-commissions', label: 'Commissions', icon: Calculator, permissions: ['manage_commissions'] },
      { id: 'payment-reconciliation', label: 'Reconciliation', icon: CreditCard, permissions: ['manage_reconciliation'] },
      { id: 'inventory-alerts', label: 'Inventory Alerts', icon: AlertTriangle, permissions: ['manage_inventory_alerts'] },
      { id: 'staff-workload', label: 'Staff Workload', icon: Users, permissions: ['manage_staff_workload'] },
      { id: 'color-palette', label: 'Theme Colors', icon: Palette, permissions: ['manage_theme'] },
      { id: 'fraud-detection', label: 'Fraud Detection', icon: Shield, permissions: ['view_fraud_detection'] },
      { id: 'error-monitoring', label: 'Error Monitor', icon: AlertTriangle, permissions: ['view_error_monitoring'] },
      { id: 'system-health', label: 'System Health', icon: Activity, permissions: ['view_error_monitoring'] },
      { id: 'backend-health', label: 'Backend Health', icon: ShieldCheck, permissions: ['view_error_monitoring'] },
      { id: 'dlq-monitor', label: 'Dead Letter Queue', icon: AlertTriangle, permissions: ['view_error_monitoring'] },
      { id: 'cron-dashboard', label: 'Cron Jobs', icon: Clock, permissions: ['view_error_monitoring'] },
      { id: 'storage-usage', label: 'Storage Usage', icon: HardDrive, permissions: ['view_error_monitoring'] },
      { id: 'webhook-explorer', label: 'Webhook Explorer', icon: Webhook, permissions: ['view_error_monitoring'] },
      { id: 'kill-switches', label: 'Kill Switches', icon: AlertTriangle, permissions: ['manage_feature_flags'] },
      { id: 'circuit-breakers', label: 'Circuit Breakers', icon: Gauge, permissions: ['manage_feature_flags'] },
      { id: 'scheduled-rollouts', label: 'Scheduled Rollouts', icon: CalendarClock, permissions: ['manage_feature_flags'] },
      { id: 'scheduled-reports', label: 'Scheduled Reports', icon: CalendarClock, permissions: ['view_analytics'] },
      { id: 'webhook-replay', label: 'Webhook Replay', icon: Webhook, permissions: ['view_error_monitoring'] },
      { id: 'backup-snapshots', label: 'Backup Snapshots', icon: HardDrive, permissions: ['manage_admins'] },
      { id: 'rate-limit-policies', label: 'Rate Limit Policies', icon: Gauge, permissions: ['manage_admins'] },
      { id: 'data-retention', label: 'Data Retention', icon: Database, permissions: ['manage_admins'] },
      { id: 'email-deliverability', label: 'Email Deliverability', icon: Mail, permissions: ['view_error_monitoring'] },
      { id: 'admin-ip-allowlist', label: 'Admin IP Allowlist', icon: Shield, permissions: ['manage_admins'] },
      { id: 'notification-templates', label: 'Notification Templates', icon: FileText, permissions: ['send_notifications'] },
      { id: 'outbound-webhooks', label: 'Outbound Webhooks', icon: Webhook, permissions: ['manage_admins'] },
      { id: 'api-keys', label: 'API Keys', icon: Key, permissions: ['manage_admins'] },
      { id: 'login-security', label: 'Login Security', icon: ShieldCheck, permissions: ['manage_admins'] },
      { id: 'sms-deliverability', label: 'SMS Deliverability', icon: MessageSquare, permissions: ['view_error_monitoring'] },
      { id: 'push-deliverability', label: 'Push Deliverability', icon: Bell, permissions: ['view_error_monitoring'] },
      { id: 'two-factor-policies', label: 'Two-Factor Policies', icon: ShieldCheck, permissions: ['manage_admins'] },
      { id: 'consent-ledger', label: 'Consent Ledger', icon: FileText, permissions: ['manage_admins'] },
      { id: 'inbound-webhook-allowlist', label: 'Inbound Webhook Allowlist', icon: Webhook, permissions: ['manage_admins'] },
      { id: 'trusted-devices', label: 'Trusted Devices', icon: ShieldCheck, permissions: ['manage_admins'] },
      { id: 'captcha-monitor', label: 'CAPTCHA Monitor', icon: Shield, permissions: ['view_error_monitoring'] },
      { id: 'geo-blocks', label: 'Geo-Block Rules', icon: Shield, permissions: ['manage_admins'] },
      { id: 'admin-approvals', label: 'Action Approvals', icon: ShieldCheck, permissions: ['manage_admins'] },
      { id: 'security-ledger', label: 'Security Ledger', icon: ShieldCheck, permissions: ['view_error_monitoring'] },
      { id: 'security-detections', label: 'Security Detections', icon: Siren, permissions: ['manage_admins'] },
      { id: 'rotation-scheduler', label: 'Rotation Scheduler', icon: Key, permissions: ['manage_admins'] },
      { id: 'api-key-usage', label: 'API Key Usage', icon: Activity, permissions: ['view_error_monitoring'] },
      { id: 'data-export-jobs', label: 'Export Job Queue', icon: FileText, permissions: ['manage_admins'] },
      { id: 'backup-verifications', label: 'Backup Verifications', icon: ShieldCheck, permissions: ['manage_admins'] },
      { id: 'admin-notif-prefs', label: 'My Notification Prefs', icon: Bell, permissions: [] },
      { id: 'service-probes', label: 'Service Health Probes', icon: Activity, permissions: ['view_error_monitoring'] },
      { id: 'threat-intel', label: 'Threat Intel Feeds', icon: Shield, permissions: ['manage_admins'] },
      { id: 'activity-heatmap', label: 'Activity Heatmap', icon: BarChart3, permissions: ['view_audit_log'] },
      { id: 'heartbeats', label: 'Heartbeats', icon: Activity, permissions: ['view_error_monitoring'] },
      { id: 'edge-performance', label: 'Edge Performance', icon: Zap, permissions: ['view_error_monitoring'] },
      { id: 'anomaly-alerts', label: 'Anomaly Alerts', icon: Siren, permissions: ['view_error_monitoring'] },
      { id: 'incidents', label: 'Incidents', icon: AlertTriangle, permissions: ['view_error_monitoring'] },
      { id: 'maintenance', label: 'Maintenance Mode', icon: Wrench, permissions: ['manage_feature_flags'] },
      { id: 'secret-rotation', label: 'Secret Rotation', icon: Key, permissions: ['manage_admins'] },
      { id: 'compliance-exports', label: 'Compliance Exports', icon: FileText, permissions: ['manage_admins'] },
      { id: 'admin-sessions', label: 'Admin Sessions', icon: Lock, permissions: ['manage_admins'] },
      { id: 'release-notes', label: 'Release Notes', icon: FileText, permissions: ['manage_cms'] },
      { id: 'observability', label: 'Observability & SLOs', icon: Activity, permissions: ['view_error_monitoring'] },
      { id: 'role-simulator', label: 'Preview as Role', icon: EyeOff, permissions: ['manage_admins'] },
      { id: 'broadcast-banners', label: 'Broadcast Banners', icon: Megaphone, permissions: ['manage_cms'] },
      { id: 'export-import', label: 'Export/Import', icon: Database, permissions: ['manage_export_import'] },
      { id: 'feature-flags', label: 'Features', icon: ToggleLeft, permissions: ['manage_feature_flags'] },
      { id: 'audit-logs', label: 'Audit Logs', icon: History, permissions: ['view_audit_log'] },
      { id: 'settings', label: 'Settings', icon: Settings, permissions: ['view_settings'] },
      { id: 'integrations', label: 'Integrations', icon: Globe, permissions: ['manage_integrations'] },
      { id: 'ga4-analytics', label: 'Google Analytics', icon: BarChart3, permissions: ['view_ga4'] },
      { id: 'fb-pixel', label: 'Facebook Pixel', icon: Target, permissions: ['view_fb_pixel'] },
      { id: 'recaptcha', label: 'reCAPTCHA', icon: Shield, permissions: ['manage_recaptcha'] },
      { id: 'source-code', label: 'Source & Docs', icon: FileCode, permissions: ['manage_admins'] },
    ],
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['main', 'commerce', 'users', 'marketing', 'system']);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Cmd/Ctrl+K focuses sidebar search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        haptic('light');
        const target = mobileMenuOpen ? mobileSearchRef.current : desktopSearchRef.current;
        target?.focus();
        target?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  useEffect(() => {
    setSearchQuery('');
    mainContentRef.current?.focus({ preventScroll: true });
  }, [activeTab]);

  
  const { data: pendingReviewsCount } = usePendingReviewsCount();
  const { data: stats } = useAdvancedAnalytics('30d');
  const { data: myPermissions = [], isLoading: permissionsLoading } = useMyAdminPermissions();

  const setActiveTab = (tab: string) => {
    haptic('light');
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };


  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const hasPermission = useCallback((permissions?: string[]): boolean => {
    if (!permissions || permissions.length === 0) return true;
    if (permissionsLoading) return true;
    if (myPermissions.includes('admin.*') || myPermissions.includes('*')) return true;
    return permissions.some(p => myPermissions.includes(p));
  }, [myPermissions, permissionsLoading]);

  const filteredNavGroups = useMemo(() => {
    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => hasPermission(item.permissions)),
    })).filter(group => group.items.length > 0);
  }, [hasPermission]);

  const canAccessCurrentTab = useMemo(() => {
    const sectionPerms = SECTION_PERMISSIONS[activeTab];
    return hasPermission(sectionPerms);
  }, [activeTab, hasPermission]);

  const NavItemComponent = ({ item, isMobile = false }: { item: NavItem, isMobile?: boolean }) => {
    const isActive = activeTab === item.id;
    const hasAccess = hasPermission(item.permissions);
    
    if (!hasAccess) return null;
    
    return (
      <Button
        variant="ghost"
        className={cn(
          'w-full min-h-11 justify-start gap-2.5 px-3 text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isActive 
            ? 'bg-accent/10 text-accent shadow-sm' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        )}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          setActiveTab(item.id);
          if (isMobile) setMobileMenuOpen(false);
        }}
      >
        <item.icon className={cn('w-4 h-4', isActive && 'text-accent')} />
        <span className="flex-1 text-left text-[13px]">{item.label}</span>
        {item.badge && pendingReviewsCount && pendingReviewsCount > 0 && (
          <Badge variant="destructive" className="text-[10px] h-5 px-1.5 rounded-full">
            {pendingReviewsCount}
          </Badge>
        )}
      </Button>
    );
  };

  const Sidebar = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={isMobile ? mobileSearchRef : desktopSearchRef}
            placeholder="Search..."
            aria-label={isMobile ? 'Search mobile admin sections' : 'Search admin sections'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('');
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'Enter' && searchQuery) {
                const q = searchQuery.toLowerCase();
                const firstMatch = filteredNavGroups
                  .flatMap(g => g.items)
                  .find(item => item.label.toLowerCase().includes(q));
                if (firstMatch) {
                  setActiveTab(firstMatch.id);
                  setSearchQuery('');
                  if (isMobile) setMobileMenuOpen(false);
                }
              }
            }}
            className="min-h-11 pl-9 pr-12 bg-secondary/50 placeholder:text-muted-foreground"
            autoComplete="off"
            autoFocus={false}
            inputMode="none"
            onFocus={(e) => {
              setTimeout(() => {
                e.target.inputMode = 'text';
              }, 0);
            }}
            onBlur={(e) => {
              e.target.inputMode = 'none';
            }}
          />
          <kbd className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 h-5 rounded border border-border bg-background text-[10px] text-muted-foreground font-mono pointer-events-none">
            ⌘K
          </kbd>
        </div>

      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {permissionsLoading ? (
          <div className="space-y-4 px-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const visibleGroups = filteredNavGroups
                .map(group => ({
                  group,
                  items: group.items.filter(item =>
                    item.label.toLowerCase().includes(searchQuery.toLowerCase())
                  ),
                }))
                .filter(({ items }) => items.length > 0 || !searchQuery);

              if (searchQuery && visibleGroups.length === 0) {
                return (
                  <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No matches for <span className="font-medium text-foreground">"{searchQuery}"</span>
                  </div>
                );
              }

              return visibleGroups.map(({ group, items }) => {
                const isOpen = searchQuery ? true : expandedGroups.includes(group.id);
                return (
                  <Collapsible
                    key={group.id}
                    open={isOpen}
                    onOpenChange={() => !searchQuery && toggleGroup(group.id)}
                  >
                    <CollapsibleTrigger className="flex min-h-10 items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
                      {group.label}
                      <ChevronDown className={cn(
                        'w-3 h-3 transition-transform',
                        isOpen && 'rotate-180'
                      )} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {(searchQuery ? items : group.items).map((item) => (
                        <NavItemComponent key={item.id} item={item} isMobile={isMobile} />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              });
            })()}
          </div>
        )}
      </ScrollArea>


      <div className="p-4 border-t border-border space-y-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>{myPermissions.length} permissions</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px]">
              <p className="font-medium mb-1">Your Permissions:</p>
              <p className="text-xs text-muted-foreground">
                {myPermissions.slice(0, 5).join(', ')}
                {myPermissions.length > 5 && ` +${myPermissions.length - 5} more`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="outline" asChild className="w-full gap-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4" />
            Exit Admin Panel
          </Link>
        </Button>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-accent/10 to-primary/5">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || 'Admin'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (!canAccessCurrentTab && !permissionsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            You don't have permission to access this section. Contact the admin owner to request access.
          </p>
          <Button onClick={() => setActiveTab('overview')}>
            Go to Dashboard
          </Button>
        </div>
      );
    }

    const componentMap: Record<string, React.ReactNode> = {
      'overview': <EnhancedOverview />,
      'analytics': <AdvancedAnalytics />,
      'vendors': <VendorManagement />,
      'customers': <EnhancedCustomerManagement />,
      'orders': <EnhancedOrderManagement />,
      'products': <ProductCatalog />,
      'categories': <CategoryManager />,
      'reviews': <ReviewModeration />,
      'payouts': <PayoutManagement />,
      'support': <SupportTicketManager />,
      'live-chat': <LiveChatManager />,
      'returns': <ReturnManagement />,
      'disputes': <DisputeManagement />,
      'promotions': <PromotionsManager />,
      'loyalty': <LoyaltyManagement />,
      'spinwheel': <SpinWheelManager />,
      'spinwheel-codes': <SpinWheelCodesManager />,
      'flash-sales': <FlashSalesManager />,
      'promo-history': <PromoCodeHistory />,
      'email-campaigns': <NotificationCenter />,
      'push-notifications': <AdminNotificationManager />,
      'cms': <CMSManager />,
      'audit-logs': <AuditLogViewer />,
      'feature-flags': <FeatureFlagsManager />,
      'fraud-detection': <FraudDetectionDashboard />,
      'admin-management': <AdminManagement />,
      'refunds': <RefundManagement />,
      'invoices': <InvoiceManager />,
      'shipping': <ShippingManager />,
      'tax-config': <TaxConfigManager />,
      'sla-management': <SLAManager />,
      'customer-segments': <CustomerSegmentation />,
      'vendor-performance': <VendorPerformanceDashboard />,
      'abandoned-carts': <AbandonedCartDashboard />,
      'order-timeline': <OrderTimelineAdmin />,
      'ab-testing': <ABTestingDashboard />,
      'funnel-analytics': <FunnelAnalyticsDashboard />,
      'behavior-analytics': <BehaviorAnalyticsDashboard />,
      'customer-360': <Customer360Admin />,
      'export-import': <ExportImportCenter />,
      'error-monitoring': <ErrorMonitoringDashboard />,
      'vendor-commissions': <VendorCommissionManager />,
      'payment-reconciliation': <PaymentReconciliation />,
      'inventory-alerts': <InventoryAlertsDashboard />,
      'staff-workload': <StaffWorkloadDashboard />,
      'color-palette': <ColorPaletteCustomizer />,
      'whatsapp': <WhatsAppManager />,
      'newsletter-contacts': <FooterNewsletterManager />,
      'campaign-links': <CampaignLinksDashboard />,
      'integrations': <IntegrationHub />,
      'ga4-analytics': <GA4Dashboard />,
      'fb-pixel': <FBPixelDashboard />,
      'recaptcha': <RecaptchaDashboard />,
      'indiapost': <IndiaPostManager />,
      'settings': <SystemSettings />,
      'source-code': <SourceCodeDocs />,
      'system-health': <SystemHealthDashboard />,
      'vendor-wallets': <VendorWalletDashboard />,
      'cohort-retention': <CohortRetentionDashboard />,
      'observability': <ObservabilityDashboard />,
      'broadcast-banners': <BroadcastBannerManager />,
      'orders-split': <OrderSplitPane />,
      'kyc-queue': <KycReviewQueue />,
      'role-simulator': <RoleSimulator />,
      'backend-health': <BackendHealthDashboard />,
      'dlq-monitor': <DeadLetterQueueViewer />,
      'cron-dashboard': <CronDashboard />,
      'storage-usage': <StorageUsageAnalyzer />,
      'kill-switches': <KillSwitchPanel />,
      'webhook-explorer': <WebhookExplorer />,
      'circuit-breakers': <CircuitBreakerPanel />,
      'heartbeats': <SystemHeartbeatDashboard />,
      'edge-performance': <EdgePerformanceDashboard />,
      'anomaly-alerts': <AnomalyAlertsPanel />,
      'maintenance': <MaintenanceModePanel />,
      'secret-rotation': <SecretRotationTracker />,
      'release-notes': <ReleaseNotesPublisher />,
      'incidents': <IncidentManagementPanel />,
      'compliance-exports': <ComplianceExportCenter />,
      'admin-sessions': <AdminSessionActivity />,
      'scheduled-rollouts': <ScheduledFeatureRollouts />,
      'customer-broadcasts': <CustomerBroadcastOrchestrator />,
      'scheduled-reports': <ScheduledReportsBuilder />,
      'webhook-replay': <WebhookReplayConsole />,
      'backup-snapshots': <BackupSnapshotsRegistry />,
      'rate-limit-policies': <ApiRateLimitPolicies />,
      'data-retention': <DataRetentionPolicies />,
      'email-deliverability': <EmailDeliverabilityMonitor />,
      'admin-ip-allowlist': <AdminIpAllowlist />,
      'notification-templates': <NotificationTemplatesRegistry />,
      'outbound-webhooks': <OutboundWebhookSubscriptions />,
      'api-keys': <ApiKeysManager />,
      'login-security': <LoginSecurityCenter />,
      'sms-deliverability': <SmsDeliverabilityMonitor />,
      'push-deliverability': <PushDeliverabilityMonitor />,
      'two-factor-policies': <TwoFactorPolicyCenter />,
      'consent-ledger': <ConsentLedgerCenter />,
      'inbound-webhook-allowlist': <InboundWebhookAllowlist />,
      'trusted-devices': <TrustedDevicesRegistry />,
      'captcha-monitor': <CaptchaVerificationMonitor />,
      'geo-blocks': <GeoBlockRules />,
      'admin-approvals': <AdminApprovalQueue />,
      'security-ledger': <SecurityEventLedger />,
      'security-detections': <SecurityDetectionRules />,
      'rotation-scheduler': <SecretRotationScheduler />,
      'api-key-usage': <ApiKeyUsageAnalytics />,
      'data-export-jobs': <DataExportJobQueue />,
      'backup-verifications': <BackupVerificationLog />,
      'admin-notif-prefs': <AdminNotificationPreferences />,
      'service-probes': <ServiceHealthProbes />,
      'threat-intel': <ThreatIntelFeeds />,
      'activity-heatmap': <AdminActivityHeatmap />,
    };

    return (
      <Suspense fallback={<TabLoader />}>
        {componentMap[activeTab] || <EnhancedOverview />}
      </Suspense>
    );
  };

  const currentSectionLabel = filteredNavGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Dashboard';
  const alertsCount = (stats?.pendingVendors || 0) + (stats?.pendingPayouts || 0) + (stats?.lowStockProducts || 0) + (pendingReviewsCount || 0);

  return (
    <div className="min-h-screen bg-background flex">
      <Suspense fallback={null}><AdminCommandPalette /></Suspense>
      <a href="#admin-main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground focus:shadow-lg">
        Skip to admin content
      </a>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] border-r border-border bg-card/50 backdrop-blur-sm fixed left-0 top-0 bottom-0 z-40">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/20">
              <Shield className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-bold text-lg">Odhra Admin</p>
              <p className="text-xs text-muted-foreground">Control Center</p>
            </div>
          </Link>
        </div>
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-[280px]">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="min-h-11 min-w-11 lg:hidden" aria-label="Open admin navigation">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(320px,88vw)] p-0">
                  <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                  <SheetDescription className="sr-only">Search and open admin control center sections.</SheetDescription>
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <Shield className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="font-bold">Admin</p>
                        <p className="text-xs text-muted-foreground">Control Center</p>
                      </div>
                    </div>
                  </div>
                  <Sidebar isMobile />
                </SheetContent>
              </Sheet>

              <Button variant="ghost" size="icon" asChild className="hidden min-h-11 min-w-11 sm:flex">
                <Link to="/" aria-label="Exit admin panel">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>

              <div>
                <h1 className="font-bold text-lg capitalize">
                  {currentSectionLabel}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Manage your marketplace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative min-h-11 min-w-11" aria-label="Open admin notifications">
                    <Bell className="w-5 h-5" />
                    {alertsCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Admin Notifications</span>
                    {alertsCount > 0 && (
                      <Badge variant="destructive" className="text-xs">{alertsCount}</Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hasPermission(['view_vendors']) && (stats?.pendingVendors || 0) > 0 && (
                    <DropdownMenuItem onClick={() => setActiveTab('vendors')} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                           <Store className="w-4 h-4 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">{stats?.pendingVendors} Pending Vendors</p>
                          <p className="text-xs text-muted-foreground">Awaiting approval</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(['view_payouts']) && (stats?.pendingPayouts || 0) > 0 && (
                    <DropdownMenuItem onClick={() => setActiveTab('payouts')} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                           <Wallet className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{stats?.pendingPayouts} Pending Payouts</p>
                          <p className="text-xs text-muted-foreground">Require processing</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(['view_products']) && (stats?.lowStockProducts || 0) > 0 && (
                    <DropdownMenuItem onClick={() => setActiveTab('products')} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                           <AlertTriangle className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{stats?.lowStockProducts} Low Stock Items</p>
                          <p className="text-xs text-muted-foreground">Need restocking</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(['moderate_reviews']) && pendingReviewsCount && pendingReviewsCount > 0 && (
                    <DropdownMenuItem onClick={() => setActiveTab('reviews')} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                           <MessageSquare className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{pendingReviewsCount} Pending Reviews</p>
                          <p className="text-xs text-muted-foreground">Awaiting moderation</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {alertsCount === 0 && (
                    <div className="py-6 text-center text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No pending actions</p>
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  {hasPermission(['send_notifications']) && (
                    <DropdownMenuItem onClick={() => setActiveTab('push-notifications')} className="cursor-pointer justify-center text-accent">
                      Send Push Notification
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{user?.user_metadata?.full_name || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-accent-foreground font-bold">
                  {(user?.user_metadata?.full_name || user?.email || 'A')[0].toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main id="admin-main-content" aria-label={`Admin: ${currentSectionLabel}`} className="p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              ref={mainContentRef}
              tabIndex={-1}
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
              className="focus:outline-none"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Real-time ticket notifications */}
      <Suspense fallback={null}>
        <TicketRealtimeNotification />
      </Suspense>
    </div>
  );
}
