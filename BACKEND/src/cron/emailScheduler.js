const cron = require('node-cron');
const UserRepository = require('../repositories/UserRepository');
const RankingRepository = require('../repositories/RankingRepository');
const EmailService = require('../services/EmailService');

// Cron job para enviar ranking semanal el lunes a las 00:00 UTC (domingo 21:00 Argentina)
function scheduleWeekendRankingEmail() {
  cron.schedule('0 0 * * 1', async () => {
    console.log('[CRON] Starting weekend ranking email job...');

    try {
      const users = await UserRepository.findAllActive();
      console.log(`[CRON] Found ${users.length} active users`);

      if (users.length === 0) {
        console.log('[CRON] No active users to email');
        return;
      }

      const generalRanking = await RankingRepository.getRankingGeneral({ page: 1, limit: 100 });
      const weeklyRanking = await RankingRepository.getLastClosedWeekRanking();

      if (!generalRanking || !weeklyRanking) {
        console.warn('[CRON] Unable to fetch ranking data');
        return;
      }

      console.log(`[CRON] General ranking: ${generalRanking.length} entries, Weekly ranking: ${weeklyRanking.length} entries`);

      await EmailService.sendWeekendRanking(users, {
        generalRanking,
        weeklyRanking,
      });

      console.log('[CRON] Weekend ranking email job completed successfully');
    } catch (err) {
      console.error('[CRON] Error in weekend ranking email job:', err);
    }
  });

  console.log('[CRON] Scheduled: Weekend ranking email every Monday 00:00 UTC (Sunday 21:00 Argentina)');
}

module.exports = { scheduleWeekendRankingEmail };
