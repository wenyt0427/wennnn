import React, { useMemo } from 'react';
import type { CandleData } from '../types';

interface CandlestickProps {
  prices: CandleData;
  minPrice: number;
  maxPrice: number;
}

export const Candlestick: React.FC<CandlestickProps> = ({ prices, minPrice, maxPrice }) => {
  const { open, high, low, close } = prices;

  const priceRange = maxPrice - minPrice;
  if (priceRange <= 0) return null;

  const isBullish = close > open;
  const isBearish = close < open;
  
  const colorClass = isBullish ? 'bg-bullish' : isBearish ? 'bg-bearish' : 'bg-neutral';
  const borderColorClass = isBullish ? 'border-bullish' : isBearish ? 'border-bearish' : 'border-neutral';

  const highPercent = ((maxPrice - high) / priceRange) * 100;
  const lowPercent = ((maxPrice - low) / priceRange) * 100;

  const bodyTop = Math.max(open, close);
  const bodyBottom = Math.min(open, close);

  const bodyTopPercent = ((maxPrice - bodyTop) / priceRange) * 100;
  const bodyHeightPercent = ((bodyTop - bodyBottom) / priceRange) * 100;
  
  const wickHeightPercent = lowPercent - highPercent;

  const yAxisTicks = useMemo(() => {
    if (priceRange <= 0) return [];
    const ticks = [];
    const tickCount = 5;
    const priceStep = (maxPrice - minPrice) / (tickCount - 1);
    for (let i = 0; i < tickCount; i++) {
        ticks.push(minPrice + (i * priceStep));
    }
    return ticks;
  }, [minPrice, maxPrice, priceRange]);
  
  const ohlcLines = useMemo(() => [
    { label: 'H', price: high, colorClass: 'border-bullish' },
    { label: 'L', price: low, colorClass: 'border-bearish' },
    { label: 'O', price: open, colorClass: 'border-neutral' },
    { label: 'C', price: close, colorClass: borderColorClass },
  ], [high, low, open, close, borderColorClass]);


  return (
    <div className="w-full h-80 relative flex items-center pt-[10px] pb-[25px] box-border pl-5">
      {/* Candlestick Chart Area */}
      <div className="flex-grow h-full relative flex justify-center">
        {/* OHLC Price Lines */}
        {ohlcLines.map(({ label, price, colorClass }) => {
            const topPercent = ((maxPrice - price) / priceRange) * 100;
            return (
                <div key={label} className="absolute left-0 right-0" style={{ top: `${topPercent}%`}}>
                    <div className={`h-px border-t border-dashed ${colorClass} transition-all duration-300 ease-in-out`} />
                    <span className={`absolute -left-5 top-0 -translate-y-1/2 text-xs font-bold ${colorClass.replace('border-','text-')}`}>
                        {label}
                    </span>
                </div>
            );
        })}

        {/* Candlestick Wick */}
        <div
          className={`absolute w-1 ${colorClass} transition-all duration-300 ease-in-out`}
          style={{
            top: `${highPercent}%`,
            height: `${wickHeightPercent}%`,
          }}
        />
        {/* Candlestick Body */}
        <div
          className={`absolute w-12 ${colorClass} transition-all duration-300 ease-in-out rounded-sm border ${borderColorClass}`}
          style={{
            top: `${bodyTopPercent}%`,
            height: `${Math.max(bodyHeightPercent, 0.5)}%`, // min height of 0.5% for doji
          }}
        />
      </div>

      {/* Y-Axis */}
      <div className="w-16 h-full relative flex-shrink-0">
          {yAxisTicks.map((price) => {
              const topPercent = ((maxPrice - price) / priceRange) * 100;
              return (
                  <div 
                      key={price} 
                      className="absolute w-full right-0 pr-2 text-right"
                      style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
                  >
                      <span className="text-xs text-secondary-text">{price.toFixed(0)}</span>
                  </div>
              )
          })}
      </div>
    </div>
  );
};