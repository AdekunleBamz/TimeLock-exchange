'use client';

import React, { useState, useEffect } from 'react';
import { TimeFiClient, formatSTX } from '@timefi/sdk';
import { ACTIVE_NETWORK } from '@/lib/constants';

export function TimeFiStats() {
    const [tvl, setTvl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTVL = async () => {
            try {
                setLoading(true);
                // Initialize client with the same network as the exchange
                const client = new TimeFiClient(ACTIVE_NETWORK === 'mainnet' ? 'mainnet' : 'testnet');
                const result = await client.getTVL();

                // result.value contains the microSTX amount from the contract
                if (result && result.value) {
                    setTvl(formatSTX(result.value));
                } else {
                    setTvl('0');
                }
            } catch (err: any) {
                console.error('Failed to fetch TimeFi TVL:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTVL();
    }, []);

    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-indigo-100 mt-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">⏳</span>
                    TimeFi Protocol Ecosystem
                </h3>
                <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-200 uppercase tracking-wider">
                    Powered by @timefi/sdk
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-100">
                    <p className="text-sm text-indigo-600 font-medium mb-1">Total Value Locked (TVL)</p>
                    <div className="flex items-baseline gap-2">
                        {loading ? (
                            <div className="h-8 w-32 bg-indigo-200 animate-pulse rounded"></div>
                        ) : error ? (
                            <span className="text-red-500 text-sm">Error Loading</span>
                        ) : (
                            <span className="text-3xl font-bold text-indigo-900">{tvl} STX</span>
                        )}
                    </div>
                    <p className="text-xs text-indigo-400 mt-2">Live data from TimeFi smart contracts</p>
                </div>

                <div className="flex flex-col justify-center">
                    <p className="text-sm text-gray-600 italic">
                        "Your TimeLock Exchange portfolio can now view your locked assets in the TimeFi Protocol."
                    </p>
                    <div className="mt-4 flex gap-2">
                        <button className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors">
                            Deposit to TimeFi
                        </button>
                        <button className="text-xs border border-indigo-200 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md font-medium transition-colors">
                            Learn More
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
