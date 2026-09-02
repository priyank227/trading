import YahooFinance from 'yahoo-finance2';

async function test() {
    const symbol = "HDFCBANK.NS"; // Let's just pull one stock to see the data format and test our logic
    
    // We will just do a quick loop on some hardcoded symbols
    const symbols = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBI.NS", "BAJFINANCE.NS"];
    
    for (let sym of symbols) {
        try {
            const result = await YahooFinance.historical(sym, { period1: '2024-01-01' });
            if(result.length >= 2) {
                const prev = result[result.length - 2];
                const today = result[result.length - 1];
                
                const isPrevRed = prev.close < prev.open;
                const midPoint = (prev.close + prev.open) / 2;
                const isTodayOpenAboveHalf = today.open > midPoint;
                
                console.log(`[${sym}] Prev Red: ${isPrevRed}, Today Open: ${today.open}, Mid: ${midPoint}, Above: ${isTodayOpenAboveHalf}`);
            }
        } catch(e) {}
    }
}
test();
