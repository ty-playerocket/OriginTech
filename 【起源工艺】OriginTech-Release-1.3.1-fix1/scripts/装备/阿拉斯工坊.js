const PotionEffectType = Java.type('org.bukkit.potion.PotionEffectType');
const PotionEffect = Java.type('org.bukkit.potion.PotionEffect');

const CFG = {
    weaknessDuration: 100,   // 虚弱持续时间（tick），100tick = 5秒
    weaknessAmplifier: 2,    // 虚弱等级（0对应虚弱I）
    hitCooldownMs: 500       // 命中冷却时间（毫秒），防止效果频繁刷新
};

const playerCooldowns = new Map();

function onWeaponHit(event, player, item) {
    const entity = event.getEntity();

    if (!(entity instanceof org.bukkit.entity.LivingEntity)) {
        return;
    }

    // 冷却检查，避免短时间内频繁施加效果
    const now = Date.now();
    const playerId = player.getUniqueId().toString();
    if (playerCooldowns.has(playerId) && now - playerCooldowns.get(playerId) < CFG.hitCooldownMs) {
        return;
    }
    playerCooldowns.set(playerId, now);

    // 对目标施加虚弱效果
    entity.addPotionEffect(new PotionEffect(
        PotionEffectType.WEAKNESS,
        CFG.weaknessDuration,
        CFG.weaknessAmplifier
    ));
}
