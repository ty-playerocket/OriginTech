const PotionEffectType = Java.type('org.bukkit.potion.PotionEffectType');
const PotionEffect = Java.type('org.bukkit.potion.PotionEffect');

const CFG = {
    crippleDuration: 200,        // 残废（缓慢）持续时间（tick），200tick = 10秒
    crippleAmplifier: 9,         // 残废等级（缓慢10）
    bonusMultiplier: 1.8         // 攻击残废目标时的伤害倍率（1.0 基础 + 0.8 额外 = 1.8）
};

function onWeaponHit(event, player, item) {
    const entity = event.getEntity();

    if (!(entity instanceof org.bukkit.entity.LivingEntity)) {
        return;
    }

    if (entity.hasPotionEffect(PotionEffectType.SLOWNESS)) {
        event.setDamage(event.getDamage() * CFG.bonusMultiplier);
    }

    // 使目标残废
    entity.addPotionEffect(new PotionEffect(
        PotionEffectType.SLOWNESS,
        CFG.crippleDuration,
        CFG.crippleAmplifier
    ));
}
