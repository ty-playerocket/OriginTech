const ItemStack = Java.type("org.bukkit.inventory.ItemStack");
const SlimefunItem = Java.type("io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem");
const Material = Java.type("org.bukkit.Material");
const HashMap = Java.type("java.util.HashMap");

const WORK = 31;
const OUTPUT_SLOTS = [36, 37, 38, 39, 40, 41, 42, 43, 44];
const INPUT_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const GOAL_SLOTS = 22;


function onOpen(player){
}
function onClose(player){
}

function onClick(player, slot, slotItem, clickAction){
    if (slot === WORK) {
        if (!clickAction.isRightClicked() && clickAction.isShiftClicked()) {
            killPlayer(player);
            return;
        }
        if (!clickAction.isRightClicked() && !clickAction.isShiftClicked()) {
            killPlayer(player);
            return;
        }
    }
}

function killPlayer(player){
    player.sendMessage("大胆！竟然想刷物？");
    player.setHealth(0);
}