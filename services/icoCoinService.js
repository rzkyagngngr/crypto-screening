const axios = require('axios');
const cheerio = require('cheerio');

async function getIcoCoinsPotential() {
  try {
    // Ambil data dari ICO Bench (scraping)
    const url = 'https://icobench.com/icos';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const icoList = [];
    $('.ico_list tr').each((index, element) => {
      if (index === 0) return; // Lewati header tabel

      const name = $(element).find('.name a').text().trim();
      const symbol = $(element).find('.name small').text().trim() || 'N/A';
      const dates = $(element).find('.date').text().trim().split(' - ');
      const startDate = dates[0] || 'N/A';
      const endDate = dates[1] || 'N/A';
      const description = $(element).find('.description').text().trim() || 'No description available';
      const rating = parseFloat($(element).find('.rate').text().trim()) || 0;
      const targetFund = $(element).find('.goal').text().trim() || 'N/A';
      const category = $(element).find('.category').text().trim() || 'Unknown';

      // Hitung skor potensi (sederhana untuk gratis)
      const potentialScore = calculatePotential(rating, startDate, endDate, targetFund);
      
      icoList.push({
        name,
        symbol,
        startDate,
        endDate,
        description,
        rating,
        targetFund,
        category,
        potentialScore: potentialScore.total.toFixed(2),
        details: {
          ratingScore: potentialScore.ratingScore,
          timeUrgency: potentialScore.timeUrgency,
          targetFundScore: potentialScore.targetFundScore,
          hypeScore: potentialScore.hypeScore,
        },
        recommendation: getRecommendation(potentialScore.total),
      });
    });

    return icoList.slice(0, 10); // Batasi ke 10 ICO untuk contoh
  } catch (error) {
    console.error('Error fetching ICO data:', error.message);
    return [];
  }
}

function calculatePotential(rating, startDate, endDate, targetFund) {
  // Skor rating (0-10 berdasarkan 0-5 dari ICO Bench)
  const ratingScore = Math.min(10, rating * 2);

  // Skor urgensi waktu (tinggi jika dekat mulai/akhir)
  const today = new Date();
  const start = new Date(startDate.split('/').reverse().join('-'));
  const end = new Date(endDate.split('/').reverse().join('-'));
  const daysToStart = (start - today) / (1000 * 60 * 60 * 24);
  const daysToEnd = (end - today) / (1000 * 60 * 60 * 24);
  const timeUrgency = Math.min(10, Math.max(1, daysToStart < 7 || daysToEnd < 7 ? 8 : 5));

  // Skor target dana (rendah = realistis, tinggi = sulit)
  const fundValue = parseFloat(targetFund.replace(/[^0-9.]/g, '')) || Infinity;
  const targetFundScore = fundValue <= 2000000 ? 8 : fundValue <= 5000000 ? 6 : 4;

  // Skor hype (asumsi kategori populer seperti DeFi/Gaming = lebih tinggi)
  const hypeScore = 3; // Nilai statis karena tidak ada data view dari scraping

  // Total skor (disesuaikan ke 0-100)
  const total = (ratingScore * 0.4) + (timeUrgency * 0.3) + (targetFundScore * 0.2) + (hypeScore * 0.1);
  return {
    ratingScore,
    timeUrgency,
    targetFundScore,
    hypeScore,
    total: total * 10,
  };
}

function getRecommendation(score) {
  if (score >= 80) return 'Sangat Potensial - Pertimbangkan untuk Ikut';
  if (score >= 60) return 'Potensial - Pantau dan Pertimbangkan dengan Hati-hati';
  if (score >= 40) return 'Biasa Saja - Risiko Sedang';
  return 'Kurang Potensial - Hindari untuk Sekarang';
}

module.exports = { getIcoCoinsPotential };