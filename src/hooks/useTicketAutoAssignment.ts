import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StaffWorkload {
  staffId: string;
  staffName: string;
  staffEmail: string;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  totalActive: number;
  totalResolved: number;
  resolutionRate: number;
  avgResponseTime?: number;
}

export function useStaffWorkload() {
  return useQuery({
    queryKey: ['staff-workload'],
    queryFn: async () => {
      // Get all admin users
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;
      if (!adminRoles || adminRoles.length === 0) return [];

      const staffIds = adminRoles.map((r) => r.user_id);

      // Get profiles for staff members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', staffIds);

      if (profilesError) throw profilesError;

      // Get all tickets with assignments
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, status, assigned_to, created_at, resolved_at');

      if (ticketsError) throw ticketsError;

      // Calculate workload for each staff member
      const workloadMap: Record<string, StaffWorkload> = {};

      // Initialize with all staff (including unassigned bucket)
      profiles?.forEach((profile) => {
        workloadMap[profile.id] = {
          staffId: profile.id,
          staffName: profile.full_name || 'Unknown',
          staffEmail: profile.email,
          openTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          totalActive: 0,
          totalResolved: 0,
          resolutionRate: 0,
        };
      });

      // Count tickets per staff member
      tickets?.forEach((ticket) => {
        if (ticket.assigned_to && workloadMap[ticket.assigned_to]) {
          const staff = workloadMap[ticket.assigned_to];
          switch (ticket.status) {
            case 'open':
              staff.openTickets++;
              staff.totalActive++;
              break;
            case 'in_progress':
              staff.inProgressTickets++;
              staff.totalActive++;
              break;
            case 'resolved':
              staff.resolvedTickets++;
              staff.totalResolved++;
              break;
            case 'closed':
              staff.closedTickets++;
              staff.totalResolved++;
              break;
          }
        }
      });

      // Calculate resolution rate for each staff member
      Object.values(workloadMap).forEach((staff) => {
        const total = staff.totalActive + staff.totalResolved;
        staff.resolutionRate = total > 0 ? (staff.totalResolved / total) * 100 : 0;
      });

      return Object.values(workloadMap);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useAutoAssignStaff() {
  const { data: workload = [] } = useStaffWorkload();

  const getOptimalAssignee = (priority: string): string | null => {
    if (workload.length === 0) return null;

    // For urgent/high priority, find the staff with:
    // 1. Lowest active ticket count
    // 2. Highest resolution rate (as tiebreaker)
    const sortedStaff = [...workload].sort((a, b) => {
      // Primary: fewer active tickets
      if (a.totalActive !== b.totalActive) {
        return a.totalActive - b.totalActive;
      }
      // Secondary: higher resolution rate
      return b.resolutionRate - a.resolutionRate;
    });

    // For urgent tickets, prefer staff with 0-2 active tickets
    if (priority === 'urgent' || priority === 'high') {
      const availableStaff = sortedStaff.filter((s) => s.totalActive <= 2);
      if (availableStaff.length > 0) {
        return availableStaff[0].staffId;
      }
    }

    // Return staff with lowest workload
    return sortedStaff[0]?.staffId || null;
  };

  const shouldAutoAssign = (priority: string): boolean => {
    return priority === 'urgent' || priority === 'high';
  };

  return {
    workload,
    getOptimalAssignee,
    shouldAutoAssign,
  };
}

// Get unassigned ticket stats
export function useUnassignedTicketStats() {
  return useQuery({
    queryKey: ['unassigned-ticket-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, priority, status')
        .is('assigned_to', null)
        .in('status', ['open', 'in_progress']);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        urgent: data?.filter((t) => t.priority === 'urgent').length || 0,
        high: data?.filter((t) => t.priority === 'high').length || 0,
        medium: data?.filter((t) => t.priority === 'medium').length || 0,
        low: data?.filter((t) => t.priority === 'low').length || 0,
      };

      return stats;
    },
    refetchInterval: 15000,
  });
}
