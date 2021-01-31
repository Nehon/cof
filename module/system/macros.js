import { CofRoll } from "../controllers/roll.js";
import { CofItem } from "../items/item.js";
import { Capacity } from "../controllers/capacity.js";
import { Traversal } from "../utils/traversal.js";

export class Macros {

    static getSpeakersActor = function () {
        const speaker = ChatMessage.getSpeaker();
        let actor;
        // if a token is selected take it as target actor
        if (speaker.token) actor = game.actors.tokens[speaker.token];
        // otherwise take the default actor for current user
        if (!actor) actor = game.actors.get(speaker.actor);
        return actor;
    }

    static rollStatMacro = async function (actor, stat, onEnter = "submit") {
        if (actor) {
            let key;
            switch (stat) {                                
                case "melee": 
                case "ranged":
                case "magic": 
                     key = `data.attacks.${stat}`;       
                break;                
            }
            if(!key){
                key = `data.stats.${stat}`;
            }
            CofRoll.skillCheckDialog(actor, key);            
        } else {
            ui.notifications.error(game.i18n.localize("COF.notification.NoActorSelected"));
        }
    };

    static rollItemMacro = function (itemId, itemName, itemType) {
        const actor = Macros.getSpeakersActor()
        let item;
        item = actor ? actor.items.find(i => i.name === itemName && i.type == itemType) : null;
        if (!item) return ui.notifications.warn(`${game.i18n.localize("COF.notification.MacroItemMissing")}: "${itemName}"`);
        const itemData = item.data;
        if (itemData.data.properties.weapon) {
            if (itemData.data.worn) {
                const key = itemData.data.skill.replace("@", "actor.data.data.").replace(".mod", ".superior");
                const superior = eval(key);

                const action = {
                    skillRoll: {
                        superior: superior,
                        mod: itemData.data.mod,
                        dice: "1d20",
                        critRange: itemData.data.critrange,
                        target: "selected"
                    },

                    damageRoll: {
                        formula: itemData.data.dmg,
                        type: "damage",
                        target: "selected"
                    }
                };
                CofRoll.rollDialog(actor, actor.token, itemData.name, itemData.img, action);
            }
            else return ui.notifications.warn(`${game.i18n.localize("COF.notification.MacroItemUnequiped")}: "${itemName}"`);
        }
        else {
            return item.sheet.render(true);
        }
    };

    static rollCapacityMacro = async function (itemKey, itemName) {
        const actor = Macros.getSpeakersActor()
        if (!actor) {
            return ui.notifications.warn(game.i18n.localize("COF.notification.NoActorSelected"));
        }

        const cap = actor.getCapacityByKey(actor.data.items, itemKey);
        if (!cap) {
            return ui.notifications.warn(`${game.i18n.localize("COF.notification.NoCapacity")}: "${itemName}"`);
        }
        const effects = cap.data.effects;
        if (!effects || !Object.keys(effects).length) {
            CofItem.logItem(cap, actor);
            return;
        }
        
        if(actor.getMaxUse(cap) !== null && (cap.data.nbUse <= 0)){
            ui.notifications.warn(`${game.i18n.localize("COF.notification.capacityDepleted")}: ${cap.name}, ${cap.data.nbUse} / ${actor.getMaxUse(cap)} per ${cap.data.frequency}`);
            return;
        }

        // register actions and effects for each type of targets. + one entry for the skill roll
        let action = {
            skillRoll: undefined, // optional skill roll
            damageRoll: undefined, // optional damage roll. if SkillRoll damage are only applied on success.
            effects: new Map(), // ActiveEffects to apply only when a skill roll succeeded for each type of targets.
            uncheckedEffects: new Map(), // ActiveEffect data map to apply in any case when the capacity is triggerred for each type of targets.
            itemId: cap._id,
            forceDisplayApply: !!cap.data.maxUse
        }
        let activable = false;

        // only activable effects are considered, all effects found after a skill roll are considered applied only if the skill roll succeeded.
        // gather effects
        for (let key in effects) {
            const effect = effects[key];
            if (!effect.activable) {
                continue;
            }            
            let rank = 0;
            if (cap.data.pathIndex != undefined) {
                rank = actor.data.data.paths[cap.data.pathIndex].rank;
                if (effect.rank > rank || rank > effect.maxRank) {
                    continue;
                }
            }
            activable = true;

            if (effect.testRoll) {
                if (action.skillRoll != undefined) {
                    ui.notifications.warn(`${game.i18n.localize("COF.notification.multipleSkillRoll")}: "${cap.name}"`);
                }
                action.skillRoll = CofRoll.replaceSpecialAttributes(effect.testMod, actor, cap);
                let roll = new Roll(action.skillRoll.formula, actor.data.data);
                roll.roll();
                action.skillRoll.mod = roll.total;
                action.skillRoll.dice = effect.testDice
                action.skillRoll.target = effect.target.length ? effect.target : undefined;
                action.skillRoll.critRange = 20;
            }

            const hasSkillRoll = action.skillRoll != undefined;

            if (effect.type == 'skill') {
                continue;
            }

            if (effect.type === "damage" || effect.type === "heal") {
                const value = CofRoll.replaceSpecialAttributes(effect.value, actor, cap).formula;
                action.damageRoll = {};
                action.damageRoll.formula = new Roll(value, actor.data.data).formula;
                action.damageRoll.type = effect.type;
                action.damageRoll.target = effect.target.length ? effect.target : undefined;
                if(effect.restsitanceFormula){
                    action.damageRoll.restsitanceFormula = effect.restsitanceFormula;
                    action.damageRoll.resistanceEffect = effect.restsitanceFormula;
                }
                continue;
            }

            if (effect.type == 'buff') {
                let duration = 0;
                if (effect.duration) {
                    const durationFormula = CofRoll.replaceSpecialAttributes(effect.duration, actor, cap).formula;
                    duration = new Roll(durationFormula, actor.data.data).roll().total;
                }
                let changes = Traversal.getChangesFromBuffValue(effect.value);
                for (let change of changes) {
                    if(!change.key || change.key.trim() === ""){
                        continue;
                    }
                    const valueFormula = CofRoll.replaceSpecialAttributes(change.value, actor, cap).formula;
                    let value = 0;
                    try { value = new Roll(valueFormula, actor.data.data).roll().total; } catch (e) { }
                    change.value = value;
                }
                const effectKey = hasSkillRoll ? "effects" : "uncheckedEffects";
                action[effectKey].set(effect.target, Capacity.makeActiveEffect(cap, effect, changes, duration));
            }            
        }
        if(!activable){
            CofItem.logItem(cap, actor);
            return;
        }

        //console.log(action);
        const source = canvas.tokens.controlled[0];
        CofRoll.rollDialog(actor, source, cap.name, cap.img, action);
    };


}
