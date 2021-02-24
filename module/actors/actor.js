/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
import { CofRoll } from "../controllers/roll.js";
import { MacroDispatcher } from "../system/macroDispatcher.js";
import {Stats} from "../system/stats.js";
import { Traversal } from "../utils/traversal.js";

export class CofActor extends Actor {

    /** @override */
    prepareBaseData() {
        super.prepareBaseData();
        let actorData = this.data;
        if (actorData.type === "encounter") this._prepareBaseEncounterData(actorData);
        else this._prepareBaseCharacterData(actorData);
    }

    /* -------------------------------------------- */

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();
        let actorData = this.data;
        if (actorData.type === "encounter") this._prepareDerivedEncounterData(actorData);
        else this._prepareDerivedCharacterData(actorData);
        this.items = this._prepareOwnedItems(this.data.items || []);
    }

    /** @override */
    prepareEmbeddedEntities() {    
        this.effects = this._prepareActiveEffects(this.data.effects || []);
    }


    /* -------------------------------------------- */

    initBuffs(actorData) {
        let stats = actorData.data.stats;
        let attributes = actorData.data.attributes;
        let attacks = actorData.data.attacks;

        stats.str.buff = 0;
        stats.dex.buff = 0;
        stats.con.buff = 0;
        stats.int.buff = 0;
        stats.wis.buff = 0;
        stats.cha.buff = 0;

        attributes.hp.buff = 0;
        attributes.def.buff = 0;
        attributes.init.buff = 0;
        attributes.dr.buff = 0;
        attributes.rp.buff = 0;
        attributes.fp.buff = 0;
        attributes.mp.buff = 0;

        attacks.melee.buff = 0;
        attacks.ranged.buff = 0;
        attacks.magic.buff = 0;
        attacks.melee.superior = false;
        attacks.ranged.superior = false;
        attacks.magic.superior = false;
        attacks.melee.critRangeBonus = 0;
        attacks.ranged.critRangeBonus = 0;
        attacks.magic.critRangeBonus = 0;

        actorData.data.globalRollBonus = 0;
    }

    _prepareBaseCharacterData(actorData) {
        // reset all buff values
        this.initBuffs(actorData);
        // compute xp points and rank levels
        this.computeXP(actorData);
        // apply only base stats capacity buff
        this.applyCapacities(actorData, true);
        // compute the modifiers        
        this.computeMods(actorData);    
    }

    /* -------------------------------------------- */

    _prepareDerivedCharacterData(actorData) {
        // apply non base stat capacity buffs
        this.applyCapacities(actorData, false);     
        // compute derived attributes
        this.computeAttributes(actorData);        
        this.computeAttacks(actorData);       
        this.computeDef(actorData);
    }

    /* -------------------------------------------- */

    _prepareBaseEncounterData(actorData) {
        if (!actorData.data.attacks) {
            actorData.data.attacks = {
                "melee": {
                    "key": "melee",
                    "label": "COF.attacks.melee.label",
                    "abbrev": "COF.attacks.melee.abbrev",
                    "stat": "@stats.str.mod",
                    "enabled": true,
                    "base": Math.ceil(actorData.data.nc.value) + actorData.data.stats.str.mod,
                    "bonus": 0,
                    "mod": Math.ceil(actorData.data.nc.value) + actorData.data.stats.str.mod, 
                },
                "ranged": {
                    "key": "ranged",
                    "label": "COF.attacks.ranged.label",
                    "abbrev": "COF.attacks.ranged.abbrev",
                    "stat": "@stats.dex.mod",
                    "enabled": true,
                    "base": Math.ceil(actorData.data.nc.value) + actorData.data.stats.dex.mod,
                    "bonus": 0,
                    "mod": Math.ceil(actorData.data.nc.value) + actorData.data.stats.dex.mod 
                },
                "magic": {
                    "key": "magic",
                    "label": "COF.attacks.magic.label",
                    "abbrev": "COF.attacks.magic.abbrev",
                    "stat": "@stats.int.mod",
                    "enabled": true,
                    "base": Math.ceil(actorData.data.nc.value) + actorData.data.stats.int.mod,
                    "bonus": 0,
                    "mod": Math.ceil(actorData.data.nc.value) + actorData.data.stats.int.mod
                }
            }
        }
         // reset all buff values
        this.initBuffs(actorData);
        // mod capacities
        this.applyCapacities(actorData, true);
        // STATS
        let stats = actorData.data.stats;
        // COMPUTE STATS FROM MODS
        for (let stat of Object.values(stats)) {
            stat.value = Stats.getStatValueFromMod(stat.mod);
        }
    }

    /* -------------------------------------------- */

    _prepareDerivedEncounterData(actorData) {
        // apply non base stat capacity buffs
        this.applyCapacities(actorData, false);    
        // ATTACKS
        let attacks = actorData.data.attacks;
        
        for (let attack of Object.values(attacks)) {            
            attack.mod = attack.base + attack.bonus + attack.buff;
        }
        

        // MODIFY TOKEN REGARDING SIZE
        switch (actorData.data.details.size) {
            case "big":
                actorData.token.width = 2;
                actorData.token.height = 2;
                break;
            case "huge":
                actorData.token.width = 4;
                actorData.token.height = 4;
                break;
            case "colossal":
                actorData.token.width = 8;
                actorData.token.height = 8;
                break;
            case "tiny":
            case "small":
            case "short":
            case "med":
            default:
                break;
        }
        let attributes = actorData.data.attributes;
        attributes.init.value = attributes.init.base + attributes.init.bonus + attributes.init.buff;
        attributes.def.value = attributes.def.base + attributes.def.bonus + attributes.def.buff;
        attributes.dr.value = attributes.dr.base.value + attributes.dr.bonus.value + attributes.dr.buff;
    }

    /* -------------------------------------------- */

    getActiveSpells(items) {
        // return items.filter(item => item.type === "spell" && item.data.worn)
        return items.filter(item => item.type === "spell")
    }

    /* -------------------------------------------- */

    getProfile(items) {
        return items.find(i => i.type === "profile")
    }

    /* -------------------------------------------- */

    getSpecies(items) {
        return items.find(i => i.type === "species")
    }

    /* -------------------------------------------- */
    getPaths(items) {
        return items.filter(i => i.type === "path")        
    }
    getPathById(id) {
        return this.data.items.find(i => i.type === "path" && i._id === id )        
    }
    /* -------------------------------------------- */

    getActiveCapacities(items) {
        return items.filter(i => i.type === "capacity" && i.data.rank)
    }

    getCapacities(items) {
        return items.filter(i => i.type === "capacity")
    }

    getWeapons(items) {
        return items.filter(i => i.type === "item" && i.data.properties && i.data.properties.weapon)
    }

    getTrappingItems(items) {
        return items.filter(i => i.type === "item" && i.data.subtype === "trapping")
    }

    getCapacity(items, id){
        return items.find(i => i.type === "capacity" && i._id === id)
    }

    getItemById(id){
        return this.data.items.find(i => i._id === id)
    }    

    getItemByKey(items, key){
        return items.find(i => i.data.key === key)
    }
    
    getCapacityByKey(items, key){
        return items.find(i => i.type === "capacity" && i.data.key === key)
    }

    async applyDamage(value){
        const hp = this.data.data.attributes.hp;
        const newValue = Math.min(hp.value - value, hp.max);
        await this.update({
            "data.attributes.hp.value": newValue
        })
        if( newValue <= 0 ) {            
            let effect = duplicate(CONFIG.statusEffects[0]);
            effect.duration = {rounds:128};            
            effect.flags = {
                core:{
                    statusId: effect.flags["core.statusId"],
                    overlay: effect.flags["core.overlay"],
                }
            }

            effect.label = game.i18n.localize(effect.label);
            await this.applyEffect(effect);
        }
    }

    async clearEffects(filter){
        let remove = [];
        
        switch(filter){
            case "all":
                this.effects.forEach(e => remove.push(e.data._id));
                break;
            case "buff":
                this.effects.forEach(e => {if(Traversal.isBuff(e.data)) remove.push(e.data._id);});
                break;
            case "debuff":
                this.effects.forEach(e => {if(Traversal.isDebuff(e.data)) remove.push(e.data._id);});
                break;
            default:
                this.effects.forEach(e => {if(e.data.flags["core.statusId"] === filter || e.data.flags.core.statusId === filter) remove.push(e.data._id);});
        }        
        
        if(remove.length){
            await this.deleteEmbeddedEntity("ActiveEffect", remove);
        }
    }

    async _onDeath(){
        await this.clearEffects("all");
        Hooks.call("actorDeath", this);
    }

    async applyEffect(effectData){
        const alreadyAppliedeffects = this.effects.filter((e) => e.data.flags.core.statusId === effectData.flags.core.statusId);

        for (const alreadyApplied of alreadyAppliedeffects) {
            if(alreadyApplied.data.disabled){
                continue;
            }
            // extend duration
            if(!alreadyApplied.data.duration){
                return;                
            }
            if(!alreadyApplied.data.duration.combat || !game.combat){
                return; // TODO handle duration outside of combat
            }

            // extends the duration so that the effect span from the start of 
            // the original application to the end of the current application
            const currentRound = game.combat.current.round;
            const startRound = alreadyApplied.data.duration.startRound;
            const duration = effectData.duration.rounds;
            return this.updateEmbeddedEntity("ActiveEffect", {
                _id: alreadyApplied.data._id, 
                "duration.rounds": duration + currentRound - startRound
            });
        }
        if( effectData.flags.core.statusId === "dead"){
            await this._onDeath();            
        }

        await this.createEmbeddedEntity("ActiveEffect", effectData);
    }

    
    getMaxUse(item){
        let maxUse = item.data.maxUse;
        if (maxUse === "@rank") {
            maxUse = item.data.pathRank;            
        }
        if(maxUse === "" || maxUse === undefined){
            return null;
        }
        return maxUse;
    }

    async updateForRound(){
        let updates = [];
        for (const item of this.data.items) {
            const maxUse = this.getMaxUse(item);
            if(!maxUse || item.data.frequency !== 'round'){
                continue;
            }
            updates.push({_id:item._id, "data.nbUse":maxUse});            
        }
        if (!updates.length) {
            return;
        }
        return this.updateEmbeddedEntity("OwnedItem", updates);
    }

    async updateForCombat(){
        let updates = [];
        for (const item of this.data.items) {
            const maxUse = this.getMaxUse(item);
            if(!maxUse || (item.data.frequency !== 'round' && item.data.frequency !== 'combat')){
                continue;
            }
            
            updates.push({_id:item._id, "data.nbUse": maxUse});            
        }
        if (!updates.length) {
            return;
        }
        return this.updateEmbeddedEntity("OwnedItem", updates);
    }

    async updateForDay(){
        let updates = [];
        for (const item of this.data.items) {
            const maxUse = this.getMaxUse(item);
            if(!maxUse || item.data.frequency !== 'day'){
                continue;
            }
           updates.push({_id:item._id, "data.nbUse": maxUse});            
        }
        if (!updates.length) {
            return;
        }
        return this.updateEmbeddedEntity("OwnedItem", updates);
    }

    /* -------------------------------------------- */

    getMagicMod(stats, profile) {

        let intMod = stats.int.mod;
        let wisMod = stats.wis.mod;
        let chaMod = stats.cha.mod;

        // STATS RELATED TO PROFILE
        let magicMod = intMod;
        if (profile) {
            switch (profile.data.spellcasting) {
                case "wis" :
                    magicMod = wisMod;
                    break;
                case "cha" :
                    magicMod = chaMod;
                    break;
                default :
                    magicMod = intMod;
                    break;
            }
        }
        return magicMod;
    }

    /* -------------------------------------------- */

    computeMods(actorData) {
        let stats = actorData.data.stats;
        let items = actorData.items;
        let species = this.getSpecies(items);        

        for(const [key, stat] of Object.entries(stats)){
            stat.racial = (species && species.data.bonuses[key]) ? species.data.bonuses[key] : stat.racial;
            stat.value = stat.base + stat.racial + stat.bonus + stat.buff;
            stat.mod = Stats.getModFromStatValue(stat.value);
        }
    }

    computeAttributes(actorData) {

        let stats = actorData.data.stats;
        let attributes = actorData.data.attributes;
        let items = actorData.items;
        let lvl = actorData.data.level.value;
        let profile = this.getProfile(items);

        attributes.init.base = stats.dex.value;
        attributes.init.value = attributes.init.base + attributes.init.bonus + attributes.init.buff;

        attributes.fp.base = 3 + stats.cha.mod;
        attributes.fp.max = attributes.fp.base + attributes.fp.bonus + attributes.fp.buff;
        attributes.dr.value = attributes.dr.base.value + attributes.dr.bonus.value + attributes.dr.buff;
        attributes.rp.max = attributes.rp.base + attributes.rp.bonus + attributes.rp.buff;
        attributes.hp.max = attributes.hp.base + stats.con.mod * lvl + attributes.hp.bonus + attributes.hp.buff;

        const magicMod = this.getMagicMod(stats, profile);
        if(profile){
            attributes.hd.value = profile.data.dv;
            attributes.mp.base = profile.data.mpfactor * (lvl + magicMod);
        }
        else attributes.mp.base = 0;
        attributes.mp.max = attributes.mp.base + attributes.mp.bonus + attributes.mp.buff;
    }

    /* -------------------------------------------- */

    computeAttacks(actorData) {

        let stats = actorData.data.stats;
        let attacks = actorData.data.attacks;
        let items = actorData.items;
        let lvl = actorData.data.level.value;
        let profile = this.getProfile(items);

        let melee = attacks.melee;
        let ranged = attacks.ranged;
        let magic = attacks.magic;

        let strMod = stats.str.mod;
        let dexMod = stats.dex.mod;

        // STATS RELATED TO PROFILE
        const magicMod = this.getMagicMod(stats, profile);
        melee.base = (strMod) ? strMod + lvl : lvl;
        ranged.base = (dexMod) ? dexMod + lvl : lvl;
        magic.base = (magicMod) ? magicMod + lvl : lvl;
        for (let attack of Object.values(attacks)) {
            attack.mod = attack.base + attack.bonus + attack.buff;
        }
    }

    applyCapacities(actorData, statPass = false) {
        const caps = actorData.items;
        for(let cap of caps){
            if(!cap.data.effects){
                continue;
            }
            if(cap.data.hasOwnProperty("worn") && !cap.data.worn){
                continue;
            }
            for (const key in cap.data.effects) {
                const effect = cap.data.effects[key];     
                if(effect.activable){
                   continue;
                }                 
                if(effect.type == 'buff' && effect.target == 'self'){
                    const changes = Traversal.getChangesFromBuffValue(effect.value);                    
                    for (const change of changes) {
                        if ((statPass && !change.key.startsWith("data.stats."))
                            || (!statPass && change.key.startsWith("data.stats."))) {
                            continue;
                        }                    
                        let formula = CofRoll.replaceSpecialAttributes(change.value, this, cap).formula;
                        const roll = new Roll(formula, actorData.data);
                        roll.roll();
                        const data = actorData.data;
                        const value = eval(change.key) + roll.total
                        Stats.setPath(actorData, change.key, value);
                    }                   
                }               
            }
            MacroDispatcher.onApplyPassive(cap.data.key, this, cap);
        }
    }
    

    /* -------------------------------------------- */

    computeDef(actorData) {
        let stats = actorData.data.stats;
        let attributes = actorData.data.attributes;
        let protections = actorData.items.filter(i => i.type === "item" && i.data.worn && i.data.def).map(i => i.data.def);
        // COMPUTE DEF SCORES
        let protection = protections.reduce((acc, curr) => acc + curr, 0);
        attributes.def.base = 10 + protection + stats.dex.mod;
        attributes.def.value = attributes.def.base + attributes.def.bonus + attributes.def.buff;
    }

    /* -------------------------------------------- */

    computeXP(actorData) {
        let items = actorData.items;
        let lvl = actorData.data.level.value;
        const alert = actorData.data.alert;
        const capacities = this.getActiveCapacities(items);
        let currxp = capacities.map(cap => (cap.data.rank > 2) ? 2 : 1).reduce((acc, curr) => acc + curr, 0);
        const maxxp = 2 * lvl;
        // UPDATE XP
        actorData.data.xp.max = maxxp;
        actorData.data.xp.value = maxxp - currxp;

        if (maxxp - currxp < 0) {
            const diff = currxp - maxxp;
            alert.msg =  `${actorData.name} a dépensé ${diff} point${(diff == 1) ?'':'s'} de capacité en trop !`;
            alert.type = "error";
        } else if (maxxp - currxp > 0) {
            const diff = maxxp - currxp;
            alert.msg = `Il reste ${diff} point${(diff == 1) ?'':'s'} de capacité à dépenser à ${actorData.name}!`;
            alert.type = "info";
        } else {
            alert.msg = null;
            alert.type = null;
        }
        
    }
}
