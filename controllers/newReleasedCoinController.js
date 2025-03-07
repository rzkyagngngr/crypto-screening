const newReleasedCoinService = require('../services/newReleasedCoinService');

const getNewCoinsPotential = async (req, res) => {
  try {
    const newCoinsPotential = await newReleasedCoinService.getNewCoinsPotential();
    if (!newCoinsPotential || newCoinsPotential.length === 0) {
      return res.status(404).json({ error: 'Tidak ada koin baru ditemukan' });
    }
    res.json(newCoinsPotential);
  } catch (error) {
    console.error('Error in getNewCoinsPotential:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

module.exports = { getNewCoinsPotential };