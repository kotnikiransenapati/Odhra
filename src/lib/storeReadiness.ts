/**
 * Batch J4 — Store-readiness manifests & policy payloads.
 *
 * Generates the static documents needed for App Store / Play Store submission
 * plus runtime helpers for in-app review prompting and App Tracking
 * Transparency (ATT) on iOS. Everything is web-safe; native plugins are loaded
 * via the dynamic-import facade in `nativePlugins.ts`.
 */

/* -------------------------------------------------------------------------- */
/* iOS 17+ Privacy Manifest (PrivacyInfo.xcprivacy)                            */
/* -------------------------------------------------------------------------- */

export interface PrivacyManifest {
  NSPrivacyTracking: boolean;
  NSPrivacyTrackingDomains: string[];
  NSPrivacyCollectedDataTypes: Array<{
    NSPrivacyCollectedDataType: string;
    NSPrivacyCollectedDataTypeLinked: boolean;
    NSPrivacyCollectedDataTypeTracking: boolean;
    NSPrivacyCollectedDataTypePurposes: string[];
  }>;
  NSPrivacyAccessedAPITypes: Array<{
    NSPrivacyAccessedAPIType: string;
    NSPrivacyAccessedAPITypeReasons: string[];
  }>;
}

export const iosPrivacyManifest: PrivacyManifest = {
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyCollectedDataTypes: [
    {
      NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
      NSPrivacyCollectedDataTypeLinked: true,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: [
        'NSPrivacyCollectedDataTypePurposeAppFunctionality',
        'NSPrivacyCollectedDataTypePurposeCustomerSupport',
      ],
    },
    {
      NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhoneNumber',
      NSPrivacyCollectedDataTypeLinked: true,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
    },
    {
      NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhysicalAddress',
      NSPrivacyCollectedDataTypeLinked: true,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
    },
    {
      NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory',
      NSPrivacyCollectedDataTypeLinked: true,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: [
        'NSPrivacyCollectedDataTypePurposeAppFunctionality',
        'NSPrivacyCollectedDataTypePurposeAnalytics',
      ],
    },
    {
      NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction',
      NSPrivacyCollectedDataTypeLinked: false,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: [
        'NSPrivacyCollectedDataTypePurposeAnalytics',
        'NSPrivacyCollectedDataTypePurposeAppFunctionality',
      ],
    },
    {
      NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData',
      NSPrivacyCollectedDataTypeLinked: false,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
    },
  ],
  NSPrivacyAccessedAPITypes: [
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
      NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
      NSPrivacyAccessedAPITypeReasons: ['C617.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
      NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
      NSPrivacyAccessedAPITypeReasons: ['E174.1'],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Google Play Data Safety form (machine-readable mirror)                      */
/* -------------------------------------------------------------------------- */

export interface PlayDataSafetyEntry {
  category: string;
  type: string;
  collected: boolean;
  shared: boolean;
  ephemeral: boolean;
  required: boolean;
  purposes: Array<'app_functionality' | 'analytics' | 'account_management' | 'fraud_prevention' | 'personalization' | 'advertising'>;
}

export const playDataSafety: PlayDataSafetyEntry[] = [
  { category: 'Personal info', type: 'Name',          collected: true, shared: false, ephemeral: false, required: true,  purposes: ['app_functionality', 'account_management'] },
  { category: 'Personal info', type: 'Email address', collected: true, shared: false, ephemeral: false, required: true,  purposes: ['app_functionality', 'account_management'] },
  { category: 'Personal info', type: 'Phone number',  collected: true, shared: false, ephemeral: false, required: true,  purposes: ['app_functionality'] },
  { category: 'Personal info', type: 'Address',       collected: true, shared: true,  ephemeral: false, required: true,  purposes: ['app_functionality'] },
  { category: 'Financial info', type: 'Purchase history', collected: true, shared: false, ephemeral: false, required: true, purposes: ['app_functionality', 'analytics'] },
  { category: 'App activity',  type: 'App interactions', collected: true, shared: false, ephemeral: false, required: false, purposes: ['analytics', 'personalization'] },
  { category: 'App activity',  type: 'In-app search history', collected: true, shared: false, ephemeral: true, required: false, purposes: ['analytics', 'personalization'] },
  { category: 'Device or other IDs', type: 'Device or other IDs', collected: true, shared: false, ephemeral: false, required: false, purposes: ['analytics', 'fraud_prevention'] },
  { category: 'App info and performance', type: 'Crash logs', collected: true, shared: false, ephemeral: false, required: false, purposes: ['app_functionality'] },
];

export const playSecurityPractices = {
  dataEncryptedInTransit: true,
  userCanRequestDataDeletion: true,
  followsFamilyPolicy: false,
  independentSecurityReview: false,
};

/* -------------------------------------------------------------------------- */
/* App Tracking Transparency (iOS)                                             */
/* -------------------------------------------------------------------------- */

export const attCopy = {
  purposeString:
    'We use this to measure ad performance and personalize product recommendations. You can change this any time in Settings.',
};

export async function requestAppTrackingTransparency(): Promise<'authorized' | 'denied' | 'restricted' | 'notDetermined' | 'unsupported'> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const core: any = await import(/* @vite-ignore */ '@capacitor/core').catch(() => null);
    if (!core?.Capacitor?.isNativePlatform?.() || core.Capacitor.getPlatform() !== 'ios') return 'unsupported';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const att: any = await import(/* @vite-ignore */ '@capacitor-community/app-tracking-transparency').catch(() => null);
    const plugin = att?.AppTrackingTransparency ?? att?.AppTrackingStatus;
    if (!plugin) return 'unsupported';
    const res = await plugin.requestPermission();
    return (res?.status ?? 'notDetermined') as 'authorized' | 'denied' | 'restricted' | 'notDetermined';
  } catch {
    return 'unsupported';
  }
}

/* -------------------------------------------------------------------------- */
/* In-app review prompting                                                     */
/* -------------------------------------------------------------------------- */

const REVIEW_KEY = 'odhra.review.prompt.v1';

interface ReviewState {
  promptedAt?: number;
  declinedCount: number;
  lastEligibleAt?: number;
}

function readState(): ReviewState {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}') as ReviewState;
  } catch {
    return { declinedCount: 0 };
  }
}

function writeState(s: ReviewState) {
  try { localStorage.setItem(REVIEW_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

/**
 * Decide whether to ask the user for a review. Rate-limited to once every
 * 60 days and capped at three lifetime prompts (Apple's StoreKit hard limit).
 */
export function shouldPromptForReview(): boolean {
  const s = readState();
  if ((s.declinedCount ?? 0) >= 3) return false;
  if (s.promptedAt && Date.now() - s.promptedAt < 1000 * 60 * 60 * 24 * 60) return false;
  return true;
}

export async function maybePromptForReview(): Promise<boolean> {
  if (!shouldPromptForReview()) return false;
  const s = readState();
  s.promptedAt = Date.now();
  s.declinedCount = (s.declinedCount ?? 0) + 1;
  writeState(s);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* @vite-ignore */ '@capacitor-community/in-app-review').catch(() => null);
    const plugin = mod?.InAppReview ?? mod?.default;
    if (plugin?.requestReview) {
      await plugin.requestReview();
      return true;
    }
  } catch { /* fall through */ }
  return false;
}

/* -------------------------------------------------------------------------- */
/* Store listing copy (single source of truth for screenshots/text)            */
/* -------------------------------------------------------------------------- */

export const storeListing = {
  appName: 'Odhra — Handcrafted Sarees',
  shortDescription: 'Discover handcrafted sarees, suits & dupattas. Free shipping over ₹1000.',
  fullDescription: [
    'Odhra brings you authentic handcrafted Indian wear sourced directly from weavers and small studios.',
    '',
    'WHY ODHRA',
    '• Curated catalogue of sarees, suits, dupattas and ethnic accessories',
    '• Verified buyer reviews with photos & videos',
    '• Free delivery on orders above ₹1000, COD available across India',
    '• 7-day easy returns with reverse pickup',
    '• Earn loyalty points on every purchase',
    '',
    'SHOP YOUR WAY',
    '• Search with typo-tolerance & voice',
    '• Save styles for later & track price drops',
    '• Live order tracking with delivery OTP',
    '',
    'Made in India. Crafted with love.',
  ].join('\n'),
  keywords: ['saree', 'ethnic wear', 'indian fashion', 'handcrafted', 'lehenga', 'kurti', 'dupatta'],
  primaryCategory: 'Shopping',
  contentRating: '4+',
  screenshots: [
    { id: 'home',     copy: 'Discover handcrafted styles' },
    { id: 'pdp',      copy: 'Every saree tells a story' },
    { id: 'cart',     copy: 'Secure checkout in seconds' },
    { id: 'tracking', copy: 'Track your order live' },
    { id: 'rewards',  copy: 'Earn rewards on every order' },
  ],
};
