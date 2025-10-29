const lastUseTimes = new Map();

function onWeaponHit(event, player, item) {
    const damage = event.getDamage();
    const entity = event.getEntity();
    const health = entity.getHealth();
    const maxHealth = entity.getMaxHealth();
    if (health < maxHealth * 0.5 && health > 0) {
        event.setDamage(damage * 1.25);
    }
}

function onUse(event){
   const player = event.getPlayer();
   const playerId = player.getUniqueId();
   const currentTime = new Date().getTime();

  if(event.getHand() !== org.bukkit.inventory.EquipmentSlot.HAND){
    player.sendMessage("请置于主手");
    return;
  }

  if (lastUseTimes.has(playerId)) {
    const lastUseTime = lastUseTimes.get(playerId);
    if (currentTime - lastUseTime < 12000) {
      const remainingTime = Math.ceil((12000 - (currentTime - lastUseTime)) / 1000);
      const item = player.getInventory().getItemInMainHand();
      const itemMeta = item.getItemMeta();
      const lore = itemMeta.getLore().slice(0, -2);
      lore.push(`§e║§9§l冷却剩余时间 : ${remainingTime}`);
      lore.push('§e╚═══════════════════════════════════════╝')
      itemMeta.setLore(lore);
      item.setItemMeta(itemMeta);
      return;
    }
  }

  lastUseTimes.set(playerId, currentTime);

  executeSkill(player);

}

function executeSkill(player) {
    const playerMaxHealth = player.getMaxHealth();
    const maxDamage = playerMaxHealth * 5; // 最大伤害限制

    // 获取周围10格内的所有生物
    const nearbyEntities = player.getNearbyEntities(10, 10, 10);
    let hitCount = 0;

    for (let i = 0; i < nearbyEntities.length; i++) {
        const entity = nearbyEntities[i];

        // 只对活着的生物生效，排除玩家和自己
        if (isValidTarget(entity, player)) {
            const damage = calculateDamage(entity, maxDamage);
            if (damage > 0) {
                applyDamage(entity, damage, player);
                hitCount++;
            }
        }
    }

    if (hitCount > 0) {
        player.sendMessage("对 " + hitCount + " 个目标造成了伤害");
    } else {
        player.sendMessage("§7附近没有可攻击的目标");
    }
}

function isValidTarget(entity, player) {
    // 排除非生物实体
    if (!(entity instanceof org.bukkit.entity.LivingEntity)) {
        return false;
    }

    // 排除玩家自己
    if (entity === player) {
        return false;
    }
    return true;
}

function calculateDamage(entity, maxDamage) {
    const targetMaxHealth = entity.getMaxHealth();

    // 计算目标最大生命值的50%
    let damage = targetMaxHealth * 0.5;

    // 应用伤害限制
    damage = Math.min(damage, maxDamage);

    return damage;
}

function applyDamage(entity, damage, damager) {
    entity.damage(damage, damager);
}