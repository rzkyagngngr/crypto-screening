const whatsappService = require('../services/whatsappService');

const sendGroupMessage = async (req, res) => {
  const { groupId, content } = req.body;
  try {
    await whatsappService.sendMessage(groupId, content);
    res.json({ status: 'success', message: `Pesan terkirim ke grup ${groupId}`, content });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengirim pesan', details: error.message });
  }
};

const scheduleGroupMessage = async (req, res) => {
  const { groupId, content, schedule } = req.body;
  try {
    await whatsappService.scheduleMessage(groupId, content, schedule);
    res.json({ status: 'success', message: `Pesan dijadwalkan ke grup ${groupId}`, schedule });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menjadwalkan pesan', details: error.message });
  }
};

module.exports = { sendGroupMessage, scheduleGroupMessage };