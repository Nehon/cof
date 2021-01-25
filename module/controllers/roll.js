import { CharacterGeneration } from "../system/chargen.js";
import { CofSkillRoll } from "../system/skill-roll.js";
import { CofDamageRoll } from "../system/dmg-roll.js";
import { Traversal } from "../utils/traversal.js";


const iconsMap = {
    "data.stats.str": "systems/cof/ui/macros/icons/FOR.png",
    "data.stats.dex": "systems/cof/ui/macros/icons/DEX.png",
    "data.stats.con,": "systems/cof/ui/macros/icons/STAM.png",
    "data.stats.int": "systems/cof/ui/macros/icons/INT.png",
    "data.stats.wis": "systems/cof/ui/macros/icons/WIS.png",
    "data.stats.cha": "systems/cof/ui/macros/icons/CHA.png",
    "data.attacks.melee": "systems/cof/ui/macros/icons/ATC.png",
    "data.attacks.ranged": "systems/cof/ui/macros/icons/ATD.png",
    "data.attacks.magic": "systems/cof/ui/macros/icons/ATM.png",
}

export class CofRoll {
    static options() {
        return { classes: ["cof", "dialog"] };
    }

    static getTargetsTemplate(actor, targets) {
        if (!targets || !targets.length) {
            return;
        }
        const actorToken = canvas.tokens.placeables.find((t) => t.actor.data._id === actor.data._id);
        let html = `<div class="flex2" style="position:relative">`;
        html += `<img style="border:none" src="${actorToken.data.img}" width="32" height="32" />`;
        html += `<i class="fas fa-arrow-alt-circle-right" style="font-size: 16px;margin: 3px;vertical-align: super;"></i>`;
        for (let i = 0; i < targets.length && i < 4; i++) {
            const target = targets[i];
            const z = i + 1;
            const m = i * 8;
            html += `<img style="border:none; z-index:${z}; margin-left: ${m}px; position: absolute; margin-top:${i * 2}px;" src="${target.data.img}" width="32" height="32" />`;
        }
        html += `</div>`;
        return html;
    }

    /**
     *  Handles skill check rolls
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static skillCheck(data, actor, event) {
        const elt = $(event.currentTarget)[0];
        let key = elt.attributes["data-rolling"].value;
        let label = eval(`${key}.label`);
        const mod = eval(`${key}.mod`);
        // let bonus = eval(`${key}.bonus`);
        let superior = eval(`${key}.superior`);
        label = (label) ? game.i18n.localize(label) : null;

        const skillRoll = {
            superior: superior,
            mod: mod,
            dice: "1d20",
            critRange: 20,
        }
        CofRoll.rollDialog(actor, actor.token, label, iconsMap[key], { skillRoll: skillRoll });
    }


    /**
     *  Handles weapon check rolls
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static rollWeapon(data, actor, event) {
        const li = $(event.currentTarget).parents(".item");
        let item = actor.getOwnedItem(li.data("itemId"));
        const itemData = item.data;
        const key = itemData.data.skill.replace("@", "data.").replace(".mod", ".superior");
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
        return CofRoll.rollDialog(actor, actor.token, itemData.name, itemData.img, action);
    }

    /**
     *  Handles encounter attack checks
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static rollEncounterWeapon(data, actor, event) {
        const item = $(event.currentTarget).parents(".weapon");
        let label = item.find(".weapon-name").val();
        let mod = parseInt(item.find(".weapon-mod").val(), 10);
        let attackBuff = actor.data.data.attacks.melee.buff;
        let critrange = item.find(".weapon-critrange").val();
        let dmg = item.find(".weapon-dmg").val();

        const action = {
            hideFate: true,
            skillRoll: {
                mod: mod + attackBuff,
                dice: "1d20",
                critRange: critrange,
                target: "selected"
            },

            damageRoll: {
                formula: dmg,
                type: "damage",
                target: "selected"
            }
        };
        return CofRoll.rollDialog(actor, actor.token, label, "systems/cof/ui/icons/red_31.jpg", action);
    }

    /**
     *  Handles encounter damage rolls
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static rollEncounterDamage(data, actor, event) {
        const item = $(event.currentTarget).parents(".weapon");
        let label = item.find(".weapon-name").val();
        let dmg = item.find(".weapon-dmg").val();
        const action = {
            damageRoll: {
                formula: dmg,
                type: "damage",
                target: "selected"
            }
        };
        return CofRoll.rollDialog(actor, actor.token, label, "systems/cof/ui/icons/red_31.jpg", action);
    }

    /**
     *  Handles spell rolls
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static rollSpell(data, actor, event) {
        const li = $(event.currentTarget).parents(".item");
        let item = actor.getOwnedItem(li.data("itemId"));
        const action = {
            skillRoll: {
                mod: item.data.data.mod,
                dice: "1d20",
                critRange: item.data.data.critrange,
                target: "selected"
            },

            damageRoll: {
                formula: item.data.data.dmg,
                type: "damage",
                target: "selected"
            }
        };
        return CofRoll.rollDialog(actor, actor.token, item.data.name, item.data.img, action);
    }

    /**
     *  Handles damage rolls
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static rollDamage(data, actor, event) {
        const li = $(event.currentTarget).parents(".item");
        let item = actor.getOwnedItem(li.data("itemId"));
        const action = {
            damageRoll: {
                formula: item.data.data.dmg,
                type: "damage",
                target: "selected"
            }
        };
        return CofRoll.rollDialog(actor, actor.token, item.data.name, item.data.img, action);
    }

    /**
     *  Handles Hit Points Rolls
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static rollHitPoints(data, actor, event) {
        let hp = data.attributes.hp;
        const lvl = data.level.value;
        const actorData = actor.data;

        Dialog.confirm({
            title: "Roll Hit Points",
            content: `<p>Êtes sûr de vouloir remplacer les points de vie de <strong>${actor.name}</strong></p>`,
            yes: () => {
                if (actorData.data.attributes.hd && actorData.data.attributes.hd.value) {
                    const hd = actorData.data.attributes.hd.value;
                    const hdmax = parseInt(hd.split("d")[1]);
                    // If LVL 1 COMPUTE HIT POINTS
                    if (lvl == 1) {
                        hp.base = hdmax;
                        hp.max = hp.base + hp.bonus;
                    } else {
                        const hpLvl1 = hdmax;
                        const dice2Roll = lvl - 1;
                        const formula = `${dice2Roll}d${hdmax}`;
                        const r = new Roll(formula);
                        r.roll();
                        r.toMessage({
                            user: game.user._id,
                            flavor: "<h2>Roll Hit Points</h2>",
                            speaker: ChatMessage.getSpeaker({ actor: actor })
                        });
                        hp.base = hpLvl1 + r.total;
                        hp.max = hp.base + hp.bonus;
                    }
                    actor.update({ 'data.attributes.hp': hp });
                } else ui.notifications.error("Vous devez sélectionner un profil ou choisir un Dé de Vie.");
            },
            defaultYes: false
        });
    }

    /**
     *  Handles attributes rolls
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static async rollAttributes(data, actor, event) {
        let stats = data.stats;
        Dialog.confirm({
            title: "Jet de caractéristiques",
            content: `<p>Êtes sûr de vouloir remplacer les caractériques de <strong>${actor.name}</strong></p>`,
            yes: () => {
                const rolls = CharacterGeneration.statsCommand(actor);
                let i = 0;
                for (const stat of Object.values(stats)) {
                    stat.base = rolls[i].total;
                    ++i;
                }
                actor.update({ 'data.stats': stats });
            },
            defaultYes: false
        });
        return true;
    }


    static replaceSpecialAttributes(formula, actor, capacity) {
        let superior = false;
        if (!formula) {
            return "0";
        }
        const arr = formula.split(">");
        let result = arr[0].trim();
        let difficulty = arr.length > 1 ? arr[1].trim() : undefined;
        if(difficulty && (typeof difficulty) !== "number" && difficulty.indexOf("@target") >=0 ){
            const target = CofRoll.getTargets("selected")[0];
            difficulty = eval(difficulty.replace("@target","target.actor.data.data"));
        }

        if (result.indexOf("@rank") >= 0) {
            const rank = actor.data.data.paths[capacity.data.pathIndex].rank;
            result = result.replace(/@rank/g, rank);
        }
        if (result.indexOf("@shield.def") >= 0) {
            const shield = actor.items.find(i => i.data.data.subtype === "shield" && i.data.data.worn);
            let shieldDef = 0;
            if (!shield) {
                ui.notifications.warn(`${game.i18n.localize("COF.notification.NoShieldEquiped")}`);
            } else {
                shieldDef = shield.data.data.def;
            }
            result = result.replace(/@shield.def/g, shieldDef);
        }

        const wRE = /@weapon\.([^+-\/*\s)(]*)/g
        const matches = [...result.matchAll(wRE)];
        if (matches && matches.length) {
            const weapon = actor.items.find(i => i.data.data.subtype === "melee" && i.data.data.worn && i.data.data.properties.weapon);
            if(!weapon){
                return ui.notifications.error(game.i18n.localize("COF.notification.noWeaponEquiped"));
            }
            superior = eval(`actor.data.data.${weapon.data.data.skill.replace("@", "").replace("mod", "superior")}`);
            for (const match of matches) {
                for (let i = 1; i < match.length; i += 2) {
                    result = result.replace(match[i - 1], weapon.data.data[match[i]]);
                }
            }

        }

        return { formula: result, superior: superior, difficulty: difficulty };
    }

    /* -------------------------------------------- */
    /* ROLL DIALOG                                  */

    /* -------------------------------------------- */

    static getTargets(targetType, source) {

        switch (targetType) {
            case "selected":
                if (game.user.targets.size) {
                    return [...game.user.targets];
                }
                break;
            case "self":
                return [source];
            case "allies":
                return Traversal.getTokensForDisposition(source.data.disposition, source.data._id);
            case "enemies":
                return Traversal.getTokensForDisposition(source.data.disposition * -1);
            case "all":
                return canvas.tokens.placeables;
        }

        return [];
    };

    static makeTarget(results, target) {
        results.targets[target.data._id] = {
            name: Traversal.getTokenName(target),
            img: target.data.img
        };
        return results.targets[target.data._id];
    }

    static applyEffect(results, action, effectLabel, sourceToken) {
        for (let [key, value] of action[effectLabel]) {
            const trgs = CofRoll.getTargets(key, sourceToken);
            for (const target of trgs) {
                let data = results.targets[target.data._id];
                if (!data) {
                    data = CofRoll.makeTarget(results, target);
                }
                data[effectLabel] = value;
                data[effectLabel].tooltip = value.label;
                 if(data[effectLabel].duration.rounds == 128){
                    data[effectLabel].tooltip += `<br>${game.i18n.localize("COF.message.undefinedDuration")}`;
                } else if(data[effectLabel].duration.rounds == 1){
                    data[effectLabel].tooltip += `<br>${data[effectLabel].duration.rounds} ${game.i18n.localize("COF.message.round")}`;
                } else {
                    data[effectLabel].tooltip += `<br>${data[effectLabel].duration.rounds} ${game.i18n.localize("COF.message.rounds")}`;
                }
                if (!value.changes) {
                    continue;
                }
                for (const change of value.changes) {
                    if (!change.key.length) {
                        continue;
                    }
                    data[effectLabel].tooltip += `<br>${game.i18n.localize(change.key)} ${change.value >= 0 ? '+' : ''}${change.value}`;
                }
               
                
            }
        }
    }

    // let skillRoll = {
    //     formula: "",
    //     superior: false,
    //     difficulty: undefined,
    //     mod: 0,
    //     dice: "1d20",
    //     critRange : 20;
    //     target:undefined
    // }
    // let dmgRoll = {
    //     formula: "",
    //     type: "damage",
    //     target:undefined
    // }
    // let action = {
    //     skillRoll: undefined, // optional skill roll
    //     damageRoll: undefined, // optional damage roll. if SkillRoll damage are only applied on success.
    //     effects: new Map(), // ActiveEffects to apply only when a skill roll succeeded for each type of targets.
    //     uncheckedEffects: new Map(), // ActiveEffect data map to apply in any case when the capacity is triggerred for each type of targets.
    // }
    static async rollDialog(actor, sourceToken, label, img, action) {
        const rollOptionTpl = 'systems/cof/templates/dialogs/roll-dialog.hbs';
        let diff = "";
        let diffReadonly = false;
        let targetName, mod, critRange, dice, displayTarget = false;

        const skillRoll = action.skillRoll;
        const dmgRoll = action.damageRoll; // onchecked damageRoll;
        let targets = [];
        let targetType;
        if (skillRoll) {
            mod = skillRoll.mod;
            critRange = skillRoll.critRange;
            dice = skillRoll.dice;
            if (skillRoll.superior && !dice.endsWith("kh")) dice = `2${dice.substring(1, dice.length)}kh`;

            targetType = skillRoll.target;
            targets = CofRoll.getTargets(skillRoll.target, sourceToken);
            if (game.settings.get("cof", "displayDifficulty")) {
                if (skillRoll.difficulty) {
                    diff = skillRoll.difficulty;
                } else if (targets.length) {
                    diff = [];
                    for (let i = 0; i < targets.length; i++) {
                        const target = targets[i];
                        diff.push(target.actor.data.data.attributes.def.value);
                        //diff += (i > 0 ? " / " : "") + target.actor.data.data.attributes.def.value;
                        diffReadonly = i != 0;
                    }
                }
            }
        } else if (dmgRoll) {
            targetType = dmgRoll.target
            targets = CofRoll.getTargets(dmgRoll.target, sourceToken);
        }

        if (targetType && targets.length) {
            targetName = targetType;
            if (targets.length === 1) {
                targetName = Traversal.getTokenName(targets[0]);
            } else if (targetType === "selected") {
                targetName = "Multiple";
            }
        }


        const type = dmgRoll ? dmgRoll.type : "";
        const rollOptionContent = await renderTemplate(rollOptionTpl, {
            useSkillRoll: skillRoll !== undefined,
            mod: mod,
            bonus: actor.data.data.globalRollBonus,
            critrange: critRange,
            difficulty: diff,
            difficultyReadonly: diffReadonly,
            displayTarget: targetType !== undefined,
            targetName: targetName,
            dice: dice,
            useDmgRoll: dmgRoll !== undefined,
            dmgFormula: dmgRoll ? dmgRoll.formula : "",
            dmgBonus: 0,
            type: type,
            dmgCustomFormula: "",
        });

        let d = new Dialog({
            title: label,
            content: rollOptionContent,
            buttons: {
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => {
                    }
                },
                submit: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Submit",
                    callback: (html) => {
                        const dice = html.find("#dice").val();
                        const diff = html.find('#difficulty').val();
                        const critrange = html.find('input#critrange').val();
                        const m = html.find('input#mod').val();
                        const b = html.find('input#bonus').val();
                        let dmgBonus = html.find("#dmgBonus").val();
                        let dmgCustomFormula = html.find("#dmgCustomFormula").val();
                        let dmgBaseFormula = html.find("#dmgFormula").val();
                        let dmgFormula = (dmgCustomFormula) ? dmgCustomFormula : dmgBaseFormula;
                        if (dmgBonus > 0) dmgFormula = dmgFormula.concat('+', dmgBonus);
                        else if (dmgBonus < 0) dmgFormula = dmgFormula.concat(' ', dmgBonus);

                        let difficulty;
                        if(diff && diff.indexOf(",") < 0){
                            try{ 
                                difficulty = parseInt(diff,10);
                            } catch(e){
                                difficulty = diff;
                            }
                        } else {
                            difficulty = diff;
                        }

                        let results = {
                            name: label,
                            img: img,
                            source: {
                                img: actor.data.token.img
                            },
                            targets: {}
                        };
                        for (const target of targets) {
                            this.makeTarget(results, target);
                        }

                        if (skillRoll) {
                            results.fateValue = actor.data.data.attributes.fp.value;
                            results.fateMax = actor.data.data.attributes.fp.max;
                            let r = new CofSkillRoll(label, dice, m, b, difficulty, critrange);
                            if (targets.length) {
                                for (const target of targets) { 
                                    let result;    
                                    if((typeof difficulty) !== "number"){
                                        result = r.getRollResult(target.actor.data.data.attributes.def.value);                                        
                                    } else{
                                        result = r.getRollResult();
                                    }
                                    
                                    results.targets[target.data._id].skill = result;
                                }
                            } else {
                                results.global = {};
                                results.global.skill = r.getRollResult();
                            }
                        }

                        if (dmgRoll) {
                            const r = new CofDamageRoll(label, dmgFormula, false, dmgRoll.type);
                            const dmg = r.getRollResult();
                            if (!skillRoll) {
                                // apply the dmg on each target
                                for (const target of targets) {
                                    results.targets[target.data._id].damage = dmg;
                                }
                            } else {
                                // dmg roll for each target
                                for (const target of targets) {
                                    const result = results.targets[target.data._id];
                                    result.damage = r.getRollResult(result.skill.isCritical);
                                }
                            }
                            if (!targets.length) {
                                if (!results.global) results.global = {};
                                results.global.damage = dmg
                            }
                        }


                        if (action.uncheckedEffects) {
                            CofRoll.applyEffect(results, action, "uncheckedEffects", sourceToken)
                        }

                        if (action.effects) {
                            CofRoll.applyEffect(results, action, "effects", sourceToken)
                        }

                        const targetObject = Object.keys(results.targets);

                        // if only one target copy the target to global (single target roll)
                        if (targetObject.length === 1) {
                            results.global = results.targets[targetObject[0]];
                        }


                        results.displayTargets = targetObject.length > 0;

                        if (targetObject.length === 0) {
                            if (!results.global) {
                                return ui.notifications.warn(game.i18n.localize("COF.message.missingTarget"));
                            }
                            results.targets.global = results.global;
                            results.targets.global.img = "icons/svg/mystery-man.svg";
                            results.targets.global.name = "???";
                            results.displayTargets |= (results.global.damage !== undefined);
                            if (!results.global.skill || !results.global.skill.difficulty) {
                                results.targets.global.forceDisplay = true;
                            }
                        }

                        if (action.hideFate) {
                            results.hideFate = action.hideFate;
                        }

                        CofRoll.toMessage(results, actor);
                    }
                }
            },
            default: "submit",
            close: () => {
            }
        }, this.options());
        return d.render(true);
    }
    
    static async toMessage(rollResult = {}, actor, { rollMode = null, create = true } = {}) {
        const rollOptionTpl = 'systems/cof/templates/chat/roll-card.hbs';
        const rollOptionContent = await renderTemplate(rollOptionTpl, rollResult);
        console.log(rollResult);

        // Prepare chat data
        const messageData = {
            user: game.user._id,
            content: rollOptionContent,
            sound: CONFIG.sounds.dice,
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            "flags.rollResult": rollResult
        };

        // Either create the message or just return the chat data
        return create ? CONFIG.ChatMessage.entityClass.create(messageData) : messageData;
    }

    static handleApplyResultButton(message, html, data) {
        const flags = message.data.flags;
        if (!flags.rollResult) {
            return;
        }
        const button = html.find('.chat-message-apply-button');
        if (!button) {
            return;
        }

        button.click(ev => {
            ev.stopPropagation();

            if (flags.applied) {
                ui.notifications.error(game.i18n.localize("COF.message.alreadyApplied"));
                return;
            }

            if (!game.user.isGM) {
                ui.notifications.error(game.i18n.localize("COF.message.notAllowedButton"));
                return;
            }
            const targets = flags.rollResult.targets;

            for (const targetId in targets) {
                let data = targets[targetId];
                let target = Traversal.findTargetToken(targetId);
                if (!target) {
                    ui.notifications.error(game.i18n.localize("COF.message.missingTarget"));
                    return;
                }
                if (data.damage) {
                    if (!data.skill || data.skill.isSuccess) {
                        target.actor.applyDamage(data.damage.type === 'damage' ? data.damage.total : -data.damage.total);
                    }
                }
                if (data.uncheckedEffects) {
                    target.actor.createEmbeddedEntity("ActiveEffect", data.uncheckedEffects);
                }

                if (data.effects) {
                    if (!data.skill || data.skill.isSuccess) {
                        target.actor.createEmbeddedEntity("ActiveEffect", data.effects);
                    }
                }
            }
            message.update({
                "flags.applied": true
            });
        });
    }

    // roll messages hooks    
    static handleFateReroll(message, html, data) {
        const flags = message.data.flags;
        if (!flags.rollResult) {
            return;
        }
        const fateButton = html.find('.chat-message-fate-button');
        if (!fateButton) {
            return;
        }
        fateButton.click(ev => {
            ev.stopPropagation();
            const flags = message.data.flags;
            if (!message.isAuthor && !game.user.isGM) {
                ui.notifications.error(game.i18n.localize("COF.message.fateNotAllowed"));
                return;
            }
            if (flags.rolled) {
                ui.notifications.error(game.i18n.localize("COF.message.fateAlreadyRolled"));
                return;
            }

            const actor = game.actors.get(message.data.speaker.actor);

            if (!actor) {
                ui.notifications.error("No actor associated with this message");
                return;
            }

            const fp = actor.data.data.attributes.fp.value - 1
            if (fp < 0) {
                ui.notifications.error(game.i18n.localize("COF.message.noMoreFP"));
                return;
            }

            const rollResult = flags.rollResult;
            let entry = rollResult.global;
            if (Object.keys(rollResult.targets).length) {
                entry = rollResult.targets[Object.keys(rollResult.targets)[0]];
            }

            entry.skill.total += 10;
            entry.skill.result += "+ 10";

            if (entry.skill.total >= entry.skill.difficulty) {
                entry.skill.isSuccess = true;
            }

            rollResult.global = entry;
            rollResult.hideFate = true;

            CofRoll.toMessage(rollResult, actor);

            actor.update({
                "data.attributes.fp.value": fp
            });

            message.update({
                "flags.rolled": true
            });
        });
    }


}