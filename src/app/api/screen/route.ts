/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

import { ALL_STOCKS } from '@/lib/symbols';
import { getAngelHistoricalCandles } from '@/lib/angelOneAuth';

export async function GET() {
  try {
    const matchedStocks: any[] = [];
    const skippedStocks: string[] = [];

    // Process in smaller batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < ALL_STOCKS.length; i += batchSize) {
      const batch = ALL_STOCKS.slice(i, i + batchSize);
      
      const promises = batch.map(async (symbol) => {
        try {
          // Ensure dates are strictly mapped to IST (+5:30)
          const now = new Date();
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          
          const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
          const todayIstStr = formatter.format(now);

          // Pass the raw Date objects to Yahoo Finance so it includes data up to the current second
          const result: any = await yahooFinance.chart(symbol, { period1: sevenDaysAgo, period2: now, interval: '1d' });
          if (!result.quotes || result.quotes.length < 2) return null;

          // Strictly find the candle that matches today's exact IST date
          const todayCandleIndex = result.quotes.findIndex((q: any) => {
            return q.date && formatter.format(new Date(q.date)) === todayIstStr;
          });

          console.log(`\n--- DEBUGGING [${symbol}] ---`);
          console.log(`Expected Today (IST): ${todayIstStr}`);
          console.log(`todayCandleIndex found: ${todayCandleIndex}`);

          // If Yahoo hasn't returned today's data yet, or there's no previous day, skip.
          if (todayCandleIndex === -1 || todayCandleIndex === 0) {
            console.log(`[${symbol}] SKIPPED: Today's data not available or no previous day.`);
            return null;
          }

          const todayCandle = result.quotes[todayCandleIndex];
          const prevCandle = result.quotes[todayCandleIndex - 1];

          console.log(`[${symbol}] prevCandle Date: ${formatter.format(new Date(prevCandle.date))}`);
          console.log(`[${symbol}] todayCandle Date: ${formatter.format(new Date(todayCandle.date))}`);
          console.log(`[${symbol}] prevCandle (O: ${prevCandle.open}, C: ${prevCandle.close})`);
          console.log(`[${symbol}] todayCandle (O: ${todayCandle.open}, C: ${todayCandle.close})`);

          // If Yahoo Finance returns null for either day, try Angel One fallback
          if (todayCandle.open === null || todayCandle.close === null || 
              prevCandle.open === null || prevCandle.close === null) {
            console.log(`[${symbol}] Daily data has nulls. Attempting Angel One fallback...`);
            try {
              const cleanSymbol = symbol.replace('.NS', '');
              
              // We need fromdate and todate in "YYYY-MM-DD 09:15" format for Angel One
              const fromDateStr = formatter.format(sevenDaysAgo) + " 09:15";
              const toDateStr = formatter.format(now) + " 15:30";

              const hist = await getAngelHistoricalCandles(cleanSymbol, fromDateStr, toDateStr);
              
              // Angel One returns: [[timestamp, open, high, low, close, volume], ...]
              if (!hist || hist.length < 2) {
                 console.log(`[${symbol}] SKIPPED: Angel One missing historical data.`);
                 return { skipped: true, symbol };
              }

              // The last item is today, second to last is yesterday
              const todayAngel = hist[hist.length - 1];
              const prevAngel = hist[hist.length - 2];

              // Format: [timestamp, open, high, low, close, volume]
              const nsePrevOpen = prevAngel[1];
              const nsePrevHigh = prevAngel[2];
              const nsePrevLow = prevAngel[3];
              const nsePrevClose = prevAngel[4];
              const nseTodayOpen = todayAngel[1];
              const nseTodayClose = todayAngel[4];

              console.log(`[${symbol}] Angel One Fallback successful! Reconstructed: Prev(O:${nsePrevOpen}, H:${nsePrevHigh}, L:${nsePrevLow}, C:${nsePrevClose}) | Today(O:${nseTodayOpen})`);

              // Re-evaluate strategy with Angel One data
              const isPrevGreen = nsePrevClose > nsePrevOpen;
              const isPrevRed = nsePrevClose < nsePrevOpen;
              const midPoint = (nsePrevHigh + nsePrevLow) / 2;
              
              const isTodayOpenBelowHalf = nseTodayOpen < midPoint;
              const isTodayOpenAboveHalf = nseTodayOpen > midPoint;

              console.log(`[${symbol}] isPrevGreen? ${isPrevGreen} | isPrevRed? ${isPrevRed}`);
              console.log(`[${symbol}] midPoint: ${midPoint}`);
              console.log(`[${symbol}] todayOpen: ${nseTodayOpen}`);

              let matchedStrategy = null;
              if (isPrevGreen && isTodayOpenBelowHalf) matchedStrategy = "Green-Below-50";
              if (isPrevRed && isTodayOpenAboveHalf) matchedStrategy = "Red-Above-50";

              if (matchedStrategy) {
                  console.log(`[${symbol}] MATCHED (${matchedStrategy} via Angel One)! ✅`);
                  return {
                      symbol,
                      strategy: matchedStrategy,
                      prevDate: prevAngel[0],
                      prevOpen: nsePrevOpen,
                      prevClose: nsePrevClose,
                      todayDate: todayAngel[0],
                      todayOpen: nseTodayOpen,
                      currentPrice: nseTodayClose || nseTodayOpen,
                      midPoint
                  };
              } else {
                  console.log(`[${symbol}] FAILED STRATEGY (via Angel One) ❌`);
                  return null;
              }
            } catch (err: any) {
              console.log(`[${symbol}] Angel One fallback failed. Skipping. Error:`, err.message);
              return { skipped: true, symbol };
            }
          }

          // Strategy Logic
          const isPrevGreen = prevCandle.close > prevCandle.open;
          const isPrevRed = prevCandle.close < prevCandle.open;
          const midPoint = (prevCandle.high + prevCandle.low) / 2;
          
          const isTodayOpenBelowHalf = todayCandle.open < midPoint;
          const isTodayOpenAboveHalf = todayCandle.open > midPoint;

          console.log(`[${symbol}] isPrevGreen? ${isPrevGreen} | isPrevRed? ${isPrevRed}`);
          console.log(`[${symbol}] midPoint: ${midPoint}`);
          console.log(`[${symbol}] todayOpen: ${todayCandle.open}`);

          let matchedStrategy = null;
          if (isPrevGreen && isTodayOpenBelowHalf) matchedStrategy = "Green-Below-50";
          if (isPrevRed && isTodayOpenAboveHalf) matchedStrategy = "Red-Above-50";

          if (matchedStrategy) {
            console.log(`[${symbol}] MATCHED (${matchedStrategy})! ✅`);
            return {
              symbol,
              strategy: matchedStrategy,
              prevDate: prevCandle.date,
              prevOpen: prevCandle.open,
              prevClose: prevCandle.close,
              todayDate: todayCandle.date,
              todayOpen: todayCandle.open,
              currentPrice: todayCandle.close || todayCandle.open, // latest available price
              midPoint
            };
          } else {
            console.log(`[${symbol}] FAILED STRATEGY ❌`);
          }
        } catch (error: any) {
          if (error.message && error.message.includes('No data found')) {
            return null; // Ignore silently if delisted or no data
          }
          console.error(`Error fetching data for ${symbol}:`, error.message || error);
        }
        return null;
      });

      const results = await Promise.all(promises);
      results.forEach(res => {
        if (res) {
          if (res.skipped) {
            skippedStocks.push(res.symbol);
          } else {
            matchedStocks.push(res);
          }
        }
      });
      
      // small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({ 
      success: true, 
      count: matchedStocks.length, 
      data: matchedStocks,
      skipped: skippedStocks
    });

  } catch (error) {
    console.error("Screener error:", error);
    return NextResponse.json({ success: false, error: "Failed to run screener" }, { status: 500 });
  }
}
