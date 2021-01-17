import { CharacterGeneration } from "../system/chargen.js";
import { CofSkillRoll } from "../system/skill-roll.js";
import { CofDamageRoll } from "../system/dmg-roll.js";
import { Traversal } from "../utils/traversal.js";

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
        const critrange = 20;
        // bonus = (bonus) ? bonus : 0;
        label = (label) ? game.i18n.localize(label) : null;
        return this.skillRollDialog(actor, label, mod, actor.data.data.globalRollBonus, critrange, superior);

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
        item.prepareData();
        const itemData = item.data;
        let label = itemData.name;
        let mod = itemData.data.mod;
        let critrange = itemData.data.critrange;
        let dmg = itemData.data.dmg;
        return this.rollWeaponDialog(actor, label, mod, actor.data.data.globalRollBonus, critrange, dmg, 0, 'damage', [...game.user.targets][0]);
    }

    /**
     *  Handles encounter attack checks
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static rollEncounterWeapon(data, actor, event) {
        const item = $(event.currentTarget).parents(".weapon");
        let label = item.find(".weapon-name").text();
        let mod = item.find(".weapon-mod").val();
        let critrange = item.find(".weapon-critrange").val();
        let dmg = item.find(".weapon-dmg").val();
        return this.rollWeaponDialog(actor, label, mod, actor.data.data.globalRollBonus, critrange, dmg, 0, 'damage', [...game.user.targets][0]);
    }

    /**
     *  Handles encounter damage rolls
     * @param elt DOM element which raised the roll event
     * @param key the key of the attribute to roll
     * @private
     */
    static rollEncounterDamage(data, actor, event) {
        const item = $(event.currentTarget).parents(".weapon");
        let label = item.find(".weapon-name").text();
        let dmg = item.find(".weapon-dmg").val();
        return this.rollDamageDialog(actor, label, dmg, 0);
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
        item.prepareData();
        let label = item.data.name;
        let mod = item.data.data.mod;
        let critrange = item.data.data.critrange;
        let dmg = item.data.data.dmg;
        return this.rollWeaponDialog(actor, label, mod, actor.data.data.globalRollBonus, critrange, dmg, 0);
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
        let label = item.data.name;
        let dmg = item.data.data.dmg;
        return this.rollDamageDialog(actor, label, dmg, 0);
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

    /* -------------------------------------------- */
    /* ROLL DIALOGS                                 */

    /* -------------------------------------------- */


    /* -------------------------------------------- */
    /* ROLL DIALOGS                                 */
    /* -------------------------------------------- */

    static async skillRollDialog(actor, label, mod, bonus, critrange, superior = false, onEnter = "submit") {
        const rollOptionTpl = 'systems/cof/templates/dialogs/skillroll-dialog.hbs';
        const rollOptionContent = await renderTemplate(rollOptionTpl, { mod: mod, bonus: bonus, critrange: critrange, superior: superior });
        let d = new Dialog({
            title: label,
            content: rollOptionContent,
            buttons: {
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("COF.ui.cancel"),
                    callback: () => {
                    }
                },
                submit: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("COF.ui.submit"),
                    callback: (html) => {
                        const dice = html.find("#dice").val();
                        const diff = html.find('#difficulty').val();
                        const critrange = html.find('input#critrange').val();
                        const m = html.find('input#mod').val();
                        const b = html.find('input#bonus').val();
                        let r = new CofSkillRoll(label, dice, m, b, diff, critrange);
                        r.roll(actor);
                    }
                }
            },
            default: onEnter,
            close: () => { }
        }, this.options());
        return d.render(true);
    }

    static async rollWeaponDialog(actor, label, mod, bonus, critrange, dmgFormula, dmgBonus, type = 'damage', target = undefined, onEnter = "submit") {
        const rollOptionTpl = 'systems/cof/templates/dialogs/roll-weapon-dialog.hbs';
        let diff = null;
        let targetName = undefined;
        if (game.settings.get("cof", "displayDifficulty") && target) {
            diff = target.actor.data.data.attributes.def.value;
            targetName = Traversal.getTokenName(target);
        }

        const rollOptionContent = await renderTemplate(rollOptionTpl, {
            mod: mod,
            bonus: bonus,
            critrange: critrange,
            difficulty: diff,
            dmgFormula: dmgFormula,
            dmgBonus: dmgBonus,
            dmgCustomFormula: "",
            type: type,
            targetName: targetName
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
                        let r = new CofSkillRoll(label, dice, m, b, diff, critrange, type);
                        r.weaponRoll(actor, dmgFormula, target);
                    }
                }
            },
            default: onEnter,
            close: () => {
            }
        }, this.options());
        return d.render(true);
    }

    static async rollDamageDialog(actor, label, formula, bonus, type = 'damage', critical = false, targets = undefined, onEnter = "submit") {
        const rollOptionTpl = 'systems/cof/templates/dialogs/roll-dmg-dialog.hbs';
        const rollOptionContent = await renderTemplate(rollOptionTpl, { dmgFormula: formula, dmgBonus: bonus, dmgCustomFormula: "", isCritical: critical, type: type });

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
                        let dmgBonus = html.find("#dmgBonus").val();
                        let dmgCustomFormula = html.find("#dmgCustomFormula").val();
                        let dmgBaseFormula = html.find("#dmgFormula").val();
                        const isCritical = html.find("#isCritical").is(":checked");
                        let dmgFormula = (dmgCustomFormula) ? dmgCustomFormula : dmgBaseFormula;
                        if (dmgBonus > 0) {
                            dmgFormula = dmgFormula.concat('+', dmgBonus);
                        }
                        else if (dmgBonus < 0) {
                            dmgFormula = dmgFormula.concat(' ', dmgBonus);
                        }
                        let r = new CofDamageRoll(label, dmgFormula, isCritical, type);
                        r.roll(actor, targets);
                    }
                }
            },
            default: onEnter,
            close: () => {
            }
        }, this.options());
        return d.render(true);
    }

}