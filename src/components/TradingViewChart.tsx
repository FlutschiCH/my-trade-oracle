import React, { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol: string;
}

export const TradingViewChart = ({ symbol }: TradingViewChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      chartContainerRef.current.innerHTML = ''; // Clear existing widget
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": symbol,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "calendar": false,
      "support_host": "https://www.tradingview.com"
    });

    chartContainerRef.current?.appendChild(script);

    return () => {
      // Cleanup function to remove the script if the component unmounts
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '';
      }
    };
  }, [symbol]);

  return (
    <div className="tradingview-widget-container w-full h-full">
      <div ref={chartContainerRef} className="tradingview-widget-container__widget w-full h-full"></div>
    </div>
  );
};