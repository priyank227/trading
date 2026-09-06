/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Activity,
  Search,
  AlertCircle,
  RefreshCw,
  BarChart2,
  Download,
  LayoutGrid,
  List,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  X
} from "lucide-react";

interface StockMatch {
  symbol: string;
  prevDate: string;
  prevOpen: number;
  prevClose: number;
  todayDate: string;
  todayOpen: number;
  currentPrice: number;
  midPoint: number;
  strategy: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StockMatch[] | null>(null);
  const [skipped, setSkipped] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bullish" | "bearish">("bullish");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showSkipped, setShowSkipped] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState<string | null>(null);

  const runScreener = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/screen");
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        setSkipped(data.skipped || []);
        setLastScannedTime(
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      } else {
        setError(data.error || "Failed to fetch data.");
      }
    } catch {
      setError("An unexpected error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (data: StockMatch[], strategy: string, filename: string) => {
    const strategyResults = data.filter((s: any) => s.strategy === strategy);
    if (strategyResults.length === 0) return;

    const headers = [
      "Symbol",
      "Strategy",
      "Prev Date",
      "Prev Open",
      "Prev Close",
      "Today Date",
      "Today Open",
      "Current Price",
      "Mid Point",
    ];
    const csvContent = [
      headers.join(","),
      ...strategyResults.map((r: any) => {
        const pDate = new Date(r.prevDate).toLocaleDateString("en-IN");
        const tDate = new Date(r.todayDate).toLocaleDateString("en-IN");
        return [
          r.symbol.replace(".NS", ""),
          r.strategy,
          pDate,
          r.prevOpen.toFixed(2),
          r.prevClose.toFixed(2),
          tDate,
          r.todayOpen.toFixed(2),
          r.currentPrice.toFixed(2),
          r.midPoint.toFixed(2),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter results by search query and strategy
  const bullishStocks = useMemo(() => {
    if (!results) return [];
    return results.filter(
      (s: any) =>
        s.strategy === "Green-Below-50" &&
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [results, searchQuery]);

  const bearishStocks = useMemo(() => {
    if (!results) return [];
    return results.filter(
      (s: any) =>
        s.strategy === "Red-Above-50" &&
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [results, searchQuery]);

  const totalBullish = results?.filter((s: any) => s.strategy === "Green-Below-50").length || 0;
  const totalBearish = results?.filter((s: any) => s.strategy === "Red-Above-50").length || 0;

  const currentStocks = activeTab === "bullish" ? bullishStocks : bearishStocks;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 flex flex-col">
      {/* Sticky Responsive Navbar with robust backdrop blur */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-white leading-none">
                Trade<span className="text-emerald-400">Lens</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Nifty 100 Scanner
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastScannedTime && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 bg-slate-900 border border-white/5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Updated {lastScannedTime}
              </span>
            )}
            {results !== null && (
              <button
                onClick={runScreener}
                disabled={loading}
                title="Rescan Nifty 100"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden xs:inline sm:inline">Rescan</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-12">
        {/* Header / Hero Section */}
        <div className="flex flex-col items-center text-center mb-8 sm:mb-12 md:mb-14 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
          </div>

          <div className="space-y-2 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Midpoint Strategy Screener
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Real-time scanner filtering <span className="text-emerald-400 font-medium">Nifty 100</span> equities based on yesterday&apos;s candle midpoint momentum setups.
            </p>
          </div>

          {/* Responsive Dual Strategy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-w-3xl w-full text-left">
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wide">
                  1. Bullish Setup
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-snug">
                Yesterday candle was <strong className="text-emerald-300">Green</strong> (Close &gt; Open). Today opened <strong className="text-emerald-300">BELOW 50%</strong> of yesterday&apos;s range.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-950/20 border border-rose-500/20 hover:border-rose-500/30 transition-all">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></div>
                <span className="text-xs sm:text-sm font-bold text-rose-400 uppercase tracking-wide">
                  2. Bearish Setup
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-snug">
                Yesterday candle was <strong className="text-rose-300">Red</strong> (Close &lt; Open). Today opened <strong className="text-rose-300">ABOVE 50%</strong> of yesterday&apos;s range.
              </p>
            </div>
          </div>

          {/* Scan Action Button */}
          <div className="pt-2 w-full sm:w-auto">
            <button
              onClick={runScreener}
              disabled={loading}
              className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-white transition-all duration-300 bg-emerald-600 rounded-full hover:bg-emerald-500 hover:shadow-[0_0_35px_-8px_rgba(16,185,129,0.5)] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5 transition-transform group-hover:scale-110" />
              )}
              <span>{loading ? "Scanning Nifty 100..." : "Run Screener Now"}</span>
            </button>
          </div>
        </div>

        {/* Status / Error Messages */}
        {error && (
          <div className="p-4 mb-6 sm:mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start sm:items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results Section */}
        {results !== null && !loading && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            {/* Results Header & Responsive Controls Toolbar */}
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5">
              {/* Top Row: Title, Count, and Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Scan Results
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-white/5">
                    {results.length} {results.length === 1 ? "Stock" : "Stocks"}
                  </span>
                  {searchQuery && (
                    <span className="text-xs text-slate-400">
                      ({currentStocks.length} matching filter)
                    </span>
                  )}
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-64 md:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by symbol (e.g. TCS)..."
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-900/90 text-white placeholder-slate-500 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Row: View Toggle & CSV Export Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-white/5 rounded-xl w-fit">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === "grid"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === "table"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                </div>

                {/* CSV Downloads (Responsive: 2-column grid on mobile, inline on sm+) */}
                {results.length > 0 && (
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                    <button
                      onClick={() => {
                        const dateStr = new Date().toISOString().split("T")[0];
                        downloadCSV(results, "Green-Below-50", `bullish_stocks_${dateStr}.csv`);
                      }}
                      disabled={totalBullish === 0}
                      className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Bullish CSV ({totalBullish})</span>
                    </button>
                    <button
                      onClick={() => {
                        const dateStr = new Date().toISOString().split("T")[0];
                        downloadCSV(results, "Red-Above-50", `bearish_stocks_${dateStr}.csv`);
                      }}
                      disabled={totalBearish === 0}
                      className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Bearish CSV ({totalBearish})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center border border-dashed border-white/10 rounded-2xl sm:rounded-3xl bg-slate-900/30 px-4">
                <div className="p-3 sm:p-4 rounded-full bg-slate-800 mb-3">
                  <Search className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">No Matches Found</h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
                  None of the Nifty 100 stocks currently match the midpoint strategy criteria today.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Responsive Segmented Control Tabs */}
                <div className="w-full sm:w-fit grid grid-cols-2 sm:flex p-1 bg-slate-900 border border-white/10 rounded-2xl mx-auto lg:mx-0">
                  <button
                    onClick={() => setActiveTab("bullish")}
                    className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${activeTab === "bullish"
                      ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                      }`}
                  >
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Bullish Setup</span>
                    <span
                      className={`ml-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded-full shrink-0 ${activeTab === "bullish" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "bg-slate-800 text-slate-400"
                        }`}
                    >
                      {totalBullish}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("bearish")}
                    className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${activeTab === "bearish"
                      ? "bg-rose-500/20 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.15)] border border-rose-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                      }`}
                  >
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 rotate-90 transform shrink-0" />
                    <span className="truncate">Bearish Setup</span>
                    <span
                      className={`ml-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded-full shrink-0 ${activeTab === "bearish" ? "bg-rose-500/20 text-rose-300 font-bold" : "bg-slate-800 text-slate-400"
                        }`}
                    >
                      {totalBearish}
                    </span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-slate-900/40">
                  {/* Section Title Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                    <h3
                      className={`text-base sm:text-lg md:text-xl font-bold flex items-center gap-2 ${activeTab === "bullish" ? "text-emerald-400" : "text-rose-400"
                        }`}
                    >
                      {activeTab === "bullish" ? (
                        <>
                          <ArrowUpRight className="w-5 h-5 shrink-0" />
                          <span>Bullish Setup (Green-Below-50)</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="w-5 h-5 shrink-0" />
                          <span>Bearish Setup (Red-Above-50)</span>
                        </>
                      )}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      Showing {currentStocks.length}
                    </span>
                  </div>

                  {/* Empty Filter State */}
                  {currentStocks.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      {searchQuery
                        ? `No stocks matching "${searchQuery}" in this setup.`
                        : "No stocks matched this strategy today."}
                    </div>
                  ) : viewMode === "grid" ? (
                    /* Grid View: Responsive columns across all devices */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                      {currentStocks.map((stock: any) => {
                        const cleanSymbol = stock.symbol.replace(".NS", "");
                        const isBullish = activeTab === "bullish";
                        const theme = isBullish
                          ? {
                            text: "text-emerald-400",
                            border: "border-emerald-500/20",
                            hoverBorder: "hover:border-emerald-500/35",
                            bg: "bg-emerald-500/10",
                            badgeBg: "bg-emerald-500/15",
                            badgeBorder: "border-emerald-500/30",
                            iconColor: "text-emerald-500",
                          }
                          : {
                            text: "text-rose-400",
                            border: "border-rose-500/20",
                            hoverBorder: "hover:border-rose-500/35",
                            bg: "bg-rose-500/10",
                            badgeBg: "bg-rose-500/15",
                            badgeBorder: "border-rose-500/30",
                            iconColor: "text-rose-500",
                          };

                        return (
                          <div
                            key={stock.symbol}
                            className={`group relative overflow-hidden rounded-2xl bg-slate-900/90 border border-white/10 p-4 sm:p-5 ${theme.hoverBorder} hover:bg-slate-800/80 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col justify-between`}
                          >
                            {/* Watermark Icon */}
                            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none">
                              <TrendingUp
                                className={`w-20 h-20 ${theme.iconColor} ${!isBullish ? "rotate-90" : "-rotate-12"
                                  } transform translate-x-3 -translate-y-3`}
                              />
                            </div>

                            <div className="relative z-10 space-y-4">
                              {/* Stock Card Header: Line 1 Symbol & Price, Line 2 Exchange & Badge (No collision!) */}
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                                    {cleanSymbol}
                                  </h4>
                                  <div className="text-right shrink-0">
                                    <span className={`text-lg sm:text-xl font-bold ${theme.text}`}>
                                      ₹{stock.currentPrice.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                                    NSE Equity
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${theme.badgeBg} ${theme.text} border ${theme.badgeBorder} whitespace-nowrap shrink-0`}
                                  >
                                    {isBullish ? "Bullish (G-B50)" : "Bearish (R-A50)"}
                                  </span>
                                </div>
                              </div>

                              {/* Yesterday's Candle Box */}
                              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                    Yesterday&apos;s Candle
                                  </p>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(stock.prevDate).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                  <span className="text-slate-400">
                                    Open:{" "}
                                    <strong className="text-white font-medium">
                                      ₹{stock.prevOpen.toFixed(2)}
                                    </strong>
                                  </span>
                                  <span className="text-slate-400">
                                    Close:{" "}
                                    <strong className={`font-semibold ${theme.text}`}>
                                      ₹{stock.prevClose.toFixed(2)}
                                    </strong>
                                  </span>
                                </div>
                              </div>

                              {/* Strategy Setup Box */}
                              <div className={`p-3 rounded-xl ${theme.bg} border ${theme.border} space-y-1.5`}>
                                <p className={`text-[10px] uppercase tracking-wider font-bold ${theme.text} opacity-90`}>
                                  Strategy Breakdown
                                </p>
                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                  <span className="text-slate-300">Target Midpoint:</span>
                                  <strong className="text-white font-semibold">
                                    ₹{stock.midPoint.toFixed(2)}
                                  </strong>
                                </div>
                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                  <span className="text-slate-300">Today&apos;s Open:</span>
                                  <strong className={`font-bold ${theme.text}`}>
                                    ₹{stock.todayOpen.toFixed(2)}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {/* Card Footer: Quick TradingView Link */}
                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">
                                Setup matched today
                              </span>
                              <a
                                href={`https://in.tradingview.com/chart/?symbol=NSE:${cleanSymbol}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                              >
                                <span>Chart</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Table View: Responsive horizontal scroll for dense trading analysis */
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[640px]">
                        <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Symbol</th>
                            <th className="px-4 py-3 font-semibold">Current Price</th>
                            <th className="px-4 py-3 font-semibold">Prev Open</th>
                            <th className="px-4 py-3 font-semibold">Prev Close</th>
                            <th className="px-4 py-3 font-semibold">Midpoint</th>
                            <th className="px-4 py-3 font-semibold">Today Open</th>
                            <th className="px-4 py-3 font-semibold">Setup</th>
                            <th className="px-4 py-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {currentStocks.map((stock: any) => {
                            const cleanSymbol = stock.symbol.replace(".NS", "");
                            const isBullish = activeTab === "bullish";
                            return (
                              <tr
                                key={stock.symbol}
                                className="hover:bg-slate-800/50 transition-colors"
                              >
                                <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                                  {cleanSymbol}
                                </td>
                                <td
                                  className={`px-4 py-3.5 font-bold whitespace-nowrap ${isBullish ? "text-emerald-400" : "text-rose-400"
                                    }`}
                                >
                                  ₹{stock.currentPrice.toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-300">
                                  ₹{stock.prevOpen.toFixed(2)}
                                </td>
                                <td
                                  className={`px-4 py-3.5 whitespace-nowrap font-mono font-medium ${isBullish ? "text-emerald-400" : "text-rose-400"
                                    }`}
                                >
                                  ₹{stock.prevClose.toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap font-mono text-white">
                                  ₹{stock.midPoint.toFixed(2)}
                                </td>
                                <td
                                  className={`px-4 py-3.5 whitespace-nowrap font-mono font-bold ${isBullish ? "text-emerald-400" : "text-rose-400"
                                    }`}
                                >
                                  ₹{stock.todayOpen.toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${isBullish
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      }`}
                                  >
                                    {isBullish ? "Bullish" : "Bearish"}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap text-right">
                                  <a
                                    href={`https://in.tradingview.com/chart/?symbol=NSE:${cleanSymbol}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                                  >
                                    <span>Chart</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skipped Stocks Section (Collapsible on Mobile & Desktop) */}
            {skipped && skipped.length > 0 && (
              <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
                    <h3 className="text-base sm:text-lg font-semibold text-white">
                      Skipped Stocks ({skipped.length})
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowSkipped(!showSkipped)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-white/5 transition-colors w-fit"
                  >
                    <span>{showSkipped ? "Hide Skipped Symbols" : "View Skipped Symbols"}</span>
                    {showSkipped ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-400 mb-3">
                  These stocks were skipped due to missing daily bars or delisted symbols on Yahoo Finance.
                </p>

                {showSkipped && (
                  <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-white/5 animate-in fade-in duration-300">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-48 overflow-y-auto pr-1">
                      {skipped.map((symbol) => (
                        <span
                          key={symbol}
                          className="px-2 sm:px-2.5 py-1 text-[11px] font-mono text-slate-300 bg-slate-900 border border-white/5 rounded-md hover:bg-slate-800 transition-colors"
                        >
                          {symbol.replace(".NS", "")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Responsive Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TradeLens Midpoint Strategy Screener</span>
          <span>Market data from Yahoo Finance & Angel One • Real-time calculations</span>
        </div>
      </footer>
    </div>
  );
}
