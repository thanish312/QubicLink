const logger = require('../utils/logger');
const cron = require('node-cron');
const { prisma } = require('../services/prisma');
const { addRoleSafe, removeRoleSafe } = require('../services/discord.service');
const CONFIG = require('../config/config');
const { withRetry } = require('../utils/retry');

const evaluateCondition = (condition, portfolio) => {
    const { all, any, asset, operator, value } = condition;

    if (all) {
        return all.every(subCondition => evaluateCondition(subCondition, portfolio));
    }

    if (any) {
        return any.some(subCondition => evaluateCondition(subCondition, portfolio));
    }

    const assetName = asset;
    const assetValue = portfolio[assetName] || 0n; // Default to 0 if asset not in portfolio

    switch (operator) {
        case 'gt':
            return assetValue > BigInt(value);
        case 'lt':
            return assetValue < BigInt(value);
        case 'eq':
            return assetValue === BigInt(value);
        default:
            return false;
    }
};

const processUserRoles = async (guild, user, roleThresholds, prismaClient) => {
    const prisma = prismaClient || require('../services/prisma').prisma;

    try {
        const member = await guild.members.fetch(user.discordId).catch(() => null);
        if (!member) {
            logger.debug({ userId: user.discordId }, 'Member not found in guild, skipping role assignment.');
            return;
        }

        await member.fetch();

        const portfolioData = await prisma.portfolio.findUnique({ where: { userId: user.discordId } });
        const ownedAssets = await prisma.ownedAsset.findMany({ where: { userId: user.discordId } });

        const portfolio = {
            QUBIC: portfolioData ? portfolioData.totalBalance : 0n,
            ...ownedAssets.reduce((acc, asset) => {
                acc[asset.assetName] = BigInt(asset.quantity);
                return acc;
            }, {}),
        };

        const qualifiedRoles = roleThresholds.filter(role => {
            try {
                return evaluateCondition(role.conditions, portfolio);
            } catch (e) {
                logger.error({ err: e, roleId: role.roleId, userId: user.discordId }, "Error evaluating role condition");
                return false;
            }
        });

        const qualifiedRoleIds = qualifiedRoles.map(r => r.roleId);

        // Assign new roles
        for (const role of qualifiedRoles) {
            if (!member.roles.cache.has(role.roleId)) {
                await addRoleSafe(member, role.roleId, role.roleName);
            }
        }

        // Remove unqualified roles
        for (const role of roleThresholds) {
            if (!qualifiedRoleIds.includes(role.roleId) && member.roles.cache.has(role.roleId)) {
                await removeRoleSafe(member, role.roleId, role.roleName);
            }
        }

    } catch (err) {
        logger.error({ userId: user.discordId, err }, 'Error processing user roles');
    }
};

const roleAssignmentJob = (client) => {
    try {
        cron.schedule('*/30 * * * *', async () => {
            logger.info('=== Role Assignment Job Started ===');

            try {
                const guild = await client.guilds
                    .fetch(CONFIG.GUILD_ID)
                    .catch(() => null);
                if (!guild) {
                    logger.error('Guild not found, aborting role assignment.');
                    return;
                }

                const roleThresholds = await withRetry(() =>
                    prisma.roleThreshold.findMany(), 'roleAssignmentJob-fetchThresholds');

                if (roleThresholds.length === 0) {
                    logger.info(
                        'No role thresholds configured. Skipping role assignment.'
                    );
                    return;
                }

                const users = await prisma.user.findMany();

                for (const user of users) {
                    await processUserRoles(
                        guild,
                        user,
                        roleThresholds
                    );
                }

                logger.info('=== Role Assignment Job Complete ===');
            } catch (error) {
                logger.error(
                    { err: error },
                    'Role assignment job critical failure after retries'
                );
            }
        });
    } catch (e) {
        logger.error({ err: e }, 'Failed to start role assignment job');
    }
};

module.exports = { roleAssignmentJob, processUserRoles };
