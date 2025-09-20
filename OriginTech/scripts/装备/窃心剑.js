function onWeaponHit(event, player, item) {
    const damage = event.getDamage();
    const health = player.getHealth();
    const maxHealth = player.getMaxHealth();
    if (health == maxHealth) {
    runOpCommand(player, "effect " + "give " + player.getName() + " absorption " + "3 " + "0 ");
    } else {
    player.setHealth(health + (damage * 0.08));
    }
}