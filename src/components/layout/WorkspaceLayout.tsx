import React, { useState } from 'react';
import { PromptInputArea } from '@/components/PromptInputArea';
import { TradingViewChart } from '@/components/TradingViewChart';
import { SymbolDisplay } from '@/components/SymbolDisplay';

export const WorkspaceLayout = () => {
  const [symbol, setSymbol] = useState<string>('AAPL'); // Default symbol
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePromptSubmit = (prompt: string) => {
    // Basic parsing logic: try to find a common stock/crypto symbol
    const upperPrompt = prompt.toUpperCase();
    const potentialSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'BTCUSD', 'ETHUSD'];
    let foundSymbol: string | null = null;

    for (const s of potentialSymbols) {
      if (upperPrompt.includes(s)) {
        foundSymbol = s;
        break;
      }
    }

    if (foundSymbol) {
      setSymbol(foundSymbol);
      setErrorMessage(null);
    } else {
      setErrorMessage('Could not find a valid trading symbol in your prompt. Displaying default (AAPL).');
      setSymbol('AAPL'); // Fallback to default
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 min-h-[calc(100vh-64px)]">
      <div className="md:col-span-1 p-6 bg-card rounded-xl shadow-lg border border-border flex flex-col space-y-4">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Prompt Engine</h2>
        <PromptInputArea onSubmit={handlePromptSubmit} />
        {errorMessage && (
          <div className="bg-destructive/20 text-destructive-foreground p-3 rounded-md text-sm">
            {errorMessage}
          </div>
        )}
        <div className="mt-auto">
          <SymbolDisplay symbol={symbol} />
        </div>
      </div>
      <div className="md:col-span-2 lg:col-span-3 p-2 bg-card rounded-xl shadow-lg border border-border flex items-center justify-center relative">
        {/* TradingView Chart will be embedded here */}
        <TradingViewChart symbol={symbol} />
      </div>
    </div>
  );
};