export class MacroDispatcher {


    static async findMacro(name) {
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

    static async onPrepareRoll(key, sourceToken, action, item) {
        const macro = await MacroDispatcher.findMacro(`${key}-onPrepareRoll`);
        if (!macro) {
            return;
        }
    }
    static async onRoll(key, sourceToken, rollResult, action, item) {
        const macro = await MacroDispatcher.findMacro(`${key}-onRoll`);
        if (!macro) {
            return;
        }
    }
    //  static onApplyPassive(key, actor, item){}
    static async onApplyActive(key, sourceToken, rollResult, targets) {
        const macro = await MacroDispatcher.findMacro(`${key}-onApplyActive`);
        if (!macro) {
            return;
        }
    }
    static async onVisualEffect(key, sourceToken, rollResult, targets) {
        const macro = await MacroDispatcher.findMacro(`${key}-onVisualEffect`);
        if (!macro) {
            return false;
        }
        console.log("Found macro", macro.data.name);
        try{
            const halfCell = game.scenes.viewed.data.grid * 0.5;
            eval(macro.data.command);
            return true;
        } catch(e){
            console.error("Error on macro", macro.data.name, e);
        }
    }


}