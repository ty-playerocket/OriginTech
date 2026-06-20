const CFG = {
    weight1: 55,//造成80%伤害基础权重
    weight2: 34,//额外造成50%伤害基础权重
    weight3: 10,//自身受到10%最大生命值伤害基础权重
    weight4: 1//造成十倍伤害基础权重
}

function onWeaponHit(event, player, item) {
    const entity = event.getEntity();
    const currentLevel = player.getLevel()
    const damage = event.getDamage();
    const maxHealth = player.getMaxHealth();

    //可以在下方修改权重计算公式
    const w1 = Math.max(40, CFG.weight1 - currentLevel);
    const w2 = Math.min(50, CFG.weight2 + currentLevel);
    const w3 = Math.max(1, CFG.weight3 - currentLevel);
    const w4 = Math.min(9, CFG.weight4 + currentLevel / 10);

    if (!(entity instanceof org.bukkit.entity.LivingEntity)) {
        return;
    }

    const totalWeight = w1 + w2 + w3 + w4;
    let chance = Math.random() * totalWeight;

    if ((chance = chance - w1) < 0) {
        event.setDamage(damage * 0.8);
    } else if ((chance = chance - w2) < 0) {
        const extraDamage = damage * 0.5;
        entity.damage(extraDamage);
        spawnMagicParticles1(entity);
    } else if ((chance = chance - w3) < 0) {
        event.setDamage(0);
        player.damage(maxHealth * 0.1);
    } else {
        event.setDamage(damage * 10.0);
        spawnMagicParticles2(entity);
    }
}

function spawnMagicParticles1(entity) {
    var world = entity.getWorld();
    var location = entity.getLocation();

    world.spawnParticle(
        org.bukkit.Particle.FLAME,
        location,
        20,
        0.5,
        0.5,
        0.5
    );
}

function spawnMagicParticles2(entity) {
    var world = entity.getWorld();
    var location = entity.getLocation();

    world.spawnParticle(
        org.bukkit.Particle.SPELL_WITCH,
        location,
        30,
        0.5,
        0.5,
        0.5
    );
}
