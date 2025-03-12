const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
  rank: Number,
  name: String,
  symbol: String,
  utility: Number,
  team: Number,
  adoption: Number,
  totalScore: Number,
  gitMetrics: { Y: Number, C: Number, F: Number },
  volumeUsd: Number,
  marketCap: Number,
  coinType: String,
  classification: String,
});

const screenedCoinSchema = new mongoose.Schema({
  symbol: String,
  timestamp: { type: Date, default: Date.now },
  indicators: {
    ema: {
      score: Number,
      details: {
        ema7: Number,
        ema21: Number,
        currentPrice: Number,
        crossingDate: String, // Format: dd/mm/yyyy HH:mm
        condition: String,    // e.g., "Crossing Bullish", "Above EMA21", "Below EMA21"
      },
    },
    bollinger: {
      score: Number,
      details: {
        sma: Number,
        upperBand: Number,
        lowerBand: Number,
        currentPrice: Number,
        condition: String,    // e.g., "Below SMA", "Above Upper Band"
      },
    },
    stochastic: {
      score: Number,
      details: {
        k: Number,
        d: Number,
        condition: String,    // e.g., "Overbought", "Oversold", "Neutral"
      },
    },
    vwap: {
      score: Number,
      details: {
        vwap: Number,
        currentPrice: Number,
        condition: String,    // e.g., "Above VWAP", "Below VWAP"
      },
    },
    rsi: {
      score: Number,
      details: {
        rsi: Number,
        condition: String,    // e.g., "Overbought", "Oversold", "Neutral"
      },
    },
    macd: {
      score: Number,
      details: {
        macd: Number,
        signal: Number,
        crossingDate: String, // Format: dd/mm/yyyy HH:mm
        condition: String,    // e.g., "Crossing Bullish", "Above Signal"
      },
    },
  },
  totalScreeningScore: Number,
  signals: [String],
  volume: Number,
  volumeFluctuation: Number,
});

const Coin = mongoose.model('Coin', coinSchema, 'cryptoTop50');
const ScreenedCoin = mongoose.model('ScreenedCoin', screenedCoinSchema, 'screenedCoins');

function calculateUtility(coin) {
  const tags = coin.tags || [];
  return tags.includes('defi') || tags.includes('smart-contracts') ? 10 : 8;
}

function calculateTeamScore(gitMetrics) {
  const { Y, C } = gitMetrics;
  if (Y > 100 && C > 10000) return 10;
  if (Y > 50 && C > 5000) return 9;
  if (Y > 20 && C > 2000) return 8;
  return 7;
}

function calculateAdoptionScore(volumeUsd) {
  if (volumeUsd > 1000000000) return 10;
  if (volumeUsd > 100000000) return 9;
  if (volumeUsd > 50000000) return 8;
  return 7;
}

function determineCoinType(coin, maxAltcoinMarketCap, minAltcoinMarketCap) {
  const marketCap = coin.marketCap;
  const tags = coin.tags || [];
  const symbol = coin.symbol;
  if (marketCap > 100000000000 || ['BTC', 'ETH'].includes(symbol)) return 'Major Coin';
  if (tags.includes('erc-20') || tags.includes('bep-20') || tags.includes('stablecoin')) return 'Token';
  const range = (maxAltcoinMarketCap - minAltcoinMarketCap) / 10;
  const altcoinRank = Math.min(10, Math.max(1, Math.ceil((marketCap - minAltcoinMarketCap) / range)));
  return `Altcoin-${altcoinRank}`;
}

module.exports = {
  Coin,
  ScreenedCoin,
  calculateUtility,
  calculateTeamScore,
  calculateAdoptionScore,
  determineCoinType,
};