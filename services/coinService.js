const axios = require('axios');
const { Coin, ScreenedCoin } = require('../models/coinModel');
const githubService = require('./githubService');
const { calculateEMA, calculateBollingerBands, calculateStochastic, calculateVWAP, calculateRSI, calculateMACD } = require('../utils/technicalIndicators');
const coinModel = require('../models/coinModel');
require('dotenv').config(); // Tambahkan dotenv

const CMC_API_KEY = process.env.CMC_API_KEY; // Ubah ke dotenv
const cmcHeaders = { 'Accept': 'application/json', 'X-CMC_PRO_API_KEY': CMC_API_KEY };

const INDICATOR_WEIGHTS = {
  EMA: 17,
  Bollinger: 17,
  Stochastic: 17,
  VWAP: 18,
  RSI: 17,
  MACD: 14,
};

async function getTop200CMC() {
  const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
  const response = await axios.get(url, { headers: cmcHeaders, params: { limit: 200 } });
  return response.data.data;
}

async function getBinanceVolume(symbol) {
  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`;
    const response = await axios.get(url);
    return parseFloat(response.data.quoteVolume || 0);
  } catch (error) {
    console.warn(`Volume fetch failed for ${symbol}: ${error.message}`);
    return 0;
  }
}

async function getTop50RankedCoins() {
  const top200 = await getTop200CMC();
  const symbols = top200.map(coin => coin.symbol);
  const metadata = await getCoinMetadata(symbols);

  const coinScores = [];

  for (const coin of top200) {
    const symbol = coin.symbol;
    const name = coin.name;

    const utilityScore = coinModel.calculateUtility(coin);
    const gitMetrics = await githubService.getGithubMetricsAuto(name, symbol);
    const teamScore = coinModel.calculateTeamScore(gitMetrics);
    const volumeUsd = await getBinanceVolume(symbol);
    const adoptionScore = coinModel.calculateAdoptionScore(volumeUsd);
    const totalScore = utilityScore + teamScore + adoptionScore;

    const coinMetadata = metadata[symbol];
    const { classification, isFiatRepresenting } = classifyAndFilterCoin(coin, coinMetadata);

    if (isFiatRepresenting) {
      continue; // Skip fiat representing coins
    }

    coinScores.push({
      name,
      symbol,
      utility: utilityScore,
      team: teamScore,
      adoption: adoptionScore,
      totalScore,
      gitMetrics,
      volumeUsd,
      marketCap: coin.quote.USD.market_cap,
      classification,
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const sortedCoins = coinScores.sort((a, b) => b.totalScore - a.totalScore);
  const top50 = sortedCoins.slice(0, 50);
  const altcoins = top50.filter(coin => coin.marketCap <= 100000000000 && !['erc-20', 'bep-20', 'stablecoin'].some(tag => (coin.tags || []).includes(tag)));
  const maxAltcoinMarketCap = Math.max(...altcoins.map(coin => coin.marketCap));
  const minAltcoinMarketCap = Math.min(...altcoins.map(coin => coin.marketCap));

  return top50.map((coin, index) => ({
    rank: index + 1,
    name: coin.name,
    symbol: coin.symbol,
    utility: coin.utility,
    team: coin.team,
    adoption: coin.adoption,
    totalScore: coin.totalScore,
    gitMetrics: coin.gitMetrics,
    volumeUsd: coin.volumeUsd,
    marketCap: coin.marketCap,
    coinType: coinModel.determineCoinType(coin, maxAltcoinMarketCap, minAltcoinMarketCap),
    classification: coin.classification,
  }));
}

// New function to fetch coin metadata
async function getCoinMetadata(symbols) {
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?symbol=${symbols.join(',')}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
        'Accept': 'application/json'
      },
    });
    const data = await response.json();
    if (data.status.error_code !== 0) {
      throw new Error(`CMC Metadata API error: ${data.status.error_message}`);
    }
    return data.data;
  } catch (error) {
    console.error('Error fetching coin metadata:', error.message);
    throw error;
  }
}

// New function to classify and filter coins
function classifyAndFilterCoin(coin, metadata) {
  const tags = metadata.tags || [];
  const category = metadata.category || 'unknown';
  const platform = coin.platform;

  let classification = 'unknown';
  let isFiatRepresenting = false;

  if (
    tags.includes('stablecoin') ||
    category === 'Stablecoin' ||
    tags.includes('asset-backed-stablecoin') ||
    tags.includes('fiat-stablecoin') ||
    coin.name.toLowerCase().includes('wrapped') && coin.name.toLowerCase().includes('usd')
  ) {
    isFiatRepresenting = true;
  }

  if (!isFiatRepresenting) {
    if (!platform) {
      classification = 'layer-1';
    } else if (platform) {
      if (tags.includes('layer-2') || tags.includes('scaling')) {
        classification = 'layer-2';
      } else if (tags.includes('interoperability') || tags.includes('cross-chain')) {
        classification = 'layer-0';
      } else {
        classification = 'token';
      }
    }
  }

  return {
    classification,
    isFiatRepresenting
  };
}

async function saveTop50CoinsToMongo() {
  const top50Coins = await getTop50RankedCoins();
  await Coin.deleteMany({});
  await Coin.insertMany(top50Coins);
  console.log('Top 50 coins saved to MongoDB');
  return true;
}

async function getOHLCV(symbol, interval = '15m', limit = 50) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`;
    const response = await axios.get(url);
    const ohlcv = response.data.map(candle => ({
      time: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
    console.log(`OHLCV for ${symbol}:`, ohlcv.slice(-2));
    return ohlcv;
  } catch (error) {
    console.warn(`OHLCV fetch failed for ${symbol}: ${error.message}`);
    return null;
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

async function screenTop50Coins() {
  const top50Coins = await Coin.find();
  const screenedResults = [];

  for (const coin of top50Coins) {
    const ohlcv = await getOHLCV(coin.symbol, '15m', 50);
    if (!ohlcv) {
      console.log(`Skipping ${coin.symbol} due to OHLCV fetch failure`);
      continue;
    }

    const closes = ohlcv.map(c => c.close);
    const highs = ohlcv.map(c => c.high);
    const lows = ohlcv.map(c => c.low);
    const volumes = ohlcv.map(c => c.volume);
    const times = ohlcv.map(c => c.time);

    const ema7 = calculateEMA(closes, 7);
    const ema21 = calculateEMA(closes, 21);
    const bollinger = calculateBollingerBands(closes, 20, 2);
    const stochastic = calculateStochastic(highs, lows, closes, 14, 3, 3);
    const vwap = calculateVWAP(ohlcv);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes, 12, 26, 9);

    const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
    const currentVolume = volumes[volumes.length - 1];
    const volumeFluctuation = ((currentVolume - avgVolume) / avgVolume) * 100 || 0;

    let emaCrossingDate = null;
    for (let i = 1; i < ema7.length; i++) {
      if (ema7[i] > ema21[i] && ema7[i - 1] <= ema21[i - 1]) {
        emaCrossingDate = formatDate(times[i]);
        break;
      }
    }
    const emaCondition = emaCrossingDate ? 'Crossing Bullish' : (ema7[ema7.length - 1] > ema21[ema21.length - 1] ? 'Above EMA21' : 'Below EMA21');

    let macdCrossingDate = null;
    for (let i = 1; i < macd.macd.length; i++) {
      if (macd.macd[i] > macd.signal[i] && macd.macd[i - 1] <= macd.signal[i - 1]) {
        macdCrossingDate = formatDate(times[i]);
        break;
      }
    }
    const macdCondition = macdCrossingDate ? 'Crossing Bullish' : (macd.macd[macd.macd.length - 1] > macd.signal[macd.signal.length - 1] ? 'Above Signal' : 'Below Signal');

    const signals = [];
    let totalScore = 0;

    const emaScore = (ema7[ema7.length - 1] > ema21[ema21.length - 1]) ? INDICATOR_WEIGHTS.EMA : 0;
    if (emaScore > 0) signals.push('EMA Buy');
    totalScore += emaScore;

    const bollingerScore = (closes[closes.length - 1] < bollinger.sma[bollinger.sma.length - 1]) ? INDICATOR_WEIGHTS.Bollinger : 0;
    const bollingerCondition = closes[closes.length - 1] > bollinger.upper[bollinger.upper.length - 1] ? 'Above Upper Band' : (closes[closes.length - 1] < bollinger.lower[bollinger.lower.length - 1] ? 'Below Lower Band' : 'Between Bands');
    if (bollingerScore > 0) signals.push('Bollinger Buy');
    totalScore += bollingerScore;

    const stochasticScore = (stochastic.k[stochastic.k.length - 1] < 30) ? INDICATOR_WEIGHTS.Stochastic : 0;
    const stochasticCondition = stochastic.k[stochastic.k.length - 1] > 80 ? 'Overbought' : (stochastic.k[stochastic.k.length - 1] < 20 ? 'Oversold' : 'Neutral');
    if (stochasticScore > 0) signals.push('Stochastic Buy');
    totalScore += stochasticScore;

    const vwapScore = (closes[closes.length - 1] > vwap) ? INDICATOR_WEIGHTS.VWAP : 0;
    const vwapCondition = closes[closes.length - 1] > vwap ? 'Above VWAP' : 'Below VWAP';
    if (vwapScore > 0) signals.push('VWAP Buy');
    totalScore += vwapScore;

    const rsiScore = (rsi[rsi.length - 1] < 40) ? INDICATOR_WEIGHTS.RSI : 0;
    const rsiCondition = rsi[rsi.length - 1] > 70 ? 'Overbought' : (rsi[rsi.length - 1] < 30 ? 'Oversold' : 'Neutral');
    if (rsiScore > 0) signals.push('RSI Buy');
    totalScore += rsiScore;

    const macdScore = (macd.macd[macd.macd.length - 1] > macd.signal[macd.signal.length - 1]) ? INDICATOR_WEIGHTS.MACD : 0;
    if (macdScore > 0) signals.push('MACD Buy');
    totalScore += macdScore;

    screenedResults.push({
      symbol: coin.symbol,
      classification: coin.classification,
      coinType: coin.coinType,
      indicators: {
        ema: {
          score: emaScore,
          details: {
            ema7: ema7[ema7.length - 1],
            ema21: ema21[ema21.length - 1],
            currentPrice: closes[closes.length - 1],
            crossingDate: emaCrossingDate,
            condition: emaCondition,
          },
        },
        bollinger: {
          score: bollingerScore,
          details: {
            sma: bollinger.sma[bollinger.sma.length - 1],
            upperBand: bollinger.upper[bollinger.upper.length - 1],
            lowerBand: bollinger.lower[bollinger.lower.length - 1],
            currentPrice: closes[closes.length - 1],
            condition: bollingerCondition,
          },
        },
        stochastic: {
          score: stochasticScore,
          details: {
            k: stochastic.k[stochastic.k.length - 1],
            d: stochastic.d[stochastic.d.length - 1],
            condition: stochasticCondition,
          },
        },
        vwap: {
          score: vwapScore,
          details: {
            vwap,
            currentPrice: closes[closes.length - 1],
            condition: vwapCondition,
          },
        },
        rsi: {
          score: rsiScore,
          details: {
            rsi: rsi[rsi.length - 1],
            condition: rsiCondition,
          },
        },
        macd: {
          score: macdScore,
          details: {
            macd: macd.macd[macd.macd.length - 1],
            signal: macd.signal[macd.signal.length - 1],
            crossingDate: macdCrossingDate,
            condition: macdCondition,
          },
        },
      },
      totalScreeningScore: totalScore,
      signals,
      volume: currentVolume,
      volumeFluctuation,
    });
  }

  await ScreenedCoin.deleteMany({});
  await ScreenedCoin.insertMany(screenedResults);
  return screenedResults;
}

async function getScreenedCoins() {
  return ScreenedCoin.find().sort({ totalScreeningScore: -1 });
}

module.exports = { getTop50RankedCoins, saveTop50CoinsToMongo, screenTop50Coins, getScreenedCoins };