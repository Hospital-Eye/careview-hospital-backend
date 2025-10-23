const cron = require('node-cron');
const { Op } = require('sequelize');

/**
 * Cleanup Cron Job for CVEvent and MP4Event TTL
 *
 * MongoDB had TTL indexes that auto-deleted documents after 72 hours.
 * PostgreSQL doesn't have native TTL, so we use a cron job to periodically clean up old records.
 *
 * Default schedule: Every 6 hours
 * Default TTL: 72 hours
 */

let cleanupJob = null;

const initCleanupCron = (db) => {
  const schedule = process.env.CLEANUP_CRON_SCHEDULE || '0 */6 * * *'; // Every 6 hours by default
  const ttlHours = parseInt(process.env.EVENT_TTL_HOURS || '72', 10);

  console.log(`🕒 Initializing cleanup cron job`);
  console.log(`   Schedule: ${schedule}`);
  console.log(`   TTL: ${ttlHours} hours`);

  cleanupJob = cron.schedule(schedule, async () => {
    try {
      console.log('🧹 Starting cleanup of old CVEvent and MP4Event records...');

      const cutoffDate = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

      // Cleanup CVEvent records
      const cvEventCount = await db.CVEvent.destroy({
        where: {
          createdAt: {
            [Op.lt]: cutoffDate
          }
        }
      });

      // Cleanup MP4Event records
      const mp4EventCount = await db.MP4Event.destroy({
        where: {
          createdAt: {
            [Op.lt]: cutoffDate
          }
        }
      });

      console.log(`✅ Cleanup completed:`);
      console.log(`   - Deleted ${cvEventCount} CVEvent records`);
      console.log(`   - Deleted ${mp4EventCount} MP4Event records`);
      console.log(`   - Cutoff date: ${cutoffDate.toISOString()}`);

    } catch (error) {
      console.error('❌ Cleanup cron job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });

  console.log('✅ Cleanup cron job initialized successfully');
};

const stopCleanupCron = () => {
  if (cleanupJob) {
    cleanupJob.stop();
    console.log('⏹️  Cleanup cron job stopped');
  }
};

module.exports = {
  initCleanupCron,
  stopCleanupCron
};
