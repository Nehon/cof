import {CofRoll} from "../controllers/roll.js"
import { Traversal } from "../utils/traversal.js";

export class MacroDispatcher {

    static async findMacro(name) {
        if(!game.macros.find){
            return;
        }
        // first search in game macros
        let macro = game.macros.find(m => m.data.name === name);
        if (macro) {
            return macro;
        }
        // search in compendiums
        const macroCompendiums = game.packs.filter(c => c.metadata.entity === "Macro");
        for (const compendium of macroCompendiums) {
            const content = await compendium.getContent();
            macro = content.find(m => m.data.name === name);
            if (macro) {
                return macro;
            }
        }
        return macro;
    }

    static async onActivate(key, actor, capacity) {
        const macro = await MacroDispatcher.findMacro(`${key}-onActivate`);
        if (!macro) {
            return;
        }
        try{
            eval(macro.data.command);
            return true;
        } catch(e){
            console.error("Error on macro", macro.data.name, e);
        }
    }

    static async onDeactivate(key, actor, capacity) {
        const macro = await MacroDispatcher.findMacro(`${key}-onDeactivate`);
        if (!macro) {          
            return;
        }
        try{
            eval(macro.data.command);
            return true;
        } catch(e){
            console.error("Error on macro", macro.data.name, e);
        }
    }

    static async onApplyPassive(key, actor, capacity) {
        const macro = await MacroDispatcher.findMacro(`${key}-onApplyPassive`);
        if (!macro) {
            return;
        }
        console.log("found macro", `${key}-onApplyPassive`);
        try{
            eval(macro.data.command);
            return true;
        } catch(e){
            console.error("Error on macro", macro.data.name, e);
        }
    }

    static async onPrepareRoll(key, sourceToken, action, item) {
        const macro = await MacroDispatcher.findMacro(`${key}-onPrepareRoll`);
        if (!macro) {
            return;
        }
        try{
            eval(macro.data.command);
            return true;
        } catch(e){
            console.error("Error on macro", macro.data.name, e);
        }
    }

    static async onRoll(key, sourceToken, rollResult, action) {
        const macro = await MacroDispatcher.findMacro(`${key}-onRoll`);
        if (!macro) {
            return;
        }
        try{
            eval(macro.data.command);
            return true;
        } catch(e){
            console.error("Error on macro", macro.data.name, e);
        }
    }

    static async onApplyActive(key, sourceToken, rollResult, targets) {
        const macro = await MacroDispatcher.findMacro(`${key}-onApplyActive`);
        if (!macro) {
            return;
        }
        try{
            eval(macro.data.command);
            return true;
        } catch(e){
            console.error("Error on macro", macro.data.name, e);
        }
    }

    static async onVisualEffect(key, sourceToken, rollResult, targets) {
        const macro = await MacroDispatcher.findMacro(`${key}-onVisualEffect`);
        if (!macro) {
            return false;
        }
        try{
            const halfCell = game.scenes.viewed.data.grid * 0.5;
            eval(macro.data.command);
            return true;
        } catch(e){
            console.error("Error on macro", macro.data.name, e);
        }
    }


}