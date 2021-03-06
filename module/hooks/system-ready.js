/**
 * Ready hook loads tables, and override's foundry's entity link functions to provide extension to pseudo entities
 */

import {DataLoader} from "../data.js";
import {UpdateUtils} from "../utils/update-utils.js";
import {FXMasterOverride} from "../hooks/fxMasterOverrides.js";
import { MacroDispatcher } from "../system/macroDispatcher.js";

Hooks.once("canvasInit",async () => {        
    await MacroDispatcher.init();
})

Hooks.once("ready", async () => {
    FXMasterOverride();

    //     console.debug("Importing data");
        // DataLoader.loadData("capacities");
        // DataLoader.loadData("encounters");
        // DataLoader.loadData("items");
        // DataLoader.loadData("paths");
        // DataLoader.loadData("profiles");
        // DataLoader.loadData("species");
        // DataLoader.loadData("spells");

    await game.cof.config.getProfiles();
    await game.cof.config.getSpecies();
    await game.cof.config.getPaths();
    await game.cof.config.getCapacities();

    // UpdateUtils.updatePaths();
    // UpdateUtils.updateProfiles();
    // UpdateUtils.updateSpecies();
    // await UpdateUtils.createEncounterAbilities();
    // await UpdateUtils.updateEncounters();
    //await UpdateUtils.makeEncounters();
    UpdateUtils.createEffects();
    ui.hotbar.render();
    console.info("System Initialized.");
});
 