const plugin = org.bukkit.Bukkit.getPluginManager().getPlugin("RykenSlimefunCustomizer");
const EquipmentSlot = Java.type('org.bukkit.inventory.EquipmentSlot');
const Particle = Java.type('org.bukkit.Particle');
const Bukkit = Java.type('org.bukkit.Bukkit');
const JavaRunnable = Java.extend(Java.type('java.lang.Runnable'));

const CFG = {
    name: '万物起源',
    damage: 1200.0,//基础伤害值
    damageMultiplier1: 0.8,//离子射线倍率(为lore里显示的两倍）
    damageMultiplier2: 0.07,//湮灭光束倍率
    meleeDamageMultiplier: 1.8,//近战伤害倍率
    maxDistance: 60,//射弹最大距离
    moveSteps: 5,//射弹步进数
    moveInterval: 1,//射弹移动间隔（tick）
    radius: 2.8,//伤害半径
    particleType1: Particle.SCRAPE,//离子射线粒子1
    particleType2: Particle.WAX_OFF,//离子射线粒子2
    soundName: "entity.experience_orb.pickup",//发射音效
    beamDensity: 2.0,//双螺旋粒子密度
    helixRadius: 0.6,//双螺旋半径
    helixTwists: 3,//双螺旋圈数
    beamParticle: Particle.END_ROD,//湮灭光束粒子
    beamHeight: 30,//湮灭光束高度
    beamWidth: 1.5,//湮灭光束宽度
    shockwaveParticle: Particle.FLAME,//湮灭光束特效粒子
    shockwaveRadius: 4.0,//震荡波半径
    shockwaveDuration: 5,//震荡波持续时间（tick）
    shockwaveParticlesPerRing: 8//每圈震荡波的粒子数量
    //如果服主需要修改例如伤害的配置，记得也要同时修改物品的lore
};


const activeTasks = new java.util.HashMap();

// 创建从天而降的光束
function createBeamFromSky(world, targetLoc) {
    const beamStartY = targetLoc.getWorld().getMaxHeight();
    const beamHeight = beamStartY - targetLoc.getY();
    const particleCount = Math.floor(beamHeight * 2);

    for (let i = 0; i < particleCount; i++) {
        const y = beamStartY - i;
        const progress = i / particleCount;
        const spread = CFG.beamWidth * (1 - progress);

        world.spawnParticle(CFG.beamParticle,
            targetLoc.getX() + (Math.random() - 0.5) * spread,
            y,
            targetLoc.getZ() + (Math.random() - 0.5) * spread,
            1, 0, 0, 0, 0);
    }
}

// 创建震荡波效果
// 创建震荡波效果
function createShockwave(world, center) {
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

            // 【修改】让所有粒子保持在同一个水平面（使用中心点的Y坐标）
            const y = center.getY();

            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * 2 * Math.PI;
                const x = center.getX() + Math.cos(angle) * currentRadius;
                const z = center.getZ() + Math.sin(angle) * currentRadius;

                world.spawnParticle(CFG.shockwaveParticle,
                    x, y, z,
                    0, 0, 0, 0, 0);
            }

            ringCount++;
        }
    }), 0, 1);

    return shockwaveTask;
}


// 更新击中特效逻辑
function createExplosionParticles(world, center) {
    createBeamFromSky(world, center);
    createShockwave(world, center);
}

// 保持其他函数不变...
function createBeamParticles(world, startLoc, endLoc, dir, globalProgress) {
    const dirX = dir.getX();
    const dirY = dir.getY();
    const dirZ = dir.getZ();
    const distance = startLoc.distance(endLoc);

    if (distance <= 0) return;

    const particleCount = Math.floor(distance * CFG.beamDensity);

    let refX = 0.0, refY = 0.0, refZ = 1.0;
    if (Math.abs(dirX) < 0.9) {
        refX = 1.0; refY = 0.0; refZ = 0.0;
    }

    const ax1X = dirY * refZ - dirZ * refY;
    const ax1Y = dirZ * refX - dirX * refZ;
    const ax1Z = dirX * refY - dirY * refX;
    const ax1Len = Math.sqrt(ax1X * ax1X + ax1Y * ax1Y + ax1Z * ax1Z);
    const nax1X = ax1X / ax1Len, nax1Y = ax1Y / ax1Len, nax1Z = ax1Z / ax1Len;

    const ax2X = dirY * nax1Z - dirZ * nax1Y;
    const ax2Y = dirZ * nax1X - dirX * nax1Z;
    const ax2Z = dirX * nax1Y - dirY * nax1X;

    for (let i = 0; i < particleCount; i++) {
        const t = Math.random();

        const angle = t * CFG.helixTwists * 2 * Math.PI + globalProgress * 4.0;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const offX1 = CFG.helixRadius * (nax1X * cosA + ax2X * sinA);
        const offY1 = CFG.helixRadius * (nax1Y * cosA + ax2Y * sinA);
        const offZ1 = CFG.helixRadius * (nax1Z * cosA + ax2Z * sinA);

        const offX2 = CFG.helixRadius * (nax1X * -cosA + ax2X * -sinA);
        const offY2 = CFG.helixRadius * (nax1Y * -cosA + ax2Y * -sinA);
        const offZ2 = CFG.helixRadius * (nax1Z * -cosA + ax2Z * -sinA);

        const baseX = startLoc.getX() + dirX * distance * t;
        const baseY = startLoc.getY() + dirY * distance * t;
        const baseZ = startLoc.getZ() + dirZ * distance * t;

        world.spawnParticle(CFG.particleType1,
            baseX + offX1, baseY + offY1, baseZ + offZ1,
            0, 0, 0, 0, 1);

        world.spawnParticle(CFG.particleType2,
            baseX + offX2, baseY + offY2, baseZ + offZ2,
            0, 0, 0, 0, 1);
    }
}

function applyDamage(world, center, player, damage, damageMultiplier1, damageMultiplier2) {
    const entities = world.getNearbyLivingEntities(center, CFG.radius, CFG.radius, CFG.radius);
    let hit = false;

    for (let i = 0; i < entities.size(); i++) {
        const entity = entities.get(i);
        const entityMaxHealth = entity.getMaxHealth();
        if (entity === player) continue;

        entity.damage(CFG.damage * damageMultiplier1);
        if (entity.isDead()) {
            hit = true;
            continue;
        }

        if (!entity.isDead()) {
            entity.setNoDamageTicks(0);
            entity.damage(entityMaxHealth * damageMultiplier2);
        }
        hit = true;
    }

    if (hit) {
        createExplosionParticles(world, center);
    }
}

function onUse(event) {
    const player = event.getPlayer();
    if (event.getHand() !== EquipmentSlot.HAND) return;

    const uuid = player.getUniqueId().toString();
    if (activeTasks.containsKey(uuid)) return;

    player.getWorld().playSound(player.getLocation(), CFG.soundName, 1.0, 1.0);

    const eyeLoc = player.getEyeLocation();
    const dir = eyeLoc.getDirection();
    const startLoc = eyeLoc.clone().add(dir);
    const stepDist = CFG.maxDistance / CFG.moveSteps;
    const initWorld = player.getWorld();

    const task = Bukkit.getScheduler().runTaskTimer(plugin, new JavaRunnable({
        run: function() {
            const taskData = activeTasks.get(uuid);
            if (!taskData || taskData.cancelled) {
                if (taskData && taskData.task) {
                    taskData.task.cancel();
                }
                return;
            }

            let step = taskData.step;
            if (typeof step !== 'number') step = 0;

            const currentLoc = startLoc.clone().add(dir.clone().multiply(stepDist * step));

            const globalProgress = step / CFG.moveSteps;
            createBeamParticles(initWorld, startLoc, currentLoc, dir, globalProgress);

            applyDamage(initWorld, currentLoc, player, CFG.damage, CFG.damageMultiplier1, CFG.damageMultiplier2);

            step++;

            if (step >= CFG.moveSteps) {
                taskData.task.cancel();
                activeTasks.remove(uuid);
            } else {
                taskData.step = step;
                activeTasks.put(uuid, taskData);
            }
        }
    }), 0, CFG.moveInterval);

    activeTasks.put(uuid, {
        task: task,
        step: 0,
        cancelled: false
    });
}

function onWeaponHit(event, player, item) {
    const entity = event.getEntity();
    const meleeDamage = event.getDamage() * CFG.meleeDamageMultiplier;
    const health = player.getHealth();
    const maxHealth = player.getMaxHealth();

    if (!(entity instanceof org.bukkit.entity.LivingEntity)) return;

    event.setDamage(Math.max((meleeDamage + CFG.damage) * (health / maxHealth) * 4, meleeDamage + CFG.damage));
}
