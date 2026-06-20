const PotionEffectType = Java.type('org.bukkit.potion.PotionEffectType');
const PotionEffect = Java.type('org.bukkit.potion.PotionEffect');

const CFG = {
    extraDamageMultiplier: 0.4,          // 额外伤害倍率
    offhandExtraDamageMultiplier: 0.6,   // 副手持有特定装备时的额外伤害倍率（攻击力的60%）
    offhandItemId: 'OT_失落的咏叹调',     // 副手判定的特定装备ID
    killEffectType: PotionEffectType.DAMAGE_RESISTANCE, // 击杀后给予的状态效果类型
    killEffectDuration: 40,              // 击杀后状态效果持续时间（tick），40tick = 2秒
    killEffectAmplifier: 3               // 击杀后状态效果等级（3对应抗性提升IV）
};

function onWeaponHit(event, player, item) {
    const entity = event.getEntity();

    if (!(entity instanceof org.bukkit.entity.LivingEntity))
        return;

    const offhandItem = player.getInventory().getItemInOffHand();
    const slimefunItem = SlimefunItem.getByItem(offhandItem);
    const hasOffhandBuff = slimefunItem !== null && slimefunItem.getId() === CFG.offhandItemId;

    const multiplier = hasOffhandBuff ? CFG.offhandExtraDamageMultiplier : CFG.extraDamageMultiplier;

    const baseDamage = event.getDamage();
    const extraDamage = baseDamage * multiplier;
    entity.damage(extraDamage);

    if (entity.getHealth() - extraDamage <= 0) {
        player.addPotionEffect(new PotionEffect(
            CFG.killEffectType,
            CFG.killEffectDuration,
            CFG.killEffectAmplifier
        ));
    }
}
