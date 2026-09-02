/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error smartapi does not provide types
import { SmartAPI } from "smartapi-javascript";
import { TOTP } from "totp-generator";

let angelInstance: any = null;
let jwtToken: string | null = null;

// Caches the authenticated instance to avoid logging in repeatedly
export async function getAuthenticatedAngelAPI() {
  if (angelInstance && jwtToken) {
    return angelInstance;
  }

  const apiKey = process.env.ANGEL_API_KEY;
  const clientCode = process.env.ANGEL_CLIENT_CODE;
  const pin = process.env.ANGEL_PIN;
  const totpSecret = process.env.ANGEL_TOTP_SECRET;

  if (!apiKey || !clientCode || !pin || !totpSecret) {
    throw new Error("Missing Angel One credentials in .env.local");
  }

  const smart_api = new SmartAPI({
    api_key: apiKey,
  });

  // Generate TOTP dynamically
  const { otp: totp } = await TOTP.generate(totpSecret);

  try {
    const data = await smart_api.generateSession(clientCode, pin, totp);
    if (data && data.status) {
      jwtToken = data.data.jwtToken;
      angelInstance = smart_api;
      console.log("✅ Successfully authenticated with Angel One SmartAPI");
      return angelInstance;
    } else {
      throw new Error(`Angel One Auth Failed: ${data.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error("Angel One Session Error:", error);
    throw error;
  }
}

// Token Map Cache
let tokenMap: Record<string, string> | null = null;

// Download and cache the Angel One Scrip Master JSON
export async function getAngelTokenMap() {
  if (tokenMap) return tokenMap;

  console.log("Downloading Angel One Scrip Master...");
  try {
    const res = await fetch("https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json");
    const data = await res.json();
    
    tokenMap = {};
    for (const item of data) {
      if (item.exch_seg === "NSE" && item.symbol.endsWith("-EQ")) {
        const cleanSymbol = item.symbol.split("-EQ")[0];
        tokenMap[cleanSymbol] = item.token;
      }
    }
    console.log(`✅ Loaded ${Object.keys(tokenMap).length} NSE tokens from Angel One.`);
    return tokenMap;
  } catch (err: any) {
    console.error("Failed to load Angel One tokens:", err.message);
    return {};
  }
}

// Helper to fetch historical daily candles
export async function getAngelHistoricalCandles(symbol: string, fromDate: string, toDate: string) {
  const api = await getAuthenticatedAngelAPI();
  const map = await getAngelTokenMap();
  
  const token = map[symbol];
  if (!token) throw new Error(`Symbol token not found for ${symbol}`);

  const payload = {
    exchange: "NSE",
    symboltoken: token,
    interval: "ONE_DAY",
    fromdate: fromDate,
    todate: toDate
  };

  const response = await api.getCandleData(payload);
  if (response && response.status) {
    return response.data;
  } else {
    throw new Error(response.message || "Failed to fetch candle data");
  }
}
