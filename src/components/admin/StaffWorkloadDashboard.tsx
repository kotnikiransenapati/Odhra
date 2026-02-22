import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useStaffWorkload, useUnassignedTicketStats } from '@/hooks/useTicketAutoAssignment';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  TrendingUp,
  Inbox,
  RefreshCw,
} from 'lucide-react';

interface StaffWorkloadDashboardProps {
  onAssignTickets?: () => void;
}

export function StaffWorkloadDashboard({ onAssignTickets }: StaffWorkloadDashboardProps) {
  const { data: workload = [], isLoading, refetch } = useStaffWorkload();
  const { data: unassignedStats, isLoading: statsLoading } = useUnassignedTicketStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const totalActiveTickets = workload.reduce((sum, s) => sum + s.totalActive, 0);
  const totalResolvedTickets = workload.reduce((sum, s) => sum + s.totalResolved, 0);
  const avgResolutionRate =
    workload.length > 0
      ? workload.reduce((sum, s) => sum + s.resolutionRate, 0) / workload.length
      : 0;

  const getWorkloadStatus = (activeCount: number) => {
    if (activeCount === 0) return { label: 'Available', color: 'bg-success', textColor: 'text-success' };
    if (activeCount <= 2) return { label: 'Low', color: 'bg-info', textColor: 'text-info' };
    if (activeCount <= 5) return { label: 'Moderate', color: 'bg-warning', textColor: 'text-warning' };
    return { label: 'High', color: 'bg-destructive', textColor: 'text-destructive' };
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff Members</p>
                <p className="text-2xl font-bold">{workload.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Tickets</p>
                <p className="text-2xl font-bold">{totalActiveTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{totalResolvedTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Resolution</p>
                <p className="text-2xl font-bold">{avgResolutionRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Tickets Alert */}
      {unassignedStats && unassignedStats.total > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <Inbox className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {unassignedStats.total} Unassigned Tickets
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    {unassignedStats.urgent > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        {unassignedStats.urgent} urgent
                      </span>
                    )}
                    {unassignedStats.high > 0 && (
                      <span className="text-warning">{unassignedStats.high} high</span>
                    )}
                    {unassignedStats.medium > 0 && (
                      <span>{unassignedStats.medium} medium</span>
                    )}
                    {unassignedStats.low > 0 && (
                      <span>{unassignedStats.low} low</span>
                    )}
                  </div>
                </div>
              </div>
              {onAssignTickets && (
                <Button onClick={onAssignTickets} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Auto-Assign
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Workload Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Staff Workload
            </CardTitle>
            <CardDescription>
              Current ticket distribution and performance metrics
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {workload.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Staff Members</h3>
              <p className="text-muted-foreground">
                Add admin users to enable ticket assignment.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workload.map((staff) => {
                const status = getWorkloadStatus(staff.totalActive);
                const totalTickets = staff.totalActive + staff.totalResolved;

                return (
                  <Card key={staff.staffId} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold">{staff.staffName}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                            {staff.staffEmail}
                          </p>
                        </div>
                        <Badge
                          className={`${status.color} text-white`}
                        >
                          {status.label}
                        </Badge>
                      </div>

                      {/* Active Tickets Breakdown */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Active Tickets</span>
                          <span className="font-semibold">{staff.totalActive}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-warning/10">
                            <span>Open</span>
                            <span className="font-bold text-warning">{staff.openTickets}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-info/10">
                            <span>In Progress</span>
                            <span className="font-bold text-info">{staff.inProgressTickets}</span>
                          </div>
                        </div>
                      </div>

                      {/* Resolution Stats */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Resolution Rate</span>
                          <span className="font-semibold">{staff.resolutionRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={staff.resolutionRate} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Resolved: {staff.resolvedTickets}</span>
                          <span>Closed: {staff.closedTickets}</span>
                        </div>
                      </div>

                      {/* Total Handled */}
                      <div className="mt-4 pt-4 border-t text-center">
                        <p className="text-xs text-muted-foreground">Total Handled</p>
                        <p className="text-lg font-bold">{totalTickets}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
