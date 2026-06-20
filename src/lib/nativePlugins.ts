/**
 * Batch J2 — Native plugin facade (Capacitor + Web fallback)
 *
 * All Capacitor plugins are loaded via dynamic import so the web bundle stays
 * unaffected and the same code paths work in browsers without the runtime.
 *
 * Capabilities:
 *   - Push notifications  (FCM / APNs via @capacitor/push-notifications)
 *   - Haptics             (@capacitor/haptics, falls back to navigator.vibrate)
 *   - Biometric auth      (@aparajita/capacitor-biometric-auth, web no-op)
 *   - Native share sheet  (@capacitor/share, falls back to navigator.share)
 *   - Camera / gallery    (@capacitor/camera for review uploads)
 *
 * Security notes:
 *   - Push tokens are returned to the caller; persisting is the caller's job
 *     so RLS-protected tables (e.g. `push_tokens`) own the data.
 *   - Biometric verification only returns a boolean — it never exposes raw
 *     credentials. Use it as a *gate* before a server-side action.
 *   - Camera permissions are requested explicitly; we never auto-prompt.
 */

type LoadedModule<T> = T | null;

async function tryImport<T>(name: string): Promise<LoadedModule<T>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* @vite-ignore */ name);
    return (mod?.default ?? mod) as T;
  } catch {
    return null;
  }
}

async function isNative(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const core = await tryImport<any>('@capacitor/core');
  return Boolean(core?.Capacitor?.isNativePlatform?.());
}

/* -------------------------------------------------------------------------- */
/* Push notifications                                                          */
/* -------------------------------------------------------------------------- */

export interface PushRegistration {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export async function registerPushNotifications(
  onToken: (reg: PushRegistration) => void | Promise<void>,
  onNotification?: (payload: { title?: string; body?: string; data?: Record<string, unknown> }) => void,
): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isNative())) {
    return { ok: false, reason: 'web-platform' };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const push = await tryImport<any>('@capacitor/push-notifications');
  if (!push?.PushNotifications) return { ok: false, reason: 'plugin-missing' };

  const perm = await push.PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return { ok: false, reason: 'denied' };

  await push.PushNotifications.register();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const core = await tryImport<any>('@capacitor/core');
  const platform = (core?.Capacitor?.getPlatform?.() as PushRegistration['platform']) ?? 'web';

  push.PushNotifications.addListener('registration', (t: { value: string }) => {
    void onToken({ token: t.value, platform });
  });

  if (onNotification) {
    push.PushNotifications.addListener(
      'pushNotificationReceived',
      (n: { title?: string; body?: string; data?: Record<string, unknown> }) =>
        onNotification({ title: n.title, body: n.body, data: n.data }),
    );
  }
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Haptics — defers to the existing web haptics implementation on the browser */
/* -------------------------------------------------------------------------- */

export type NativeHapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export async function nativeHaptic(style: NativeHapticStyle = 'light'): Promise<void> {
  if (await isNative()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await tryImport<any>('@capacitor/haptics');
    if (mod?.Haptics) {
      const { Haptics, ImpactStyle, NotificationType } = mod;
      try {
        switch (style) {
          case 'selection':
            return await Haptics.selectionStart();
          case 'success':
            return await Haptics.notification({ type: NotificationType.Success });
          case 'warning':
            return await Haptics.notification({ type: NotificationType.Warning });
          case 'error':
            return await Haptics.notification({ type: NotificationType.Error });
          case 'heavy':
            return await Haptics.impact({ style: ImpactStyle.Heavy });
          case 'medium':
            return await Haptics.impact({ style: ImpactStyle.Medium });
          default:
            return await Haptics.impact({ style: ImpactStyle.Light });
        }
      } catch {
        /* swallow */
      }
    }
  }
  // Web fallback
  const { haptic } = await import('@/lib/haptics');
  haptic(style as 'light');
}

/* -------------------------------------------------------------------------- */
/* Biometric login                                                             */
/* -------------------------------------------------------------------------- */

export interface BiometricResult {
  ok: boolean;
  available: boolean;
  reason?: string;
}

export async function verifyBiometric(reason = 'Confirm it’s you'): Promise<BiometricResult> {
  if (!(await isNative())) return { ok: false, available: false, reason: 'web-platform' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await tryImport<any>('@aparajita/capacitor-biometric-auth');
  const Biometric = mod?.BiometricAuth ?? mod;
  if (!Biometric) return { ok: false, available: false, reason: 'plugin-missing' };
  try {
    const info = await Biometric.checkBiometry?.();
    if (info && info.isAvailable === false) {
      return { ok: false, available: false, reason: info.reason ?? 'unavailable' };
    }
    await Biometric.authenticate({ reason, allowDeviceCredential: true });
    return { ok: true, available: true };
  } catch (err) {
    return { ok: false, available: true, reason: (err as Error)?.message ?? 'cancelled' };
  }
}

/* -------------------------------------------------------------------------- */
/* Share sheet                                                                 */
/* -------------------------------------------------------------------------- */

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export async function nativeShare(opts: ShareOptions): Promise<{ ok: boolean; reason?: string }> {
  if (await isNative()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await tryImport<any>('@capacitor/share');
    if (mod?.Share) {
      try {
        await mod.Share.share(opts);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: (err as Error)?.message };
      }
    }
  }
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error)?.message };
    }
  }
  // Last-resort: copy URL
  if (opts.url && navigator.clipboard) {
    await navigator.clipboard.writeText(opts.url);
    return { ok: true, reason: 'copied-to-clipboard' };
  }
  return { ok: false, reason: 'unsupported' };
}

/* -------------------------------------------------------------------------- */
/* Camera (review uploads)                                                     */
/* -------------------------------------------------------------------------- */

export interface CapturedPhoto {
  /** base64 dataURL or http(s) URL the caller can upload to storage. */
  dataUrl: string;
  format: string;
  width?: number;
  height?: number;
}

export type PhotoSource = 'camera' | 'gallery' | 'prompt';

export async function capturePhoto(source: PhotoSource = 'prompt'): Promise<CapturedPhoto | null> {
  if (await isNative()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await tryImport<any>('@capacitor/camera');
    const Camera = mod?.Camera;
    const CameraSource = mod?.CameraSource ?? { Camera: 'CAMERA', Photos: 'PHOTOS', Prompt: 'PROMPT' };
    const CameraResultType = mod?.CameraResultType ?? { DataUrl: 'dataUrl' };
    if (Camera) {
      try {
        const perm = await Camera.checkPermissions?.();
        if (perm && perm.camera !== 'granted' && perm.photos !== 'granted') {
          await Camera.requestPermissions?.({ permissions: ['camera', 'photos'] });
        }
        const photo = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source:
            source === 'camera' ? CameraSource.Camera :
            source === 'gallery' ? CameraSource.Photos :
            CameraSource.Prompt,
        });
        return { dataUrl: photo.dataUrl, format: photo.format ?? 'jpeg' };
      } catch {
        return null;
      }
    }
  }
  // Web fallback: open <input type="file">
  return await pickWebFile(source !== 'gallery');
}

function pickWebFile(allowCapture: boolean): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (allowCapture) input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: String(reader.result ?? ''), format: file.type.split('/')[1] || 'jpeg' });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
