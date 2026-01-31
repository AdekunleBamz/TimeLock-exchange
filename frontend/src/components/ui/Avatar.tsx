'use client';

import { forwardRef, HTMLAttributes, ImgHTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ size = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar Image
interface AvatarImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
}

export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt, onLoadingStatusChange, className, ...props }, ref) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    const handleLoad = () => {
      setStatus('loaded');
      onLoadingStatusChange?.('loaded');
    };

    const handleError = () => {
      setStatus('error');
      onLoadingStatusChange?.('error');
    };

    if (!src || status === 'error') {
      return null;
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover',
          status === 'loading' && 'invisible',
          className
        )}
        {...props}
      />
    );
  }
);

AvatarImage.displayName = 'AvatarImage';

// Avatar Fallback (shown when image fails or is loading)
interface AvatarFallbackProps extends HTMLAttributes<HTMLSpanElement> {
  delayMs?: number;
}

export const AvatarFallback = forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ delayMs = 0, className, children, ...props }, ref) => {
    const [show, setShow] = useState(delayMs === 0);

    useState(() => {
      if (delayMs > 0) {
        const timer = setTimeout(() => setShow(true), delayMs);
        return () => clearTimeout(timer);
      }
    });

    if (!show) return null;

    return (
      <span
        ref={ref}
        className={cn(
          'flex items-center justify-center w-full h-full font-medium text-gray-600 bg-gray-200',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

AvatarFallback.displayName = 'AvatarFallback';

// Avatar Group
interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: AvatarSize;
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ max = 4, size = 'md', className, children, ...props }, ref) => {
    const avatars = Array.isArray(children) ? children : [children];
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;

    return (
      <div
        ref={ref}
        className={cn('flex -space-x-2', className)}
        {...props}
      >
        {visibleAvatars.map((child, index) => (
          <div
            key={index}
            className="relative ring-2 ring-white rounded-full"
            style={{ zIndex: visibleAvatars.length - index }}
          >
            {child}
          </div>
        ))}
        {remainingCount > 0 && (
          <Avatar
            size={size}
            className="ring-2 ring-white bg-gray-300 text-gray-600 font-medium"
          >
            +{remainingCount}
          </Avatar>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

// Wallet Avatar (generates avatar from wallet address)
interface WalletAvatarProps extends AvatarProps {
  address: string;
}

export const WalletAvatar = forwardRef<HTMLDivElement, WalletAvatarProps>(
  ({ address, size = 'md', className, ...props }, ref) => {
    // Generate a simple gradient based on the address
    const getGradient = (addr: string) => {
      const hash = addr.slice(2, 8);
      const hue1 = parseInt(hash.slice(0, 2), 16) % 360;
      const hue2 = (hue1 + 60) % 360;
      return `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 70%, 50%))`;
    };

    const getInitials = (addr: string) => {
      return addr.slice(0, 2).toUpperCase();
    };

    return (
      <Avatar
        ref={ref}
        size={size}
        className={className}
        style={{ background: getGradient(address) }}
        {...props}
      >
        <span className="text-white font-bold">{getInitials(address)}</span>
      </Avatar>
    );
  }
);

WalletAvatar.displayName = 'WalletAvatar';

// Status Avatar (avatar with online/offline indicator)
type StatusType = 'online' | 'offline' | 'away' | 'busy';

interface StatusAvatarProps extends AvatarProps {
  status?: StatusType;
}

const statusColors: Record<StatusType, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

export const StatusAvatar = forwardRef<HTMLDivElement, StatusAvatarProps>(
  ({ status, size = 'md', children, className, ...props }, ref) => {
    return (
      <div className="relative inline-flex">
        <Avatar ref={ref} size={size} className={className} {...props}>
          {children}
        </Avatar>
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
              statusColors[status],
              size === 'xs' && 'w-1.5 h-1.5',
              size === 'sm' && 'w-2 h-2',
              size === 'md' && 'w-2.5 h-2.5',
              size === 'lg' && 'w-3 h-3',
              size === 'xl' && 'w-3.5 h-3.5',
              size === '2xl' && 'w-4 h-4'
            )}
          />
        )}
      </div>
    );
  }
);

StatusAvatar.displayName = 'StatusAvatar';
