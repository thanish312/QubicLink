const logger = require('../../utils/logger');
const { prisma } = require('../../services/prisma');
const { DISCORD_ERROR_CODES } = require('../constants');

module.exports = async (interaction, commandId) => {
    logger.info({ commandId, user: interaction.user.tag }, 'Portfolio command');

    try {
        // 1. Defer the reply IMMEDIATELY.
        await interaction.deferReply({ ephemeral: true });

        // 2. Do the slow work.
        const wallets = await prisma.wallet.findMany({
            where: { userId: interaction.user.id },
        });

        if (wallets.length === 0) {
            logger.debug({ commandId }, 'No wallets found');
            return interaction.editReply(
                'You have no linked wallets. Use `/link` to add one.'
            );
        }

        const portfolio = await prisma.portfolio.findUnique({ where: { userId: interaction.user.id } });
        const ownedAssets = await prisma.ownedAsset.findMany({ where: { userId: interaction.user.id } });

        let totalBalance = portfolio ? portfolio.totalBalance : 0n;

        const walletList = wallets.map((w, i) => {
            return `${i + 1}. ${w.address.slice(0, 8)}... ${
                w.isVerified
                    ? `✅`
                    : '⏳ Pending verification'
            }`;
        }).join('\n');

        const assetList = ownedAssets.map(a => `**${a.assetName}:** ${BigInt(a.quantity).toLocaleString()}`).join('\n');

        // 3. Edit the reply with the final result.
        await interaction.editReply({
            content: `### 💼 Your Portfolio\n\n**Wallets:**\n${walletList}\n\n**Qubic Balance:** ${totalBalance.toLocaleString()} QUBIC\n\n**Other Assets:**\n${assetList}`,
        });

        logger.info(
            {
                commandId,
                walletCount: wallets.length,
                totalBalance: totalBalance.toString(),
            },
            'Portfolio displayed'
        );
    } catch (e) {
        // This will catch errors from the deferReply or initial prisma query.
        if (e.code !== DISCORD_ERROR_CODES.UNKNOWN_INTERACTION) {
            logger.error({ commandId, err: e }, 'Portfolio command failed');
            // If we already deferred, we have to use editReply.
            if (!interaction.replied) {
                await interaction
                    .editReply({
                        content:
                            'An error occurred while fetching your portfolio.',
                    })
                    .catch(() => {});
            }
        }
    }
};
