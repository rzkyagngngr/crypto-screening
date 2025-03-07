const axios = require('axios');
const natural = require('natural');
require('dotenv').config();

const CMC_API_KEY = process.env.CMC_API_KEY;
const CRYPTOPANIC_API_KEY = process.env.CRYPTOPANIC_API_KEY;

let knownCoins = {};

async function fetchKnownCoins() {
  try {
    const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
    const response = await axios.get(url, {
      headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
      params: {
        limit: 100,
        sort: 'market_cap',
      },
    });

    knownCoins = response.data.data.reduce((acc, coin) => {
      acc[coin.symbol] = coin.name;
      return acc;
    }, {});
    console.log('Top 100 coins by market cap fetched successfully:', Object.keys(knownCoins).length);
  } catch (error) {
    console.error('Error fetching known coins:', error.message);
    knownCoins = { BTC: 'Bitcoin', ETH: 'Ethereum' };
  }
}

async function getNewCoinsPotential() {
  await fetchKnownCoins();

  const newCoins = await getNewCoins();
  if (!newCoins || newCoins.length === 0) return [];

  const globalData = await getGlobalMarketData();
  const results = [];

  // Proses koin satu per satu dengan delay
  for (const coin of newCoins) {
    const potentialScore = calculatePotential({ ...coin, marketData: globalData });
    const affiliations = await getAffiliations(coin.symbol);
    results.push({
      coin: coin.name,
      symbol: coin.symbol,
      listingDate: coin.date_added,
      lastVolumeUSD: coin.quote.USD.volume_24h,
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply,
      marketCoins: coin.num_market_pairs,
      affiliations,
      potentialScore: potentialScore.total.toFixed(2),
      details: {
        pumpEffect: potentialScore.pumpEffect,
        volume: potentialScore.volume,
        tokenomics: potentialScore.tokenomics,
        marketCondition: potentialScore.marketCondition,
      },
      recommendation: getRecommendation(potentialScore.total),
    });
    // Tunggu 10 detik sebelum koin berikutnya
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

async function getNewCoins() {
  const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
  const response = await axios.get(url, {
    headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
    params: { limit: 500 },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return response.data.data.filter(coin => {
    const addedDate = new Date(coin.date_added);
    return addedDate >= thirtyDaysAgo;
  });
}

async function getGlobalMarketData() {
  const url = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
  const response = await axios.get(url, {
    headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
  });

  const data = response.data.data;
  return {
    marketCapChange24h: data.quote.USD.total_market_cap_yesterday_percentage_change,
    btcDominance: data.btc_dominance,
  };
}

function calculatePotential(coinData) {
  const priceChange = coinData.quote.USD.percent_change_24h || 0;
  const pumpEffect = Math.min(10, Math.max(1, Math.floor(priceChange / 50)));

  const volume = coinData.quote.USD.volume_24h || 0;
  const volumeScore = Math.min(10, Math.max(1, Math.floor(volume / 1000000)));

  const circSupply = coinData.circulating_supply || 0;
  const totalSupply = coinData.total_supply || Infinity;
  const supplyRatio = circSupply / totalSupply;
  const tokenomics = Math.min(10, Math.max(1, Math.floor((1 - supplyRatio) * 10)));

  const marketCapChange = coinData.marketData.marketCapChange24h || 0;
  const btcDominance = coinData.marketData.btcDominance || 50;
  const marketCondition = marketCapChange > 0 && btcDominance < 50 
    ? 8 + Math.min(2, marketCapChange / 2) 
    : Math.max(1, Math.floor(marketCapChange + 5));

  const total = (pumpEffect * 0.1) + (volumeScore * 0.25) + (tokenomics * 0.2) + (marketCondition * 0.1);

  return {
    pumpEffect,
    volume: volumeScore,
    tokenomics,
    marketCondition,
    total: total * 10,
  };
}

async function getAffiliations(symbol) {
  try {
    // await new Promise(resolve => setTimeout(resolve, 2000));
    const newsUrl = `https://cryptopanic.com/api/v1/posts/?auth_token=${CRYPTOPANIC_API_KEY}&filter=hot¤cies=${symbol}`;
    const response = await axios.get(newsUrl);
    const news = response.data.results || [];

    if (news.length === 0) {
      return {
        airdrop: "Tidak diketahui",
        sameDev: "Tidak diketahui",
        exDevFrom: "Tidak diketahui",
      };
    }

    const tokenizer = new natural.WordTokenizer();
    const text = news.map(post => `${post.title} ${post.metadata?.description || ''}`).join(' ').toLowerCase();
    const words = tokenizer.tokenize(text);

    const airdrop = detectAirdrop(words);
    const sameDev = detectSameDev(words);
    const exDevFrom = detectExDev(words);

    return { airdrop, sameDev, exDevFrom };
  } catch (error) {
    console.error(`Error fetching affiliations for ${symbol}:`, error.message);
    return {
      airdrop: "Tidak diketahui",
      sameDev: "Tidak diketahui",
      exDevFrom: "Tidak diketahui",
    };
  }
}

function detectAirdrop(words) {
  const airdropKeywords = ['airdrop', 'free', 'giveaway', 'distributed', 'reward'];
  if (!airdropKeywords.some(kw => words.includes(kw))) return "Tidak diketahui";

  for (const [symbol, name] of Object.entries(knownCoins)) {
    if (words.includes(symbol.toLowerCase()) || words.includes(name.toLowerCase())) {
      const index = words.indexOf(symbol.toLowerCase()) || words.indexOf(name.toLowerCase());
      if (words.slice(index - 5, index + 5).some(w => airdropKeywords.includes(w))) {
        return `Airdrop dari ${name} (${symbol})`;
      }
    }
  }
  return "Mungkin ada airdrop, koin terkait tidak jelas";
}

function detectSameDev(words) {
  const devKeywords = ['developer', 'dev', 'team', 'same', 'created', 'built'];
  if (!devKeywords.some(kw => words.includes(kw))) return "Tidak diketahui";

  for (const [symbol, name] of Object.entries(knownCoins)) {
    if (words.includes(symbol.toLowerCase()) || words.includes(name.toLowerCase())) {
      const index = words.indexOf(symbol.toLowerCase()) || words.indexOf(name.toLowerCase());
      if (words.slice(index - 5, index + 5).some(w => devKeywords.includes(w))) {
        return `Developer sama dengan ${name} (${symbol})`;
      }
    }
  }
  return "Mungkin developer sama, koin terkait tidak jelas";
}

function detectExDev(words) {
  const exDevKeywords = ['ex-', 'former', 'previously', 'worked', 'developer', 'dev', 'team'];
  if (!exDevKeywords.some(kw => words.includes(kw))) return "Tidak diketahui";

  for (const [symbol, name] of Object.entries(knownCoins)) {
    if (words.includes(symbol.toLowerCase()) || words.includes(name.toLowerCase())) {
      const index = words.indexOf(symbol.toLowerCase()) || words.indexOf(name.toLowerCase());
      if (words.slice(index - 5, index + 5).some(w => exDevKeywords.includes(w))) {
        return `Mantan developer dari ${name} (${symbol})`;
      }
    }
  }
  return "Mungkin ada mantan dev, koin asal tidak jelas";
}

function getRecommendation(score) {
  if (score >= 80) return 'Sangat Potensial - Pertimbangkan untuk Beli';
  if (score >= 60) return 'Potensial - Pantau dan Beli dengan Hati-hati';
  if (score >= 40) return 'Biasa Saja - Risiko Sedang';
  return 'Kurang Potensial - Hindari untuk Sekarang';
}

module.exports = { getNewCoinsPotential };