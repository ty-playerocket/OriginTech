const plugin = org.bukkit.Bukkit.getPluginManager().getPlugin("RykenSlimefunCustomizer");
const Bukkit = Java.type('org.bukkit.Bukkit');
const JavaRunnable = Java.extend(Java.type('java.lang.Runnable'));
const EquipmentSlot = Java.type('org.bukkit.inventory.EquipmentSlot');
const Particle = Java.type('org.bukkit.Particle');
const LivingEntityClass = Java.type('org.bukkit.entity.LivingEntity');

const CFG = {
    name: '回响脉冲弓',
    baseDamage: 10000,               //基础伤害值
    shootCooldownMs: 200,            //脉冲矢内置CD（0.2秒）
    maxDistance: 50,                 //两种箭矢的最大飞行距离
    moveSteps: 10,                   //箭矢步进数（高速，每步5格）
    moveInterval: 1,                 //步进间隔（tick）

    //脉冲矢
    pulseDamageRate: 0.6,            //脉冲矢直击伤害倍率
    pulseExplosionRate: 0.3,         //脉冲矢命中时爆炸伤害倍率
    pulseExplosionRadius: 3.0,       //爆炸伤害半径
    pulseParticle: Particle.END_ROD, //脉冲矢拖尾粒子

    //回响矢
    echoEveryShots: 3,               //每三轮射击额外发射一道回响矢
    echoDamageRate: 1.0,             //回响矢伤害倍率
    echoParticle: Particle.SONIC_BOOM, //回响矢拖尾粒子

    //音爆
    sonicMin: 3,                     //音爆最少数目
    sonicMax: 5,                     //音爆最多数目
    sonicDamageRate: 0.5,            //音爆伤害倍率
    sonicSpawnRadius: 6.0,           //音爆随机生成半径
    sonicDamageRadius: 2.5,          //单个音爆伤害半径
    sonicInterval: 4,                //音爆逐个生成间隔（tick）

    shootSound: "entity.arrow.shoot",
    echoSound: "entity.warden.sonic_boom",
    explosionSound: "entity.generic.explode"
    //如果服主需要修改例如伤害的配置，记得也要同时修改物品的lore
};

// uuid -> 最近一次射击时间戳
const lastShoot = new Map();
// uuid -> 脉冲矢射击次数（回响矢不计入）
const shotCount = new Map();

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

//对中心点周围造成范围伤害，可排除特定目标
function explodeDamage(world, center, radius, damage, player, exclude) {
    const nearby = world.getNearbyLivingEntities(center, radius, radius, radius);
    for (let i = 0; i < nearby.size(); i++) {
        const entity = nearby.get(i);
        if (entity === player || !(entity instanceof LivingEntityClass)) continue;
        if (entity.isDead()) continue;
        if (exclude && entity === exclude) continue;

        entity.setNoDamageTicks(0);
        entity.damage(damage, player);
    }
}

//沿视线生成一道箭矢（纯粒子表现，非真实弹射物）
//pierce为true时贯穿敌人继续飞行，false时命中第一个目标即消失
function fireArrow(player, dir, damage, particle, pierce, onHit) {
    const world = player.getWorld();
    const startLoc = player.getEyeLocation().clone().add(dir);
    const stepDist = CFG.maxDistance / CFG.moveSteps;
    const state = { point: startLoc.clone(), hits: [] };

    let step = 0;
    const task = Bukkit.getScheduler().runTaskTimer(plugin, new JavaRunnable({
        run: function () {
            state.point = state.point.add(dir.clone().multiply(stepDist));

            //箭矢拖尾
            world.spawnParticle(particle,
                state.point.getX(), state.point.getY(), state.point.getZ(),
                2, 0.05, 0.05, 0.05, 0);

            const nearby = world.getNearbyLivingEntities(state.point, 1.4, 1.2, 1.4);
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
    }), 0, CFG.moveInterval);
}

//回响矢击中后在周围随机生成音爆
function spawnSonicBooms(world, center, player) {
    const count = randInt(CFG.sonicMin, CFG.sonicMax);
    let spawned = 0;
    const sonicTask = Bukkit.getScheduler().runTaskTimer(plugin, new JavaRunnable({
        run: function () {
            const spot = center.clone().add(
                rand(-CFG.sonicSpawnRadius, CFG.sonicSpawnRadius),
                rand(-2, 2),
                rand(-CFG.sonicSpawnRadius, CFG.sonicSpawnRadius)
            );

            world.spawnParticle(Particle.SONIC_BOOM,
                spot.getX(), spot.getY(), spot.getZ(), 1, 0, 0, 0, 0);
            world.playSound(spot, CFG.echoSound, 1.0, 1.0);
            explodeDamage(world, spot, CFG.sonicDamageRadius,
                CFG.baseDamage * CFG.sonicDamageRate, player, null);

            spawned++;
            if (spawned >= count) {
                sonicTask.cancel();
            }
        }
    }), CFG.sonicInterval, CFG.sonicInterval);
}

function onUse(event) {
    const player = event.getPlayer();
    if (event.getHand() !== EquipmentSlot.HAND) return;

    const uuid = player.getUniqueId().toString();
    const now = Date.now();

    //脉冲矢内置CD
    if (lastShoot.has(uuid) && now - lastShoot.get(uuid) < CFG.shootCooldownMs) return;
    lastShoot.set(uuid, now);

    const world = player.getWorld();
    const dir = player.getEyeLocation().getDirection();

    world.playSound(player.getLocation(), CFG.shootSound, 1.0, 1.0);

    //发射脉冲矢：贯穿敌人，命中时爆炸
    fireArrow(player, dir, CFG.baseDamage * CFG.pulseDamageRate, CFG.pulseParticle, true,
        function (hitPoint, hitEntity) {
            //命中时爆炸：对周围目标造成爆炸伤害，命中者自身只吃直击
            world.spawnParticle(Particle.EXPLOSION_LARGE,
                hitPoint.getX(), hitPoint.getY(), hitPoint.getZ(), 1, 0, 0, 0, 0);
            world.playSound(hitPoint, CFG.explosionSound, 1.0, 1.0);
            explodeDamage(world, hitPoint, CFG.pulseExplosionRadius,
                CFG.baseDamage * CFG.pulseExplosionRate, player, hitEntity);
        });

    //脉冲矢计入轮数，每三轮额外发射一道回响矢（不计入轮数）
    const count = (shotCount.get(uuid) || 0) + 1;
    shotCount.set(uuid, count);
    if (count % CFG.echoEveryShots === 0) {
        fireArrow(player, dir, CFG.baseDamage * CFG.echoDamageRate, CFG.echoParticle, false,
            function (hitPoint, hitEntity) {
                spawnSonicBooms(world, hitPoint, player);
            });
    }
}
