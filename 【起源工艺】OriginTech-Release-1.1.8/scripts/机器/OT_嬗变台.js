const ItemStack = Java.type("org.bukkit.inventory.ItemStack");
const SlimefunItem = Java.type("io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem");
const Material = Java.type("org.bukkit.Material");
const HashMap = Java.type("java.util.HashMap");

const WORK = 31;
const OUTPUT_SLOTS = [36, 37, 38, 39, 40, 41, 42, 43, 44];
const INPUT_SLOTS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const GOAL_SLOTS = 22;

const cooldowns = new HashMap();

function onOpen(player){

}
function onClose(player){

}

const blackList = {
    




}

function onClick(player, slot, slotItem, clickAction){
    if (slot === WORK) {
        if (!clickAction.isRightClicked() && clickAction.isShiftClicked()) {
            return;
        }
        if (!clickAction.isRightClicked() && !clickAction.isShiftClicked()) {
            copyItem(player);
            return;
        }
    }
}

function copyItem(player) {
    const inv = player.getOpenInventory().getTopInventory();
    let totalAmount = getInputItemCount(player, inv);

    if (totalAmount === 0) {
        player.sendMessage("可恶的神人，竟然想空手套白狼？");
        return;
    }

    let goalSlotItem = inv.getItem(GOAL_SLOTS);
    if (goalSlotItem == null) {
        player.sendMessage("请放入目标物品");
        return;
    }

    let slimefunItem = SlimefunItem.getByItem(goalSlotItem);
    if (slimefunItem == null) {
        player.sendMessage("请放入粘液物品！");
        return;
    }

    // 清空输入槽
    for (let slot of INPUT_SLOTS) {
        inv.clear(slot);
    }

    let outputAmount = totalAmount > 64 ? 64 : totalAmount;
    let success = false;
    let remainingAmount = outputAmount;
    let itemToOutput = slimefunItem.getItem().clone();

    for (let outputSlot of OUTPUT_SLOTS) {
        let existingItem = inv.getItem(outputSlot);
        if (existingItem != null && existingItem.isSimilar(itemToOutput)) {
            let existingAmount = existingItem.getAmount();
            if (existingAmount < 64) {
                let canAdd = 64 - existingAmount;
                let toAdd = Math.min(canAdd, remainingAmount);
                existingItem.setAmount(existingAmount + toAdd);
                remainingAmount -= toAdd;
                inv.setItem(outputSlot, existingItem);
                if (remainingAmount <= 0) {
                    success = true;
                    break;
                }
            }
        } else if (existingItem == null) {
            let toAdd = Math.min(64, remainingAmount);
            let newItem = itemToOutput.clone();
            newItem.setAmount(toAdd);
            inv.setItem(outputSlot, newItem);
            remainingAmount -= toAdd;
            if (remainingAmount <= 0) {
                success = true;
                break;
            }
        }
    }

    if (success) {
        player.sendMessage("刷物成功");
    } else {
        player.sendMessage("输出槽已满，无法生成！");
    }

    resetMachineState(inv);
}

function getInputItemCount(player, inv) {
    let totalAmount = 0;
    for (let slot of INPUT_SLOTS) {
        let slotItem = inv.getItem(slot);
        if (slotItem != null) {
            totalAmount += slotItem.getAmount();
        }
    }
    return totalAmount;
}
//有🐖盐浸虾没有分清大小写导致出现了这么一个东西
function test(player){
    player.sendMessage("点击输入文字");
}

function resetMachineState(inv) {

}