const plugin = org.bukkit.Bukkit.getPluginManager().getPlugin("RykenSlimefunCustomizer");
const Bukkit = Java.type('org.bukkit.Bukkit');
const JavaRunnable = Java.extend(Java.type('java.lang.Runnable'));
const EquipmentSlot = Java.type('org.bukkit.inventory.EquipmentSlot');
const Particle = Java.type('org.bukkit.Particle');
const Attribute = Java.type('org.bukkit.attribute.Attribute');
const LivingEntityClass = Java.type('org.bukkit.entity.LivingEntity');

const CFG = {
    name: '裁决',
    // ---- 威势 ----
    maxMight: 10,              //威势层数上限
    mightBonusPerStack: 0.05,  //每层威势提供5%增伤（独立乘区）
    decayTicks: 200,           //长时间不攻击（10秒）威势清空
    // ---- 冲刺 ----
    dashPower: 2.4,            //冲刺速度
    dashY: 0.2,                //冲刺时Y轴初速度
    dashDuration: 12,          //冲刺判定持续时间（tick）
    dashRadius: 2.2,           //冲刺命中半径
    dashDamageMultiplier: 2.0, //冲刺造成双倍伤害（独立乘区）
    executeRatio: 2.0,         //冲刺命中目标生命值低于你最大生命值的200%时直接击杀
    fallbackBaseDamage: 300.0, //基础伤害
    // ---- 特效 ----
    trailParticle: Particle.CLOUD,            //冲刺拖尾粒子
    hitParticle: Particle.SWEEP_ATTACK,       //冲刺命中粒子
    dashSound: "entity.breeze.wind_burst"     //冲刺音效
};

const playerData = new java.util.HashMap();

let scriptApplyingDamage = false;

function getData(uuid) {
    if (playerData.containsKey(uuid)) return playerData.get(uuid);
    const data = { stacks: 0, resetTask: null, dashing: false, dashTask: null };
    playerData.put(uuid, data);
    return data;
}

//读取玩家近战攻击力
function getMeleeBaseDamage(player) {
    try {
        let attr = player.getAttribute(Attribute.GENERIC_ATTACK_DAMAGE);
        if (attr === null) {
            const modernAttr = Attribute.ATTACK_DAMAGE;
            if (modernAttr) attr = player.getAttribute(modernAttr);
        }
        if (attr !== null) return attr.getValue();
    } catch (e) {
        //忽略，使用兜底值
    }
    return CFG.fallbackBaseDamage;
}

//（重新）安排威势衰减任务，每次命中都会刷新为10秒
function refreshDecay(uuid) {
    const data = playerData.get(uuid);
    if (data.resetTask !== null) {
        try {
            data.resetTask.cancel();
        } catch (e) {
            //任务可能已结束，忽略
        }
    }
    data.resetTask = Bukkit.getScheduler().runTaskLater(plugin, new JavaRunnable({
        run: function () {
            const d = playerData.get(uuid);
            if (d) {
                d.stacks = 0;
                d.resetTask = null;
                if (!d.dashing) playerData.remove(uuid);
            }
        }
    }), CFG.decayTicks);
}

//清空威势（长时间不攻击或释放冲刺后调用）
function resetMight(uuid) {
    const data = playerData.get(uuid);
    if (!data) return;
    if (data.resetTask !== null) {
        try {
            data.resetTask.cancel();
        } catch (e) {
            //任务可能已结束，忽略
        }
        data.resetTask = null;
    }
    data.stacks = 0;
    if (!data.dashing) playerData.remove(uuid);
}

function createDashHitEffect(entity) {
    const world = entity.getWorld();
    const loc = entity.getLocation();
    world.spawnParticle(CFG.hitParticle,
        loc.getX(), loc.getY() + entity.getHeight() / 2, loc.getZ(),
        3, 0.4, 0.4, 0.4, 0);
}

//冲刺命中单个目标：满足斩杀线直接击杀，否则造成双倍伤害
function dashHit(player, entity) {
    createDashHitEffect(entity);

    //生命值低于你最大生命值的200%，直接击杀
    if (entity.getHealth() < player.getMaxHealth() * CFG.executeRatio) {
        entity.setHealth(0);
        return;
    }

    //攻击附加最大生命值的伤害，威势增伤为独立乘区，冲刺双倍为独立乘区
    const baseDamage = getMeleeBaseDamage(player) + player.getMaxHealth();
    const mightMultiplier = 1 + CFG.maxMight * CFG.mightBonusPerStack;
    const damage = baseDamage * mightMultiplier * CFG.dashDamageMultiplier;

    scriptApplyingDamage = true;
    try {
        entity.damage(damage, player);
    } finally {
        scriptApplyingDamage = false;
    }
}

//威势达到顶峰后，右键发动冲刺
function onUse(event) {
    const player = event.getPlayer();
    if (event.getHand() !== EquipmentSlot.HAND) return;

    const uuid = player.getUniqueId().toString();
    const data = playerData.get(uuid);
    if (!data || data.stacks < CFG.maxMight || data.dashing) return;

    //释放冲刺后威势清空（先标记冲刺中，避免数据被清掉）
    data.dashing = true;
    resetMight(uuid);

    const world = player.getWorld();
    world.playSound(player.getLocation(), CFG.dashSound, 1.0, 1.2);

    const velocity = player.getEyeLocation().getDirection().normalize()
        .multiply(CFG.dashPower).setY(CFG.dashY);
    player.setVelocity(velocity);

    const hitTargets = [];
    let ticks = 0;

    const dashTask = Bukkit.getScheduler().runTaskTimer(plugin, new JavaRunnable({
        run: function () {
            ticks++;

            const loc = player.getLocation();

            //冲刺拖尾
            world.spawnParticle(CFG.trailParticle,
                loc.getX(), loc.getY() + 0.2, loc.getZ(),
                4, 0.2, 0.1, 0.2, 0.01);

            //判定冲刺路径上命中的目标，每个目标只受一次冲刺伤害
            const nearbyEntities = world.getNearbyLivingEntities(
                loc, CFG.dashRadius, 1.5, CFG.dashRadius);
            for (let i = 0; i < nearbyEntities.size(); i++) {
                const entity = nearbyEntities.get(i);
                if (entity === player || !(entity instanceof LivingEntityClass)) continue;

                const entityUuid = entity.getUniqueId().toString();
                if (hitTargets.indexOf(entityUuid) !== -1) continue;
                hitTargets.push(entityUuid);

                dashHit(player, entity);
            }

            if (ticks >= CFG.dashDuration) {
                dashTask.cancel();
                const d = playerData.remove(uuid);
                if (d && d.resetTask !== null) {
                    try {
                        d.resetTask.cancel();
                    } catch (e) {
                        //任务可能已结束，忽略
                    }
                }
            }
        }
    }), 0, 1);
    data.dashTask = dashTask;
}

function onWeaponHit(event, player, item) {
    //脚本自身造成的伤害不再二次处理
    if (scriptApplyingDamage) return;

    const entity = event.getEntity();
    if (!(entity instanceof LivingEntityClass)) return;

    const uuid = player.getUniqueId().toString();
    const data = getData(uuid);

    //每命中一次增加一点威势，上限10点
    if (data.stacks < CFG.maxMight) {
        data.stacks++;
        //威势达到顶峰时提醒玩家（仅首次达到时提醒一次）
        if (data.stacks === CFG.maxMight) {
            player.sendMessage("§d✧ 你的气势已经达到了巅峰！");
        }
    }

    //你的攻击附加最大生命值的伤害；威势增伤为独立乘区
    const baseDamage = event.getDamage() + player.getMaxHealth();
    const finalDamage = baseDamage * (1 + data.stacks * CFG.mightBonusPerStack);
    event.setDamage(finalDamage);

    //刷新“长时间不攻击则威势清空”的计时（10秒）
    refreshDecay(uuid);
}

//玩家退出时清理数据与定时任务
const PlayerQuitEvent = Java.type('org.bukkit.event.player.PlayerQuitEvent');
const EventPriority = Java.type('org.bukkit.event.EventPriority');
Bukkit.getPluginManager().registerEvent(PlayerQuitEvent,
    new (Java.extend(org.bukkit.event.Listener, {})), EventPriority.NORMAL, (l, e) => {
        const uuid = e.getPlayer().getUniqueId().toString();
        const data = playerData.remove(uuid);
        if (data) {
            if (data.resetTask !== null) {
                try {
                    data.resetTask.cancel();
                } catch (ex) {
                    //任务可能已结束，忽略
                }
            }
            if (data.dashTask !== null) {
                try {
                    data.dashTask.cancel();
                } catch (ex) {
                    //任务可能已结束，忽略
                }
            }
        }
    }, plugin);
