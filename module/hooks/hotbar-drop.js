/**
 * Create a macro when dropping an entity on the hotbar
 * Item      - open roll dialog for item
 * Actor     - open actor sheet
 * Journal   - open journal sheet
 */
import { Capacity } from "../controllers/capacity.js";
import { CofRoll } from "../controllers/roll.js";
import { Macros } from "../system/macros.js";
import { Traversal } from "../utils/traversal.js";

Hooks.on("hotbarDrop", async (bar, data, slot) => {
    // Create item macro if rollable item - weapon, spell, prayer, trait, or skill
    if (data.type == "Item") {
        let item = data.data;
        let command;
        let displayUsage = false
        displayUsage = item.data.maxUse !== undefined && item.data.maxUse !== null && item.data.maxUse !== "";
        if (item.type === "capacity") {
            command = `game.cof.macros.rollCapacityMacro("${item.data.key}", "${item.name}");`;
        } else {
            command = `game.cof.macros.rollItemMacro("${item._id}", "${item.name}", "${item.type}");`;
            displayUsage |= item.data.properties.consumable;
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


const getUsage = function (actor, item) {
    let maxUse = actor.getMaxUse(item);
    let nbUse = item.data.nbUse;
    if (!maxUse && item.data.properties && item.data.properties.consumable) {
        maxUse = item.data.qty;
        nbUse = maxUse;
    }
    return {
        maxUse: maxUse,
        nbUse: nbUse
    }
}

const makeUsageDiv = function (usage) {
    let div = $("<div></div>");
    div.addClass("macro-use");
    div.addClass("flexrow");
    div.addClass("between");
    for (let i = 0; i < usage.maxUse; i++) {
        let span = $("<span></span>");
        if (i < usage.nbUse) {
            span.addClass("active");
        }
        span.addClass("flex1");
        div.append(span);
    }
    return div;
}

Hooks.on("renderHotbar", async (bar, html, info) => {
    let macroList = html.find("#macro-list");
    let macros = macroList.find(".macro");

    for (let i = 0; i < bar.macros.length; i++) {
        const slot = bar.macros[i];
        const macro = slot.macro;
        if (!macro || !macro.data.flags.displayUsage) {
            continue;
        }
        const actor = Traversal.findActor(macro.data.flags.actorId);
        const item = actor.getItemByKey(actor.data.items, macro.data.flags.itemKey);
        if (!item) {
            console.warn(`Hotbar: ${actor.name} doesn't have the item/capacity ${macro.data.flags.itemKey}`);
            continue;
        }

        const usage = getUsage(actor, item);
        let elem = macros[i];
        let div = makeUsageDiv(usage);
        $(elem).append(div);
    }

    if (!game.user.isGM || !canvas) {
        return;
    }

    const tokens = canvas.tokens.controlled;
    if (!tokens.length) {
        return;
    }
    const actor = tokens[tokens.length - 1].actor;

    let buttons = []
    if (actor.data.data.weapons) {
        let array = actor.data.data.weapons;
        if(typeof array === "object"){
            array = Object.values(array);
        }
        for (const weapon of array) {
            buttons.push({
                name: weapon.name,
                description:  `<strong>mod:</strong> ${weapon.mod}, <strong>dmg:</strong> ${weapon.dmg} (<strong>crit</strong> ${weapon.critrange})`,
                img: weapon.img? weapon.img: "systems/cof/ui/icons/red_31.jpg",
                onClick: () => {
                    CofRoll.rollEncounterWeapon(weapon, actor);
                }
            })
        }
    }

    const weapons = actor.getWeapons(actor.data.items);
    for (const weapon of weapons) {
        if (!weapon.data.worn) {
            continue;
        }
        buttons.push({
            name: weapon.name,
            description: weapon.data.description,
            img: weapon.img,
            onClick: () => {
                CofRoll.rollWeapon(weapon, actor);
            }
        });
    }
    const capacities = actor.getCapacities(actor.data.items);
    for (const capacity of capacities) {
        if (!Capacity.isActivable(capacity)) {
            continue;
        }
        buttons.push({
            name: capacity.name,
            description: capacity.data.description,
            img: capacity.img,
            onClick: () => {
                Macros.rollCapacityMacro(capacity.data.key, capacity.name);
            },
            usage: getUsage(actor, capacity)
        });
    }

    const items = actor.getTrappingItems(actor.data.items);
    for (const item of items) {
        if (!Capacity.isActivable(item)) {
            continue;
        }
        buttons.push({
            name: item.name,
            description: item.data.description,
            img: item.img,
            onClick: () => {
                Macros.rollItemMacro(item._id, item.name, "item");
            },
            usage: getUsage(actor, item)
        });
    }


    html.addClass("GM");
    let bar2 = $("<nav id='action-bar2' class='flexrow'></nav>");
    html.append(bar2);
    let ol = $("<ol id='macro-list2' class='flexrow' data-page='1'></ol>");
    bar2.append(ol);
    for (let i = 0; i < buttons.length && i < 10; i++) {
        const button = buttons[i];
        const active = button !== undefined;
        let li = $(`<li class='macro ${active ? "active" : "inactive"}' data-slot='s${i}'></li>`);
        ol.append(li)
        let span = $(`<span class="macro-key">?</spana>`);
        li.append(span);
        let bigTooltip = $(`<div id="description" class="big-tooltip"><h2><img id="desc-img" width="32" height="32" src="${button.img}"/>
        <span id="desc-title">${button.name}</span></h2><span id="desc-content">${button.description}</span></div>`);
        li.append(bigTooltip);
        bigTooltip.hide();
        span.hover((e) => {
            e.preventDefault();
            bigTooltip.show();
        },
        (e) => {
            e.preventDefault();
            bigTooltip.hide();
        });       
        if (active) {
            let img = $(`<img class="macro-icon" src="${button.img}">`);
            li.append(img);
            li.click(button.onClick);
            if (button.usage && button.usage.maxUse) {
                const div = makeUsageDiv(button.usage);
                li.append(div);
            }
            let tooltip = $(`<span class='tooltip'>${button.name}</tooltip>`);
            li.append(tooltip);
            tooltip.hide();
            li.hover((e) => {
                e.preventDefault();
                tooltip.show();
            },
            (e) => {
                 e.preventDefault();
                tooltip.hide();
            });
        }
    }
});

Hooks.on("controlToken", async (token, selected) => {
    if (!game.user.isGM) {
        return;
    }
    ui.hotbar.render();
});


Hooks.on("updateOwnedItem", async (actor, item, change) => {
    if (!change) {
        return;
    }
    if (change.data && (change.data.hasOwnProperty("nbUse") || change.data.hasOwnProperty("maxUse") || change.data.hasOwnProperty("qty"))) {
        ui.hotbar.render();
    }

});
