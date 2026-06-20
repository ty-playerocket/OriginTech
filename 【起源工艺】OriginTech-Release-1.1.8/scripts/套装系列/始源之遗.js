const plugin = org.bukkit.Bukkit.getPluginManager().getPlugin("RykenSlimefunCustomizer");
const Bukkit = Java.type('org.bukkit.Bukkit');
const JavaRunnable = Java.extend(Java.type('java.lang.Runnable'));

const CFG = {
    attackCycle: 3, // 武器攻击总阶段数
    meleeDamage: 800, // 武器的基础近战伤害值

    // ---- 第一段攻击：斩切光束 ----
    slashParticleCount: 20, // 斩切光束的粒子数量
    slashRange: 2.0, // 斩切光束的横向长度
    slashParticle: "END_ROD", // 斩切光束使用的粒子类型
    slashDamageMultiplier: 0.8, // 斩切造成的额外伤害倍率

    // ---- 第二段攻击：震荡波 ----
    shockwaveParticle: "GLOW", // 震荡波使用的粒子类型
    shockwaveRadius: 4.0, // 震荡波的最大扩散半径
    shockwaveDuration: 15, // 震荡波持续时间
    shockwaveParticlesPerRing: 8, // 震荡波每圈的初始粒子数量
    shockwaveDamageMultiplier: 2.2, // 震荡波造成的伤害倍率

    // ---- 第三段攻击：十字星与天降光束 ----
    starHeight: 30.0, // 十字星生成在目标上方的高度
    starSize: 3.0, // 十字星的尺寸大小
    starParticle: "FIREWORKS_SPARK", // 十字星使用的粒子类型
    beamDelayTicks: 20, // 十字星出现后，光束落下的延迟时间
    beamParticle: "SONIC_BOOM", // 垂直光束使用的粒子类型
    beamDensity: 4.0, // 垂直光束的粒子密度
    beamWidth: 2.5, // 垂直光束的最大宽度
    explosionParticle: "FLAME", // 光束命中地面后爆炸使用的粒子类型
    explosionRadius: 3.0, // 爆炸特效的球体半径
    beamDamageMultiplier: 12.0 // 毁灭光束造成的伤害倍率
};

function getParticle(name) {
    return org.bukkit.Particle[name];
}

const playerAttackPhase = new java.util.HashMap();

// ================= 粒子特效生成函数 =================

// 第一段攻击：目标身上斩切光束
function createSlashEffect(targetLoc, playerYaw) {
    const world = targetLoc.getWorld();
    const count = CFG.slashParticleCount;
    const range = CFG.slashRange;
    const yawRad = playerYaw * Math.PI / 180.0;

    for (let i = 0; i < count; i++) {
        const progress = (i / count) - 0.5;
        const dx = Math.cos(yawRad) * progress * range;
        const dz = Math.sin(yawRad) * progress * range;

        world.spawnParticle(getParticle(CFG.slashParticle),
            targetLoc.getX() + dx,
            targetLoc.getY() + 1.0,
            targetLoc.getZ() + dz,
            1, 0, 0.1, 0, 0.02);
    }
}

// 第二段攻击：玩家自身震荡波
function createShockwave(playerLoc) {
    const world = playerLoc.getWorld();
    let ringCount = 0;

    const shockwaveTask = Bukkit.getScheduler().runTaskTimer(plugin, new JavaRunnable({
        run: function() {
            if (ringCount >= CFG.shockwaveDuration) {
                shockwaveTask.cancel();
                return;
            }

            const progress = ringCount / CFG.shockwaveDuration;
            const currentRadius = CFG.shockwaveRadius * progress;
            const particleCount = CFG.shockwaveParticlesPerRing * (1 + progress * 2);
            const y = playerLoc.getY();

            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * 2 * Math.PI;
                const x = playerLoc.getX() + Math.cos(angle) * currentRadius;
                const z = playerLoc.getZ() + Math.sin(angle) * currentRadius;

                world.spawnParticle(getParticle(CFG.shockwaveParticle),
                    x, y, z,
                    0, 0, 0, 0, 0);
            }
            ringCount++;
        }
    }), 0, 1);
}

// 第三段攻击：十字星
function createCrossStar(world, centerLoc) {
    const size = CFG.starSize;
    const density = 20;

    for (let i = 0; i < density; i++) {
        const progress = (i / density) - 0.5;
        world.spawnParticle(getParticle(CFG.starParticle),
            centerLoc.getX() + progress * size, centerLoc.getY(), centerLoc.getZ(),
            1, 0, 0, 0, 0);
        world.spawnParticle(getParticle(CFG.starParticle),
            centerLoc.getX(), centerLoc.getY(), centerLoc.getZ() + progress * size,
            1, 0, 0, 0, 0);
    }
}

// 第三段攻击：垂直向下的光束
function createBeamFromSky(targetLoc) {
    const world = targetLoc.getWorld();
    const beamStartY = targetLoc.getY() + CFG.starHeight;
    const particleCount = Math.floor(CFG.starHeight * CFG.beamDensity);

    for (let i = 0; i < particleCount; i++) {
        const y = beamStartY - i;
        const progress = i / particleCount;
        const spread = CFG.beamWidth * (1 - progress);

        world.spawnParticle(getParticle(CFG.beamParticle),
            targetLoc.getX() + (Math.random() - 0.5) * spread,
            y,
            targetLoc.getZ() + (Math.random() - 0.5) * spread,
            1, 0, -0.5, 0, 0.1);
    }
}

// 第三段攻击：命中地面爆炸
function createExplosion(world, center) {
    const radius = CFG.explosionRadius;

    for (let i = 0; i < 100; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = Math.random() * radius;

        const dx = r * Math.sin(phi) * Math.cos(theta);
        const dy = r * Math.cos(phi);
        const dz = r * Math.sin(phi) * Math.sin(theta);

        world.spawnParticle(getParticle(CFG.explosionParticle),
            center.getX() + dx, center.getY() + dy, center.getZ() + dz,
            1, 0, 0.1, 0, 0.5);
    }
}

// ================= 武器攻击主逻辑 =================

function onWeaponHit(event, player, item) {
    const entity = event.getEntity();
    if (!(entity instanceof org.bukkit.entity.LivingEntity)) return;

    const uuid = player.getUniqueId().toString();

    let currentPhase = 1;
    if (playerAttackPhase.containsKey(uuid)) {
        currentPhase = playerAttackPhase.get(uuid);
    }

    const targetLoc = entity.getLocation();
    const playerLoc = player.getLocation();
    const playerYaw = playerLoc.getYaw();
    const baseDmg = CFG.meleeDamage;

    switch (currentPhase) {
        case 1:
            // 第一段：设置100%基础伤害 + 50%斩切伤害
            event.setDamage(baseDmg * (1 + CFG.slashDamageMultiplier));
            createSlashEffect(targetLoc);
            break;

        case 2:
            // 第二段：取消原版单体伤害，改为对周围生物造成180%伤害
            event.setCancelled(true);
            createShockwave(playerLoc);
            const world2 = playerLoc.getWorld();
            const nearbyEntities = world2.getNearbyLivingEntities(playerLoc, CFG.shockwaveRadius, CFG.shockwaveRadius, CFG.shockwaveRadius);
            for (let i = 0; i < nearbyEntities.size(); i++) {
                const nearbyEntity = nearbyEntities.get(i);
                if (nearbyEntity !== player) {
                    nearbyEntity.damage(baseDmg * CFG.shockwaveDamageMultiplier);
                }
            }
            break;

        case 3:
            // 第三段：设置100%基础伤害，延迟1秒后降下光束造成1000%伤害
            event.setDamage(baseDmg);
            createCrossStar(targetLoc.getWorld(), targetLoc.clone().add(0, CFG.starHeight, 0));

            const world3 = targetLoc.getWorld();
            const safeTargetLoc = targetLoc.clone();
            const safeEntity = entity;
            const safePlayer = player;

            Bukkit.getScheduler().runTaskLater(plugin, new JavaRunnable({
                run: function() {
                    if (!safeTargetLoc.getChunk().isLoaded()) return;
                    createBeamFromSky(safeTargetLoc);
                    createExplosion(world3, safeTargetLoc);

                    if (!safeEntity.isDead()) {
                        safeEntity.damage(baseDmg * CFG.beamDamageMultiplier,);
                    }
                }
            }), CFG.beamDelayTicks);
            break;
    }

    // 更新阶段循环
    currentPhase++;
    if (currentPhase > CFG.attackCycle) {
        currentPhase = 1;
    }

    playerAttackPhase.put(uuid, currentPhase);
}
