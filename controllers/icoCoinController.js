const icoCoinService = require('../services/icoCoinService');

const getIcoCoinsPotential = async (req, res) => {
  try {
    const icoCoinsPotential = await icoCoinService.getIcoCoinsPotential();
    if (!icoCoinsPotential || icoCoinsPotential.length === 0) {
      return res.status(404).json({ error: 'Tidak ada ICO ditemukan' });
    }
    res.json(icoCoinsPotential);
  } catch (error) {
    console.error('Error in getIcoCoinsPotential:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

module.exports = { getIcoCoinsPotential };