const CFG = {
    baseMaxHealthMultiplier: 0.75,           // 基础生命值伤害转化率
    baseCreatureBonusRate: 0.05,             // 每个敌对生物提供的增伤比例
    offhandMaxHealthMultiplier: 0.90,        // 副手加成后的转化率
    offhandCreatureBonusRate: 0.07,          // 副手加成后的增伤比例
    offhandItemId: 'OT_天国的交响乐',        // 副手判定ID
    scanRadius: 10,                          // 扫描半径
    maxCreatureCount: 20,                    // 参与增伤计算的生物数量上限（防止伤害崩坏）
    hitCooldownMs: 500                       // 扫描冷却时间（毫秒），防止高频连击卡服
};

// 用于存储玩家的扫描冷却时间
const playerCooldowns = new Map();

function onWeaponHit(event, player, item) {
    const entity = event.getEntity();

    if (!(entity instanceof org.bukkit.entity.LivingEntity)) {
        return;
    }

    const now = Date.now();
    const playerId = player.getUniqueId().toString();
    if (playerCooldowns.has(playerId) && now - playerCooldowns.get(playerId) < CFG.hitCooldownMs) {
        return;
    }
    playerCooldowns.set(playerId, now);

    const offhandItem = player.getInventory().getItemInOffHand();
    const slimefunItem = SlimefunItem.getByItem(offhandItem);
    const hasOffhandBuff = slimefunItem !== null && slimefunItem.getId() === CFG.offhandItemId;

    const healthMultiplier = hasOffhandBuff ? CFG.offhandMaxHealthMultiplier : CFG.baseMaxHealthMultiplier;
    const creatureBonusRate = hasOffhandBuff ? CFG.offhandCreatureBonusRate : CFG.baseCreatureBonusRate;

    const maxHealth = player.getMaxHealth();

    const nearbyEntities = player.getLocation().getNearbyLivingEntities(CFG.scanRadius);
    let hostileCount = 0;

    for (let i = 0; i < nearbyEntities.size(); i++) {
        const nearbyEntity = nearbyEntities.get(i);

        if (!nearbyEntity.equals(player) && !nearbyEntity.isDead() && nearbyEntity instanceof org.bukkit.entity.Monster) {
            hostileCount++;
            if (hostileCount >= CFG.maxCreatureCount) {
                break;
            }
        }
    }

    const finalMultiplier = 1.0 + (hostileCount * creatureBonusRate);
    const extraDamage = maxHealth * healthMultiplier * finalMultiplier;
    entity.damage(extraDamage, player);
}
