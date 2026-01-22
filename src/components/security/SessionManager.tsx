import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useUserSessions, useRevokeSession, useRevokeAllOtherSessions } from '@/hooks/useSessions';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  Loader2, 
  LogOut,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const deviceIcons: Record<string, React.ElementType> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

export function SessionManager() {
  const { data: sessions, isLoading } = useUserSessions();
  const revokeSession = useRevokeSession();
  const revokeAllOthers = useRevokeAllOtherSessions();
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading sessions...
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentSession = sessions?.find(s => s.is_current);
  const otherSessions = sessions?.filter(s => !s.is_current) || [];

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage devices where you're currently logged in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Session */}
          {currentSession && (
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {(() => {
                    const device = currentSession.device_info?.device || 'Desktop';
                    const DeviceIcon = deviceIcons[device] || Monitor;
                    return <DeviceIcon className="w-6 h-6 text-accent mt-0.5" />;
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {currentSession.device_info?.browser || 'Unknown Browser'} on {currentSession.device_info?.os || 'Unknown OS'}
                      </p>
                      <Badge variant="default" className="text-xs">Current</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentSession.location || 'Unknown location'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active now
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Sessions */}
          {otherSessions.length > 0 ? (
            <>
              <div className="space-y-3">
                {otherSessions.map((session) => {
                  const device = session.device_info?.device || 'Desktop';
                  const DeviceIcon = deviceIcons[device] || Monitor;

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-lg bg-muted/50 flex items-start justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <DeviceIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">
                            {session.device_info?.browser || 'Unknown'} on {session.device_info?.os || 'Unknown'}
                          </p>
                          {session.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Globe className="w-3 h-3" />
                              {session.location}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Last active: {format(new Date(session.last_active_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setSessionToRevoke(session.id)}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmRevokeAll(true)}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out all other sessions
              </Button>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No other active sessions</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Revoke Single Session */}
      <Dialog open={!!sessionToRevoke} onOpenChange={() => setSessionToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              End Session
            </DialogTitle>
            <DialogDescription>
              This will log you out from that device. You'll need to sign in again to use it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToRevoke(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (sessionToRevoke) {
                  revokeSession.mutate(sessionToRevoke);
                  setSessionToRevoke(null);
                }
              }}
              disabled={revokeSession.isPending}
            >
              {revokeSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Revoke All */}
      <Dialog open={confirmRevokeAll} onOpenChange={setConfirmRevokeAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              End All Other Sessions
            </DialogTitle>
            <DialogDescription>
              This will log you out from all other devices. You'll only remain logged in on this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRevokeAll(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                revokeAllOthers.mutate();
                setConfirmRevokeAll(false);
              }}
              disabled={revokeAllOthers.isPending}
            >
              {revokeAllOthers.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Log Out All Others
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
