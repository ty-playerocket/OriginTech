function onUse(event) {

    const player = event.getPlayer();

    if (event.getHand() !== org.bukkit.inventory.EquipmentSlot.HAND){
        player.sendMessage("该物品仅允许在主手使用");
        return;
    }

    const inventory = player.getInventory();
    const itemInMainHand = inventory.getItemInMainHand();

    if (itemInMainHand.getAmount() < 1) {
        return;
    }

    const currentLevel = player.getLevel();
    itemInMainHand.setAmount(itemInMainHand.getAmount() - 1);
    player.setLevel(currentLevel + 5);
}