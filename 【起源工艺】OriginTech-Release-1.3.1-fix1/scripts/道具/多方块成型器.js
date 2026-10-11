

var Bukkit = Java.type('org.bukkit.Bukkit');
var Material = Java.type('org.bukkit.Material');
var GameMode = Java.type('org.bukkit.GameMode');
var Action = Java.type('org.bukkit.event.block.Action');
var BlockBreakEvent = Java.type('org.bukkit.event.block.BlockBreakEvent');
var SlimefunItem = Java.type('io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem');
var SuperMultiBlockManager = Java.type('org.lins.mmmjjkx.rykenslimefuncustomizer.customs.super_multiblock.SuperMultiBlockManager');

// Adventure 组件惰性加载：缺料提示用可翻译组件，由客户端按玩家语言自动本地化
var ADVENTURE = null;
function tryLoadAdventure() {
    if (ADVENTURE !== null) return ADVENTURE;
    try {
        ADVENTURE = {
            Component: Java.type('net.kyori.adventure.text.Component'),
            Red: Java.type('net.kyori.adventure.text.format.NamedTextColor').RED
        };
    } catch (e) {
        ADVENTURE = false;
    }
    return ADVENTURE;
}

function cleanName(s) {
    return String(s)
        .replace(/\{#[0-9a-fA-F]{6}\}/g, '')
        .replace(/§x(§[0-9a-fA-F]){6}/g, '')
        .replace(/§./g, '');
}

function getVanillaName(mat) {
    return String(mat.name()).toLowerCase();
}

// 缺料提示：原版方块用可翻译组件（客户端本地化），粘液物品用其显示名；异常时回退纯文本
function sendMissingMessage(player, miss) {
    var adv = tryLoadAdventure();
    if (adv) {
        try {
            var msg = adv.Component.text('[成型器] 缺少材料: ', adv.Red);
            for (var i = 0; i < miss.length; i++) {
                if (i > 0) msg = msg.append(adv.Component.text('、', adv.Red));
                var nameComp = null;
                if (miss[i].mat) {
                    try { nameComp = adv.Component.translatable(miss[i].mat.translationKey()); } catch (e1) {}
                }
                if (!nameComp) nameComp = adv.Component.text(miss[i].name, adv.Red);
                msg = msg.append(nameComp).append(adv.Component.text(' x' + miss[i].count, adv.Red));
            }
            player.sendMessage(msg);
            return;
        } catch (e2) {}
    }
    var parts = [];
    for (var j = 0; j < miss.length; j++) parts.push(miss[j].name + ' x' + miss[j].count);
    player.sendMessage('§c[成型器] 缺少材料: ' + parts.join('、'));
}

function getClickedBlock(event) {
    try {
        var opt = event.getClickedBlock();
        if (opt) {
            if (opt.isPresent) {
                if (opt.get()) return opt.get();
            } else if (opt.getLocation) {
                return opt;
            }
        }
    } catch (e) {}
    try {
        return event.getInteractEvent().getClickedBlock();
    } catch (e2) {}
    return null;
}

function getSlimefunId(stack) {
    if (!stack || stack.getType() === Material.AIR) return null;
    try {
        var sf = SlimefunItem.getByItem(stack);
        return sf ? sf.getId() : null;
    } catch (e) {
        return null;
    }
}

function matchNeed(stack, key) {
    if (!stack || stack.getType() === Material.AIR) return false;
    if (key.indexOf('mc:') === 0) {
        return String(stack.getType().name()) === key.substring(3);
    }
    if (key.indexOf('sf:') === 0) {
        var id = getSlimefunId(stack);
        return id && String(id).toLowerCase() === key.substring(3).toLowerCase();
    }
    return false;
}

function countNeed(player, key) {
    var count = 0;
    var inv = player.getInventory();
    for (var i = 0; i < 36; i++) {
        var stack = inv.getItem(i);
        if (matchNeed(stack, key)) count += stack.getAmount();
    }
    var off = inv.getItem(40);
    if (matchNeed(off, key)) count += off.getAmount();
    return count;
}

function takeNeed(player, key, amount) {
    if (countNeed(player, key) < amount) return false;
    var inv = player.getInventory();
    for (var i = 0; i < 36 && amount > 0; i++) {
        var stack = inv.getItem(i);
        if (!matchNeed(stack, key)) continue;
        var take = Math.min(stack.getAmount(), amount);
        var left = stack.getAmount() - take;
        if (left <= 0) inv.setItem(i, null);
        else stack.setAmount(left);
        amount -= take;
    }
    if (amount > 0) {
        var off = inv.getItem(40);
        if (matchNeed(off, key)) {
            var take2 = Math.min(off.getAmount(), amount);
            if (off.getAmount() - take2 <= 0) inv.setItem(40, null);
            else off.setAmount(off.getAmount() - take2);
            amount -= take2;
        }
    }
    return true;
}

function getPartTarget(part) {
    try {
        var t = part.getTarget();
        if (t) return t;
    } catch (e) {}
    try {
        var field = part.getClass().getDeclaredField('target');
        field.setAccessible(true);
        return field.get(part);
    } catch (e2) {
        return null;
    }
}

function getPartBlockData(part) {
    try {
        var bd = part.getBlockData();
        if (bd) return bd;
    } catch (e) {}
    try {
        var field = part.getClass().getDeclaredField('blockData');
        field.setAccessible(true);
        return field.get(part);
    } catch (e2) {}
    return null;
}

// 物理放置部件方块（修复 RSC 粘液方块只写数据、不放实体方块的问题）
function placePartPhysical(loc, part) {
    try {
        var b = loc.getBlock();
        var bd = getPartBlockData(part);
        if (bd) {
            b.setBlockData(bd, false);
            return true;
        }
        var target = getPartTarget(part);
        if (target) {
            var mat = null;
            try {
                mat = target.getType();
            } catch (e1) {
                try {
                    mat = target.getItem().getItem().getType();
                } catch (e2) {}
            }
            if (mat && mat.isBlock()) {
                b.setType(mat, false);
                return true;
            }
        }
    } catch (e) {}
    return false;
}

// 模拟一次破坏事件检测建筑权限（兼容 Res 领地 / 圈地 / WorldGuard 等保护插件）
function hasBuildPermission(player, block) {
    try {
        var e = new BlockBreakEvent(block, player);
        try { e.setDropItems(false); } catch (ignored) {}
        Bukkit.getPluginManager().callEvent(e);
        return !e.isCancelled();
    } catch (err) {
        return true; // 检测异常时放行，避免插件冲突导致无法使用
    }
}

function isVanillaPart(part) {
    return String(part.getClass().getName()).indexOf('VanillaMultiBlockPart') !== -1;
}

function isSlimefunPart(part) {
    return String(part.getClass().getName()).indexOf('SlimefunMultiBlockPart') !== -1;
}

function onUse(event) {
    try {
        var player = event.getPlayer();
        var action = null;
        try { action = event.getAction(); } catch (e) {
            try { action = event.getInteractEvent().getAction(); } catch (e2) {}
        }
        if (action != null && action !== Action.RIGHT_CLICK_BLOCK) return false;

        var block = getClickedBlock(event);
        if (!block) return false;
        var loc = block.getLocation();

        var storage = SuperMultiBlockManager.getCoreStorage();
        var smb = storage.get(loc);
        if (!smb) return false;

        // 扫描缺失部件，统计所需材料并记录位置
        var needed = {};
        var display = {};
        var matByKey = {}; // mc: 键对应原版 Material，供可翻译组件使用
        var missingParts = [];
        var it = smb.getLocations().iterator();
        while (it.hasNext()) {
            var l = it.next();
            var part = smb.getPart(l);
            if (!part) continue;
            if (smb.isFormedCached(l)) continue;

            if (isVanillaPart(part)) {
                var data = getPartBlockData(part);
                var mat = data ? data.getMaterial() : null;
                if (!mat || !mat.isItem()) continue; // 水等非物品方块由 RSC 直接放置，不消耗
                var key = 'mc:' + mat.name();
                needed[key] = (needed[key] || 0) + 1;
                display[key] = getVanillaName(mat);
                matByKey[key] = mat;
            } else if (isSlimefunPart(part)) {
                var target = getPartTarget(part);
                var sfItem = target ? target.getItem() : null;
                if (!sfItem) continue;
                var sfKey = 'sf:' + sfItem.getId();
                needed[sfKey] = (needed[sfKey] || 0) + 1;
                display[sfKey] = sfItem.getId();
                try {
                    var meta = sfItem.getItem().getItemMeta();
                    if (meta && meta.hasDisplayName()) display[sfKey] = cleanName(meta.getDisplayName());
                } catch (e3) {}
            } else {
                continue; // 其他类型部件不处理
            }
            missingParts.push({ loc: l, part: part });
        }

        // 结构已成型：不提示，交给默认交互（避免刷屏）
        if (missingParts.length === 0) return false;

        // 创造模式：不检测背包，直接成型
        var creative = false;
        try { creative = player.getGameMode() === GameMode.CREATIVE; } catch (e4) {}

        if (!creative) {
            var miss = [];
            for (var key2 in needed) {
                var have = countNeed(player, key2);
                if (have < needed[key2]) {
                    miss.push({
                        key: key2,
                        mat: matByKey[key2] || null,
                        name: display[key2] || key2,
                        count: needed[key2] - have
                    });
                }
            }
            if (miss.length > 0) {
                sendMissingMessage(player, miss);
                return false;
            }
        }

        // 建筑权限检查：逐个缺失位置模拟破坏事件
        for (var i = 0; i < missingParts.length; i++) {
            if (!hasBuildPermission(player, missingParts[i].loc.getBlock())) {
                player.sendMessage('§c[多付款成型器] 你没有权限！');
                return false;
            }
        }

        // 消耗材料（仅生存模式）
        if (!creative) {
            for (var key3 in needed) takeNeed(player, key3, needed[key3]);
            try { player.updateInventory(); } catch (e5) {}
        }

        // 交由 RSC 成型：登记粘液方块数据、放置原版方块、更新成型缓存
        smb.buildMultiBlock(player);

        // 这里对全部缺失位置补放物理方块
        var placed = 0;
        for (var j = 0; j < missingParts.length; j++) {
            if (placePartPhysical(missingParts[j].loc, missingParts[j].part)) placed++;
        }

        try {
            Bukkit.getLogger().info('[多方块成型器] 核心=' + loc + ' 补放部件=' + placed + '/' + missingParts.length + (creative ? ' 创造模式' : ''));
        } catch (e6) {}

        player.sendMessage('§a[成型器] 搭建完成');
        return false;
    } catch (e) {
        try { event.getPlayer().sendMessage('§c[成型器] 成型失败: ' + e); } catch (e2) {}
        return false;
    }
}
