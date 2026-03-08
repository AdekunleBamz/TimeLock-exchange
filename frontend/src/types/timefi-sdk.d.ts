declare module 'timefi-sdk' {
    export class TimeFiClient {
        constructor(networkType?: 'mainnet' | 'testnet');
        network: any;
        contractAddress: string;
        callReadOnly(functionName: string, functionArgs?: any[], senderAddress?: string): Promise<any>;
        getVault(vaultId: number | string): Promise<any>;
        getTimeRemaining(vaultId: number | string): Promise<any>;
        canWithdraw(vaultId: number | string): Promise<any>;
        getTVL(): Promise<any>;
        getCreateVaultOptions(amountSTX: number, lockDurationBlocks: number): any;
        getWithdrawOptions(vaultId: number | string): any;
    }
    export function formatSTX(microStx: number | string): string;
    export function formatAddress(address: string, prefix?: number, suffix?: number): string;
    export function formatNumber(val: number | string): string;
    export function formatPercent(val: number | string, decimals?: number): string;
    export function formatDate(date: any): string;
    export function formatRelativeTime(date: any): string;
    export const CONTRACT_ADDRESS: string;
    export const CONTRACT_NAMES: Record<string, string>;
    export const LOCK_PERIODS: Record<string, any>;
    export const MIN_DEPOSIT: number;
    export const MAX_DEPOSIT: number;
    export const uintCV: (val: number | string) => any;
    export const principalCV: (address: string) => any;
}
