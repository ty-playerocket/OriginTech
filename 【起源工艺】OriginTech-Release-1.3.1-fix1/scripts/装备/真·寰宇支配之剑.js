function onWeaponHit(event, player, item) {

    const entity = event.getEntity();

    if (!(entity instanceof org.bukkit.entity.LivingEntity))
    return;

    if (entity instanceof org.bukkit.entity.Player && entity.getGameMode() === org.bukkit.GameMode.CREATIVE) {
        return;
    }

    const maxHealth = player.getMaxHealth();

    entity.setKiller(player);
    entity.setHealth(0);
    player.setHealth(maxHealth);

}

