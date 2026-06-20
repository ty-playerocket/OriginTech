const ItemStack = Java.type("org.bukkit.inventory.ItemStack");
const SlimefunItem = Java.type("io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem");

function onUse(event) {

    const player = event.getPlayer();

    if (event.getHand() !== org.bukkit.inventory.EquipmentSlot.HAND){
        player.sendMessage("该物品仅允许在主手使用");
        return;
    }

    const health = player.getHealth();
    const maxHealth = player.getMaxHealth();
    const sfItem = SlimefunItem.getById("OT_BLOOD")

    if (health < 3) {
        player.sendMessage("你感到虚弱无比，剩余的生命力不足以支撑你继续献祭");
        return;
    }

    player.setHealth(health - 2);

    const is = sfItem.getItem();
    player.getInventory().addItem(is);

}