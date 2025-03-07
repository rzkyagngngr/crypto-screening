function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    const ema = [prices[0]]; // Seed dengan harga pertama
    for (let i = 1; i < prices.length; i++) {
      ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }
  
  function calculateBollingerBands(prices, period, stdDev) {
    const sma = [];
    const upper = [];
    const lower = [];
  
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);
      sma.push(mean);
      upper.push(mean + stdDev * sd);
      lower.push(mean - stdDev * sd);
    }
    return { sma, upper, lower };
  }
  
  function calculateStochastic(highs, lows, closes, kPeriod, kSmooth, dSmooth) {
    const kValues = [];
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const high = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const low = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      const k = 100 * (closes[i] - low) / (high - low);
      kValues.push(k);
    }
  
    const dValues = [];
    for (let i = kSmooth - 1; i < kValues.length; i++) {
      const d = kValues.slice(i - kSmooth + 1, i + 1).reduce((a, b) => a + b, 0) / kSmooth;
      dValues.push(d);
    }
    return { k: kValues, d: dValues };
  }
  
  function calculateVWAP(ohlcv) {
    let totalVolume = 0;
    let totalPriceVolume = 0;
    ohlcv.forEach(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      totalPriceVolume += typicalPrice * candle.volume;
      totalVolume += candle.volume;
    });
    return totalPriceVolume / totalVolume;
  }
  
  function calculateRSI(prices, period) {
    const gains = [];
    const losses = [];
    for (let i = 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      gains.push(diff > 0 ? diff : 0);
      losses.push(diff < 0 ? -diff : 0);
    }
  
    const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const rs = avgGain / avgLoss;
    const rsi = [100 - 100 / (1 + rs)];
  
    for (let i = period; i < gains.length; i++) {
      const newAvgGain = (avgGain * (period - 1) + gains[i]) / period;
      const newAvgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      rsi.push(100 - 100 / (1 + newAvgGain / newAvgLoss));
    }
    return rsi;
  }
  
  function calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod) {
    const emaFast = calculateEMA(prices, fastPeriod);
    const emaSlow = calculateEMA(prices, slowPeriod);
    const macd = emaFast.map((f, i) => f - emaSlow[i]);
    const signal = calculateEMA(macd, signalPeriod);
    return { macd, signal };
  }
  
  module.exports = {
    calculateEMA,
    calculateBollingerBands,
    calculateStochastic,
    calculateVWAP,
    calculateRSI,
    calculateMACD,
  };