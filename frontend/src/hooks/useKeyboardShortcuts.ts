// Keyboard Shortcuts Hook - Global keyboard shortcut management
import { useEffect, useCallback, useRef, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  action: () => void;
  description: string;
  category?: string;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

// Global shortcut registry
const shortcutRegistry = new Map<string, KeyboardShortcut>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function getShortcutKey(shortcut: Pick<KeyboardShortcut, 'key' | 'modifiers'>): string {
  const parts: string[] = [];
  if (shortcut.modifiers?.ctrl) parts.push('ctrl');
  if (shortcut.modifiers?.alt) parts.push('alt');
  if (shortcut.modifiers?.shift) parts.push('shift');
  if (shortcut.modifiers?.meta) parts.push('meta');
  parts.push(shortcut.key.toLowerCase());
  return parts.join('+');
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = true,
  } = options;

  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  // Register shortcuts
  useEffect(() => {
    if (!enabled) return;

    const registeredKeys: string[] = [];

    shortcuts.forEach(shortcut => {
      if (shortcut.enabled === false) return;
      const key = getShortcutKey(shortcut);
      shortcutRegistry.set(key, shortcut);
      registeredKeys.push(key);
    });

    notifyListeners();

    return () => {
      registeredKeys.forEach(key => shortcutRegistry.delete(key));
      notifyListeners();
    };
  }, [shortcuts, enabled]);

  // Handle keydown
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = getShortcutKey({
        key: event.key,
        modifiers: {
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          meta: event.metaKey,
        },
      });

      const shortcut = shortcutsRef.current.find(
        s => getShortcutKey(s) === key && s.enabled !== false
      );

      if (shortcut) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, preventDefault, stopPropagation]);
}

// Hook to get all registered shortcuts
export function useAllShortcuts(): KeyboardShortcut[] {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

  useEffect(() => {
    const updateShortcuts = () => {
      setShortcuts(Array.from(shortcutRegistry.values()));
    };

    updateShortcuts();
    listeners.add(updateShortcuts);

    return () => {
      listeners.delete(updateShortcuts);
    };
  }, []);

  return shortcuts;
}

// Format shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  if (shortcut.modifiers?.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.modifiers?.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.modifiers?.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.modifiers?.meta) parts.push(isMac ? '⌘' : 'Win');

  // Format special keys
  const keyMap: Record<string, string> = {
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    enter: '↵',
    escape: 'Esc',
    backspace: '⌫',
    delete: 'Del',
    tab: 'Tab',
    space: 'Space',
    ' ': 'Space',
  };

  const formattedKey = keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase();
  parts.push(formattedKey);

  return parts.join(isMac ? '' : '+');
}

// Default app shortcuts
export function useAppShortcuts(handlers: {
  onCreatePosition?: () => void;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  onOpenSearch?: () => void;
  onRefresh?: () => void;
  onHelp?: () => void;
  onNavigateHome?: () => void;
  onNavigatePositions?: () => void;
  onNavigateHistory?: () => void;
  onEscape?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      modifiers: { ctrl: true },
      action: handlers.onCreatePosition || (() => {}),
      description: 'Create new position',
      category: 'Actions',
      enabled: !!handlers.onCreatePosition,
    },
    {
      key: 'd',
      modifiers: { ctrl: true },
      action: handlers.onToggleTheme || (() => {}),
      description: 'Toggle dark mode',
      category: 'Appearance',
      enabled: !!handlers.onToggleTheme,
    },
    {
      key: ',',
      modifiers: { ctrl: true },
      action: handlers.onOpenSettings || (() => {}),
      description: 'Open settings',
      category: 'Navigation',
      enabled: !!handlers.onOpenSettings,
    },
    {
      key: 'k',
      modifiers: { ctrl: true },
      action: handlers.onOpenSearch || (() => {}),
      description: 'Open search',
      category: 'Navigation',
      enabled: !!handlers.onOpenSearch,
    },
    {
      key: 'r',
      modifiers: { ctrl: true },
      action: handlers.onRefresh || (() => {}),
      description: 'Refresh data',
      category: 'Actions',
      enabled: !!handlers.onRefresh,
    },
    {
      key: '?',
      modifiers: { shift: true },
      action: handlers.onHelp || (() => {}),
      description: 'Show keyboard shortcuts',
      category: 'Help',
      enabled: !!handlers.onHelp,
    },
    {
      key: 'h',
      modifiers: { alt: true },
      action: handlers.onNavigateHome || (() => {}),
      description: 'Go to home',
      category: 'Navigation',
      enabled: !!handlers.onNavigateHome,
    },
    {
      key: 'p',
      modifiers: { alt: true },
      action: handlers.onNavigatePositions || (() => {}),
      description: 'Go to positions',
      category: 'Navigation',
      enabled: !!handlers.onNavigatePositions,
    },
    {
      key: 'y',
      modifiers: { alt: true },
      action: handlers.onNavigateHistory || (() => {}),
      description: 'Go to history',
      category: 'Navigation',
      enabled: !!handlers.onNavigateHistory,
    },
    {
      key: 'Escape',
      action: handlers.onEscape || (() => {}),
      description: 'Close modal / Cancel',
      category: 'General',
      enabled: !!handlers.onEscape,
    },
  ];

  useKeyboardShortcuts(shortcuts);
}

// Shortcut indicator component helper
export function useShortcutIndicator(shortcut: Pick<KeyboardShortcut, 'key' | 'modifiers'>) {
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const matchesCtrl = !shortcut.modifiers?.ctrl || event.ctrlKey;
      const matchesAlt = !shortcut.modifiers?.alt || event.altKey;
      const matchesShift = !shortcut.modifiers?.shift || event.shiftKey;
      const matchesMeta = !shortcut.modifiers?.meta || event.metaKey;

      if (matchesKey && matchesCtrl && matchesAlt && matchesShift && matchesMeta) {
        setIsPressed(true);
      }
    };

    const handleKeyUp = () => {
      setIsPressed(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [shortcut]);

  return isPressed;
}

export default useKeyboardShortcuts;
