const CFG = {
    HealingMultiplier: 0.1, // 治疗倍率（最大生命值）
    CooldownTicks: 40       // 冷却时间（Tick），60 tick = 3秒
}

function onUse(event) {
    const player = event.getPlayer();

    if (event.getHand() !== org.bukkit.inventory.EquipmentSlot.OFF_HAND) {
        player.sendMessage("§c该物品仅允许在副手使用!");
        return;
    }

    // 检查是否在冷却中
    if (player.hasCooldown(event.getItem().getType())) {
        // 可选：显示剩余冷却时间
        const remaining = player.getCooldown(event.getItem().getType()) / 20; // 转换为秒
        player.sendMessage(`§c该物品还在冷却中，请 ${remaining.toFixed(1)} 秒后再试!`);
        return;
    }

    const health = player.getHealth();
    const maxHealth = player.getMaxHealth();
    const healing = maxHealth * CFG.HealingMultiplier;

    // 应用治疗
    player.setHealth(Math.min(health + healing, maxHealth));

    // 设置冷却
    player.setCooldown(event.getItem().getType(), CFG.CooldownTicks);

    // 可选：显示成功消息
    player.sendMessage(`§a成功恢复了 ${healing.toFixed(1)} 点生命值!`);
}
