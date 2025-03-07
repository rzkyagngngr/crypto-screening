const mongoose = require('mongoose');

const newReleasedCoinSchema = new mongoose.Schema({
  symbol: String,
  name: String,
  listingDate: String,
  lastVolumeUSD: Number,
  circulatingSupply: Number,
  totalSupply: Number,
  marketCoins: Number,
  affiliations: {
    airdrop: String,
    sameDev: String,
    exDevFrom: String,
  },
  potentialScore: Number,
  details: {
    pumpEffect: Number,
    volume: Number,
    tokenomics: Number,
    marketCondition: Number,
  },
  recommendation: String,
  timestamp: { type: Date, default: Date.now },
});

const NewReleasedCoin = mongoose.model('NewReleasedCoin', newReleasedCoinSchema, 'newReleasedCoins');

module.exports = { NewReleasedCoin };