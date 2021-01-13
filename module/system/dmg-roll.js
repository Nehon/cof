import {Traversal} from "../utils/traversal.js";

export class CofDamageRoll {
    constructor(label, formula, isCritical, type = 'damage'){
        this._label = label;
        this._formula = formula;
        this._isCritical = isCritical;
        this._type = type
    }

    roll(actor, target = undefined){
        const r = new Roll(this._formula);
        r.roll();
        if (this._isCritical) r._total = r._total * 2;
        const dmgCheckFlavor = this._buildDamageRollMessage(target);
        r.toMessage({
            user: game.user._id,
            flavor: dmgCheckFlavor,
            speaker: ChatMessage.getSpeaker({actor: actor}),
            "flags.type": this._type,
            "flags.target": target ? target.data._id : undefined,
            "flags.damageRoll": true
        });
    }

    /* -------------------------------------------- */

    _buildDamageRollMessage(target) {

        let subtitle = `<div class="flexrow"><h3 class="flex3"><strong>${this._label}</strong>`;
        
        if (target) {
            subtitle+= `<br>${Traversal.getTokenName(target)}&nbsp;</h3>`;        
            subtitle += `<div class="flex2"><img style="border:none" src="${canvas.tokens.controlled[0].data.img}" width="32" height="32" />
                    <i class="fas fa-arrow-alt-circle-right" style="font-size: 16px;margin: 3px;vertical-align: super;"></i>
                    <img style="border:none" src="${target.data.img}" width="32" height="32" />
            </div>`
        } else {
            subtitle += "</h3>";
        }
        
        subtitle += "</div>"

        if(this._type === 'damage'){
            if (this._isCritical) return `<h2 class="damage">${game.i18n.localize("COF.message.criticalDamageRoll")}</h2>${subtitle}`;
            return `<h2 class="damage">${game.i18n.localize("COF.message.damageRoll")}</h2>${subtitle}`;
        } else {
            if (this._isCritical) return `<h2 class="success">${game.i18n.localize("COF.message.criticalHealRoll")}</h2>${subtitle}`;
            return `<h2 class="success">${game.i18n.localize("COF.message.healRoll")}</h2>${subtitle}`;
        }
    }

    // roll messages hooks    
    static handleApplyDamageButton(message, html, data) {
        const flags = message.data.flags;
        if (!message.isRoll || !flags.type || !flags.damageRoll || !flags.target) {
            return;
        }
        const color = flags.type === 'damage' ? "#dd3333" : "#339933";
        const btnStyling = `width: 22px; height:22px; font-size:12px;line-height:1px; color:${color};`;
        const buttonIcon = flags.type === 'damage' ? "fa-fist-raised" : "fa-hand-holding-medical"
        const damageButton = $(`<button class="dice-total-fullDamage-btn" style="${btnStyling}"><i class="fas ${buttonIcon}" title="${game.i18n.localize(`COF.message.apply.${flags.type}`)}."></i></button>`);
        const btnContainer = $('<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>');
        btnContainer.append(damageButton);
        html.find('.dice-total').append(btnContainer);

        damageButton.click(ev => {
            ev.stopPropagation();

            if(flags.applied){
                ui.notifications.error(game.i18n.localize("COF.message.alreadyApplied"));
                return;
            }            

            if ((flags.type !== 'heal' && !game.user.isGM)
                || (flags.type==='heal' && !message.isAuthor && !game.user.isGM)) {
                ui.notifications.error(game.i18n.localize("COF.message.notAllowedButton"));
                return;
            }
            
            
            let target = Traversal.findTargetToken(flags.target);
            if(!target){
                ui.notifications.error(game.i18n.localize("COF.message.missingTarget"));
                return;
            }
            const roll = message.roll;

            target.actor.applyDamage(flags.type === 'damage' ? roll.total : -roll.total);
            message.update({
                "flags.applied": true
            });   
        });
    }


}