'use client';

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ============================================================================
// Types
// ============================================================================

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector for the target element
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  disableInteraction?: boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

interface Tour {
  id: string;
  name: string;
  steps: TourStep[];
  version: number;
}

interface TourState {
  activeTour: Tour | null;
  currentStepIndex: number;
  isActive: boolean;
  completedTours: string[];
  skippedTours: string[];
}

interface TourContextValue extends TourState {
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  endTour: () => void;
  goToStep: (index: number) => void;
  resetTour: (tourId: string) => void;
  resetAllTours: () => void;
  hasCompletedTour: (tourId: string) => boolean;
  tours: Tour[];
}

// ============================================================================
// Tours Configuration
// ============================================================================

const TOURS: Tour[] = [
  {
    id: 'welcome',
    name: 'Welcome to TimeLock Exchange',
    version: 1,
    steps: [
      {
        id: 'welcome-intro',
        title: 'Welcome to TimeLock Exchange! 🎉',
        content: 'TimeLock Exchange allows you to create time-locked token positions with customizable unlock schedules. Let\'s take a quick tour to get you started!',
        target: '[data-tour="app-header"]',
        placement: 'bottom',
      },
      {
        id: 'connect-wallet',
        title: 'Connect Your Wallet',
        content: 'First, connect your Stacks wallet to interact with the exchange. Click the "Connect Wallet" button to get started.',
        target: '[data-tour="connect-wallet"]',
        placement: 'bottom',
        spotlightPadding: 8,
      },
      {
        id: 'view-positions',
        title: 'Your Positions',
        content: 'Once connected, you\'ll see all your time-locked positions here. Each position shows the token amount, unlock schedule, and current status.',
        target: '[data-tour="positions-list"]',
        placement: 'top',
      },
      {
        id: 'create-position',
        title: 'Create a Position',
        content: 'Click the "Create Position" button to lock tokens with a custom unlock schedule. You can choose single unlock or vesting schedules.',
        target: '[data-tour="create-position"]',
        placement: 'left',
        spotlightPadding: 8,
      },
      {
        id: 'portfolio-stats',
        title: 'Portfolio Overview',
        content: 'Track your portfolio performance, total value locked, and projected earnings in the analytics dashboard.',
        target: '[data-tour="portfolio-stats"]',
        placement: 'bottom',
      },
      {
        id: 'tour-complete',
        title: 'You\'re All Set! ✨',
        content: 'That\'s the basics! Explore the platform to discover more features like batch operations, governance voting, and staking rewards. Happy locking!',
        target: '[data-tour="app-header"]',
        placement: 'center',
      },
    ],
  },
  {
    id: 'create-position',
    name: 'Creating Your First Position',
    version: 1,
    steps: [
      {
        id: 'position-form',
        title: 'Position Creation Form',
        content: 'This form lets you configure your time-locked position. Let\'s go through each field.',
        target: '[data-tour="position-form"]',
        placement: 'right',
      },
      {
        id: 'token-amount',
        title: 'Token Amount',
        content: 'Enter the amount of STX tokens you want to lock. Make sure you have enough balance in your wallet.',
        target: '[data-tour="token-amount"]',
        placement: 'bottom',
      },
      {
        id: 'unlock-type',
        title: 'Unlock Type',
        content: 'Choose between single unlock (all at once) or vesting (gradual release over time).',
        target: '[data-tour="unlock-type"]',
        placement: 'bottom',
      },
      {
        id: 'unlock-schedule',
        title: 'Unlock Schedule',
        content: 'Set when your tokens will be available for withdrawal. For vesting, define the cliff period and vesting duration.',
        target: '[data-tour="unlock-schedule"]',
        placement: 'bottom',
      },
      {
        id: 'beneficiary',
        title: 'Beneficiary (Optional)',
        content: 'Optionally set a different address to receive the unlocked tokens. Leave empty to use your own address.',
        target: '[data-tour="beneficiary"]',
        placement: 'bottom',
      },
      {
        id: 'review-create',
        title: 'Review and Create',
        content: 'Review the summary and click "Create Position" to submit the transaction. You\'ll need to confirm in your wallet.',
        target: '[data-tour="create-button"]',
        placement: 'top',
      },
    ],
  },
  {
    id: 'governance',
    name: 'Governance Participation',
    version: 1,
    steps: [
      {
        id: 'gov-intro',
        title: 'Governance Overview',
        content: 'TimeLock Exchange uses decentralized governance. Stakers can vote on proposals to shape the protocol\'s future.',
        target: '[data-tour="governance-section"]',
        placement: 'bottom',
      },
      {
        id: 'active-proposals',
        title: 'Active Proposals',
        content: 'View and vote on active proposals here. Each proposal includes a description, voting period, and current results.',
        target: '[data-tour="proposals-list"]',
        placement: 'top',
      },
      {
        id: 'voting-power',
        title: 'Your Voting Power',
        content: 'Your voting power is based on your staked tokens. More staked tokens = more voting influence.',
        target: '[data-tour="voting-power"]',
        placement: 'left',
      },
      {
        id: 'cast-vote',
        title: 'Cast Your Vote',
        content: 'Click on a proposal to read the details, then vote For, Against, or Abstain.',
        target: '[data-tour="vote-buttons"]',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'staking',
    name: 'Staking Rewards',
    version: 1,
    steps: [
      {
        id: 'staking-intro',
        title: 'Earn Staking Rewards',
        content: 'Stake your STX tokens to earn rewards and gain voting power in governance.',
        target: '[data-tour="staking-section"]',
        placement: 'bottom',
      },
      {
        id: 'staking-tiers',
        title: 'Staking Tiers',
        content: 'Higher tiers unlock better rewards! Progress from Bronze to Diamond by staking more tokens.',
        target: '[data-tour="staking-tiers"]',
        placement: 'top',
      },
      {
        id: 'stake-tokens',
        title: 'Stake Tokens',
        content: 'Enter the amount to stake and confirm the transaction. Your rewards start accruing immediately.',
        target: '[data-tour="stake-form"]',
        placement: 'right',
      },
      {
        id: 'claim-rewards',
        title: 'Claim Rewards',
        content: 'Claim your accumulated rewards at any time. Rewards are calculated based on your staked amount and tier.',
        target: '[data-tour="claim-rewards"]',
        placement: 'left',
      },
    ],
  },
];

// ============================================================================
// Context
// ============================================================================

const TourContext = createContext<TourContextValue | null>(null);

export const useTour = (): TourContextValue => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

// ============================================================================
// Tour Provider
// ============================================================================

interface TourProviderProps {
  children: React.ReactNode;
  autoStartTour?: string;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children, autoStartTour }) => {
  const [completedTours, setCompletedTours] = useLocalStorage<string[]>('timelock-completed-tours', []);
  const [skippedTours, setSkippedTours] = useLocalStorage<string[]>('timelock-skipped-tours', []);
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Auto-start welcome tour for new users
  useEffect(() => {
    if (autoStartTour && !completedTours.includes(autoStartTour) && !skippedTours.includes(autoStartTour)) {
      const timer = setTimeout(() => {
        startTour(autoStartTour);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStartTour, completedTours, skippedTours]);

  const startTour = useCallback((tourId: string) => {
    const tour = TOURS.find((t) => t.id === tourId);
    if (tour) {
      setActiveTour(tour);
      setCurrentStepIndex(0);
      setIsActive(true);
      tour.steps[0]?.onEnter?.();
    }
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTour) return;

    const currentStep = activeTour.steps[currentStepIndex];
    currentStep?.onExit?.();

    if (currentStepIndex < activeTour.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      activeTour.steps[nextIndex]?.onEnter?.();
    } else {
      // Tour completed
      setCompletedTours((prev) => [...prev.filter((id) => id !== activeTour.id), activeTour.id]);
      setActiveTour(null);
      setCurrentStepIndex(0);
      setIsActive(false);
    }
  }, [activeTour, currentStepIndex, setCompletedTours]);

  const prevStep = useCallback(() => {
    if (!activeTour || currentStepIndex === 0) return;

    const currentStep = activeTour.steps[currentStepIndex];
    currentStep?.onExit?.();

    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    activeTour.steps[prevIndex]?.onEnter?.();
  }, [activeTour, currentStepIndex]);

  const skipTour = useCallback(() => {
    if (!activeTour) return;

    const currentStep = activeTour.steps[currentStepIndex];
    currentStep?.onExit?.();

    setSkippedTours((prev) => [...prev.filter((id) => id !== activeTour.id), activeTour.id]);
    setActiveTour(null);
    setCurrentStepIndex(0);
    setIsActive(false);
  }, [activeTour, currentStepIndex, setSkippedTours]);

  const endTour = useCallback(() => {
    if (!activeTour) return;

    const currentStep = activeTour.steps[currentStepIndex];
    currentStep?.onExit?.();

    setActiveTour(null);
    setCurrentStepIndex(0);
    setIsActive(false);
  }, [activeTour, currentStepIndex]);

  const goToStep = useCallback(
    (index: number) => {
      if (!activeTour || index < 0 || index >= activeTour.steps.length) return;

      const currentStep = activeTour.steps[currentStepIndex];
      currentStep?.onExit?.();

      setCurrentStepIndex(index);
      activeTour.steps[index]?.onEnter?.();
    },
    [activeTour, currentStepIndex]
  );

  const resetTour = useCallback(
    (tourId: string) => {
      setCompletedTours((prev) => prev.filter((id) => id !== tourId));
      setSkippedTours((prev) => prev.filter((id) => id !== tourId));
    },
    [setCompletedTours, setSkippedTours]
  );

  const resetAllTours = useCallback(() => {
    setCompletedTours([]);
    setSkippedTours([]);
  }, [setCompletedTours, setSkippedTours]);

  const hasCompletedTour = useCallback(
    (tourId: string) => completedTours.includes(tourId),
    [completedTours]
  );

  const value: TourContextValue = {
    activeTour,
    currentStepIndex,
    isActive,
    completedTours,
    skippedTours,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    endTour,
    goToStep,
    resetTour,
    resetAllTours,
    hasCompletedTour,
    tours: TOURS,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {isActive && activeTour && <TourOverlay />}
    </TourContext.Provider>
  );
};

// ============================================================================
// Tour Overlay Component
// ============================================================================

const TourOverlay: React.FC = () => {
  const { activeTour, currentStepIndex, nextStep, prevStep, skipTour } = useTour();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const currentStep = activeTour?.steps[currentStepIndex];
  const totalSteps = activeTour?.steps.length || 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

  // Find and track target element
  useEffect(() => {
    if (!currentStep) return;

    const findTarget = () => {
      if (currentStep.placement === 'center') {
        setTargetRect(null);
        return;
      }

      const target = document.querySelector(currentStep.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);

        // Scroll into view if needed
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    };

    findTarget();

    // Re-calculate on resize
    window.addEventListener('resize', findTarget);
    window.addEventListener('scroll', findTarget);

    return () => {
      window.removeEventListener('resize', findTarget);
      window.removeEventListener('scroll', findTarget);
    };
  }, [currentStep]);

  // Calculate tooltip position
  useEffect(() => {
    if (!currentStep || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = currentStep.spotlightPadding || 16;
    const gap = 12;

    let top = 0;
    let left = 0;

    if (currentStep.placement === 'center' || !targetRect) {
      // Center in viewport
      top = (window.innerHeight - tooltipRect.height) / 2;
      left = (window.innerWidth - tooltipRect.width) / 2;
    } else {
      switch (currentStep.placement) {
        case 'top':
          top = targetRect.top - tooltipRect.height - gap - padding;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + gap + padding;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.left - tooltipRect.width - gap - padding;
          break;
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.right + gap + padding;
          break;
      }

      // Keep within viewport bounds
      const margin = 16;
      if (left < margin) left = margin;
      if (left + tooltipRect.width > window.innerWidth - margin) {
        left = window.innerWidth - tooltipRect.width - margin;
      }
      if (top < margin) top = margin;
      if (top + tooltipRect.height > window.innerHeight - margin) {
        top = window.innerHeight - tooltipRect.height - margin;
      }
    }

    setTooltipPosition({ top, left });
  }, [currentStep, targetRect]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skipTour, nextStep, prevStep, isFirstStep]);

  if (!currentStep) return null;

  const padding = currentStep.spotlightPadding || 16;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && currentStep.placement !== 'center' && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border */}
      {targetRect && currentStep.placement !== 'center' && (
        <div
          className="absolute border-2 border-indigo-500 rounded-lg pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.3)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-10 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md transition-all duration-300 ease-out"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentStepIndex
                    ? 'w-6 bg-indigo-600'
                    : idx < currentStepIndex
                    ? 'w-1.5 bg-indigo-400'
                    : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentStepIndex + 1} / {totalSteps}
          </span>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {currentStep.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
          {currentStep.content}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={skipTour}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Skip tour
          </button>

          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">→</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd> for next,{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">←</kbd> for back,{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd> to exit
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Tour Trigger Component
// ============================================================================

interface TourTriggerProps {
  tourId: string;
  children?: React.ReactNode;
  className?: string;
}

export const TourTrigger: React.FC<TourTriggerProps> = ({ tourId, children, className }) => {
  const { startTour, hasCompletedTour } = useTour();
  const tour = TOURS.find((t) => t.id === tourId);
  const completed = hasCompletedTour(tourId);

  if (!tour) return null;

  return (
    <button
      onClick={() => startTour(tourId)}
      className={className || 'inline-flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors'}
    >
      {children || (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
            />
          </svg>
          <span>{completed ? 'Replay' : 'Start'} {tour.name}</span>
        </>
      )}
    </button>
  );
};

// ============================================================================
// Help Menu Component
// ============================================================================

interface HelpMenuProps {
  className?: string;
}

export const HelpMenu: React.FC<HelpMenuProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { tours, startTour, hasCompletedTour, resetAllTours } = useTour();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        title="Help & Tours"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Help & Tours</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Interactive guides to help you get started
            </p>
          </div>

          <div className="py-2">
            {tours.map((tour) => {
              const completed = hasCompletedTour(tour.id);
              return (
                <button
                  key={tour.id}
                  onClick={() => {
                    startTour(tour.id);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-200">{tour.name}</span>
                    {completed && (
                      <span className="text-xs text-green-600 dark:text-green-400">✓ Completed</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {tour.steps.length} steps
                  </p>
                </button>
              );
            })}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 px-4 pb-2">
            <button
              onClick={() => {
                resetAllTours();
                setIsOpen(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Reset all tours
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourProvider;
