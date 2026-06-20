function onWeaponHit(event, player, item) {
    var entity = event.getEntity();

    if (!(entity instanceof org.bukkit.entity.LivingEntity))
    return;

    var chance = 0.25;

    if (Math.random() < chance) {
        var damage = event.getDamage();
        var extraDamage = damage * 0.5;

        entity.damage(extraDamage, player);

        spawnMagicParticles(entity);
    }
}

function spawnMagicParticles(entity) {
    var world = entity.getWorld();
    var location = entity.getLocation();

    world.spawnParticle(
        org.bukkit.Particle.SPELL_WITCH,
        location,
        20,
        0.5,
        0.5,
        0.5
    );
}
