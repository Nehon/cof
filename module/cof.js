/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import {CofActor} from "./actors/actor.js";
import {CofItem} from "./items/item.js";
import {CofEffect} from "./effects/effect.js";

import {CofItemSheet} from "./items/item-sheet.js";
import {CofCharacterSheet} from "./actors/character-sheet.js";
import {CofEncounterSheet} from "./actors/encounter-sheet.js";

import { preloadHandlebarsTemplates } from "./templates.js";
import { registerHandlebarsHelpers } from "./helpers.js";
import { registerSystemSettings } from "./settings.js";
import {System, COF} from "./config.js";
import {Macros} from "./system/macros.js";
import {overrides079Bugs} from "./overridesBugs.js";


Hooks.once("init", async function () {

    console.info("System Initializing...");
    console.info(System.ASCII);

    // patching foundry bugs
    overrides079Bugs();

    /**
     * Set an initiative formula for the system
     * @type {String}
     */

    CONFIG.Combat.initiative = {
        formula: "@attributes.init.value + @stats.wis.value/100",
        decimals: 2
    };

    // Define custom Entity classes
    CONFIG.Actor.entityClass = CofActor;
    CONFIG.Item.entityClass = CofItem;
    CONFIG.ActiveEffect.entityClass = CofEffect;    
    CONFIG.time.turnTime = 1;

    // Create a namespace within the game global
    game.cof = {
        skin : "base",
        macros : Macros,
        config: COF
    };

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);

    // Register actor sheets
    Actors.registerSheet("cof", CofCharacterSheet, {
        types: ["character", "npc"], 
        makeDefault: true,
        label: "COF.SheetClassCharacter"
    });
    Actors.registerSheet("cof", CofEncounterSheet, {
        types: ["encounter"], 
        makeDefault: true,
        label: "COF.SheetClassEncounter"
    });
    // Register item sheets
    Items.registerSheet("cof", CofItemSheet, {
        types: ["item", "capacity", "profile", "path", "species"],
        makeDefault: true,
        label: "COF.SheetClassItem"
    });

    // Register System Settings
    registerSystemSettings();

    // Preload Handlebars Templates
    preloadHandlebarsTemplates();

    // Register Handlebars helpers
    registerHandlebarsHelpers();

});
