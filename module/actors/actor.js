/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
import {Stats} from "../system/stats.js";
import {COF} from "../config.js";

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
    }

    /* -------------------------------------------- */

    _prepareBaseCharacterData(actorData) {
        this.computeModsAndAttributes(actorData);
        this.computeAttacks(actorData);
    }

    /* -------------------------------------------- */

    _prepareDerivedCharacterData(actorData) {
        this.computeDef(actorData);
        this.computeXP(actorData);
    }

    /* -------------------------------------------- */

    _prepareBaseEncounterData(actorData) {
        // STATS
        let stats = actorData.data.stats;
        // COMPUTE STATS FROM MODS
        for (let stat of Object.values(stats)) {
            stat.value = Stats.getStatValueFromMod(stat.mod);
        }

        // ATTACKS
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
                    "mod": Math.ceil(actorData.data.nc.value) + actorData.data.stats.str.mod
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
        } else {
            let attacks = actorData.data.attacks;
            for (let attack of Object.values(attacks)) {
                attack.mod = attack.base + attack.bonus;
            }
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
    }

    /* -------------------------------------------- */

    _prepareDerivedEncounterData(actorData) {}

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
    /* -------------------------------------------- */

    getActiveCapacities(items) {
        return items.filter(i => i.type === "capacity" && i.data.rank)
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

    computeModsAndAttributes(actorData) {

        let stats = actorData.data.stats;
        let attributes = actorData.data.attributes;
        let items = actorData.items;
        let lvl = actorData.data.level.value;
        let species = this.getSpecies(items);
        let profile = this.getProfile(items);

        for(const [key, stat] of Object.entries(stats)){
            stat.racial = (species && species.data.bonuses[key]) ? species.data.bonuses[key] : stat.racial;
            stat.value = stat.base + stat.racial + stat.bonus;
            stat.mod = Stats.getModFromStatValue(stat.value);
        }

        attributes.init.base = stats.dex.value;
        attributes.init.value = attributes.init.base + attributes.init.bonus;

        attributes.fp.base = 3 + stats.cha.mod;
        attributes.fp.max = attributes.fp.base + attributes.fp.bonus;
        attributes.dr.value = attributes.dr.base.value + attributes.dr.bonus.value;
        attributes.rp.max = attributes.rp.base + attributes.rp.bonus;
        attributes.hp.max = attributes.hp.base + attributes.hp.bonus;

        const magicMod = this.getMagicMod(stats, profile);
        if(profile){
            attributes.hd.value = profile.data.dv;
            attributes.mp.base = profile.data.mpfactor * (lvl + magicMod);
        }
        else attributes.mp.base = 0;
        attributes.mp.max = attributes.mp.base + attributes.mp.bonus;
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
            attack.mod = attack.base + attack.bonus;
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
        attributes.def.value = attributes.def.base + attributes.def.bonus;
    }

    /* -------------------------------------------- */

    computePathRank(path, capacites) {       
        let rank = 0;
        for (const capacity of path.data.capacities) {
            const cap = game.cof.config.capacities.find(c => c._id == capacity);
            const activeCapacity = capacites.find(i => i.data.key === cap.data.key);
            if (!activeCapacity) {
                continue;
            }
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
            const rank = this.computePathRank(path, capacities);
            this.data.data.paths[index] = {_id: path._id, rank: rank};       
        }
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
            ui.notifications.error(alert.msg);
        } else if (maxxp - currxp > 0) {
            const diff = maxxp - currxp;
            alert.msg = `Il reste ${diff} point${(diff == 1) ?'':'s'} de capacité à dépenser à ${actorData.name}!`;
            alert.type = "info";
            ui.notifications.info(alert.msg);
        } else {
            alert.msg = null;
            alert.type = null;
        }
        
    }
}
