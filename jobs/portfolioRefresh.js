const logger = require('../utils/logger');
const cron = require('node-cron');
const { prisma } = require('../services/prisma');
const { getQubicBalance, getOwnedAssets } = require('../services/qubic.service');
const CONFIG = require('../config/config');
const { withRetry } = require('../utils/retry');

let rpcFailures = 0;
let isCooldown = false;

const fetchWalletsGroupedByUser = async () => {
    return withRetry(
        () =>
            prisma.wallet.findMany({
                where: { isVerified: true },
                select: { userId: true, address: true },
            }),
        'fetchWalletsGroupedByUser'
    );
};

const updateUserPortfolio = async (
    userId,
    userWalletAddresses,
    stats
) => {
    try {
        // Fetch Qubic balance
        const balancePromises = userWalletAddresses.map((addr) =>
            getQubicBalance(addr)
        );
        const balances = await Promise.all(balancePromises);
        const totalNetWorth = balances.reduce((acc, curr) => acc + curr, 0n);

        // Fetch and process owned assets
        const ownedAssetsPromises = userWalletAddresses.map((addr) => getOwnedAssets(addr));
        const allOwnedAssets = (await Promise.all(ownedAssetsPromises)).flat();

        const assetMap = new Map();
        for (const asset of allOwnedAssets) {
            const assetName = asset.data.issuedAsset.name;
            const quantity = BigInt(asset.data.numberOfUnits);

            if (assetMap.has(assetName)) {
                assetMap.set(assetName, assetMap.get(assetName) + quantity);
            } else {
                assetMap.set(assetName, quantity);
            }
        }

        // Update database in a transaction
        await prisma.$transaction(async (tx) => {
            // Update portfolio with Qubic balance
            await tx.portfolio.upsert({
                where: { userId },
                update: { totalBalance: totalNetWorth },
                create: { userId, totalBalance: totalNetWorth },
            });

            // Clear old assets and add new ones
            await tx.ownedAsset.deleteMany({ where: { userId } });
            if (assetMap.size > 0) {
                await tx.ownedAsset.createMany({
                    data: Array.from(assetMap.entries()).map(([assetName, quantity]) => ({
                        userId,
                        assetName,
                        quantity: quantity.toString(),
                    })),
                });
            }
        });

        stats.processed++;
    } catch (err) {
        if (
            err.message &&
            (err.message.includes('RPC') || err.message.includes('fetch'))
        ) {
            stats.skipped++;
            rpcFailures++;
            logger.warn(
                { userId, err },
                'Skipped user portfolio update due to RPC/Network error'
            );
        } else {
            stats.errors++;
            logger.error({ userId, err }, 'Error processing user portfolio');
        }
    }
};

const runPortfolioRefresh = async () => {
    if (isCooldown) {
        logger.warn(
            'RPC circuit breaker is active. Skipping portfolio refresh.'
        );
        return;
    }

    logger.info('=== Portfolio Refresh Started ===');
    const startTime = Date.now();

    try {
        const wallets = await fetchWalletsGroupedByUser();
        const userMap = new Map();
        wallets.forEach((w) => {
            if (!userMap.has(w.userId)) userMap.set(w.userId, []);
            userMap.get(w.userId).push(w.address);
        });
        const userIds = Array.from(userMap.keys());
        logger.info(
            { userCount: userIds.length, walletCount: wallets.length },
            'Processing user portfolios'
        );

        const stats = {
            processed: 0,
            errors: 0,
            skipped: 0,
        };

        for (
            let i = 0;
            i < userIds.length;
            i += CONFIG.PORTFOLIO_REFRESH_BATCH_SIZE
        ) {
            const batchUserIds = userIds.slice(
                i,
                i + CONFIG.PORTFOLIO_REFRESH_BATCH_SIZE
            );

            await Promise.all(
                batchUserIds.map(async (userId) => {
                    const userWalletAddresses = userMap.get(userId);
                    await updateUserPortfolio(
                        userId,
                        userWalletAddresses,
                        stats
                    );
                })
            );

            if (i + CONFIG.PORTFOLIO_REFRESH_BATCH_SIZE < userIds.length) {
                await new Promise((r) =>
                    setTimeout(r, CONFIG.PORTFOLIO_REFRESH_BATCH_DELAY_MS)
                );
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.info(
            { ...stats, duration, userCount: userIds.length },
            '=== Portfolio Refresh Complete ==='
        );

        if (rpcFailures >= CONFIG.RPC_FAILURE_THRESHOLD) {
            logger.warn(
                'RPC failure threshold reached. Activating circuit breaker.'
            );
            isCooldown = true;
            setTimeout(() => {
                logger.info(
                    'RPC circuit breaker cooldown finished. Resuming normal operations.'
                );
                isCooldown = false;
                rpcFailures = 0;
            }, CONFIG.RPC_COOLDOWN_MS);
        } else {
            rpcFailures = 0;
        }

        return { ...stats, duration, userCount: userIds.length }; // Return stats on completion
    } catch (error) {
        logger.error({ err: error }, 'Portfolio refresh critical failure');
    }
};

const portfolioRefreshJob = (client) => {
    try {
        const task = cron.schedule(CONFIG.PORTFOLIO_REFRESH_JOB_SCHEDULE, () =>
            runPortfolioRefresh(client)
        );
        return task;
    } catch (e) {
        logger.error({ err: e }, 'Failed to start portfolio refresh job');
        return null;
    }
};

module.exports = { portfolioRefreshJob, runPortfolioRefresh };
