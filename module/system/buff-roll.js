//import {Traversal} from "../utils/traversal.js";
import { CofRoll } from "../controllers/roll.js"
import { Capacity } from "../controllers/capacity.js";
import { Traversal } from "../utils/traversal.js";

export class CofBuffRoll {
    constructor(label, formula, effect, durationFormula) {
        this._label = label;
        this._formula = formula;
        this.durationFormula = durationFormula;
        this._buffedAttribute = effect.stat;
        this._effect = effect;
    }

    roll(actor, targets = undefined, options) {
        const r = new Roll(this._formula);
        try {
            r.roll();
            this.total = r.total;
            this.result = r.result;
        } catch (e) {
            this.total = this._formula;
            this.result = this._formula;
        }
        if (this.durationFormula) {
            const dr = new Roll(this.durationFormula);
            dr.roll();
            this.duration = dr.total;
            this.durationTitle = dr.result;
        }

        const message = this._buildRollMessage(actor, targets);

        let targetsIds;
        if(targets){
            targetsIds = targets.map((elem) => elem.data._id);
        }

        ChatMessage.create({
            user: game.user._id,
            flavor: message,
            content: this._buildContentMessage(),
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            "flags.buffRoll": true,
            "flags.effect":this._effect,
            "flags.targets":targetsIds,
            "flags.options":options,
            "flags.total": this.total,
            "flags.duration":this.duration,
            "flags.type":"buff"
        });
    }

    /* -------------------------------------------- */

    _buildRollMessage(actor, targets) {
        const attr = game.i18n.localize(this._buffedAttribute.replace('@', "COF.").replace("buff", "label"));
        
        const cssClass = this.total > 0 ? "success" : "failure";
        let subtitle = `<div class="flexrow"><h3 class="flex3"><strong>${attr}</strong>`;

        if (this.duration) {
            subtitle += `<br><span title="${this.durationTitle}">${game.i18n.localize("COF.message.for")} ${this.duration} ${game.i18n.localize("COF.message.rounds")}</span>&nbsp;`;
        }
        subtitle += "</h3>";
        subtitle += CofRoll.getTargetsTemplate(actor, targets);
        subtitle += "</div>"
        return `<h2 class="${cssClass}">${this._label}</h2>${subtitle}`;


    }
    _buildContentMessage(actor, targets) {    
        const total = this.total > 0 ? `+${this.total}` : this.total;
        return `<div class="dice-roll"><div class="dice-result"><h4 id="btn-container" class="dice-total"> <span title="${this.result}">${total}</span></h4></div></div>`;
    }

    // roll messages hooks    
    static handleApplyBuffButton(message, html, data) {
        if (message.isRoll) {
            return;
        }
        const flags = message.data.flags;
        if(!flags || !flags.buffRoll){
            return;
        }
        let container = html.find('#btn-container');
        const color = "#339933";
        const btnStyling = `width: 22px; height:22px; position:relative; font-size:12px;line-height:1px; color:${color};`;
        const buttonIcon = "fa-check"
        const damageButton = $(`<button class="dice-total-fullDamage-btn" style="${btnStyling}"><i class="fas ${buttonIcon}" title="${game.i18n.localize(`COF.message.apply.${flags.type}`)}."></i></button>`);
        const btnContainer = $('<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>');
        btnContainer.append(damageButton);
        container.append(btnContainer);

        damageButton.click(ev => {
            ev.stopPropagation();            
            if(!flags.effect){
                return;
            }
            if(!flags.targets){
                return;
            }
            if(flags.applied){
                ui.notifications.error(game.i18n.localize("COF.message.alreadyApplied"));
                return;
            }            

            if (!game.user.isGM) {
                ui.notifications.error(game.i18n.localize("COF.message.notAllowedButton"));
                return;
            }
            const effect = flags.effect;
            const targets = flags.targets;
            const ae = CONFIG.statusEffects.find(e => e.id === effect.value);
            let activeEffect;
            if (ae) {
                activeEffect = Capacity.makeActiveEffect(flags.options, effect, 0, roll.duration);
                activeEffect.icon = ae.icon;
                activeEffect.label = game.i18n.localize(ae.label);
                activeEffect["flags.core.statusId"] = ae.id;
            } else {
                activeEffect = Capacity.makeActiveEffect(flags.options, effect, flags.total, flags.duration);
            }
            if (activeEffect && targets) {
                targets.forEach(trg => {
                    let target = Traversal.findTargetToken(trg);
                    // TODO maybe record the starting time so that if the application is cloased before the timeout is called we can clean up / resume.
                    const prom = target.actor.createEmbeddedEntity("ActiveEffect", activeEffect);
                    if (!game.combat) {
                        prom.then((eff) => {
                            setTimeout(() => {
                                target.actor.deleteEmbeddedEntity("ActiveEffect", eff._id);
                            }, flags.duration * 10000);
                        });
                    }
                });
            }
            message.update({
                "flags.applied": true
            });   
        });
    }
}