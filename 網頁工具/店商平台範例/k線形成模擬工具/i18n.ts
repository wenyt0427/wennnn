import React, { createContext, useState, useContext, ReactNode, PropsWithChildren } from 'react';

type Language = 'id' | 'en' | 'zh';
type Translations = { [key: string]: any };

const translations: Record<Language, Translations> = {
  id: {
    app: {
      title: "Simulator Lilin Candlestick",
      description: "Alat interaktif untuk memahami bagaimana satu candlestick terbentuk.",
      settingsTitle: "Pengaturan Parameter",
      timeframeLabel: "Jangka Waktu:",
      minPriceLabel: "Harga Min:",
      maxPriceLabel: "Harga Maks:",
      randomizeButton: "Buat Rentang Harga Acak",
      resetButton: "Setel Ulang",
      chartTitle: "Grafik Pergerakan Harga",
      previewTitle: "Pratinjau Langsung",
    },
    explanation: {
      bullishTitle: "Lilin Bullish",
      bullishDescription: "Harga penutupan lebih tinggi dari harga pembukaan, menandakan dominasi pembeli dan kenaikan harga selama periode ini.",
      bearishTitle: "Lilin Bearish",
      bearishDescription: "Harga penutupan lebih rendah dari harga pembukaan, menandakan dominasi penjual dan penurunan harga selama periode ini.",
      dojiTitle: "Lilin Doji",
      dojiDescription: "Harga penutupan sama dengan harga pembukaan, menandakan keseimbangan antara pembeli dan penjual, pasar dalam keraguan.",
      open: "Buka",
      high: "Tertinggi",
      low: "Terendah",
      close: "Tutup",
    },
    priceChart: {
      placeholder: "Klik dan seret untuk menggambar pergerakan harga",
    },
    timeframeLabels: {
      'M1': ['0d', '15d', '30d', '45d', '60d'],
      'M5': ['0m', '1m', '2m', '3m', '4m', '5m'],
      'M15': ['0m', '3m', '6m', '9m', '12m', '15m'],
      'M30': ['0m', '6m', '12m', '18m', '24m', '30m'],
      'H1': ['0m', '15m', '30m', '45m', '60m'],
      'H4': ['0j', '1j', '2j', '3j', '4j'],
      'D1': ['0j', '6j', '12j', '18j', '24j'],
      'W1': ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'],
      'MN': ['M1', 'M2', 'M3', 'M4', ''],
    },
  },
  en: {
    app: {
      title: "Candlestick Simulator",
      description: "An interactive tool to understand how a single candlestick is formed.",
      settingsTitle: "Parameter Settings",
      timeframeLabel: "Timeframe:",
      minPriceLabel: "Min Price:",
      maxPriceLabel: "Max Price:",
      randomizeButton: "Randomize Price Range",
      resetButton: "Reset",
      chartTitle: "Price Movement Chart",
      previewTitle: "Live Preview",
    },
    explanation: {
      bullishTitle: "Bullish Candle",
      bullishDescription: "The closing price is higher than the opening price, indicating that buyers were in control and the price went up.",
      bearishTitle: "Bearish Candle",
      bearishDescription: "The closing price is lower than the opening price, indicating that sellers were in control and the price went down.",
      dojiTitle: "Doji Candle",
      dojiDescription: "The closing price is equal to the opening price, indicating indecision in the market between buyers and sellers.",
      open: "Open",
      high: "High",
      low: "Low",
      close: "Close",
    },
    priceChart: {
      placeholder: "Click and drag to draw the price movement",
    },
    timeframeLabels: {
        'M1': ['0s', '15s', '30s', '45s', '60s'],
        'M5': ['0m', '1m', '2m', '3m', '4m', '5m'],
        'M15': ['0m', '3m', '6m', '9m', '12m', '15m'],
        'M30': ['0m', '6m', '12m', '18m', '24m', '30m'],
        'H1': ['0m', '15m', '30m', '45m', '60m'],
        'H4': ['0h', '1h', '2h', '3h', '4h'],
        'D1': ['0h', '6h', '12h', '18h', '24h'],
        'W1': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        'MN': ['Week 1', 'Week 2', 'Week 3', 'Week 4', ''],
    },
  },
  zh: {
    app: {
      title: "K線蠟燭模擬器",
      description: "一個了解單根K線如何形成的互動工具",
      settingsTitle: "參數設定",
      timeframeLabel: "時間週期:",
      minPriceLabel: "最低價:",
      maxPriceLabel: "最高價:",
      randomizeButton: "隨機生成價格區間",
      resetButton: "重設",
      chartTitle: "價格走勢圖",
      previewTitle: "即時預覽",
    },
    explanation: {
      bullishTitle: "陽線 (Bullish)",
      bullishDescription: "收盤價高於開盤價，表示在這段時間內買方力量佔優勢，價格上漲。",
      bearishTitle: "陰線 (Bearish)",
      bearishDescription: "收盤價低於開盤價，表示在這段時間內賣方力量佔優勢，價格下跌。",
      dojiTitle: "十字線 (Doji)",
      dojiDescription: "收盤價等於開盤價，表示買賣雙方力量均衡，市場可能處於猶豫或轉折點。",
      open: "開盤",
      high: "最高",
      low: "最低",
      close: "收盤",
    },
    priceChart: {
      placeholder: "點擊並拖曳以繪製價格走勢",
    },
    timeframeLabels: {
      'M1': ['0s', '15s', '30s', '45s', '60s'],
      'M5': ['0m', '1m', '2m', '3m', '4m', '5m'],
      'M15': ['0m', '3m', '6m', '9m', '12m', '15m'],
      'M30': ['0m', '6m', '12m', '18m', '24m', '30m'],
      'H1': ['0m', '15m', '30m', '45m', '60m'],
      'H4': ['0h', '1h', '2h', '3h', '4h'],
      'D1': ['0h', '6h', '12h', '18h', '24h'],
      'W1': ['週一', '週二', '週三', '週四', '週五'],
      'MN': ['第一週', '第二週', '第三週', '第四週', ''],
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  t_time: (key: string) => string[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// FIX: Explicitly type LanguageProvider with PropsWithChildren to fix type inference issue in JSX.
export const LanguageProvider = ({ children }: PropsWithChildren<{}>) => {
  const [language, setLanguage] = useState<Language>('id');

  const t = (key: string): string => {
    const keys = key.split('.');
    let result = translations[language];
    try {
      for (const k of keys) {
        result = result[k];
      }
      return result || key;
    } catch (e) {
      return key;
    }
  };

  const t_time = (key: string): string[] => {
      return translations[language].timeframeLabels[key] || [];
  }

  const value = {
    language,
    setLanguage: (lang: Language) => setLanguage(lang),
    t,
    t_time,
  };

  // FIX: Replaced JSX with React.createElement because .ts files cannot parse JSX syntax.
  return React.createElement(LanguageContext.Provider, { value }, children);
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};