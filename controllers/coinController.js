const coinService = require('../services/coinService');

const getTop50Coins = async (req, res) => {
  try {
    const top50Coins = await coinService.getTop50RankedCoins();
    res.json(top50Coins);
  } catch (error) {
    console.error('Error in getTop50Coins:', error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const saveTop50Coins = async (req, res) => {
  try {
    await coinService.saveTop50CoinsToMongo();
    res.json({ message: 'Top 50 coins saved to MongoDB successfully' });
  } catch (error) {
    console.error('Error in saveTop50Coins:', error.message);
    res.status(500).json({ error: 'Failed to save coins to MongoDB' });
  }
};

const getScreenedCoins = async (req, res) => {
  try {
    const screenedCoins = await coinService.getScreenedCoins();
    res.json(screenedCoins);
  } catch (error) {
    console.error('Error in getScreenedCoins:', error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const screenTop50CoinsOnDemand = async (req, res) => {
  try {
    const screenedCoins = await coinService.screenTop50Coins();
    res.json({ message: 'Top 50 coins screened successfully', data: screenedCoins });
  } catch (error) {
    console.error('Error in screenTop50CoinsOnDemand:', error.message);
    res.status(500).json({ error: 'Failed to screen coins' });
  }
};

module.exports = { getTop50Coins, saveTop50Coins, getScreenedCoins, screenTop50CoinsOnDemand };