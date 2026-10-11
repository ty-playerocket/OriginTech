const CFG = {
    damageMultiplier: 1.2,  //提升20%伤害（1.0基础 + 0.2提升）
    buffDurationMs: 5000    //增伤持续时间（毫秒），lore未标明，默认5秒；每次命中刷新
};

// uuid -> 最近一次命中的时间戳
const buffs = new Map();

function onWeaponHit(event, player, item) {
    const uuid = player.getUniqueId().toString();
    const now = Date.now();

    //处于增伤持续时间内，本次伤害提升20%
    if (buffs.has(uuid) && now - buffs.get(uuid) < CFG.buffDurationMs) {
        event.setDamage(event.getDamage() * CFG.damageMultiplier);
    }

    //击中后激活/刷新增伤计时
    buffs.set(uuid, now);
}
