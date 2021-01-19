import {CofDamageRoll} from "./dmg-roll.js";
import {Traversal} from "../utils/traversal.js";

export class CofSkillRoll {

    constructor(label, dice, mod, bonus, difficulty, critrange, type = 'damage', fateAllowed = true){
        this._label = label;
        this._dice = dice;
        this._mod = mod;
        this._bonus = bonus;
        this._difficulty = difficulty;
        this._critrange = critrange;
        this._totalBonus = parseInt(this._mod) + parseInt(this._bonus);
        this._formula = (this._totalBonus === 0) ? this._dice : `${this._dice} + ${this._totalBonus}`;
        this._isCritical = false;
        this._isFumble = false;
        this._isSuccess = false;
        this._msgFlavor = "";
        this._type = type;
        this._fateAllowed = fateAllowed;
    }

    setTarget(target){
        this._target = target;
    }

    roll(actor, target = undefined) {
        let r = new Roll(this._formula);
        r.roll();
        // Getting the dice kept in case of 2d12 or 2d20 rolls

        if (r.terms[0].results) {
            const result = r.terms[0].results.find(r => r.active).result;
            this._isCritical = ((result >= this._critrange.split("-")[0]) || result == 20);
            this._isFumble = (result == 1);
        }
        if (this._difficulty) {
            this._isSuccess = r.total >= this._difficulty;            
        } 
        this._msgFlavor = this._buildRollMessage(actor, target);
        r.toMessage({
            user: game.user._id,
            flavor: this._msgFlavor,
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            "flags.dmgFormula": this._dmgFormula,
            "flags.label": this._label,
            "flags.difficulty": this._difficulty,
            "flags.type": this._type,
            "flags.target": target ? target.data._id : undefined
        });
    }

    weaponRoll(actor, dmgFormula, target = undefined){
        this._dmgFormula = dmgFormula;
        this.roll(actor, target);
        if(!game.settings.get("cof", "useComboRolls") ||
           (this._difficulty && !this._isSuccess)){
            return;
        }
        let r = new CofDamageRoll(this._label, dmgFormula, this._isCritical, this._type);
        r.roll(actor, target?[target]:undefined);
    }

    /* -------------------------------------------- */

    _buildRollMessage(actor, target = undefined) {
        let fateButton="";
        if(this._fateAllowed){
            const fp = actor.data.data.attributes.fp.value;
            const max = actor.data.data.attributes.fp.max;
            const fateLabel = game.i18n.localize("COF.message.fate");
            const fateText = game.i18n.localize("COF.message.fateText");
            
            let btnStyling = 'width: 100px; height:22px; font-size:small;line-height:unset';
            fateButton = `<button class="chat-message-fate-button tooltip" style="${btnStyling}">
                <i class="fas fa-star"> ${fateLabel}!</i>
                <span class="tooltiptext tooltip-left" style="top:-5px;">${fateText} (${fp}/${max})</span>
            </button>`;
        }
        
        let subtitle = `<div class="flexrow"><h3 class="flex3"><strong>${this._label}</strong>`;
        
        if(target){
            subtitle+= `<br>${Traversal.getTokenName(target)}&nbsp;`;
            if(this._difficulty) subtitle+=`<strong>(${this._difficulty})</strong>`;
        } else if(this._difficulty){
            subtitle+= `<br>${game.i18n.localize("COF.ui.difficulty")} <strong>${this._difficulty}</strong>`
        }
        subtitle+= "</h3>"

        if(target){
            subtitle += `<div class="flex2"><img style="border:none" src="${canvas.tokens.controlled[0].data.img}" width="32" height="32" />
                    <i class="fas fa-arrow-alt-circle-right" style="font-size: 16px;margin: 3px;vertical-align: super;"></i>
                    <img style="border:none" src="${target.data.img}" width="32" height="32" />
            </div>`
        }

        subtitle += "</div>"
        if (this._isCritical) return `<h2 class="success critical">${game.i18n.localize("COF.roll.critical")} !!</h2>${subtitle}`;
        if (this._isFumble) return `<h2 class="failure fumble">${game.i18n.localize("COF.roll.fumble")} !!</h2>${subtitle}`;
        if(this._difficulty){
            if (this._isSuccess) return `<h2 class="success flexrow"><span class="flex2 left">${game.i18n.localize("COF.roll.success")} !</span>${fateButton}</h2>${subtitle}`;
            else return `<h2 class="failure flexrow"><span class="flex2 left">${game.i18n.localize("COF.roll.failure")}...</span>${fateButton}</h2>${subtitle}`;
        } else {
            return `<h2 class="roll flexrow"><span class="flex2 left">${game.i18n.localize("COF.ui.skillcheck")}</span>${fateButton}</h2>${subtitle}`;
        }
    }

    // roll messages hooks    
    static handleFateReroll(message, html, data){
        if(!message.isRoll){
            return;
        }
        const fateButton =  html.find('.chat-message-fate-button');
        if(!fateButton){
            return;
        }
        fateButton.click(ev => {
            ev.stopPropagation();
            const flags = message.data.flags; 
            if(!message.isAuthor && !game.user.isGM){
                ui.notifications.error(game.i18n.localize("COF.message.fateNotAllowed"));
                return;
            }
            if(flags.rolled){
                ui.notifications.error(game.i18n.localize("COF.message.fateAlreadyRolled"));
                return;
            }
            const roll = message.roll;
            
            const actor = game.actors.get(message.data.speaker.actor);
            if(!actor){
                ui.notifications.error("No actor associated with this message");
                return;
            }
            const fp = actor.data.data.attributes.fp.value -1 
            if(fp<0){
                ui.notifications.error(game.i18n.localize("COF.message.noMoreFP"));
                return;
            }
                
            const newRoll = new CofSkillRoll(flags.label, `${roll.total}`, "0", "10", flags.difficulty, "100", flags.type, false);
            const target = Traversal.findTargetToken(flags.target);
            if(flags.dmgFormula){
                newRoll.weaponRoll(actor, flags.dmgFormula, target);
            } else {
                newRoll.roll(actor, target);
            }
            
            actor.update({
                "data.attributes.fp.value":fp
            });

            message.update({
                "flags.rolled": true
            });        
        });     
    }

    /* -------------------------------------------- */
}