'use client';

import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftAddon?: string;
  rightAddon?: string;
  isLoading?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      isLoading,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);
    const isDisabled = disabled || isLoading;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              hasError ? 'text-red-600' : 'text-gray-700'
            )}
          >
            {label}
          </label>
        )}
        
        <div
          className={cn(
            'flex items-center rounded-lg border transition-all duration-200',
            isFocused && !hasError && 'ring-2 ring-blue-500 border-blue-500',
            hasError && 'border-red-500 ring-2 ring-red-200',
            !isFocused && !hasError && 'border-gray-300 hover:border-gray-400',
            isDisabled && 'bg-gray-50 cursor-not-allowed opacity-60'
          )}
        >
          {leftAddon && (
            <span className="px-3 py-2 bg-gray-50 border-r border-gray-300 text-gray-500 text-sm rounded-l-lg">
              {leftAddon}
            </span>
          )}
          
          {leftIcon && (
            <span className="pl-3 text-gray-400 flex-shrink-0">
              {leftIcon}
            </span>
          )}
          
          <input
            ref={ref}
            id={inputId}
            disabled={isDisabled}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              'flex-1 px-3 py-2 bg-transparent text-gray-900 placeholder-gray-400',
              'focus:outline-none text-sm',
              leftIcon && 'pl-2',
              rightIcon && 'pr-2',
              !leftAddon && 'rounded-l-lg',
              !rightAddon && 'rounded-r-lg',
              isDisabled && 'cursor-not-allowed',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          
          {isLoading && (
            <span className="pr-3">
              <svg
                className="animate-spin h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </span>
          )}
          
          {rightIcon && !isLoading && (
            <span className="pr-3 text-gray-400 flex-shrink-0">
              {rightIcon}
            </span>
          )}
          
          {rightAddon && (
            <span className="px-3 py-2 bg-gray-50 border-l border-gray-300 text-gray-500 text-sm rounded-r-lg">
              {rightAddon}
            </span>
          )}
        </div>
        
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea variant
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              hasError ? 'text-red-600' : 'text-gray-700'
            )}
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            'w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200',
            'text-gray-900 placeholder-gray-400 focus:outline-none',
            isFocused && !hasError && 'ring-2 ring-blue-500 border-blue-500',
            hasError && 'border-red-500 ring-2 ring-red-200',
            !isFocused && !hasError && 'border-gray-300 hover:border-gray-400',
            props.disabled && 'bg-gray-50 cursor-not-allowed opacity-60',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          {...props}
        />
        
        {error && (
          <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="mt-1.5 text-sm text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
