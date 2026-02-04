/**
 * Analytics tracking for TimeLock Exchange
 * Privacy-respecting analytics implementation
 */

import { config } from './config';

// Event types
export type AnalyticsEvent = 
  | { name: 'page_view'; params: { path: string; title?: string } }
  | { name: 'wallet_connect'; params: { provider: string } }
  | { name: 'wallet_disconnect'; params: Record<string, never> }
  | { name: 'position_create_start'; params: { amount: number; duration: number } }
  | { name: 'position_create_success'; params: { amount: number; duration: number; txId: string } }
  | { name: 'position_create_error'; params: { error: string } }
  | { name: 'position_unlock_start'; params: { positionId: number } }
  | { name: 'position_unlock_success'; params: { positionId: number; txId: string } }
  | { name: 'position_early_withdraw'; params: { positionId: number; penalty: number } }
  | { name: 'passkey_register_start'; params: { deviceName: string } }
  | { name: 'passkey_register_success'; params: { deviceName: string } }
  | { name: 'passkey_revoke'; params: { passkeyId: number } }
  | { name: 'fee_tier_view'; params: { tier: string } }
  | { name: 'error_displayed'; params: { code: string; message: string } }
  | { name: 'contract_interaction'; params: { method: string; contract: string } };

// Analytics provider interface
interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page(name: string, properties?: Record<string, unknown>): void;
}

// Console analytics (for development)
class ConsoleAnalytics implements AnalyticsProvider {
  track(event: AnalyticsEvent): void {
    if (config.isDevelopment) {
      console.log('[Analytics]', event.name, event.params);
    }
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (config.isDevelopment) {
      console.log('[Analytics] Identify:', userId, traits);
    }
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (config.isDevelopment) {
      console.log('[Analytics] Page:', name, properties);
    }
  }
}

// Privacy-respecting analytics that doesn't send PII
class PrivateAnalytics implements AnalyticsProvider {
  private queue: AnalyticsEvent[] = [];
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || '/api/analytics';
  }

  private sanitize(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...params };
    
    // Remove potential PII
    delete sanitized.address;
    delete sanitized.email;
    delete sanitized.name;
    
    // Truncate transaction IDs
    if (typeof sanitized.txId === 'string') {
      sanitized.txId = sanitized.txId.slice(0, 10) + '...';
    }

    return sanitized;
  }

  track(event: AnalyticsEvent): void {
    const sanitizedEvent = {
      ...event,
      params: this.sanitize(event.params as Record<string, unknown>),
      timestamp: Date.now(),
      network: config.network,
    };

    this.queue.push(event);
    this.flush();
  }

  identify(userId: string, _traits?: Record<string, unknown>): void {
    // Hash the user ID for privacy
    const hashedId = this.hashString(userId);
    if (config.isDevelopment) {
      console.log('[Analytics] User:', hashedId);
    }
  }

  page(name: string, properties?: Record<string, unknown>): void {
    this.track({
      name: 'page_view',
      params: { path: name, ...properties },
    } as AnalyticsEvent);
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch {
      // Re-queue on failure
      this.queue = [...events, ...this.queue];
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// Analytics singleton
let analyticsInstance: AnalyticsProvider;

export function getAnalytics(): AnalyticsProvider {
  if (!analyticsInstance) {
    analyticsInstance = config.isDevelopment 
      ? new ConsoleAnalytics()
      : new PrivateAnalytics();
  }
  return analyticsInstance;
}

// Convenience functions
export function trackEvent(event: AnalyticsEvent): void {
  getAnalytics().track(event);
}

export function trackPageView(path: string, title?: string): void {
  trackEvent({ name: 'page_view', params: { path, title } });
}

export function trackWalletConnect(provider: string): void {
  trackEvent({ name: 'wallet_connect', params: { provider } });
}

export function trackPositionCreate(amount: number, duration: number, txId?: string, error?: string): void {
  if (txId) {
    trackEvent({ name: 'position_create_success', params: { amount, duration, txId } });
  } else if (error) {
    trackEvent({ name: 'position_create_error', params: { error } });
  } else {
    trackEvent({ name: 'position_create_start', params: { amount, duration } });
  }
}

export function trackPositionUnlock(positionId: number, txId?: string): void {
  if (txId) {
    trackEvent({ name: 'position_unlock_success', params: { positionId, txId } });
  } else {
    trackEvent({ name: 'position_unlock_start', params: { positionId } });
  }
}

export function trackPasskeyRegister(deviceName: string, success = false): void {
  trackEvent({
    name: success ? 'passkey_register_success' : 'passkey_register_start',
    params: { deviceName },
  });
}

export function trackError(code: string, message: string): void {
  trackEvent({ name: 'error_displayed', params: { code, message } });
}

export function trackContractInteraction(method: string, contract: string): void {
  trackEvent({ name: 'contract_interaction', params: { method, contract } });
}

// React hook for analytics
export function useAnalytics() {
  return {
    trackEvent,
    trackPageView,
    trackWalletConnect,
    trackPositionCreate,
    trackPositionUnlock,
    trackPasskeyRegister,
    trackError,
    trackContractInteraction,
  };
}

export default getAnalytics;
