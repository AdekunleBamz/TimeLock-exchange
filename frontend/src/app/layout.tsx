import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { WalletProvider } from '@/lib/wallet-context';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TimeLock Exchange',
  description: 'Decentralized time-locked positions with passkey security on Stacks',
  keywords: ['stacks', 'blockchain', 'defi', 'timelock', 'nft', 'clarity'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
