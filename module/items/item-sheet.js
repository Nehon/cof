/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
import { ArrayUtils } from "../utils/array-utils.js";
import { Traversal } from "../utils/traversal.js";
import { System } from "../config.js";

export class CofItemSheet extends ItemSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["cof", "sheet", "item", this.type],
            template: System.templatesPath + "/items/item-sheet.hbs",
            width: 600,
            height: 600,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
        });
    }

    /**
     * Activate the default set of listeners for the Entity sheet
     * These listeners handle basic stuff like form submission or updating images
     *
     * @param html {JQuery}     The rendered template ready to have listeners attached
     */
    activateListeners(html) {
        super.activateListeners(html);

        // html.find('.editor-content[data-edit]').each((i, div) => this._activateEditor(div));

        html.find('.droppable').on("dragover", function (event) {
            event.preventDefault();
            event.stopPropagation();
            $(event.currentTarget).addClass('dragging');
        });

        html.find('.droppable').on("dragleave", function (event) {
            event.preventDefault();
            event.stopPropagation();
            $(event.currentTarget).removeClass('dragging');
        });

        html.find('.droppable').on("drop", function (event) {
            event.preventDefault();
            event.stopPropagation();
            $(event.currentTarget).removeClass('dragging');
        });

        // Click to open
        html.find('.compendium-pack').click(ev => {
            ev.preventDefault();
            let li = $(ev.currentTarget), pack = game.packs.get(li.data("pack"));
            if (li.attr("data-open") === "1") pack.close();
            else {
                li.attr("data-open", "1");
                li.find("i.folder").removeClass("fa-folder").addClass("fa-folder-open");
                pack.render(true);
            }
        });

        // Display item sheet
        html.find('.item-name').click(this._onEditItem.bind(this));
        html.find('.item-edit').click(this._onEditItem.bind(this));
        // Delete items
        html.find('.item-delete').click(this._onDeleteItem.bind(this));

        html.find('.capacity-effect-add').click(ev => {
            ev.preventDefault();
            let data = duplicate(this.item.data);
            if (!data.data.effects) {
                data.data.effects = {};
            }
            const length = Object.keys(data.data.effects).length

            data.data.effects[length] = {
                type: '',
                target: '',
                roll: '',
                value: "",
                rank: 1,
                maxRank: 5,
            };
            this.item.update(data)
        });

        html.find('.remove-buff').click(ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget);
            const key = li.data("key");
            const value = li.data("value");
            const data = duplicate(this.item.data);
            data.data.effects[key].value = data.data.effects[key].value.replace(value, "");
            this.item.update(data);
        });

        html.find('.add-buff').click(this._onAddBuff.bind(this));

        html.find('.edit-aoe').click(this._onEditAOE.bind(this));

        html.find('.capacity-effect-delete').click(ev => {
            ev.preventDefault();
            let li = $(ev.currentTarget), key = li.data("key");
            //let data = duplicate(this.item.data);            
            if (!this.item.data.data.effects) {
                return;
            }
            let data = {
                data: {
                    effects: {}
                }
            }
            data.data.effects['-=' + key] = null
            this.item.update(data)
        });
    }

    /** @override */
    setPosition(options = {}) {
        const position = super.setPosition(options);
        const sheetBody = this.element.find(".sheet-body");
        const bodyHeight = position.height - 192;
        sheetBody.css("height", bodyHeight);
        return position;
    }

    /* -------------------------------------------- */

    /** @override */
    _onDrop(event) {
        event.preventDefault();
        if (!this.options.editable) return false;
        // Get dropped data
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        } catch (err) {
            return false;
        }
        if (!data) return false;

        // Case 1 - Dropped Item
        if (data.type === "Item") {
            return this._onDropItem(event, data);
        }
        // Case 2 - Dropped Actor
        if (data.type === "Actor") {
            result = this._onDropActor(event, data);
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle dropping of an item reference or item data onto an Actor Sheet
     * @param {DragEvent} event     The concluding DragEvent which contains drop data
     * @param {Object} data         The data transfer extracted from the event
     * @return {Object}             OwnedItem data to create
     * @private
     */
    async _onDropItem(event, data) {
        const item = await Item.fromDropData(data);
        const itemData = duplicate(item.data);
        switch (itemData.type) {
            case "path":
                return await this._onDropPathItem(event, itemData);
            case "profile":
                return await this._onDropProfileItem(event, itemData);
            case "species":
                return await this._onDropSpeciesItem(event, itemData);
            case "capacity":
                return await this._onDropCapacityItem(event, itemData);
            default:
                return;
        }
    }
    /* -------------------------------------------- */
    /**
     * Handle dropping an Actor on the sheet to trigger a Polymorph workflow
     * @param {DragEvent} event   The drop event
     * @param {Object} data       The data transfer
     * @private
     */
    _onDropActor(event, data) {
        return false;
    }

    /* -------------------------------------------- */

    _onDropProfileItem(event, itemData) {
        return false;
    }

    /* -------------------------------------------- */

    _onDropSpeciesItem(event, itemData) {
        return false;
    }

    /* -------------------------------------------- */

    _onDropPathItem(event, itemData) {
        event.preventDefault();
        let data = duplicate(this.item.data);
        const id = itemData._id;
        if (data.type === "profile" || data.type === "species") {
            if (!data.data.paths.includes(id)) {
                data.data.paths.push(id);
                return this.item.update(data);
            }
            else ui.notifications.error("Ce profil contient déjà cette voie.")
        }
        return false;
    }

    /* -------------------------------------------- */

    _onDropCapacityItem(event, itemData) {
        event.preventDefault();
        let data = duplicate(this.item.data);
        const id = itemData._id;
        if (data.data.capacities && !data.data.capacities.includes(id)) {
            let caps = data.data.capacities;
            caps.push(id);
            return this.item.update(data);
        }
        else ui.notifications.error("Cette voie contient déjà cette capacité.")
    }

    /* -------------------------------------------- */

    async _onEditItem(ev) {
        ev.preventDefault();
        const li = $(ev.currentTarget).closest(".item");
        const id = li.data("itemId");
        const itemType = li.data("itemType");
        return Traversal.getEntity(id, "item", itemType).then(e => { if (e) e.sheet.render(true) });
    }


    async _onAddBuff(ev) {
        ev.preventDefault();
        const li = $(ev.currentTarget);
        const key = li.data("key");
        const data = duplicate(this.item.data);

        const rollOptionContent = await renderTemplate('systems/cof/templates/dialogs/buff-dialog.hbs', {
            stat: "",
            value: ""
        });
        let d = new Dialog({
            title: "Buff",
            content: rollOptionContent,
            buttons: {
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => {
                    }
                },
                submit: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Add",
                    callback: (html) => {
                        var type = $("input[name='type']:checked").val();
                        switch (type) {
                            case "buffedAttribute":
                                const stat = html.find("#stat").val();
                                let value = html.find('#value').val();
                                if (!value.startsWith("+") && !value.startsWith("-")) {
                                    value = `+${value}`;
                                }
                                data.data.effects[key].value += `${stat}(${value}),`;
                                break;
                            case "predefinedBuff":
                                const predefinedValue = html.find("#predefinedValue").val();
                                data.data.effects[key].value += `${predefinedValue},`;
                                break;
                            case "customBuff":
                                const customValue = html.find("#customValue").val();
                                data.data.effects[key].value += `${customValue},`;
                                break;
                        }
                        this.item.update(data);
                    }
                }
            },
            default: "submit",
            close: () => {
            }
        }, { classes: ["cof", "dialog"] });
        d.render(true);
    }
    async _onEditAOE(ev) {
        ev.preventDefault();
        const li = $(ev.currentTarget);
        const key = li.data("key");
        const data = duplicate(this.item.data);

        const rollOptionContent = await renderTemplate('systems/cof/templates/dialogs/aoe-edit-dialog.hbs', {
            type: "circle",
            minRange: "10",
            maxRange: "10",
            minDistance: "0",
            maxDistance: "0",
            angle: "0",
            targets:"all"            
        });
        let d = new Dialog({
            title: "Buff",
            content: rollOptionContent,
            buttons: {
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => {
                    }
                },
                submit: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Set",
                    callback: (html) => {
                        const type = html.find("#type").val();
                        const minRange = html.find("#minRange").val();
                        const maxRange = html.find("#maxRange").val();
                        const minDistance = html.find("#minDistance").val();
                        const maxDistance = html.find("#maxDistance").val();
                        const angle = html.find("#angle").val();
                        const targets = html.find("#targets").val();
                        let value = `${type}(${minRange}`;
                        if(minRange !== maxRange){
                            value+= `-${maxRange}`;
                        }
                        value += ",";
                        value += minDistance;
                        if(minDistance !== maxDistance){
                            value+= `-${maxDistance}`;
                        }
                        if(type=== "cone"){
                            value+= `,${angle}`;
                        }
                        value += ")";

                        if(targets !== "all"){
                            value += ` ${targets}`;
                        }
                        data.data.aoe = value;                        
                        this.item.update(data);
                    }
                }
            },
            default: "submit",
            close: () => {
            }
        }, { classes: ["cof", "dialog"] });
        d.render(true);
    }
    
    /* -------------------------------------------- */

    _onDeleteItem(ev) {
        ev.preventDefault();
        let data = duplicate(this.item.data);
        const li = $(ev.currentTarget).closest(".item");
        const id = li.data("itemId");
        const itemType = li.data("itemType");
        let array = null;
        switch (itemType) {
            case "path": array = data.data.paths; break;
            case "capacity": array = data.data.capacities; break;
        }
        if (array && array.includes(id)) {
            ArrayUtils.remove(array, id)
            return this.item.update(data);
        }
    }

    /** @override */
    getData() {
        const data = super.getData();
        data.labels = this.item.labels;

        // Include CONFIG values
        data.config = game.cof.config;

        // Item Type, Status, and Details
        data.itemType = data.item.type.titleCase();
        // data.itemStatus = this._getItemStatus(data.item);
        data.itemProperties = this._getItemProperties(data.item);
        // data.isPhysical = data.item.data.hasOwnProperty("quantity");

        // Potential consumption targets
        // data.abilityConsumptionTargets = this._getItemConsumptionTargets(data.item);

        // Action Details
        // data.hasAttackRoll = this.item.hasAttack;
        // data.isHealing = data.item.data.actionType === "heal";
        // data.isFlatDC = getProperty(data.item.data, "save.scaling") === "flat";

        // Vehicles
        // data.isCrewed = data.item.data.activation?.type === 'crew';
        // data.isMountable = this._isItemMountable(data.item);
        return data;
    }



    /* -------------------------------------------- */

    /**
     * Get the Array of item properties which are used in the small sidebar of the description tab
     * @return {Array}
     * @private
     */
    _getItemProperties(item) {
        const props = [];
        // const labels = this.item.labels;

        if (item.type === "item") {
            const entries = Object.entries(item.data.properties)
            props.push(...entries.filter(e => e[1] === true).map(e => {
                return game.cof.config.itemProperties[e[0]]
            }));
        }

        // else if ( item.type === "spell" ) {
        //     // props.push(
        //         // labels.components,
        //         // labels.materials,
        //         // item.data.components.concentration ? game.i18n.localize("DND5E.Concentration") : null,
        //         // item.data.components.ritual ? game.i18n.localize("DND5E.Ritual") : null
        //     // )
        // }
        //
        // else if ( item.type === "equipment" ) {
        //     props.push(CONFIG.DND5E.equipmentTypes[item.data.armor.type]);
        //     props.push(labels.armor);
        // }

        // else if ( item.type === "feat" ) {
        //     props.push(labels.featType);
        // }

        // Action type
        // if ( item.data.actionType ) {
        //     props.push(CONFIG.DND5E.itemActionTypes[item.data.actionType]);
        // }

        // Action usage
        // if ( (item.type !== "weapon") && item.data.activation && !isObjectEmpty(item.data.activation) ) {
        //     props.push(
        //         labels.activation,
        //         labels.range,
        //         labels.target,
        //         labels.duration
        //     )
        // }
        return props.filter(p => !!p);
    }

}
