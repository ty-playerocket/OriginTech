// =================================================================================================================
// 自动嬗变机（自动版嬗变台）
// 机制：读取目标槽中粘液物品的id，将输入槽内的物品按 1:1 转化为目标粘液物品并送入输出槽
// 与手动嬗变台的区别：
//   1. 无需点击工作按钮，机器每个工作刻自动执行转化
//   2. 只有成功转化时才扣除输入物品（无目标物品 / 输出槽已满时不会清空输入）
// 槽位布局与嬗变台一致：9-17 输入槽，22 目标槽，36-44 输出槽
// =================================================================================================================

var SlimefunItem = Java.type("io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem");
var Material = Java.type("org.bukkit.Material");

var INPUT_SLOTS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
var GOAL_SLOT = 22;
var OUTPUT_SLOTS = [36, 37, 38, 39, 40, 41, 42, 43, 44];
var MAX_STACK = 64;

//黑名单，服主可根据需要自行添加或删减
var blackList = [
    "OT_创造模式箱子",
    "OT_终刻之门"
];

// =================================================================================================================
// 主循环：自动执行嬗变
// =================================================================================================================

function tick(info) {
    try {
        var menu = StorageCacheUtils.getMenu(info.block().getLocation());
        if (menu == null) return;

        //目标槽必须放入粘液物品，否则不工作（不扣除输入）
        var goalItem = menu.getItemInSlot(GOAL_SLOT);
        if (goalItem == null || goalItem.getType() === Material.AIR) return;

        var slimefunItem = SlimefunItem.getByItem(goalItem);
        if (slimefunItem == null) return;

        for (var i = 0; i < blackList.length; i++) {
            if (slimefunItem.getId() === blackList[i]) return;
        }

        var totalInput = countInput(menu);
        if (totalInput === 0) return;

        //通过粘液id重新构建产物（带存储的物品只会产出对应的空存储，与嬗变台一致）
        var resultTemplate = slimefunItem.getItem().clone();

        //输出槽剩余容量（空槽或与产物相同的槽才可接收）
        var capacity = countOutputCapacity(menu, resultTemplate);
        if (capacity === 0) return;

        var amount = Math.min(totalInput, capacity);

        consumeInput(menu, amount);
        produce(menu, resultTemplate, amount);
    } catch (e) {}
}

//统计输入槽物品总数
function countInput(menu) {
    var total = 0;
    for (var i = 0; i < INPUT_SLOTS.length; i++) {
        var item = menu.getItemInSlot(INPUT_SLOTS[i]);
        if (item != null && item.getType() !== Material.AIR) {
            total += item.getAmount();
        }
    }
    return total;
}

//统计输出槽还能接收多少产物
function countOutputCapacity(menu, template) {
    var capacity = 0;
    for (var i = 0; i < OUTPUT_SLOTS.length; i++) {
        var item = menu.getItemInSlot(OUTPUT_SLOTS[i]);
        if (item == null || item.getType() === Material.AIR) {
            capacity += MAX_STACK;
        } else if (item.isSimilar(template) && item.getAmount() < MAX_STACK) {
            capacity += MAX_STACK - item.getAmount();
        }
    }
    return capacity;
}

//从输入槽中扣除指定数量的物品
function consumeInput(menu, amount) {
    var remaining = amount;
    for (var i = 0; i < INPUT_SLOTS.length; i++) {
        if (remaining <= 0) break;

        var slot = INPUT_SLOTS[i];
        var item = menu.getItemInSlot(slot);
        if (item == null || item.getType() === Material.AIR) continue;

        var take = Math.min(item.getAmount(), remaining);
        remaining -= take;

        if (item.getAmount() - take <= 0) {
            menu.replaceExistingItem(slot, null);
        } else {
            item.setAmount(item.getAmount() - take);
            menu.replaceExistingItem(slot, item);
        }
    }
}

//向输出槽放入指定数量的产物：先补满已有堆叠，再填入空槽
function produce(menu, template, amount) {
    var remaining = amount;

    for (var i = 0; i < OUTPUT_SLOTS.length; i++) {
        if (remaining <= 0) break;

        var slot = OUTPUT_SLOTS[i];
        var item = menu.getItemInSlot(slot);
        if (item == null || item.getType() === Material.AIR) continue;
        if (!item.isSimilar(template) || item.getAmount() >= MAX_STACK) continue;

        var toAdd = Math.min(MAX_STACK - item.getAmount(), remaining);
        item.setAmount(item.getAmount() + toAdd);
        remaining -= toAdd;
        menu.replaceExistingItem(slot, item);
    }

    for (var j = 0; j < OUTPUT_SLOTS.length; j++) {
        if (remaining <= 0) break;

        var outputSlot = OUTPUT_SLOTS[j];
        var outputItem = menu.getItemInSlot(outputSlot);
        if (outputItem == null || outputItem.getType() === Material.AIR) {
            var fill = Math.min(MAX_STACK, remaining);
            var newItem = template.clone();
            newItem.setAmount(fill);
            remaining -= fill;
            menu.replaceExistingItem(outputSlot, newItem);
        }
    }
}

// =================================================================================================================
// 事件处理：右键打开菜单
// =================================================================================================================

function onUse(event) {
    var blockOpt = event.getClickedBlock();
    if (!blockOpt.isPresent()) return;

    var menu = StorageCacheUtils.getMenu(blockOpt.get().getLocation());
    if (menu != null) {
        menu.open(event.getPlayer());
        event.cancel();
    }
}
