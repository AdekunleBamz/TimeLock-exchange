'use client';

import React from 'react';
import { useTheme, ThemeToggle, ColorSchemePicker, Theme, ColorScheme } from '../lib/theme-context';

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { theme, colorScheme, setTheme, setColorScheme, resolvedTheme } = useTheme();

  const themeOptions: { value: Theme; label: string; description: string; icon: string }[] = [
    { value: 'light', label: 'Light', description: 'Always use light mode', icon: '☀️' },
    { value: 'dark', label: 'Dark', description: 'Always use dark mode', icon: '🌙' },
    { value: 'system', label: 'System', description: 'Match your device settings', icon: '💻' },
  ];

  const colorOptions: { value: ColorScheme; label: string; class: string }[] = [
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Theme Section */}
        <section>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Appearance</h3>
          <div className="space-y-2">
            {themeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                  theme === option.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">{option.icon}</span>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
                </div>
                {theme === option.value && (
                  <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Color Scheme Section */}
        <section>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Accent Color</h3>
          <div className="grid grid-cols-6 gap-3">
            {colorOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setColorScheme(option.value)}
                className={`relative w-full aspect-square rounded-full ${option.class} transition-all ${
                  colorScheme === option.value
                    ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-900 scale-110'
                    : 'hover:scale-105'
                }`}
                aria-label={`Select ${option.label} color`}
                aria-pressed={colorScheme === option.value}
                title={option.label}
              >
                {colorScheme === option.value && (
                  <svg className="absolute inset-0 m-auto w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Selected: <span className="font-medium capitalize">{colorScheme}</span>
          </p>
        </section>

        {/* Preview Section */}
        <section>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Preview</h3>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold">
                TL
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">TimeLock Exchange</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your secure time-locked positions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-colors">
                Primary Button
              </button>
              <button className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Secondary
              </button>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-[var(--color-primary)] rounded-full" />
            </div>
          </div>
        </section>

        {/* Current Theme Info */}
        <section className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Current theme:</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {theme === 'system' ? `System (${resolvedTheme})` : theme}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

// Settings Modal wrapper
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="relative z-10 mx-4">
        <SettingsPanel onClose={onClose} />
      </div>
    </div>
  );
}

// Settings trigger button
interface SettingsButtonProps {
  className?: string;
}

export function SettingsButton({ className = '' }: SettingsButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${className}`}
        aria-label="Open settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default SettingsPanel;
