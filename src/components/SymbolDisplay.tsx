import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SymbolDisplayProps {
  symbol: string;
}

export const SymbolDisplay = ({ symbol }: SymbolDisplayProps) => {
  return (
    <Card className="bg-card border-border shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Current Symbol</CardTitle>
        <Badge className="bg-accent text-accent-foreground hover:bg-accent/80">Live</Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{symbol}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Showing real-time data for {symbol}
        </p>
      </CardContent>
    </Card>
  );
};