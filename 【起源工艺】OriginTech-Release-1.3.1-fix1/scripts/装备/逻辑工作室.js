const plugin = org.bukkit.Bukkit.getPluginManager().getPlugin("RykenSlimefunCustomizer");
const Bukkit = Java.type('org.bukkit.Bukkit');
const JavaRunnable = Java.extend(Java.type('java.lang.Runnable'));
const EquipmentSlot = Java.type('org.bukkit.inventory.EquipmentSlot');
const Particle = Java.type('org.bukkit.Particle');
const Attribute = Java.type('org.bukkit.attribute.Attribute');
const LivingEntityClass = Java.type('org.bukkit.entity.LivingEntity');

const CFG = {
    name: '逻辑工作室',
    baseBonusDamage: 50,             //固定基础伤害，与玩家伤害值相加后再乘倍率
    bulletMultipliers: [0.48, 0.58, 1.27], //三发子弹分别造成(玩家伤害值+50)的48%/58%/127%
    spreadAngles: [-8, 0, 8],        //三发子弹的水平散射角（度）
    maxDistance: 30,                 //子弹最大飞行距离
    moveSteps: 6,                    //子弹步进数
    moveInterval: 1,                 //步进间隔（tick）
    radius: 1.6,                     //子弹命中半径
    bulletParticle: Particle.CRIT,   //子弹拖尾粒子
    shootSound: "entity.crossbow.shoot"
    //如果服主需要修改例如伤害的配置，记得也要同时修改物品的lore
};

//读取玩家近战伤害值（含装备/属性加成，兼容1.21.3前后属性名）
function getPlayerDamage(player) {
    try {
        let attr = player.getAttribute(Attribute.GENERIC_ATTACK_DAMAGE);
        if (attr === null) {
            const modernAttr = Attribute.ATTACK_DAMAGE;
            if (modernAttr) attr = player.getAttribute(modernAttr);
        }
        if (attr !== null) return attr.getValue();
    } catch (e) {
        //忽略，返回0
    }
    return 0;
}

//将方向向量绕Y轴旋转指定角度（度）
function rotateAroundY(dir, angleDeg) {
    const rad = angleDeg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const x = dir.getX() * cos + dir.getZ() * sin;
    const z = -dir.getX() * sin + dir.getZ() * cos;
    return new org.bukkit.util.Vector(x, dir.getY(), z).normalize();
}

//发射三发子弹
function shootBullets(player) {
    const world = player.getWorld();
    const eyeLoc = player.getEyeLocation();
    const baseDir = eyeLoc.getDirection();
    const startLoc = eyeLoc.clone().add(baseDir);
    const stepDist = CFG.maxDistance / CFG.moveSteps;

    //基数 = 玩家当前伤害值 + 固定基础伤害
    const baseDamage = getPlayerDamage(player) + CFG.baseBonusDamage;

    //三发子弹各自维护当前位置与已命中目标，每个目标只受同一发子弹一次伤害
    const bullets = [];
    for (let i = 0; i < CFG.bulletMultipliers.length; i++) {
        bullets.push({
            dir: rotateAroundY(baseDir, CFG.spreadAngles[i]),
            point: startLoc.clone(),
            damage: baseDamage * CFG.bulletMultipliers[i],
            hits: []
        });
    }

    let step = 0;
    const bulletTask = Bukkit.getScheduler().runTaskTimer(plugin, new JavaRunnable({
        run: function () {
            for (let b = 0; b < bullets.length; b++) {
                const bullet = bullets[b];
                bullet.point = bullet.point.add(bullet.dir.clone().multiply(stepDist));

                //子弹拖尾
                world.spawnParticle(CFG.bulletParticle,
                    bullet.point.getX(), bullet.point.getY(), bullet.point.getZ(),
                    2, 0.05, 0.05, 0.05, 0);

                const nearbyEntities = world.getNearbyLivingEntities(
                    bullet.point, CFG.radius, 1.2, CFG.radius);
                for (let i = 0; i < nearbyEntities.size(); i++) {
                    const entity = nearbyEntities.get(i);
                    if (entity === player || !(entity instanceof LivingEntityClass)) continue;
                    if (entity.isDead()) continue;

                    const entityUuid = entity.getUniqueId().toString();
                    if (bullet.hits.indexOf(entityUuid) !== -1) continue;
                    bullet.hits.push(entityUuid);

                    //清除无敌帧，保证同一目标可以连续吃满三发子弹的伤害
                    entity.setNoDamageTicks(0);
                    entity.damage(bullet.damage, player);
                }
            }

            step++;
            if (step >= CFG.moveSteps) {
                bulletTask.cancel();
            }
        }
    }), 0, CFG.moveInterval);
}

function onUse(event) {
    const player = event.getPlayer();
    if (event.getHand() !== EquipmentSlot.HAND) return;

    player.getWorld().playSound(player.getLocation(), CFG.shootSound, 1.0, 1.0);
    shootBullets(player);
}
