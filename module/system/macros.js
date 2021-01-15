import {CofRoll} from "../controllers/roll.js";
import { Traversal } from "../utils/traversal.js";

export class Macros {

    static getSpeakersActor = function(){
        const speaker = ChatMessage.getSpeaker();
        let actor;
        // if a token is selected take it as target actor
        if (speaker.token) actor = game.actors.tokens[speaker.token];
        // otherwise take the default actor for current user
        if (!actor) actor = game.actors.get(speaker.actor);
        return actor;
    }

    static rollStatMacro = async function (actor, stat, onEnter = "submit") {
        if(actor){
            let statObj;
            switch(stat){
                case "for" :
                case "str" : statObj = eval(`actor.data.data.stats.str`); break;
                case "dex" : statObj = eval(`actor.data.data.stats.dex`); break;
                case "con" : statObj = eval(`actor.data.data.stats.con`); break;
                case "int" : statObj = eval(`actor.data.data.stats.int`); break;
                case "sag" :
                case "wis" : statObj = eval(`actor.data.data.stats.wis`); break;
                case "cha" : statObj = eval(`actor.data.data.stats.cha`); break;
                case "atc" :
                case "melee" : statObj = eval(`actor.data.data.attacks.melee`); break;
                case "atd" :
                case "ranged" : statObj = eval(`actor.data.data.attacks.ranged`); break;
                case "atm" :
                case "magic" : statObj = eval(`actor.data.data.attacks.magic`); break;
                default :
                    ui.notifications.error("La compétence à tester n'a pas été reconnue.");
                    break;
            }
            await CofRoll.skillRollDialog(actor, game.i18n.localize(statObj.label), statObj.mod, 0, 20, statObj.superior, onEnter);
        } else {
            ui.notifications.error("Vous devez sélectionner un token pour pouvoir exécuter cette macro.");
        }
    };

    static rollItemMacro = function (itemId, itemName, itemType) {
        const actor = this.getSpeakersActor()
        let item;
        item = actor ? actor.items.find(i => i.name === itemName && i.type == itemType) : null;
        if (!item) return ui.notifications.warn(`${game.i18n.localize("COF.notification.MacroItemMissing")}: "${itemName}"`);
        item.prepareData();
        const itemData = item.data;
        if(itemData.data.properties.weapon){
            if(itemData.data.worn){
                let label = itemData.name;
                let mod = itemData.data.mod;
                let critrange = itemData.data.critrange;
                let dmg = itemData.data.dmg;
                CofRoll.rollWeaponDialog(actor, label, mod, 0, critrange, dmg, 0, 'damage', [...game.user.targets][0]);
            }
            else return ui.notifications.warn(`${game.i18n.localize("COF.notification.MacroItemUnequiped")}: "${itemName}"`);
        }
        else{
            return item.sheet.render(true);
        }
    };

    static rollCapacityMacro = function (itemKey, itemName) {
        const actor = this.getSpeakersActor()
        if (!actor) {
            return ui.notifications.warn(`${game.i18n.localize("COF.notification.NoActorSelected")}`);
        }
        
        const cap = actor.getCapacityByKey(actor.data.items, itemKey);
        if(!cap){
             return ui.notifications.warn(`${game.i18n.localize("COF.notification.NoCapacity")}: "${itemName}"`);
        }
        const effects = cap.data.effects;
        if(!effects){
            // log the text in the chat?
            return;
        }
        for(let key in effects){
            const effect = effects[key];
            if(!effect.activable){
                continue;
            }
            const rank = actor.data.data.paths[cap.data.pathIndex].rank;
            if(effect.rank > rank || rank > effect.maxRank){
                continue;
            }
            if (effect.type == 'skill') {
                if (effect.testRoll) {
                    const testMod = effect.testMod.replace("@rank", `@paths.${cap.data.pathIndex}.rank`)
                    let roll = new Roll(testMod, actor.data.data);
                    roll.roll();
                    CofRoll.skillRollDialog(actor, cap.name, roll.total, 0, 20/*, superior=false, onEnter = "submit"*/);
                    return;
                }
            }
            // self
            let target = undefined;
            if(effect.target === "selected"){
                target = [...game.user.targets][0];
            } else if(effect.target = "self"){
                target = canvas.tokens.controlled[0];
            }

            if (effect.type == 'damage') {
                const value = effect.value.replace("@rank", `@paths.${cap.data.pathIndex}.rank`)
                let dmgRoll = new Roll(value, actor.data.data);                    
                if (effect.testRoll) {
                    const testMod = effect.testMod.replace("@rank", `@paths.${cap.data.pathIndex}.rank`)
                    let testRoll = new Roll(testMod, actor.data.data);
                    let formula = testRoll.formula.replace(/ /g, "");
                    CofRoll.rollWeaponDialog(actor, cap.name, formula, 0, 20, dmgRoll.formula, 0, effect.type , target/* ,onEnter = "submit"*/);                      
                    return;
                } else {
                    CofRoll.rollDamageDialog(actor, cap.name, dmgRoll._formula , 0, effect.type, false, target/* onEnter = "submit"*/);
                }
            }
            if (effect.type == 'heal') {
                const value = effect.value.replace("@rank", `@paths.${cap.data.pathIndex}.rank`)
                let dmgRoll = new Roll(value, actor.data.data);                    
                if (effect.testRoll) {
                    const testMod = effect.testMod.replace("@rank", `@paths.${cap.data.pathIndex}.rank`)
                    let testRoll = new Roll(testMod, actor.data.data);
                    let formula = testRoll.formula.replace(/ /g, "");
                    CofRoll.rollWeaponDialog(actor, cap.name, formula, 0, 20, dmgRoll.formula, 0, effect.type, target/* ,onEnter = "submit"*/);                      
                    return;
                } else {
                    CofRoll.rollDamageDialog(actor, cap.name, dmgRoll._formula , 0, "heal", false, target /* ,critical = false, onEnter = "submit"*/);
                }
            }
            
        }
    };


}
