/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
import { CofRoll } from "../controllers/roll.js";

export class CofItem extends Item {

    initialize() {
        try {
            this.prepareData();
        } catch (err) {
            console.error(`Failed to initialize data for ${this.constructor.name} ${this.id}:`);
            console.error(err);
        }
    }

    /** @override */
    prepareData() {
        super.prepareData();
        const itemData = this.data;
        const actorData = (this.actor) ? this.actor.data : null;
        switch (itemData.type) {
            case "item":
            case "spell":
                this._prepareArmorData(itemData, actorData);
                this._prepareWeaponData(itemData, actorData);
                break;
            case "capacity":
            case "path":
            case "profile":
            case "species":
                itemData.data.key = itemData.name.slugify({ strict: true });
                break;
            case "trapping":
                break;
            default:
                break;
        }
    }

    _prepareArmorData(itemData, actorData) {
        itemData.data.def = parseInt(itemData.data.defBase, 10) + parseInt(itemData.data.defBonus, 10);
    }

    _prepareShieldData(itemData, actorData) {
        this._prepareArmorData(itemData, actorData);
        this._prepareWeaponData(itemData, actorData);
    }

    _applyCapacitiesEffects(itemData, actorData){
        // Only apply on equipped weapons
        if (!itemData.data.worn) {   
            return;
        }
        const capacities = actorData.items.filter(i => i.type === "capacity" && i.data.rank);
        capacities.forEach(cap => {           
            for (const key in cap.data.effects) {
                const effect = cap.data.effects[key];
                if (effect.activable || effect.type !== 'buff' ||
                    (effect.target !== "melee" && effect.target !== "ranged")) {
                    continue;
                }
                
                const attr = effect.stat.replace("@", "");
                let val = itemData.data[attr];                
                
                let r = new Roll(effect.value, itemData.data);
                if((typeof val) === "number"){
                    r.roll();
                    val += r.total;
                } else if(!r.formula.match(/[0-9]*d[0-9]*/gi)){
                    r.roll();
                    val += "+" + r.total;
                } else {
                    val += "+" + r.formula;
                }
                itemData.data[attr] = val
            }
        });
    }

    _prepareWeaponData(itemData, actorData) {
        itemData.data.skillBonus = (itemData.data.skillBonus) ? itemData.data.skillBonus : 0;
        itemData.data.dmgBonus = (itemData.data.dmgBonus) ? itemData.data.dmgBonus : 0;
        if (!actorData) {
            return;
        }
        // Compute skill mod
        const skillMod = eval("actorData.data." + itemData.data.skill.split("@")[1]);
        itemData.data.mod = parseInt(skillMod) + parseInt(itemData.data.skillBonus);
        // Compute damage mod
        const dmgStat = eval("actorData.data." + itemData.data.dmgStat.split("@")[1]);
        const dmgBonus = (dmgStat) ? parseInt(dmgStat) + parseInt(itemData.data.dmgBonus) : parseInt(itemData.data.dmgBonus);
        if (dmgBonus < 0) itemData.data.dmg = itemData.data.dmgBase + " - " + parseInt(-dmgBonus);
        else if (dmgBonus === 0) itemData.data.dmg = itemData.data.dmgBase;
        else itemData.data.dmg = itemData.data.dmgBase + " + " + dmgBonus;

        this._applyCapacitiesEffects(itemData, actorData)
    }

}
