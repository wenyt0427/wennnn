import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import type { CandleData } from '../types';
import { useTranslation } from '../i18n';

interface PriceChartProps {
  data: CandleData;
  onUpdate: (newPrices: CandleData) => void;
  minPrice: number;
  maxPrice: number;
  timeframe: string;
  isPristine: boolean;
}

const margin = { top: 10, right: 60, bottom: 25, left: 20 };

export const PriceChart: React.FC<PriceChartProps> = ({ data, onUpdate, minPrice, maxPrice, timeframe, isPristine }) => {
    const { t, t_time } = useTranslation();
    const svgRef = useRef<SVGSVGElement>(null);
    const [points, setPoints] = useState<Array<{x: number, y: number}>>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [crosshairPos, setCrosshairPos] = useState<{x: number, y: number} | null>(null);
    
    const chartWidth = dimensions.width - margin.left - margin.right;
    const chartHeight = dimensions.height - margin.top - margin.bottom;

    const yPriceTicks = useMemo(() => {
        if (chartHeight <= 0 || maxPrice <= minPrice) return [];
        const ticks = [];
        const tickCount = 5;
        const priceStep = (maxPrice - minPrice) / (tickCount - 1);
        for (let i = 0; i < tickCount; i++) {
            ticks.push(minPrice + (i * priceStep));
        }
        return ticks;
    }, [minPrice, maxPrice, chartHeight]);

    const xTimeLabels = useMemo(() => t_time(timeframe) || [], [t_time, timeframe]);

    useLayoutEffect(() => {
        if (svgRef.current) {
            const resizeObserver = new ResizeObserver(entries => {
                const entry = entries[0];
                if (entry) {
                    setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
                }
            });
            resizeObserver.observe(svgRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    const yToPrice = useCallback((y: number) => {
        if(chartHeight <= 0) return 0;
        return minPrice + ((chartHeight - y) / chartHeight) * (maxPrice - minPrice)
    }, [minPrice, maxPrice, chartHeight]);

    const priceToY = useCallback((price: number) => {
        if (maxPrice - minPrice <= 0) return chartHeight / 2;
        return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight
    }, [minPrice, maxPrice, chartHeight]);

    useEffect(() => {
        if (isPristine) {
            setPoints([]);
        }
    }, [isPristine]);

    const highlightedPoint = useMemo(() => {
        if (!crosshairPos || points.length < 2 || chartHeight <= 0) {
            return null;
        }
    
        let segmentIndex = points.findIndex(p => p.x >= crosshairPos.x);
    
        if (segmentIndex <= 0) {
            if (crosshairPos.x > points[points.length - 1].x) {
                segmentIndex = points.length - 1;
            } else {
                 segmentIndex = 1;
            }
        }
        
        const p1 = points[segmentIndex - 1];
        const p2 = points[segmentIndex];
    
        if (!p1 || !p2) return null;
    
        const dx = p2.x - p1.x;
        if (dx === 0) {
            return {
                x: crosshairPos.x,
                y: p1.y,
                price: yToPrice(p1.y)
            };
        }
        const xRatio = (crosshairPos.x - p1.x) / dx;
        const interpolatedY = p1.y + xRatio * (p2.y - p1.y);
        
        return {
            x: crosshairPos.x,
            y: interpolatedY,
            price: yToPrice(interpolatedY)
        };
    
    }, [crosshairPos, points, yToPrice, chartHeight]);


    const updateCandleFromPoints = useCallback((currentPoints: Array<{x: number, y: number}>) => {
        if (currentPoints.length < 1 || chartHeight <= 0) return;
        const prices = currentPoints.map(p => yToPrice(p.y));
        onUpdate({
            open: yToPrice(currentPoints[0].y),
            high: Math.max(...prices),
            low: Math.min(...prices),
            close: yToPrice(currentPoints[currentPoints.length - 1].y),
        });
    }, [chartHeight, onUpdate, yToPrice]);

    const getCoords = useCallback((e: MouseEvent | TouchEvent): {x: number, y: number} | null => {
        if (!svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        let x = clientX - rect.left - margin.left;
        let y = clientY - rect.top - margin.top;
        return { 
            x: Math.max(0, Math.min(x, chartWidth)),
            y: Math.max(0, Math.min(y, chartHeight)) 
        };
    }, [chartWidth, chartHeight]);

    const handleDrawing = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const coords = getCoords(e);
        if (!coords) return;
        setCrosshairPos(coords);
        setPoints(prevPoints => {
            const lastPoint = prevPoints[prevPoints.length - 1];
            if (!lastPoint || coords.x <= lastPoint.x) return prevPoints;
            const newPoints = [...prevPoints, coords];
            updateCandleFromPoints(newPoints);
            return newPoints;
        });
    }, [isDrawing, getCoords, updateCandleFromPoints]);

    const handleEndDrawing = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const handleStartDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const nativeEvent = e.nativeEvent;
        const coords = getCoords(nativeEvent);
        if (!coords) return;

        const lastPoint = points.length > 0 ? points[points.length - 1] : null;

        if (lastPoint && coords.x <= lastPoint.x) {
            return;
        }

        setCrosshairPos(coords);
        setIsDrawing(true);
        
        setPoints(prevPoints => {
            let newPoints;
            if (prevPoints.length === 0) {
                newPoints = [{ x: 0, y: coords.y }];
            } else {
                newPoints = [...prevPoints, coords];
            }
            updateCandleFromPoints(newPoints);
            return newPoints;
        });
    }, [getCoords, updateCandleFromPoints, points]);
    
    useEffect(() => {
        if (isDrawing) {
            window.addEventListener('mousemove', handleDrawing);
            window.addEventListener('touchmove', handleDrawing, { passive: false });
            window.addEventListener('mouseup', handleEndDrawing);
            window.addEventListener('touchend', handleEndDrawing);
            return () => {
                window.removeEventListener('mousemove', handleDrawing);
                window.removeEventListener('touchmove', handleDrawing);
                window.removeEventListener('mouseup', handleEndDrawing);
                window.removeEventListener('touchend', handleEndDrawing);
            };
        }
    }, [isDrawing, handleDrawing, handleEndDrawing]);


    const handleMouseMove = (e: React.MouseEvent) => {
        const coords = getCoords(e.nativeEvent);
        if (coords) setCrosshairPos(coords);
    };

    const pathData = points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const pathColor = data.close > data.open ? 'stroke-bullish' : (data.close < data.open ? 'stroke-bearish' : 'stroke-neutral');
    
    const showLabelOnLeft = crosshairPos && crosshairPos.x > chartWidth - 80;

    return (
        <div className="h-full w-full bg-dark-bg p-2 rounded-md border border-light-border relative touch-none select-none">
            <svg ref={svgRef} className="w-full h-full" overflow="visible">
                {chartWidth > 0 && chartHeight > 0 && (
                    <g transform={`translate(${margin.left}, ${margin.top})`}>
                        {/* Grid & Axes */}
                        {yPriceTicks.map((price, i) => (
                            <g key={i} className="text-xs text-secondary-text" opacity="0.5">
                                <line x1="0" y1={priceToY(price)} x2={chartWidth} y2={priceToY(price)} stroke="currentColor" strokeDasharray="2,2" strokeWidth="0.5" />
                                <text x={chartWidth + 5} y={priceToY(price)} dy="0.32em" fill="currentColor">{price.toFixed(0)}</text>
                            </g>
                        ))}
                        {xTimeLabels.map((label, i) => (
                            <g key={i} className="text-xs text-secondary-text" opacity="0.5">
                                <text x={i * (chartWidth / (xTimeLabels.length - 1))} y={chartHeight + 18} textAnchor="middle" fill="currentColor">{label}</text>
                            </g>
                        ))}
                        
                        {/* OHLC Lines */}
                        {!isPristine && [
                            { label: 'H', price: data.high, color: 'text-bullish' },
                            { label: 'O', price: data.open, color: 'text-secondary-text' },
                            { label: 'C', price: data.close, color: 'text-secondary-text' },
                            { label: 'L', price: data.low, color: 'text-bearish' },
                        ].map(({ label, price, color }) => (
                            <g key={label} className="pointer-events-none" opacity="0.8">
                                <line
                                    x1={0}
                                    y1={priceToY(price)}
                                    x2={chartWidth}
                                    y2={priceToY(price)}
                                    stroke="currentColor"
                                    className={`${color.replace('text-','stroke-')} transition-all duration-300`}
                                    strokeWidth="1"
                                    strokeDasharray="3,3"
                                />
                                <text
                                    x={-8}
                                    y={priceToY(price)}
                                    textAnchor="end"
                                    dy="0.32em"
                                    className="text-xs font-bold text-primary-text"
                                >
                                    {label}
                                </text>
                            </g>
                        ))}

                        {/* Drawing Path */}
                        <path d={pathData} fill="none" className={pathColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

                        {/* Interaction Layer */}
                        <rect
                            width={chartWidth}
                            height={chartHeight}
                            fill="transparent"
                            className="cursor-crosshair"
                            onMouseDown={handleStartDrawing}
                            onTouchStart={handleStartDrawing}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setCrosshairPos(null)}
                        />

                        {/* Crosshair */}
                        {crosshairPos && (
                            <g className="pointer-events-none" opacity="0.7">
                                <line x1={crosshairPos.x} y1={0} x2={crosshairPos.x} y2={chartHeight} stroke="#9ca3af" strokeDasharray="3,3" strokeWidth="1" />
                                <line x1={0} y1={crosshairPos.y} x2={chartWidth} y2={crosshairPos.y} stroke="#9ca3af" strokeDasharray="3,3" strokeWidth="1" />
                                 <rect x={chartWidth + 2} y={crosshairPos.y - 10} width={50} height={20} fill="#2a2e39" rx="2"/>
                                <text x={chartWidth + 5} y={crosshairPos.y} dy="0.32em" fill="#d1d4dc" className="text-xs">{yToPrice(crosshairPos.y).toFixed(2)}</text>
                                <rect x={crosshairPos.x - 25} y={chartHeight + 2} width={50} height={20} fill="#2a2e39" rx="2"/>
                                <text x={crosshairPos.x} y={chartHeight + 12} textAnchor="middle" fill="#d1d4dc" className="text-xs">
                                    {xTimeLabels[Math.round((crosshairPos.x / chartWidth) * (xTimeLabels.length - 1))]}
                                </text>
                            </g>
                        )}

                        {/* Highlighted point on the line */}
                        {highlightedPoint && !isDrawing && points.length > 0 && crosshairPos && crosshairPos.x <= points[points.length-1].x && (
                            <g className="pointer-events-none" transform={`translate(${highlightedPoint.x}, ${highlightedPoint.y})`}>
                                <circle 
                                    r="5" 
                                    className={`${pathColor.replace('stroke-', 'fill-')}`} 
                                    stroke="#131722"
                                    strokeWidth="2"
                                />
                                <g transform={`translate(${showLabelOnLeft ? -15 : 15}, 0)`}>
                                    <rect 
                                        x={showLabelOnLeft ? -60 : 0} 
                                        y="-11" 
                                        width={60} 
                                        height={22} 
                                        fill="#2a2e39"
                                        rx="3"
                                    />
                                    <text 
                                        x={showLabelOnLeft ? -30 : 30}
                                        y="0"
                                        textAnchor="middle"
                                        dy="0.32em" 
                                        fill="#d1d4dc" 
                                        className="text-xs font-semibold"
                                    >
                                        {highlightedPoint.price.toFixed(2)}
                                    </text>
                                </g>
                            </g>
                        )}
                    </g>
                )}
            </svg>
            {isPristine && (
                <div className="absolute inset-0 flex items-center justify-center text-secondary-text pointer-events-none">
                    {t('priceChart.placeholder')}
                </div>
            )}
        </div>
    );
};