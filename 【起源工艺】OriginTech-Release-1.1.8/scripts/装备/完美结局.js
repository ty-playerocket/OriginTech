const plugin = org.bukkit.Bukkit.getPluginManager().getPlugin("RykenSlimefunCustomizer");

const EquipmentSlot = Java.type('org.bukkit.inventory.EquipmentSlot');
const Particle = Java.type('org.bukkit.Particle');
const Bukkit = Java.type('org.bukkit.Bukkit');
const JavaRunnable = Java.extend(Java.type('java.lang.Runnable'));

const CFG = {
    name: '完美结局',
    damage: 100.0,
    maxDistance: 30,
    moveSteps: 15,
    moveInterval: 1,
    radius: 1.5,
    particleType: Particle.FLAME,
    soundName: "entity.ghast.shoot"
};


const activeTasks = new java.util.HashMap();


// 在指定位置生成粒子球
function createSphereParticles(world, center) {
    for (let i = 0; i < 5; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.random() * Math.PI;
        const r = CFG.radius * 0.5;

        const offX = r * Math.sin(phi) * Math.cos(theta);
        const offY = r * Math.sin(phi) * Math.sin(theta);
        const offZ = r * Math.cos(phi);

        world.spawnParticle(CFG.particleType,
            center.getX() + offX,
            center.getY() + offY,
            center.getZ() + offZ,
            0, 0, 0, 0, 1); // count=1, speed=0
    }
}

//造成伤害
function applyDamage(world, center, player, damage) {
    const entities = world.getNearbyLivingEntities(center, CFG.radius, CFG.radius, CFG.radius);
    for (let i = 0; i < entities.size(); i++) {
        const entity = entities.get(i);
        if (entity === player) continue;
        entity.damage(damage, player);
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

            const eyeLoc = player.getEyeLocation();
            const currentDir = eyeLoc.getDirection();
            const currentStartLoc = eyeLoc.clone().add(currentDir);

            const currentLoc = currentStartLoc.clone().add(currentDir.clone().multiply(stepDist * step));

            createSphereParticles(initWorld, currentLoc);

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
