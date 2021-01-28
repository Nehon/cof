/**
 * Create a macro when dropping an entity on the hotbar
 * Item      - open roll dialog for item
 * Actor     - open actor sheet
 * Journal   - open journal sheet
 */
import { Macros } from "../system/macros.js";

Hooks.on("hotbarDrop", async (bar, data, slot) => {
    // Create item macro if rollable item - weapon, spell, prayer, trait, or skill
    if (data.type == "Item") {
        let item = data.data;
        let command;
        let displayUsage = false
        if (item.type === "capacity") {
            command = `game.cof.macros.rollCapacityMacro("${item.data.key}", "${item.name}");`;
            displayUsage = item.data.maxUse !== undefined && item.data.maxUse !== null;
        } else {
            command = `game.cof.macros.rollItemMacro("${item._id}", "${item.name}", "${item.type}");`;
        }
        let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
        if (!macro) {
            macro = await Macro.create({
                name: item.name,
                type: "script",
                img: item.img,
                command: command,
                "flags.displayUsage": displayUsage,
                "flags.actorId": data.actorId,
                "flags.sceneId": data.sceneId,
                "flags.tokenId": data.tokenId,
                "flags.itemKey": item.data.key
            }, { displaySheet: false })
        }
        game.user.assignHotbarMacro(macro, slot);
    }
    // Create a macro to open the actor sheet of the actor dropped on the hotbar
    else if (data.type == "Actor") {
        let actor = game.actors.get(data.id);
        let command = `game.actors.get("${data.id}").sheet.render(true)`
        let macro = game.macros.entities.find(m => (m.name === actor.name) && (m.command === command));
        if (!macro) {
            macro = await Macro.create({
                name: actor.data.name,
                type: "script",
                img: actor.data.img,
                command: command
            }, { displaySheet: false })
            game.user.assignHotbarMacro(macro, slot);
        }
    }
    // Create a macro to open the journal sheet of the journal dropped on the hotbar
    else if (data.type == "JournalEntry") {
        let journal = game.journal.get(data.id);
        let command = `game.journal.get("${data.id}").sheet.render(true)`
        let macro = game.macros.entities.find(m => (m.name === journal.name) && (m.command === command));
        if (!macro) {
            macro = await Macro.create({
                name: journal.data.name,
                type: "script",
                img: (journal.data.img) ? journal.data.img : "icons/svg/book.svg",
                command: command
            }, { displaySheet: false })
            game.user.assignHotbarMacro(macro, slot);
        }
    }
    return false;
});

Hooks.on("renderHotbar", async (bar, html, info) => {
    let macroList = html.find("#macro-list");
    let macros = macroList.find(".macro");

    for (let i = 0; i < bar.macros.length; i++) {
        const slot = bar.macros[i];
        const macro = slot.macro;
        if (!macro || !macro.data.flags.displayUsage) {
            continue;
        }
        const actor = game.actors.get(macro.data.flags.actorId);
        const capacity = actor.getCapacityByKey(actor.data.items, macro.data.flags.itemKey);
        let maxUse = capacity.data.maxUse;
        if (maxUse === "@rank") {
            if (actor.data.data.paths) {
                maxUse = actor.data.data.paths[capacity.data.pathIndex].rank;
            } else {
                maxUse = 2;
            }
        }
        let elem = macros[i];
        let div = $("<div></div>");
        div.addClass("macro-use");
        div.addClass("flexrow");
        div.addClass("between");
        for (let i = 0; i < maxUse; i++) {
            let span = $("<span></span>");
            if (i < capacity.data.nbUse) {
                span.addClass("active");
            }
            span.addClass("flex1");
            div.append(span);
        }
        $(elem).append(div);
    }

});
