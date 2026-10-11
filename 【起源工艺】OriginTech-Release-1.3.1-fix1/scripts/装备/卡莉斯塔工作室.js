const plugin = org.bukkit.Bukkit.getPluginManager().getPlugin("RykenSlimefunCustomizer");
const Bukkit = Java.type('org.bukkit.Bukkit');
const SlimefunItem = Java.type("io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem");

const CFG = {
    id: 'OT_卡莉斯塔工作室',
    reflectDamage: 48 //受到伤害时反弹的伤害值
};

//防止反弹伤害再次触发本监听器（两名玩家都持有本武器时会互相反弹形成递归）
let scriptApplyingDamage = false;

//判断玩家是否主手持有本武器
function isHoldingWeapon(player) {
    const item = player.getInventory().getItemInMainHand();
    if (item == null) return false;
    const sfItem = SlimefunItem.getByItem(item);
    return sfItem !== null && sfItem.getId() === CFG.id;
}

const EntityDamageByEntityEvent = Java.type('org.bukkit.event.entity.EntityDamageByEntityEvent');
const EventPriority = Java.type('org.bukkit.event.EventPriority');

Bukkit.getPluginManager().registerEvent(EntityDamageByEntityEvent,
    new (Java.extend(org.bukkit.event.Listener, {})), EventPriority.NORMAL, (l, e) => {
        //脚本反弹造成的伤害不再二次反弹
        if (scriptApplyingDamage) return;
        //事件已被取消或未造成实际伤害时不反弹（含无敌帧期间的0伤害）
        if (e.isCancelled() || e.getFinalDamage() <= 0) return;

        const victim = e.getEntity();
        if (!(victim instanceof org.bukkit.entity.Player)) return;
        if (!isHoldingWeapon(victim)) return;

        let attacker = e.getDamager();

        //若被投射物命中，反弹给投射物的发射者
        if (attacker instanceof org.bukkit.entity.Projectile) {
            const shooter = attacker.getShooter();
            if (shooter instanceof org.bukkit.entity.LivingEntity) {
                attacker = shooter;
            }
        }

        if (!(attacker instanceof org.bukkit.entity.LivingEntity) || attacker === victim) return;

        //反弹48点伤害，击杀归属受伤玩家
        scriptApplyingDamage = true;
        try {
            attacker.damage(CFG.reflectDamage, victim);
        } finally {
            scriptApplyingDamage = false;
        }
    }, plugin);
