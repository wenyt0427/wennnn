import React, { useState, useCallback } from 'react';
import { Candlestick } from './components/Candlestick';
import { PriceChart } from './components/PriceChart';
import { Explanation } from './components/Explanation';
import type { CandleData } from './types';
import { useTranslation } from './i18n';

const INITIAL_MIN_PRICE = 50;
const INITIAL_MAX_PRICE = 150;
const INITIAL_PRICES: CandleData = {
  open: 100,
  high: 125,
  low: 75,
  close: 110,
};

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

const App: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const [prices, setPrices] = useState<CandleData>(INITIAL_PRICES);
  const [timeframe, setTimeframe] = useState('M1');
  const [priceRange, setPriceRange] = useState({ min: INITIAL_MIN_PRICE, max: INITIAL_MAX_PRICE });
  const [isChartPristine, setIsChartPristine] = useState(true);

  const [minPriceInput, setMinPriceInput] = useState(String(INITIAL_MIN_PRICE));
  const [maxPriceInput, setMaxPriceInput] = useState(String(INITIAL_MAX_PRICE));

  const handleChartUpdate = useCallback((newPrices: CandleData) => {
    if (isChartPristine) {
      setIsChartPristine(false);
    }
    setPrices(newPrices);
  }, [isChartPristine]);

  const resetCandleToRange = (min: number, max: number) => {
    const rangeSize = max - min;
    const mid = min + rangeSize / 2;
    const quarter = rangeSize / 4;
    
    const newInitialPrices: CandleData = {
      open: mid,
      high: mid + quarter * 0.5,
      low: mid - quarter * 0.5,
      close: mid + quarter * 0.2,
    };
    setPrices(newInitialPrices);
    setIsChartPristine(true);
  };

  const handleRandomizeRange = () => {
    const rangeSize = Math.floor(Math.random() * 150) + 50; // 50 to 200
    const newMin = Math.floor(Math.random() * 100);
    const newMax = newMin + rangeSize;
    
    setMinPriceInput(String(newMin));
    setMaxPriceInput(String(newMax));
    setPriceRange({ min: newMin, max: newMax });
    resetCandleToRange(newMin, newMax);
  };

  const handleApplyPriceRange = () => {
    const newMin = parseFloat(minPriceInput);
    const newMax = parseFloat(maxPriceInput);

    if (!isNaN(newMin) && !isNaN(newMax) && newMax > newMin) {
      setPriceRange({ min: newMin, max: newMax });
      resetCandleToRange(newMin, newMax);
    } else {
      setMinPriceInput(String(priceRange.min));
      setMaxPriceInput(String(priceRange.max));
    }
  };

  const handleReset = () => {
    setPriceRange({ min: INITIAL_MIN_PRICE, max: INITIAL_MAX_PRICE });
    setPrices(INITIAL_PRICES);
    setTimeframe('M1');
    setMinPriceInput(String(INITIAL_MIN_PRICE));
    setMaxPriceInput(String(INITIAL_MAX_PRICE));
    setIsChartPristine(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans relative">
       <div className="absolute top-4 right-4 z-10">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'id' | 'en' | 'zh')}
          className="bg-light-bg border border-light-border text-primary-text text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
        >
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </div>

      <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">{t('app.title')}</h1>
          <p className="text-secondary-text text-lg">{t('app.description')}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
          <div className="bg-light-bg p-6 rounded-lg shadow-xl border border-light-border sm:col-span-2">
            <h2 className="text-2xl font-semibold mb-4 border-b border-light-border pb-3">{t('app.settingsTitle')}</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
               <div className="flex items-center gap-2">
                <label htmlFor="timeframe" className="text-sm font-medium text-secondary-text whitespace-nowrap">{t('app.timeframeLabel')}</label>
                <select 
                  id="timeframe" 
                  value={timeframe} 
                  onChange={e => setTimeframe(e.target.value)}
                  className="bg-dark-bg border border-light-border text-primary-text text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
                >
                  {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                  <label htmlFor="minPrice" className="text-sm font-medium text-secondary-text whitespace-nowrap">{t('app.minPriceLabel')}</label>
                  <input type="number" id="minPrice" value={minPriceInput} onChange={e => setMinPriceInput(e.target.value)} onBlur={handleApplyPriceRange} className="bg-dark-bg border border-light-border text-primary-text text-sm rounded-lg block w-full p-2" />
                  <label htmlFor="maxPrice" className="text-sm font-medium text-secondary-text whitespace-nowrap">{t('app.maxPriceLabel')}</label>
                  <input type="number" id="maxPrice" value={maxPriceInput} onChange={e => setMaxPriceInput(e.target.value)} onBlur={handleApplyPriceRange} className="bg-dark-bg border border-light-border text-primary-text text-sm rounded-lg block w-full p-2" />
              </div>
            </div>
             <button 
                onClick={handleRandomizeRange} 
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm mb-4"
              >
                {t('app.randomizeButton')}
              </button>
            <button
              onClick={handleReset}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
            >
              {t('app.resetButton')}
            </button>
          </div>

          <div className="sm:row-start-1 sm:col-start-3">
             <Explanation prices={prices} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
          <div className="sm:col-span-2">
            <div className="bg-light-bg p-6 rounded-lg shadow-xl border border-secondary-text/50 h-full flex flex-col">
              <h2 className="text-2xl font-semibold mb-4 self-start w-full">{t('app.chartTitle')}</h2>
              <div className="flex-grow">
                <PriceChart
                  data={prices}
                  onUpdate={handleChartUpdate}
                  minPrice={priceRange.min}
                  maxPrice={priceRange.max}
                  timeframe={timeframe}
                  isPristine={isChartPristine}
                />
              </div>
            </div>
          </div>

          <div className="sm:col-start-3">
            <div className="bg-light-bg p-6 rounded-lg shadow-xl border border-secondary-text/50">
              <h2 className="text-2xl font-semibold mb-4 self-start w-full">{t('app.previewTitle')}</h2>
              <Candlestick 
                prices={prices} 
                minPrice={priceRange.min} 
                maxPrice={priceRange.max} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;