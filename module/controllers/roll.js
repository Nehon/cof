import { CharacterGeneration } from "../system/chargen.js";
import { CofSkillRoll } from "../system/skill-roll.js";
import { CofDamageRoll } from "../system/dmg-roll.js";
import { Traversal } from "../utils/traversal.js";
import { MacroDispatcher } from "../system/macroDispatcher.js";
import { DefaultVFX } from "../visualFX/defaultVFX.js";

const iconsMap = {
    "data.stats.str": "systems/cof/ui/macros/icons/FOR.png",
    "data.stats.dex": "systems/cof/ui/macros/icons/DEX.png",
    "data.stats.con": "systems/cof/ui/macros/icons/STAM.png",
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
        CofRoll.skillCheckDialog(actor, key);
    }

    static skillCheckDialog(actor, key) {
        const data = actor.data.data;
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
        let id = data._id;
        if (event) {
            const li = $(event.currentTarget).parents(".item");
            id = li.data("itemId");
        }
        let item = actor.getOwnedItem(id);
        const itemData = item.data;
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
                target: "selected",
                subType: itemData.data.dmgType
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
        let obj = data;
        if (event) {
            const item = $(event.currentTarget).parents(".weapon");
            obj = {
                name: item.find(".weapon-name").val(),
                mod: parseInt(item.find(".weapon-mod").val(), 10),
                critrange: item.find(".weapon-critrange").val(),
                dmg: item.find(".weapon-dmg").val()
            }
        }
        let attackBuff = actor.data.data.attacks.melee.buff;

        const action = {
            hideFate: true,
            skillRoll: {
                mod: obj.mod + attackBuff,
                dice: "1d20",
                critRange: obj.critrange,
                target: "selected"
            },

            damageRoll: {
                formula: obj.dmg,
                type: "damage",
                target: "selected"
            }
        };
        return CofRoll.rollDialog(actor, actor.token, obj.name, "systems/cof/ui/icons/red_31.jpg", action);
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
        let item = data;
        if (event) {
            const li = $(event.currentTarget).parents(".item");
            item = actor.getOwnedItem(li.data("itemId"));
        }
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
        let uniqueRoll = false;
        if(result.startsWith("unique")){
            uniqueRoll = true;
            result = result.replace("unique ", "");
        }

        let difficulty = arr.length > 1 ? arr[1].trim() : undefined;
        
       
        if (result.indexOf("@rank") >= 0) {
            const rank =  capacity.data.pathRank? capacity.data.pathRank:0;
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
        let subType;
        if (matches && matches.length) {
            const weapon = actor.items.find(i => i.data.data.subtype === "melee" && i.data.data.worn && i.data.data.properties.weapon);
            if (!weapon) {
                return ui.notifications.error(game.i18n.localize("COF.notification.noWeaponEquiped"));
            }
            superior = eval(`actor.data.data.${weapon.data.data.skill.replace("@", "").replace("mod", "superior")}`);
            for (const match of matches) {
                for (let i = 1; i < match.length; i += 2) {
                    result = result.replace(match[i - 1], weapon.data.data[match[i]]);
                }
            }
            subType = weapon.data.data.dmgType;

        }

        return { formula: result, superior: superior, difficulty: difficulty, uniqueRoll: uniqueRoll, subType: subType};
    }

    /* -------------------------------------------- */
    /* ROLL DIALOG                                  */

    /* -------------------------------------------- */

    static getTargets(targetType, source) {

        switch (targetType) {
            case "selectedMultiple":
                if (game.user.targets.size) {
                    return [...game.user.targets];
                }
                break;
            case "selected":
                if (game.user.targets.size) {
                    const array = [...game.user.targets];
                    return [array[array.length - 1]];
                }
                break;
            case "self":
                return [source];
            case "allies":
                return Traversal.getTokensForDisposition(source.data.disposition, source.data._id);
            case "alliesSelf":
                const t = Traversal.getTokensForDisposition(source.data.disposition, source.data._id);
                t.push(source);
                return t;
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
        let apply = false;
        for (let [key, value] of action[effectLabel]) {
            const trgs = CofRoll.getTargets(key, sourceToken);
            for (const target of trgs) {
                let data = results.targets[target.data._id];
                if (!data) {
                    data = CofRoll.makeTarget(results, target);
                }
                data[effectLabel] = duplicate(value);

                data[effectLabel].tooltip = value.label;
                const resist = CofRoll.rollResistance(value.flags.resistanceFormula, sourceToken, target);
                if (resist.resisted) {
                    data[effectLabel].resisted = true;
                    data[effectLabel].tooltip = `${value.label}<br>Resist.<br>${resist.result}`;
                    continue;
                }

                if (data[effectLabel].duration.rounds == 128) {
                    data[effectLabel].tooltip += `<br>${game.i18n.localize("COF.message.undefinedDuration")}`;
                } else if (data[effectLabel].duration.rounds == 1) {
                    data[effectLabel].tooltip += `<br>${data[effectLabel].duration.rounds} ${game.i18n.localize("COF.message.round")}`;
                } else {
                    data[effectLabel].tooltip += `<br>${data[effectLabel].duration.rounds} ${game.i18n.localize("COF.message.rounds")}`;
                }
                apply |= (!data.skill) || data.skill.isSuccess;
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
        return apply;
    }

    static rollResistance(formula, source, target) {
        let resist = {
            resisted: false,
            result: ""
        };
        if (!formula) {
            return resist;
        }
        const arr = formula.split(">");
        if (arr.length != 2) {
            //warn            
            ui.notifications.warn(`Invalid roll formula : ${formula}`);
            return resist;
        }
        let rollFormula = arr[0].trim();

        let dice = "1d20";
        let m = rollFormula.match(/(@target\.stats\.[^.]*).mod/);
        if(m && m[1]){
            const sup = eval(`${m[1]}.superior`.replace("@target","target.actor.data.data"));
            if(sup){
                dice = "2d20kh";
            }
        }

        let difficultyFormula = arr[1].trim();
        let modResult = new Roll(rollFormula, { target: target.actor.data.data });
        modResult.roll();
        let difficultyResult = new Roll(difficultyFormula, source.actor.data.data);
        difficultyResult.roll();
        let roll = new CofSkillRoll("", dice, modResult.total, 0, difficultyResult.total, "20");
        const result = roll.getRollResult();
        resist.resisted = result.isSuccess;
        resist.result = result.result + ` > ${difficultyResult.total}`;
        return resist;
    }

    static includesAny(weaknesses, types){
        let pattern = weaknesses.replace(/^\s*,\s*/,"").replace(/\s*,\s*$/,"").replace(/\s*,\s*/g, "|");
        pattern = `(${pattern.trim()})`;
        
        if(types.match(pattern)){
            return true;
        }
        return false;
    }

    
    static resolveDamage(damage, resistance){
        let resist = {
            resisted: false,
            result: ""
        };
        let value = damage.final;
        let res = duplicate(resistance);
        for (const roll of damage.subRolls) {            
            const types =  roll.subtype.split(",");
            types.push("value");
            for (const type of types) {
                if(type === "value" && CofRoll.includesAny(res.weaknesses,roll.subtype)){
                   continue;
                }
                const t  =type.trim();
                const r = res[t];
                if(!r || r === "0"){
                    continue;
                }
                let total = roll.total * (damage.isCrit?2:1);
                let diff = 0;
                if(r.startsWith("*")){
                   diff = total - Math.floor(Math.min(eval(`${total} ${r}`), total));
                } else {
                   let val = parseInt(r, 10);
                   diff = Math.min(val, total);
                   val -= diff;
                   res[type] = `${val}`;
                }
                value -= diff;
                resist.result += t !== "value"? `${t}(${diff}),`: `${diff},`;
            }            
        }
        
        resist.resisted = damage.final != value;
        
        damage.final = Math.max(0,value);
        return resist;
    }

    static computeDamageResistance(dmgRoll, result, sourceToken, target) {
        result.damage.resist = CofRoll.resolveDamage(result.damage, target.actor.data.data.attributes.dr.value);
        if (!dmgRoll.resistanceFormula) {
            return;
        }
        const resist = CofRoll.rollResistance(dmgRoll.resistanceFormula, sourceToken, target)
        if (!resist.resisted) {
            return;
        }
        result.damage.resist = resist;
        try {
            result.damage.final = Math.ceil(eval(`result.damage.total ${dmgRoll.resistanceEffect}`));
        } catch (e) {
            ui.notifications.error(`Wrong resistance effect "${dmgRoll.resistanceEffect}" : ${e.message}`);
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

        const time = new Date().getTime();
        if (time - window.lastRollDialog < 800) {
            return;
        }
        window.lastRollDialog = time;

        const rollOptionTpl = 'systems/cof/templates/dialogs/roll-dialog.hbs';
        let diff = "";
        let displayDifficulty = true;
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
        } else if (dmgRoll) {
            targetType = dmgRoll.target
            targets = CofRoll.getTargets(dmgRoll.target, sourceToken);
        }

        if (targetType && targets.length) {
            displayDifficulty = false
            targetName = targetType;
            if (targets.length === 1) {
                targetName = Traversal.getTokenName(targets[0]);
            } else if (targetType === "selectedMultiple") {
                targetName = "Multiple";
            }
        }

        if (targetType && targetType.startsWith("selected") && !targets.length) {
            let confirm = async function () {
                return new Promise((resolve => {
                    Dialog.confirm({
                        title: game.i18n.localize("COF.ui.noTarget"),
                        content: `<strong>${game.i18n.localize("COF.ui.noTargetMessage")}</strong>`,
                        yes: () => resolve(true),
                        no: () => resolve(false),
                        defaultYes: false
                    });
                }));
            };
            let result = await confirm();
            if (result === false) {
                if (action.template) {
                    action.template.delete();
                }
                return;
            }
        }

        const type = dmgRoll ? dmgRoll.type : "";
        const rollOptionContent = await renderTemplate(rollOptionTpl, {
            useSkillRoll: skillRoll !== undefined,
            mod: mod,
            bonus: actor.data.data.globalRollBonus,
            critrange: critRange,
            difficulty: diff,
            displayDifficulty: displayDifficulty,
            displayTarget: targetType !== undefined,
            targetName: targetName,
            dice: dice,
            useDmgRoll: dmgRoll !== undefined,
            dmgFormula: dmgRoll ? dmgRoll.formula : "",
            dmgBonus: actor.data.data.globalDmgBonus?actor.data.data.globalDmgBonus:0,
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
                        if(dmgBonus && dmgBonus !== "0"){
                            dmgBonus = dmgBonus.trim();
                            if (!dmgBonus.startsWith("+") && !dmgBonus.startsWith("-") && !dmgBonus.startsWith("*")){
                                dmgBonus= `+ ${dmgBonus}`;
                            }
                            dmgFormula = `${dmgFormula} ${dmgBonus}`;
                        }                        

                        if (targetType && targetType.startsWith("selected") && !targets.length) {
                            // retry to find targets
                            if (action.skillRoll) {
                                targets = CofRoll.getTargets(action.skillRoll.target, sourceToken);
                            } else if (action.damageRoll) {
                                targets = CofRoll.getTargets(action.damageRoll.target, sourceToken);
                            }
                        }
                        if (action.skillRoll) {
                            action.skillRoll.mod = m;
                            action.skillRoll.dice = dice;                            
                            action.skillRoll.critRange = critrange;
                            if(displayDifficulty){
                                action.skillRoll.difficulty = diff;
                            }
                            action.skillRoll.bonus = b;
                        }
                        if(action.damageRoll){
                            action.damageRoll.formula = dmgFormula;
                        }

                        action.label = label;
                        action.img = img

                        CofRoll.makeRoll(actor, sourceToken, targets, action);

                    }
                }
            },
            default: "submit",
            close: () => {
                if (action.template) {
                    action.template.delete();
                }
            }
        }, this.options());
        return d.render(true);
    }

    static async makeRoll(actor, sourceToken, targets, action) {
        let skillRoll = action.skillRoll;
        let dmgRoll = action.damageRoll;
        const label = action.label;
        let results = {
            name: label,
            key: label.slugify(),
            displayApply: action.forceDisplayApply,
            itemId: action.itemId,
            img: action.img,
            source: {
                img: actor.data.token.img,
                id: actor._id
            },
            template: action.template ? action.template.data : undefined,
            targets: {}
        };
       
        for (const target of targets) {
            this.makeTarget(results, target);
        }

        if (skillRoll) {
            results.fateValue = actor.data.data.attributes.fp.value;
            results.fateMax = actor.data.data.attributes.fp.max;
            let r = new CofSkillRoll(label, skillRoll.dice, skillRoll.mod, skillRoll.bonus, skillRoll.difficulty, skillRoll.critRange);
            if (targets.length && !skillRoll.uniqueRoll) {
                for (const target of targets) {
                    let result;
                    let difficulty = target.actor.data.data.attributes.def.value;
                    if (skillRoll.difficulty) {
                        let r = new Roll(skillRoll.difficulty, { target: target.actor.data.data });
                        r.roll();
                        difficulty = r.total;
                    }
                    result = r.getRollResult(difficulty);
                    results.targets[target.data._id].skill = result;
                }
            } else {
                results.global = {};
                results.global.skill = r.getRollResult();
                for (const target of targets) {
                    const result = results.targets[target.data._id];
                    result.skill = results.global.skill;
                }
            }
        }

        if (dmgRoll) {
            const r = new CofDamageRoll(label, dmgRoll.formula, false, dmgRoll.type, dmgRoll.subType);
            const dmg = r.getRollResult();
            if (!skillRoll || skillRoll.uniqueRoll) {
                // apply the dmg on each target
                for (const target of targets) {
                    const result = results.targets[target.data._id];
                    result.damage = duplicate(dmg);
                    result.damage.final = dmg.total;                    
                    CofRoll.computeDamageResistance(dmgRoll, result, sourceToken, target);
                }
                results.displayApply = !skillRoll || results.global.skill.isSuccess;
            } else {
                // dmg roll for each target
                for (const target of targets) {
                    const result = results.targets[target.data._id];
                    result.damage = r.getRollResult(result.skill.isCritical);
                    result.damage.final = result.damage.total;
                    results.displayApply |= result.skill.isSuccess;
                    CofRoll.computeDamageResistance(dmgRoll, result, sourceToken, target);
                }
            }

            if (!targets.length) {
                if (!results.global) results.global = {};
                results.global.damage = dmg;
            }
        }

        if(action.cleansing){
            for (let [key, value] of action.cleansing) {
                const trgs = CofRoll.getTargets(key, sourceToken);
              
                for (const trg of trgs) {         
                    let result = results.targets[trg.data._id];
                    if (!result) {
                        result = CofRoll.makeTarget(results, trg);
                    }   
                    result.cleansing = value;
               }
            }
            results.displayApply |= action.cleansing.size > 0;
        }

        if (action.uncheckedEffects) {
            CofRoll.applyEffect(results, action, "uncheckedEffects", sourceToken);
            results.displayApply |= action.uncheckedEffects.size > 0;
        }

        if (action.effects) {
            results.displayApply |= CofRoll.applyEffect(results, action, "effects", sourceToken);
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

        await MacroDispatcher.onRoll(results.key, sourceToken, results, action);
        CofRoll.toMessage(results, actor);
        if (action.template) {
            action.template.delete();
        }
    }

    static async toMessage(rollResult = {}, actor, { rollMode = null, create = true } = {}) {
        const rollOptionTpl = 'systems/cof/templates/chat/roll-card.hbs';
        const rollOptionContent = await renderTemplate(rollOptionTpl, rollResult);

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

    static async handleApplyResultButton(message, html, data) {
        const flags = message.data.flags;
        if (!flags.rollResult) {
            return;
        }
        const button = html.find('.chat-message-apply-button');
        if (!button) {
            return;
        }

        button.click(async ev => {
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
            const targetTokens = [];

            for (const targetId in targets) {

                let target = Traversal.findTargetToken(targetId);
                if (!target) {
                    ui.notifications.error(game.i18n.localize("COF.message.missingTarget"));
                    return;
                }
                targetTokens.push(target);
            }
            const actor = Traversal.findActor(flags.rollResult.source.id);
            const item = actor.getItemById(flags.rollResult.itemId);
            const source = Traversal.findSourceToken(flags.rollResult.source.id);
            const found = await MacroDispatcher.onVisualEffect(flags.rollResult.key, source, flags.rollResult, targetTokens);
            if (!found) {
                if (flags.rollResult.global && flags.rollResult.global.damage) {
                    if (flags.rollResult.global.damage.type === "damage") {
                        DefaultVFX.playRandomAttack(targetTokens[0]);
                    } else {
                        DefaultVFX.playRandomHeal(targetTokens[0]);
                    }
                }
            }

            setTimeout(async () => {
                for (const target of targetTokens) {
                    let data = targets[target.data._id];
                    if (data.damage) {
                        if (!data.skill || data.skill.isSuccess) {
                            await target.actor.applyDamage(data.damage.type === 'damage' ? data.damage.final : -data.damage.final);
                        }
                    }
                    if (data.uncheckedEffects && !data.uncheckedEffects.resisted) {
                        await target.actor.applyEffect(data.uncheckedEffects);
                    }

                    if (data.effects && !data.effects.resisted) {
                        if (!data.skill || data.skill.isSuccess) {
                           await  target.actor.applyEffect(data.effects);
                        }
                    }
                    if(data.cleansing){
                        await target.actor.clearEffects(data.cleansing);
                    }                  
                }
                await MacroDispatcher.onApplyActive(flags.rollResult.key, source, flags.rollResult, targetTokens);
            }, 300);

            if (item) {
                if (actor.getMaxUse(item)) {
                    actor.updateEmbeddedEntity("OwnedItem", {
                        _id: item._id,
                        "data.nbUse": item.data.nbUse - 1
                    }).then(() => ui.hotbar.render());
                } else if (item.data.properties && item.data.properties.consumable) {
                    actor.updateEmbeddedEntity("OwnedItem", {
                        _id: item._id,
                        "data.qty": item.data.qty - 1
                    }).then(() => ui.hotbar.render());
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
            rollResult.displayApply = true;
            let entry = rollResult.global;
            for(let key in rollResult.targets){
                entry = rollResult.targets[key];
                entry.skill.total += 10;
                entry.skill.result += "+ 10";
                if (entry.skill.total >= entry.skill.difficulty) {
                    entry.skill.isSuccess = true;
                }
                rollResult.global = entry;
                rollResult.hideFate = true;
            }

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