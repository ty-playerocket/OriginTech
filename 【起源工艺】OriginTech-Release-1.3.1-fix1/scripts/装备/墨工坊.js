const CFG = {
    bonusMultiplier: 1.3,     // 命中时额外造成30%伤害（1.0 基础 + 0.3 额外 = 1.3）
    healthRestoreRate: 0.01,  // 恢复1%最大生命值
    foodRestore: 3,           // 恢复3点饱食度
    maxFoodLevel: 20,         // 饱食度上限
    hitCooldownMs: 500        // 恢复效果的命中冷却（毫秒），防止频繁触发
};

const playerCooldowns = new Map();

function onWeaponHit(event, player, item) {
    const entity = event.getEntity();

    if (!(entity instanceof org.bukkit.entity.LivingEntity)) {
        return;
    }

    // 额外造成30%伤害：直接修改本次伤害事件，无递归
    event.setDamage(event.getDamage() * CFG.bonusMultiplier);

    // 冷却检查，防止短时间内频繁触发恢复效果
    const now = Date.now();
    const playerId = player.getUniqueId().toString();
    if (playerCooldowns.has(playerId) && now - playerCooldowns.get(playerId) < CFG.hitCooldownMs) {
        return;
    }
    playerCooldowns.set(playerId, now);

    // 恢复1%最大生命值
    const maxHealth = player.getMaxHealth();
    const health = player.getHealth();
    const healAmount = maxHealth * CFG.healthRestoreRate;
    player.setHealth(Math.min(health + healAmount, maxHealth));

    // 恢复3点饱食度
    const foodLevel = player.getFoodLevel();
    player.setFoodLevel(Math.min(foodLevel + CFG.foodRestore, CFG.maxFoodLevel));
}
