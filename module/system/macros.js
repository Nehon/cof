import { Capacity } from "../controllers/capacity.js";
import { CofRoll } from "../controllers/roll.js";
import { Traversal } from "../utils/traversal.js";
import { CofBuffRoll } from "./buff-roll.js";

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
            let statObj;
            switch (stat) {
                case "for":
                case "str": statObj = eval(`actor.data.data.stats.str`); break;
                case "dex": statObj = eval(`actor.data.data.stats.dex`); break;
                case "con": statObj = eval(`actor.data.data.stats.con`); break;
                case "int": statObj = eval(`actor.data.data.stats.int`); break;
                case "sag":
                case "wis": statObj = eval(`actor.data.data.stats.wis`); break;
                case "cha": statObj = eval(`actor.data.data.stats.cha`); break;
                case "atc":
                case "melee": statObj = eval(`actor.data.data.attacks.melee`); break;
                case "atd":
                case "ranged": statObj = eval(`actor.data.data.attacks.ranged`); break;
                case "atm":
                case "magic": statObj = eval(`actor.data.data.attacks.magic`); break;
                default:
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
        const itemData = item.data;
        if (itemData.data.properties.weapon) {
            if (itemData.data.worn) {
                let label = itemData.name;
                let mod = itemData.data.mod;
                let critrange = itemData.data.critrange;
                let dmg = itemData.data.dmg;
                CofRoll.rollWeaponDialog(actor, label, mod, actor.data.data.globalRollBonus, critrange, dmg, 0, 'damage', [...game.user.targets][0]);
            }
            else return ui.notifications.warn(`${game.i18n.localize("COF.notification.MacroItemUnequiped")}: "${itemName}"`);
        }
        else {
            return item.sheet.render(true);
        }
    };

    
    static rollCapacityMacro = async function (itemKey, itemName) {
        const actor = this.getSpeakersActor()
        if (!actor) {
            return ui.notifications.warn(`${game.i18n.localize("COF.notification.NoActorSelected")}`);
        }

        const cap = actor.getCapacityByKey(actor.data.items, itemKey);
        if (!cap) {
            return ui.notifications.warn(`${game.i18n.localize("COF.notification.NoCapacity")}: "${itemName}"`);
        }
        const effects = cap.data.effects;
        if (!effects) {
            // log the text in the chat?
            return;
        }
        for (let key in effects) {
            const effect = effects[key];
            if (!effect.activable) {
                continue;
            }
            const rank = actor.data.data.paths[cap.data.pathIndex].rank;
            if (effect.rank > rank || rank > effect.maxRank) {
                continue;
            }
            const source = canvas.tokens.controlled[0];

            if (effect.type == 'skill') {
                if (effect.testRoll) {
                    const testMod = CofRoll.replaceSpecialAttributes(effect.testMod, actor, cap).result;
                    let roll = new Roll(testMod, actor.data.data);
                    roll.roll();
                    await CofRoll.skillRollDialog(actor, cap.name, roll.total, actor.data.data.globalRollBonus, 20, false, effect.testDice/*onEnter = "submit"*/);
                    continue;
                }
            }

            // self            
            let targets = [];
            if (effect.target === "selected") {
                if (game.user.targets.size) {
                    targets = [[...game.user.targets][0]];
                }
            } else if (effect.target === "self") {
                targets = [source];
            } else if (effect.target === "allies") {
                targets = Traversal.getTokensForDisposition(source.data.disposition, source.data._id);
            } else if (effect.target === "enemies") {
                // friendly if hostile, hostile if friendly
                targets = Traversal.getTokensForDisposition(source.data.disposition * -1);
            } else if (effect.target === "all") {
                targets = canvas.tokens.placeables;
            }

            if (effect.type == 'buff') {
                const ae = CONFIG.statusEffects.find(e => e.id === effect.value);
                const value = CofRoll.replaceSpecialAttributes(effect.value, actor, cap).result;
                let valueRoll = new Roll(value, actor.data.data);
                if (effect.testRoll) {
                } else {
                    let durationFormula;
                    if (effect.duration) {
                        const duration = CofRoll.replaceSpecialAttributes(effect.duration, actor, cap).result;
                        let r = new Roll(duration, actor.data.data)
                        durationFormula = r.formula;
                    }

                    let roll = new CofBuffRoll(cap.name, valueRoll.formula, effect.stat, durationFormula);
                    roll.roll(actor, targets);
                    let activeEffect;
                    if (ae) {
                        activeEffect = Capacity.makeActiveEffect(cap, effect, 0, roll.duration);
                        activeEffect.icon = ae.icon;
                        activeEffect.label = game.i18n.localize(ae.label);
                        activeEffect["flags.core.statusId"] = ae.id;
                    } else {
                        activeEffect = Capacity.makeActiveEffect(cap, effect, roll.total, roll.duration);
                    }
                    if (activeEffect && targets) {
                        targets.forEach(trg => {
                            // TODO maybe record the starting time so that if the application is cloased before the timeout is called we can clean up / resume.
                            const prom = trg.actor.createEmbeddedEntity("ActiveEffect", activeEffect);
                            if (!game.combat) {
                                prom.then((eff) => {
                                    setTimeout(() => {
                                        trg.actor.deleteEmbeddedEntity("ActiveEffect", eff._id);
                                    }, roll.duration * 10000);
                                });
                            }
                        });
                    }
                }
                continue;
            }

            if (effect.type == 'damage') {
                const value = CofRoll.replaceSpecialAttributes(effect.value, actor, cap).result;
                let dmgRoll = new Roll(value, actor.data.data);
                if (effect.testRoll) {
                    const testMod = CofRoll.replaceSpecialAttributes(effect.testMod, actor, cap);
                    let testRoll = new Roll(testMod.result, actor.data.data);
                    //let formula = testRoll.formula.replace(/ /g, "");
                    testRoll.roll();
                    await CofRoll.rollWeaponDialog(actor, cap.name, testRoll.total, actor.data.data.globalRollBonus, 20, dmgRoll.formula, 0, effect.type, targets ? targets[0] : undefined, testMod.superior, effect.testDice/* ,onEnter = "submit"*/);
                } else {
                    await CofRoll.rollDamageDialog(actor, cap.name, dmgRoll._formula, 0, effect.type, false, targets/* onEnter = "submit"*/);
                }
                continue;
            }

            if (effect.type == 'heal') {
                const value = CofRoll.replaceSpecialAttributes(effect.value, actor, cap).result;
                let dmgRoll = new Roll(value, actor.data.data);
                if (effect.testRoll) {
                    const testMod = CofRoll.replaceSpecialAttributes(effect.testMod, actor, cap);
                    let testRoll = new Roll(testMod.result, actor.data.data);
                    //let formula = testRoll.formula.replace(/ /g, "");
                    testRoll.roll();
                    await CofRoll.rollWeaponDialog(actor, cap.name, testRoll.total, actor.data.data.globalRollBonus, 20, dmgRoll.formula, 0, effect.type, targets ? targets[0] : undefined, testMod.superior, effect.testDice/* ,onEnter = "submit"*/);

                } else {
                    await CofRoll.rollDamageDialog(actor, cap.name, dmgRoll._formula, 0, "heal", false, targets /* ,critical = false, onEnter = "submit"*/);
                }
                continue;
            }
        }
    };


}
