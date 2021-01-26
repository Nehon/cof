/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
import {Stats} from "../system/stats.js";

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
        attributes.init.value = attributes.init.base + attributes.init.buff;
        attributes.def.value = attributes.def.base + attributes.def.buff;
        attributes.dr.value = attributes.dr.base.value + attributes.dr.buff;
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
        return items.filter(i => i.type === "capacity")
    }

    getCapacity(items, id){
        return items.find(i => i.type === "capacity" && i._id === id)
    }

    getItemById(id){
        return this.data.items.find(i => i._id === id)
    }    
    
    getCapacityByKey(items, key){
        return items.find(i => i.type === "capacity" && i.data.key === key)
    }

    applyDamage(value){
        const hp = this.data.data.attributes.hp;
        const newValue = Math.min(hp.value - value, hp.max);
        this.update({
            "data.attributes.hp.value": newValue
        })
    }

    applyEffect(effectData){
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
            this.updateEmbeddedEntity("ActiveEffect", {
                _id: alreadyApplied.data._id, 
                "duration.rounds": duration + currentRound - startRound
            });

            return;            
        }
        this.createEmbeddedEntity("ActiveEffect", effectData);
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
        if(!this.pathRanksUpdated){
            return;
        }
        const caps = this.getActiveCapacities(actorData.items);
        for(let cap of caps){
            if(!cap.data.effects){
                continue;
            }
            for (const key in cap.data.effects) {
                const effect = cap.data.effects[key];               
                if(effect.activable){
                   continue;
                } 
                if(effect.type == 'buff' && effect.target == 'self'){
                    const value = effect.value.replace("@rank", `@paths.${cap.data.pathIndex}.rank`)
                    const roll = new Roll(value, actorData.data);
                    roll.roll();
                    const result = roll.total;                    
                    const attr = effect.stat.replace('@', '');
                    if ((statPass && !attr.startsWith("stats."))
                        || (!statPass && attr.startsWith("stats."))) {
                        continue;
                    }                    
                    let attrValue = Stats.getObjectValueForPath(actorData.data, attr);
                    attrValue += result;
                    Stats.setPath(actorData.data, attr, attrValue);
                }
            }
            
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

    computePathRank(path, pathIndex, capacites) {       
        let rank = 0;
        for (const capacity of path.data.capacities) {
            let cap = game.cof.config.capacities.find(c => c._id == capacity);
            if(!cap){
                const gameCaps = game.items.filter(i => i.type === "capacity");
                cap = gameCaps.find(c => c._id == capacity);
                cap = cap ? cap.data : cap;
            }
            const activeCapacity = capacites.find(i => i.data.key === cap.data.key);
            if (!activeCapacity) {
                continue;
            }
            activeCapacity.data.pathIndex = pathIndex;
            if (activeCapacity.data.rank > rank) {
                rank = activeCapacity.data.rank;
            }
        }
        return rank;
    }

    updatePathRanks(capacities){        
        const paths = this.getPaths(this.data.items);
        this.data.data.paths = {};  // important, paths needs to be an object in order to be able to call @paths.0.rank in chat macros.
        for (let index = 0; index < paths.length; index++) {
            const path = paths[index];
            const rank = this.computePathRank(path, index, capacities);
            this.data.data.paths[index] = {_id: path._id, rank: rank};       
        }
        this.pathRanksUpdated = true;
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

        if (game.cof.config.capacities.length) {
            this.updatePathRanks(capacities);            
        }
       
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
