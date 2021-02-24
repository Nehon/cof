import { CofRoll } from "../controllers/roll.js";
import { CofItem } from "../items/item.js";
import { Capacity } from "../controllers/capacity.js";
import { Traversal } from "../utils/traversal.js";
import { MacroDispatcher } from "./macroDispatcher.js";

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
            if (!key) {
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
                return
            }
            else return ui.notifications.warn(`${game.i18n.localize("COF.notification.MacroItemUnequiped")}: "${itemName}"`);
        }

        if (itemData.data.effects && Object.keys(itemData.data.effects).length) {
            if (itemData.data.properties.consumable && itemData.data.qty <= 0) {
                ui.notifications.warn(`${game.i18n.localize("COF.notification.itemDepleted")} ${itemData.name}`);
                return;
            }
            Macros.rollEffects(actor, itemData.data.effects, itemData);
            return;
        }
        return item.sheet.render(true);

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

        if (actor.getMaxUse(cap) !== null && (cap.data.nbUse <= 0)) {
            ui.notifications.warn(`${game.i18n.localize("COF.notification.capacityDepleted")}: ${cap.name}, ${cap.data.nbUse} / ${actor.getMaxUse(cap)} per ${cap.data.frequency}`);
            return;
        }
        Macros.rollEffects(actor, effects, cap);
    };

    static targetTokensInArea = function (templates, source, releaseOthers, isTarget) {
        if (releaseOthers) {
            game.user.targets.forEach(token =>
                token.setTarget(false, { releaseOthers: false, groupSelection: true }));
        }

        canvas.tokens.objects.children.filter(token => {
            if (token === source || !isTarget(source, token)) {
                return false;
            }
            
            const { x: ox, y: oy } = token.center;
            return templates.some(template => {
                const { x: cx, y: cy } = template.center;
                return template.shape.contains(ox - cx, oy - cy);
            });
        }).forEach(token => token.setTarget(true, { releaseOthers: false, groupSelection: true }));
        game.user.broadcastActivity({ targets: game.user.targets.ids });
    };


    static displayAdjustAOEDialog = async function (source, values, isTarget) {
        Macros.targetTokensInArea([window.aoeTemplate], source, true, isTarget);
        
         //return canvas.tokens.placeables.filter(token => token.data.disposition === disposition && (token.data._id !== excludeId));
        window.aoeTemplateSource = source;
        if (!window.updateAOETemplateRange) {
            window.updateAOETemplateRange = (range) => {
                if (!window.aoeTemplate) {
                    return;
                }
                window.aoeTemplate.data.distance = range;
                window.aoeTemplate.draw();
                window.aoeTemplate.update(window.aoeTemplate.data, {diff:false});
                Macros.targetTokensInArea([window.aoeTemplate], window.aoeTemplateSource, true, isTarget);
            };
        }
        if (!window.updateAOETemplateOrientation) {
            window.updateAOETemplateOrientation = (orientation) => {
                if (!window.aoeTemplate) {
                    return;
                }
                window.aoeTemplate.data.direction = orientation;
                window.aoeTemplate.draw();
                window.aoeTemplate.update(window.aoeTemplate.data, {diff:false});
                Macros.targetTokensInArea([window.aoeTemplate], window.aoeTemplateSource, true, isTarget);
            };
        }
        if (!window.updateAOETemplatePosition) {
            window.updateAOETemplatePosition = (x,y) => {
                if (!window.aoeTemplate) {
                    return;
                }
                const gridSize = game.scenes.viewed.data.grid;
                window.aoeTemplate.data.x += x * gridSize;
                window.aoeTemplate.data.y += y * gridSize;
                window.aoeTemplate.draw();
                window.aoeTemplate.update(window.aoeTemplate.data, {diff:false});
                Macros.targetTokensInArea([window.aoeTemplate], window.aoeTemplateSource, true, isTarget);
            };
        }
        const displayPosition = values[1].min !== values[1].max;
        const dialogContent = await renderTemplate("systems/cof/templates/dialogs/aoe-dialog.hbs", {
            displayRange: values[0].min !== values[0].max,
            range: values[0].max,
            minRange: values[0].min,
            maxRange: values[0].max,
            displayPosition: displayPosition,
            positionMax: values[1],
            displayOrientation: window.aoeTemplate.data.t === "cone",
            orientation: 0            
        });

        let resolved = false;
        return new Promise((resolve => {
            const d = new Dialog({
                title: game.i18n.localize("COF.ui.aoe"),
                content: dialogContent,
                buttons: {
                    no: {
                        label: "Cancel", callback: () => {
                            resolved = true;
                            window.aoeTemplate.delete();
                            window.aoeTemplate = undefined;                            
                            resolve(false);
                        }
                    },
                    yes: { label: "Roll", callback: html => { resolved = true; resolve(true) } }
                },
                close: ()=>{
                    if(!resolved){
                        window.aoeTemplate.delete();
                        window.aoeTemplate = undefined;                            
                        resolve(false);
                    }
                },
                default: 'yes'
            }, { top: 100 });
            if(displayPosition){
                const keyDown = d._onKeyDown
                d._onKeyDown = (event) => {
                    keyDown.call(d, event);
                    event.preventDefault();
                    event.stopPropagation();    
                    switch(event.key){
                        case "ArrowUp":window.updateAOETemplatePosition(0,-1); break;
                        case "ArrowDown":window.updateAOETemplatePosition(0,1); break;
                        case "ArrowRight":window.updateAOETemplatePosition(1,0); break;
                        case "ArrowLeft":window.updateAOETemplatePosition(-1,0); break;
                    }                    
                }
            }
            d.render(true);
        }));

    }

    static displayAOE = async function (source, cap) {
        // <templatetype>(<minDist>-<maxDist>,<minPos>-<maxPos,<angle>). ex: cone(3-10,0-30,170) -> cone template distance = 3 to 10, position = 0 to 30, angle = 170
        const m = cap.data.aoe.match(/([^(]*)\((.*)\)\s*(.*$)/);
        if (!m) {
            return;
        }
        const type = m[1];
        const args = m[2].split(",");
        let isTarget = (source, token) => true;         
        if(m[3] === "enemies"){
            isTarget = (source, token) => source.data.disposition !== token.data.disposition;
        } else if(m[3] === "allies"){
            isTarget = (source, token) => source.data.disposition === token.data.disposition;
        }
        let values = [{ min: 0, max: 0 }, { min: 0, max: 0 }, { min: 1, max: 1 }];
        let needAdjust = false;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const range = arg.split("-");
            let entry = values[i];
            entry.min = range[0];
            entry.max = entry.min;
            if (range.length > 1) {
                needAdjust = true;
                entry.max = range[1];
            }
        }
        if (type === "cone") {
            needAdjust = true;
        }
        const gridSize = game.scenes.viewed.data.grid;
        const x = source.x + gridSize * 0.5;
        const y = source.y + gridSize * 0.5;
        const template = MeasuredTemplate.create({
            t: type,
            user: game.user._id,
            x: x,
            y: y,
            direction: 0,
            angle: values[2].min,
            distance: values[0].max,
            fillColor: "#999999",
        });
        if (!needAdjust) {
            template.then((t)=>Macros.targetTokensInArea([t], source, true, isTarget));
            return template;
        }

        window.aoeTemplate = await template;
        let result = await Macros.displayAdjustAOEDialog(source, values, isTarget);
        if (result) {
            return template;
        }

    }

    static rollEffects = async function (actor, effects, cap) {

        const source = canvas.tokens.controlled[0];
        let template;
        // AOE
        if (cap.data.isAoe) {
            template = await Macros.displayAOE(source, cap);
            if (!template) {
                return;
            }
        }

        // register actions and effects for each type of targets. + one entry for the skill roll
        let action = {
            skillRoll: undefined, // optional skill roll
            damageRoll: undefined, // optional damage roll. if SkillRoll damage are only applied on success.
            effects: new Map(), // ActiveEffects to apply only when a skill roll succeeded for each type of targets.
            uncheckedEffects: new Map(), // ActiveEffect data map to apply in any case when the capacity is triggerred for each type of targets.
            itemId: cap._id,
            forceDisplayApply: !!cap.data.maxUse,
            template: template
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
            if (cap.data.pathIndex) {
                rank = cap.data.pathRank;
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
                action.damageRoll.target = effect.target.length ? effect.target : undefined;
                if(effect.target === "selected"){
                    const target = CofRoll.getTargets(effect.target, source)[0];
                    if(target){
                        action.damageRoll.formula = new Roll(value, mergeObject({target: target.actor.data.data}, actor.data.data)).formula;    
                    } else {
                        action.damageRoll.formula = new Roll(value, actor.data.data).formula;        
                    }
                } else {
                    action.damageRoll.formula = new Roll(value, actor.data.data).formula;    
                }
                
                action.damageRoll.type = effect.type;
                
                if (effect.resistanceFormula) {
                    action.damageRoll.resistanceFormula = effect.resistanceFormula;
                    action.damageRoll.resistanceEffect = effect.resistanceEffect;
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
                    if (!change.key || change.key.trim() === "") {
                        continue;
                    }
                    const valueFormula = CofRoll.replaceSpecialAttributes(change.value, actor, cap).formula;
                    let value = 0;
                    try { value = new Roll(valueFormula, actor.data.data).roll().total; } catch (e) { }
                    change.value = value;
                }
                const effectKey = hasSkillRoll ? "effects" : "uncheckedEffects";
                let activeEffect = Capacity.makeActiveEffect(cap, effect, changes, duration)
                activeEffect.flags.source = source.actor._id;
                action[effectKey].set(effect.target, activeEffect);
            }

            if (effect.type == 'cleanse') {
                if(!action.cleansing){
                    action.cleansing = new Map();
                }
                action.cleansing.set(effect.target, effect.value);
            }
        }
        if (!activable) {
            CofItem.logItem(cap, actor);
            return;
        }

        await MacroDispatcher.onPrepareRoll(cap.data.key,source, action, cap);
        CofRoll.rollDialog(actor, source, cap.name, cap.img, action);
    }
}
