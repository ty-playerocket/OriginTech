const plugin = org.bukkit.Bukkit.getPluginManager().getPlugin("RykenSlimefunCustomizer");
const Bukkit = Java.type('org.bukkit.Bukkit');
const JavaRunnable = Java.extend(Java.type('java.lang.Runnable'));
const EquipmentSlot = Java.type('org.bukkit.inventory.EquipmentSlot');
const Particle = Java.type('org.bukkit.Particle');
const Attribute = Java.type('org.bukkit.attribute.Attribute');
const LivingEntityClass = Java.type('org.bukkit.entity.LivingEntity');
const SlimefunItem = Java.type('io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem');

const CFG = {
    id: 'OT_双星贯月',
    baseBonusDamage: 2000,          //固定基础伤害值，与玩家伤害值相加后再乘倍率
    releaseTicks: 10,             //超过该tick没有新的心跳即判定松开右键（客户端按住时约每4tick一个包）

    //蓄力阶段（tick）
    stage2At: 60,                 //3秒
    stage3At: 120,                //6秒
    stage4At: 240,                //12秒
    halfSecondTicks: 10,          //0.5秒对应的tick

    //阶段一：不足3秒
    t1Rate: 0.5,                  //50%伤害
    t1Particle: Particle.END_ROD,

    //阶段二：3~6秒，多重幻影投枪（齐射，起始点在玩家周围随机）
    t2BaseCount: 3,               //3秒时基础数量
    t2BaseRate: 0.3,              //3秒时基础伤害倍率
    t2StartRadiusXZ: 4.0,         //随机起始点水平半径
    t2StartRadiusY: 2.0,          //随机起始点垂直半径
    t2SpreadYaw: 7,               //各投枪水平散射幅度（度）
    t2SpreadPitch: 5,             //各投枪俯仰散射幅度（度）
    t2Particle: Particle.ENCHANT,

    //阶段三：6~12秒，连续穿透幻影投枪（流式发射）
    t3BaseCount: 4,               //6秒时基础数量
    t3BaseRate: 0.8,              //6秒时基础伤害倍率
    t3BaseDistance: 25,           //6秒时基础飞行距离
    t3StreamInterval: 2,          //穿透投枪发射间隔（tick）
    t3Particle: Particle.CRIT,

    //阶段四：达到12秒，毁灭投枪
    t4Rate: 120.0,                //12000%伤害
    t4Distance: 50,
    t4ExplosionRate: 0.25,        //爆炸造成目标最大生命值25%的伤害
    t4ExplosionCapRate: 10.0,     //爆炸伤害不超过自身最大生命值的1000%
    t4ExplosionRadius: 6.0,       //大爆炸半径
    t4Particle: Particle.SONIC_BOOM,

    //投枪通用
    moveSteps: 10,                //飞行步进数
    hitRadius: 1.6,               //命中半径
    javelinSound: "item.trident.throw",
    explosionSound: "entity.generic.explode"
    //如果服主需要修改例如伤害的配置，记得也要同时修改物品的lore
};

// uuid -> 蓄力状态 { task, ticks, sinceBeat, stage }
const charges = new Map();

function rand(min, max) {
    return min + Math.random() * (max - min);
}

//读取属性值（兼容1.21.3前后属性名）
function readAttribute(holder, legacyName, modernName) {
    try {
        let attr = holder.getAttribute(Attribute[legacyName]);
        if (attr === null && Attribute[modernName] !== undefined && Attribute[modernName] !== null) {
            attr = holder.getAttribute(Attribute[modernName]);
        }
        if (attr !== null) return attr.getValue();
    } catch (e) {
        //忽略
    }
    return 0;
}

//玩家伤害值
function getPlayerDamage(player) {
    return readAttribute(player, 'GENERIC_ATTACK_DAMAGE', 'ATTACK_DAMAGE');
}

//最大生命值
function getMaxHealth(entity) {
    return readAttribute(entity, 'GENERIC_MAX_HEALTH', 'MAX_HEALTH');
}

//判定物品是否为本武器
function isWeapon(item) {
    const sfItem = SlimefunItem.getByItem(item);
    return sfItem !== null && sfItem.getId() === CFG.id;
}

//以指定yaw/pitch偏移获取视线方向
function dirWithOffset(player, yawOff, pitchOff) {
    const eye = player.getEyeLocation();
    let pitch = eye.getPitch() + pitchOff;
    if (pitch > 90) pitch = 90;
    if (pitch < -90) pitch = -90;
    const temp = new org.bukkit.Location(player.getWorld(), 0, 0, 0,
        eye.getYaw() + yawOff, pitch);
    return temp.getDirection();
}

//生成一道投枪（纯粒子，非真实弹射物）
//pierce为true贯穿敌人，false命中第一个目标即止
function fireJavelin(player, startLoc, dir, distance, damage, particle, pierce, onHit) {
    const world = player.getWorld();
    const stepDist = distance / CFG.moveSteps;
    const state = { point: startLoc.clone(), hits: [] };

    let step = 0;
    const task = Bukkit.getScheduler().runTaskTimer(plugin, new JavaRunnable({
        run: function () {
            //发射者中途退出则停止
            if (!player.isOnline()) {
                task.cancel();
                return;
            }
            state.point = state.point.add(dir.clone().multiply(stepDist));

            world.spawnParticle(particle,
                state.point.getX(), state.point.getY(), state.point.getZ(),
                2, 0.05, 0.05, 0.05, 0);

            const nearby = world.getNearbyLivingEntities(state.point, CFG.hitRadius, 1.2, CFG.hitRadius);
            for (let i = 0; i < nearby.size(); i++) {
                const entity = nearby.get(i);
                if (entity === player || !(entity instanceof LivingEntityClass)) continue;
                if (entity.isDead()) continue;

                const uuid = entity.getUniqueId().toString();
                if (state.hits.indexOf(uuid) !== -1) continue;
                state.hits.push(uuid);

                entity.setNoDamageTicks(0);
                entity.damage(damage, player);

                if (onHit) onHit(state.point.clone(), entity);

                if (!pierce) {
                    task.cancel();
                    return;
                }
            }

            step++;
            if (step >= CFG.moveSteps) {
                task.cancel();
            }
        }
    }), 0, 1);
}

//毁灭投枪的大爆炸
function destructionExplosion(world, point, target, player) {
    world.spawnParticle(Particle.EXPLOSION_EMITTER,
        point.getX(), point.getY(), point.getZ(), 3, 1, 1, 1, 0);
    world.playSound(point, CFG.explosionSound, 1.5, 0.8);

    //爆炸伤害：目标最大生命值的25%，且不超过自身最大生命值的1000%
    const damage = Math.min(getMaxHealth(target) * CFG.t4ExplosionRate,
        getMaxHealth(player) * CFG.t4ExplosionCapRate);

    const nearby = world.getNearbyLivingEntities(point,
        CFG.t4ExplosionRadius, CFG.t4ExplosionRadius, CFG.t4ExplosionRadius);
    for (let i = 0; i < nearby.size(); i++) {
        const entity = nearby.get(i);
        if (entity === player || entity === target) continue;
        if (!(entity instanceof LivingEntityClass) || entity.isDead()) continue;

        entity.setNoDamageTicks(0);
        entity.damage(damage, player);
    }
}

//根据蓄力时长发射对应投枪
function releaseCharge(player, ticks) {
    const world = player.getWorld();
    //基数 = 玩家伤害值 + 固定基础伤害值
    const playerDamage = getPlayerDamage(player) + CFG.baseBonusDamage;
    world.playSound(player.getLocation(), CFG.javelinSound, 1.0, 1.0);

    //阶段一：一道幻影投枪，50%
    if (ticks < CFG.stage2At) {
        fireJavelin(player, player.getEyeLocation(),
            player.getEyeLocation().getDirection(), CFG.t3BaseDistance,
            playerDamage * CFG.t1Rate, CFG.t1Particle, false, null);
        return;
    }

    //阶段二：多重幻影投枪齐射，起始点在玩家周围随机
    if (ticks < CFG.stage3At) {
        //只计算额外蓄力时间（超出3秒的部分），每0.5秒为一个增量
        const extra = Math.floor((ticks - CFG.stage2At) / CFG.halfSecondTicks);
        const count = CFG.t2BaseCount + 2 * extra;
        const rate = CFG.t2BaseRate + 0.1 * extra;
        const base = player.getLocation();

        for (let i = 0; i < count; i++) {
            const start = base.clone().add(
                rand(-CFG.t2StartRadiusXZ, CFG.t2StartRadiusXZ),
                rand(0, CFG.t2StartRadiusY) + 1,
                rand(-CFG.t2StartRadiusXZ, CFG.t2StartRadiusXZ)
            );
            const dir = dirWithOffset(player,
                rand(-CFG.t2SpreadYaw, CFG.t2SpreadYaw),
                rand(-CFG.t2SpreadPitch, CFG.t2SpreadPitch));
            fireJavelin(player, start, dir, CFG.t3BaseDistance,
                playerDamage * rate, CFG.t2Particle, false, null);
        }
        return;
    }

    //阶段三：连续穿透幻影投枪（流式）
    if (ticks < CFG.stage4At) {
        //只计算额外蓄力时间（超出6秒的部分），每0.5秒：数量+2、倍率+10%、距离+5
        const extra = Math.floor((ticks - CFG.stage3At) / CFG.halfSecondTicks);
        const count = CFG.t3BaseCount + 2 * extra;
        const rate = CFG.t3BaseRate + 0.1 * extra;
        const distance = CFG.t3BaseDistance + 5 * extra;

        let fired = 0;
        const streamTask = Bukkit.getScheduler().runTaskTimer(plugin, new JavaRunnable({
            run: function () {
                const eye = player.getEyeLocation();
                fireJavelin(player, eye, eye.getDirection(), distance,
                    playerDamage * rate, CFG.t3Particle, true, null);

                fired++;
                if (fired >= count) {
                    streamTask.cancel();
                }
            }
        }), 0, CFG.t3StreamInterval);
        return;
    }

    //阶段四：毁灭投枪
    const eyeLoc = player.getEyeLocation();
    fireJavelin(player, eyeLoc, eyeLoc.getDirection(), CFG.t4Distance,
        playerDamage * CFG.t4Rate, CFG.t4Particle, false,
        function (hitPoint, entity) {
            destructionExplosion(world, hitPoint, entity, player);
        });
}

//清理蓄力状态（不发射）
function abortCharge(uuid) {
    if (charges.has(uuid)) {
        charges.get(uuid).task.cancel();
        charges.delete(uuid);
    }
}

function onUse(event) {
    const player = event.getPlayer();
    if (event.getHand() !== EquipmentSlot.HAND) return;
    //onUse收到的是Slimefun的PlayerRightClickEvent，触发即代表右键，无需再判断Action
    if (!isWeapon(player.getInventory().getItemInMainHand())) return;

    //取消原版三叉戟行为（投掷/激流），按住时的重复交互作为心跳
    //PlayerRightClickEvent不是Cancellable，使用其自带的cancel()
    event.cancel();

    const uuid = player.getUniqueId().toString();
    let charge = charges.get(uuid);

    if (!charge) {
        charge = { task: null, ticks: 0, sinceBeat: 0, stage: 0 };
        const chargeObj = charge;
        chargeObj.task = Bukkit.getScheduler().runTaskTimer(plugin, new JavaRunnable({
            run: function () {
                chargeObj.ticks++;
                chargeObj.sinceBeat++;

                //玩家死亡/退出/切换手持物品：蓄力中止
                if (player.isDead() || !player.isOnline() ||
                    !isWeapon(player.getInventory().getItemInMainHand())) {
                    abortCharge(uuid);
                    return;
                }

                //心跳超时：松手，按蓄力时长发射
                if (chargeObj.sinceBeat >= CFG.releaseTicks) {
                    const finalTicks = chargeObj.ticks;
                    abortCharge(uuid);
                    releaseCharge(player, finalTicks);
                    return;
                }

                //阶段提示
                if (chargeObj.stage === 0 && chargeObj.ticks >= CFG.stage2At) {
                    chargeObj.stage = 1;
                    player.sendMessage('§a蓄力达到 §f3§a 秒：多重幻影投枪已就绪！');
                } else if (chargeObj.stage === 1 && chargeObj.ticks >= CFG.stage3At) {
                    chargeObj.stage = 2;
                    player.sendMessage('§e蓄力达到 §f6§e 秒：穿透幻影投枪已就绪！');
                } else if (chargeObj.stage === 2 && chargeObj.ticks >= CFG.stage4At) {
                    chargeObj.stage = 3;
                    player.sendMessage('§c蓄力达到 §f12§c 秒：毁灭投枪！！！');
                    abortCharge(uuid);
                    releaseCharge(player, CFG.stage4At);
                }
            }
        }), 0, 1);
        charges.set(uuid, charge);
    }

    //刷新心跳
    charge.sinceBeat = 0;
}

//玩家退出时清理，防止任务泄漏
const PlayerQuitEvent = Java.type('org.bukkit.event.player.PlayerQuitEvent');
const EventPriority = Java.type('org.bukkit.event.EventPriority');
Bukkit.getPluginManager().registerEvent(PlayerQuitEvent,
    new (Java.extend(org.bukkit.event.Listener, {})), EventPriority.NORMAL, (l, e) => {
        abortCharge(e.getPlayer().getUniqueId().toString());
    }, plugin);
