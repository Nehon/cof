
export const overrides079Bugs = function(){
 
 
 // Hot replace Compendium.updateEntity with a fixed version
 
    /**
   * Update a single Compendium entry programmatically by providing new data with which to update
   * @param {Object} data       The incremental update with which to update the Entity. Must contain the _id
   * @param {Object} options    Additional options which modify the update request
   * @return {Promise}          A Promise which resolves with the updated Entity once the operation is complete
   */
  Compendium.prototype.updateEntity = async function(data, options={}) {
    this._assertUserCanModify();
    if ( !data._id ) throw new Error("You must specify the _id attribute for the data you wish to update");

    // Reference an existing Entity which is already rendered
    const entity = options["entity"] || null;
    delete options.entity;

    // Prepare data for update
    data = data instanceof Array ? data : [data];
    const updates = data.reduce((arr, d) => {
      if ( !d._id ) throw new Error(`You must provide an _id for every Compendium entry in the data Array.`);
      d = expandObject(d);
      arr.push(d);
      return arr;
    }, []);
    if ( !updates.length ) return [];

    // Dispatch the Socket request
    const response = await SocketInterface.dispatch("modifyCompendium", {
      action: "update",
      type: this.collection,
      data: updates,
      options: options
    });

    // Render updates
    this.render(false);
    if ( entity ) {
      const update = response.result.find(r => r._id === entity.id);
      // ------- This is the issue -------
      // it should be entity._data instead of entity.data.
      // mergeObject(entity.data, update);
      mergeObject(entity._data, update);
      entity._onUpdate(update, options, response.userId);
    }

    // Return the update entities
    return response.result;
  }

}