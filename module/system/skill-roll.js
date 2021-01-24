import { Traversal } from "../utils/traversal.js";

export class CofSkillRoll {

    constructor(label, dice, mod, bonus, difficulty, critrange) {
        this._label = label;
        this._dice = dice;
        this._mod = mod;
        this._bonus = bonus;
        this._difficulty = difficulty;
        this._critrange = critrange;
        this._totalBonus = parseInt(this._mod) + parseInt(this._bonus);
        this._formula = (this._totalBonus === 0) ? this._dice : `${this._dice} + ${this._totalBonus}`;        
    }

    getRollResult(overrideDifficulty) {
        const diff = overrideDifficulty ? overrideDifficulty : this._difficulty;
        let r = new Roll(this._formula);
        r.roll();
        let rollResult = {};
        // Getting the dice kept in case of 2d12 or 2d20 rolls

        if (diff) {
            rollResult.isSuccess = r.total >= diff;
            rollResult.difficulty = diff;
        }

        let diceResult = r.result;
        if (r.terms[0].results) {
            const result = r.terms[0].results.find(r => r.active).result;
            rollResult.isCritical = ((result >= this._critrange.split("-")[0]) || result == 20);
            rollResult.isFumble = (result == 1);
            diceResult = Traversal.rollResultToString(r);
            if(rollResult.isCritical) rollResult.isSuccess = true;
            if(rollResult.isFumble) rollResult.isSuccess = false;
        }
        
        rollResult.total = r.total;
        rollResult.result = `${r.formula} <br> ${diceResult}`;
        return rollResult;
    }

}