export class CofDamageRoll {
    constructor(label, formula, isCritical, type = 'damage'){
        this._label = label;
        this._formula = formula;
        this._isCritical = isCritical;
        this._type = type
    }

    roll(actor){
        const r = new Roll(this._formula);
        r.roll();
        if (this._isCritical) r._total = r._total * 2;
        const dmgCheckFlavor = this._buildDamageRollMessage();
        r.toMessage({
            user: game.user._id,
            flavor: dmgCheckFlavor,
            speaker: ChatMessage.getSpeaker({actor: actor})
        });
    }

    /* -------------------------------------------- */

    _buildDamageRollMessage() {
        let subtitle = `<h3><strong>${this._label}</strong></h3>`;
        if(this._type === 'damage'){
            if (this._isCritical) return `<h2 class="damage">${game.i18n.localize("COF.message.criticalDamageRoll")}</h2>${subtitle}`;
            return `<h2 class="damage">${game.i18n.localize("COF.message.damageRoll")}</h2>${subtitle}`;
        } else {
            if (this._isCritical) return `<h2 class="success">${game.i18n.localize("COF.message.criticalHealRoll")}</h2>${subtitle}`;
            return `<h2 class="success">${game.i18n.localize("COF.message.healRoll")}</h2>${subtitle}`;
        }
    }

}