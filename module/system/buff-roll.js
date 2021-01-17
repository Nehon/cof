//import {Traversal} from "../utils/traversal.js";
import {CofRoll} from "../controllers/roll.js"

export class CofBuffRoll {
    constructor(label, formula, buffedAttribute, durationFormula){
        this._label = label;
        this._formula = formula;
        this.durationFormula = durationFormula;
        this._buffedAttribute = buffedAttribute
    }

    roll(actor, targets = undefined){
        const r = new Roll(this._formula);
        try{
            r.roll();
            this.total = r.total;
            this.result = r.result;
        } catch(e){
            this.total = this._formula;
            this.result = this._formula;
        }
        if(this.durationFormula){            
            const dr = new Roll(this.durationFormula);
            dr.roll();
            this.duration = dr.total;
            this.durationTitle = dr.result;
        }
       
        const message = this._buildRollMessage(actor, targets);
        ChatMessage.create({
            user: game.user._id,
            flavor: message,
            content: "<span></span>",
            speaker: ChatMessage.getSpeaker({actor: actor}),           
            "flags.buffRoll": true
        });        
    }

    /* -------------------------------------------- */

    _buildRollMessage(actor, targets) {
        const attr = game.i18n.localize(this._buffedAttribute.replace('@',"COF.").replace("buff","label"));
        const total = this.total > 0 ? `+${this.total}` : this.total;
        const cssClass = this.total > 0 ? "success" : "failure";
        let subtitle = `<div class="flexrow"><h3 class="flex3"><strong>${attr} <span title="${this.result}">${total}</span></strong>`;

        if( this.duration){
            subtitle+= `<br><span title="${this.durationTitle}">${game.i18n.localize("COF.message.for")} ${this.duration} ${game.i18n.localize("COF.message.rounds")}</span>&nbsp;`;
        }
        subtitle += "</h3>";
        subtitle += CofRoll.getTargetsTemplate(actor, targets);
        subtitle += "</div>"
        return `<h2 class="${cssClass}">${this._label}</h2>${subtitle}`;

        
    }

    // // roll messages hooks    
    // static handleApplyDamageButton(message, html, data) {
    //     const flags = message.data.flags;
    //     if (!message.isRoll || !flags.type || !flags.damageRoll || !flags.target) {
    //         return;
    //     }
    //     const color = flags.type === 'damage' ? "#dd3333" : "#339933";
    //     const btnStyling = `width: 22px; height:22px; font-size:12px;line-height:1px; color:${color};`;
    //     const buttonIcon = flags.type === 'damage' ? "fa-fist-raised" : "fa-hand-holding-medical"
    //     const damageButton = $(`<button class="dice-total-fullDamage-btn" style="${btnStyling}"><i class="fas ${buttonIcon}" title="${game.i18n.localize(`COF.message.apply.${flags.type}`)}."></i></button>`);
    //     const btnContainer = $('<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>');
    //     btnContainer.append(damageButton);
    //     html.find('.dice-total').append(btnContainer);

    //     damageButton.click(ev => {
    //         ev.stopPropagation();

    //         if(flags.applied){
    //             ui.notifications.error(game.i18n.localize("COF.message.alreadyApplied"));
    //             return;
    //         }            

    //         if ((flags.type !== 'heal' && !game.user.isGM)
    //             || (flags.type==='heal' && !message.isAuthor && !game.user.isGM)) {
    //             ui.notifications.error(game.i18n.localize("COF.message.notAllowedButton"));
    //             return;
    //         }
            
            
    //         let target = Traversal.findTargetToken(flags.target);
    //         if(!target){
    //             ui.notifications.error(game.i18n.localize("COF.message.missingTarget"));
    //             return;
    //         }
    //         const roll = message.roll;

    //         target.actor.applyDamage(flags.type === 'damage' ? roll.total : -roll.total);
    //         message.update({
    //             "flags.applied": true
    //         });   
    //     });
    // }


}