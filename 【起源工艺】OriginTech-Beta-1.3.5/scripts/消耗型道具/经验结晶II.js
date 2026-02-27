function onUse(event) {
    const player = event.getPlayer();
    const currentLevel = player.getLevel();
    const inventory = player.getInventory();
    const itemInMainHand = inventory.getItemInMainHand();
    itemInMainHand.setAmount(itemInMainHand.getAmount() - 1);
    player.setLevel(currentLevel + 5);
}