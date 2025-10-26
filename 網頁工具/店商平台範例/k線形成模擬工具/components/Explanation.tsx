import React from 'react';
import type { CandleData } from '../types';
import { useTranslation } from '../i18n';

interface ExplanationProps {
  prices: CandleData;
}

const BullishIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-bullish mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);

const BearishIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-bearish mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
    </svg>
);

const NeutralIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-neutral mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
    </svg>
);


export const Explanation: React.FC<ExplanationProps> = ({ prices }) => {
  const { t } = useTranslation();
  const { open, close } = prices;

  let title = '';
  let description = '';
  let icon = <NeutralIcon />;
  let titleColor = 'text-neutral';

  if (close > open) {
    title = t('explanation.bullishTitle');
    description = t('explanation.bullishDescription');
    icon = <BullishIcon />;
    titleColor = 'text-bullish';
  } else if (close < open) {
    title = t('explanation.bearishTitle');
    description = t('explanation.bearishDescription');
    icon = <BearishIcon />;
    titleColor = 'text-bearish';
  } else {
    title = t('explanation.dojiTitle');
    description = t('explanation.dojiDescription');
    icon = <NeutralIcon />;
    titleColor = 'text-neutral';
  }

  return (
    <div className="bg-light-bg p-6 rounded-lg shadow-xl border border-light-border">
      <div className="flex items-center">
        {icon}
        <h2 className={`text-2xl font-semibold ${titleColor}`}>{title}</h2>
      </div>
      <p className="mt-3 text-secondary-text">{description}</p>
      
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="bg-dark-bg p-2 rounded">
          <p className="text-sm text-secondary-text">{t('explanation.open')}</p>
          <p className="font-bold text-lg">{prices.open.toFixed(2)}</p>
        </div>
        <div className="bg-dark-bg p-2 rounded">
          <p className="text-sm text-secondary-text">{t('explanation.high')}</p>
          <p className="font-bold text-lg text-bullish">{prices.high.toFixed(2)}</p>
        </div>
        <div className="bg-dark-bg p-2 rounded">
          <p className="text-sm text-secondary-text">{t('explanation.low')}</p>
          <p className="font-bold text-lg text-bearish">{prices.low.toFixed(2)}</p>
        </div>
        <div className="bg-dark-bg p-2 rounded">
          <p className="text-sm text-secondary-text">{t('explanation.close')}</p>
          <p className="font-bold text-lg">{prices.close.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};