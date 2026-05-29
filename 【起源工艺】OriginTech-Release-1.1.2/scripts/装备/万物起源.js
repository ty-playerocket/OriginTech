const plugin = org.bukkit.Bukkit.getPluginManager().getPlugin("RykenSlimefunCustomizer");

const EquipmentSlot = Java.type('org.bukkit.inventory.EquipmentSlot');
const Particle = Java.type('org.bukkit.Particle');
const Bukkit = Java.type('org.bukkit.Bukkit');
const JavaRunnable = Java.extend(Java.type('java.lang.Runnable'));

const CFG = {
    name: '万物起源',
    damage: 170.0,//基础伤害值
    maxDistance: 30,
    moveSteps: 5,//该项数值越小，攻速越快
    moveInterval: 1,
    radius: 1.5,//伤害半径
    particleType: Particle.SCRAPE,//射弹粒子
    soundName: "entity.experience_orb.pickup",
    beamDensity: 2.0 ,// 粒子密度
    explosionParticle: Particle.FLAME, //击中特效粒子
    explosionRadius: 2.0,//击中特效半径
    explosionDensity: 45//击中特效粒子数量
};


const activeTasks = new java.util.HashMap();


// 生成粒子
function createBeamParticles(world, startLoc, endLoc) {
    // 计算起点到终点的向量
    const dirX = endLoc.getX() - startLoc.getX();
    const dirY = endLoc.getY() - startLoc.getY();
    const dirZ = endLoc.getZ() - startLoc.getZ();

    // 计算两点间的距离
    const distance = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

    if (distance <= 0) return;

    // 生成粒子数量
    const particleCount = Math.floor(distance * CFG.beamDensity);

    for (let i = 0; i < particleCount; i++) {
        const t = Math.random();

        const offX = dirX * t;
        const offY = dirY * t;
        const offZ = dirZ * t;

        world.spawnParticle(CFG.particleType,
            startLoc.getX() + offX,
            startLoc.getY() + offY,
            startLoc.getZ() + offZ,
            0, 0, 0, 0, 1);
    }
}

function applyDamage(world, center, player, damage) {
    const entities = world.getNearbyLivingEntities(center, CFG.radius, CFG.radius, CFG.radius);
    let hit = false; // 标记是否击中了敌人

    for (let i = 0; i < entities.size(); i++) {
        const entity = entities.get(i);
        if (entity === player) continue;
        entity.damage(damage, player);
        hit = true;
    }

    // 如果击中了敌人，在判定点产生爆炸特效
    if (hit) {
        createExplosionParticles(world, center);
    }
}
//生成击中特效粒子
function createExplosionParticles(world, center) {
    for (let i = 0; i < CFG.explosionDensity; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = CFG.explosionRadius * Math.random();

        const offX = r * Math.sin(phi) * Math.cos(theta);
        const offY = r * Math.sin(phi) * Math.sin(theta);
        const offZ = r * Math.cos(phi);

        world.spawnParticle(CFG.explosionParticle,
            center.getX() + offX,
            center.getY() + offY,
            center.getZ() + offZ,
            1,
            offX * 0.01, offY * 0.01, offZ * 0.01,
            0.1);
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

            createBeamParticles(initWorld, startLoc, currentLoc);

            applyDamage(initWorld, currentLoc, player, CFG.damage);

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

    // 初始化任务状态
    activeTasks.put(uuid, {
        task: task,
        step: 0,
        cancelled: false
    });
}
