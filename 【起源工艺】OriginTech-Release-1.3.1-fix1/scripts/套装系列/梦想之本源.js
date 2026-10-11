const SlimefunItem = Java.type("io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem");
const UUID = Java.type('java.util.UUID');
const Attribute = Java.type('org.bukkit.attribute.Attribute');
const AttributeModifier = Java.type('org.bukkit.attribute.AttributeModifier');
const Operation = Java.type('org.bukkit.attribute.AttributeModifier.Operation');
const EventPriority = Java.type('org.bukkit.event.EventPriority');
const Random = Java.type('java.util.Random');
const plugin = Java.type('org.lins.mmmjjkx.rykenslimefuncustomizer.RykenSlimefunCustomizer').INSTANCE;

const random = new Random();

const CFG = {
    id: 'OT_梦想之本源',
    damageMultiplier: 0.7,
    healthMultiplier: 0.005,//百分比伤害
    particleType: org.bukkit.Particle.FLAME,
    particleType2: org.bukkit.Particle.END_ROD,
    soundName: "entity.ghast.shoot",
    particleMaxDistance: 5.0,
    particleMaxDistance2: 10.0,
    particleCount: 20
};

const ATTRIBUTE_BONUSES = [
    { uuid: '3E175154-7610-4B4F-B09D-6CE4F5F550B2', name: 'GENERIC_MAX_HEALTH', value: 1000.0, displayName: '§c血量' },
    { uuid: 'EF0F7DD0-CFD0-489D-B723-4D59F16D1A2F', name: 'GENERIC_ATTACK_DAMAGE', value: 15000.0, displayName: '§c攻击力' },
    { uuid: 'ACEA14C3-1BBC-4660-9795-A1A53359D804', name: 'GENERIC_ARMOR', value: 50.0, displayName: '§c防御力' },
    { uuid: '8899A3C5-C560-4237-B8DF-0C6FF085DF76', name: 'GENERIC_ARMOR_TOUGHNESS', value: 20.0, displayName: '§c盔甲韧性' }
];

function isWeapon(item) {
    if (item == null) return false;
    const slimefunItem = SlimefunItem.getByItem(item);
    return slimefunItem !== null && slimefunItem.getId() === CFG.id;
}

function addAttributeModifier(player) {
    for (const bonus of ATTRIBUTE_BONUSES) {
        let attrEnum;
        try {
            attrEnum = Attribute.valueOf(bonus.name);
        } catch (e) {
            continue;
        }
        
        const attribute = player.getAttribute(attrEnum);
        if (attribute == null) continue;
        
        const u = UUID.fromString(bonus.uuid);
        const old = attribute.getModifier(u);
        if (old != null) {
            attribute.removeModifier(old);
        }
        
        const mod = new AttributeModifier(u, bonus.displayName, bonus.value, Operation.ADD_NUMBER);
        attribute.addModifier(mod);
    }
}

function removeAttributeModifier(player) {
    for (const bonus of ATTRIBUTE_BONUSES) {
        let attrEnum;
        try {
            attrEnum = Attribute.valueOf(bonus.name);
        } catch (e) {
            continue;
        }
        
        const attribute = player.getAttribute(attrEnum);
        if (attribute == null) continue;
        
        const u = UUID.fromString(bonus.uuid);
        const old = attribute.getModifier(u);
        if (old != null) {
            attribute.removeModifier(old);
        }
    }
}

function skill1(player) {
    const maxHealth = player.getMaxHealth();
    const health = player.getHealth();
    player.setHealth(Math.max(0, health - maxHealth * 0.01));
}

function onWeaponHit(event, player, item) {
    const entity = event.getEntity();
    const damage = event.getDamage();
    if (!(entity instanceof org.bukkit.entity.LivingEntity)) return;

    const entityHealth = entity.getHealth();
    const entitMaxHealth = entity.getMaxHealth();
    
    const finalDamage = (damage * (1 +CFG.damageMultiplier)) + (entityHealth * CFG.healthMultiplier);
    
    const loc = entity.getLocation();
    const center = loc.add(0, entity.getHeight() / 2, 0);
    
    skill1(player);
    event.setDamage(finalDamage);
    createLineParticle(center);
}

function createLineParticle(center) {
    const world = center.getWorld();
    if (world == null) return;
    
    spawnLine(world, center, CFG.particleType, CFG.particleMaxDistance);
    spawnLine(world, center, CFG.particleType2, CFG.particleMaxDistance2);
}

function spawnLine(world, center, particle, maxDistance) {
    const startX = center.getX() + (random.nextDouble() - 0.5) * maxDistance * 2;
    const startY = center.getY() + (random.nextDouble() - 0.5) * maxDistance * 2;
    const startZ = center.getZ() + (random.nextDouble() - 0.5) * maxDistance * 2;
    
    const dirX = center.getX() - startX;
    const dirY = center.getY() - startY;
    const dirZ = center.getZ() - startZ;
    
    const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    const unitX = dirX / length;
    const unitY = dirY / length;
    const unitZ = dirZ / length;
    
    const step = length / CFG.particleCount;
    
    for (let i = 0; i <= CFG.particleCount; i++) {
        const x = startX + unitX * step * i;
        const y = startY + unitY * step * i;
        const z = startZ + unitZ * step * i;
        world.spawnParticle(particle, x, y, z, 1, 0, 0, 0, 0);
    }
}

const PlayerJoinEvent = Java.type('org.bukkit.event.player.PlayerJoinEvent');
const PlayerItemHeldEvent = Java.type('org.bukkit.event.player.PlayerItemHeldEvent');
const PlayerQuitEvent = Java.type('org.bukkit.event.player.PlayerQuitEvent');

plugin.getServer().getPluginManager().registerEvent(PlayerJoinEvent, new (Java.extend(org.bukkit.event.Listener, {})), EventPriority.NORMAL, (l, e) => {
    const player = e.getPlayer();
    const heldItem = player.getInventory().getItemInMainHand();
    if (isWeapon(heldItem)) {
        addAttributeModifier(player);
    }
}, plugin);

plugin.getServer().getPluginManager().registerEvent(PlayerItemHeldEvent, new (Java.extend(org.bukkit.event.Listener, {})), EventPriority.NORMAL, (l, e) => {
    const player = e.getPlayer();
    const newItem = player.getInventory().getItem(e.getNewSlot());
    const previousItem = player.getInventory().getItem(e.getPreviousSlot());

    const hasWeaponNow = isWeapon(newItem);
    const hadWeaponBefore = isWeapon(previousItem);

    if (hasWeaponNow && !hadWeaponBefore) {
        addAttributeModifier(player);
    } else if (!hasWeaponNow && hadWeaponBefore) {
        removeAttributeModifier(player);
    }
}, plugin);

plugin.getServer().getPluginManager().registerEvent(PlayerQuitEvent, new (Java.extend(org.bukkit.event.Listener, {})), EventPriority.NORMAL, (l, e) => {
    const player = e.getPlayer();
    removeAttributeModifier(player);
}, plugin);