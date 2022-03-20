
/**
 * TODO
 * 
 * First functionality;
 * 
 * Create a popup with different views
 * IF player show only the ally advantge pool
 * IF GM show both ally and adversary pool
 * Add buttons to each field allowing simple increasing and decreasing, only to show to GM/assistant permissions
 * 
 * 
 */

  class GroupAdvantage extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = 'ga';
    options.template = `modules/WFRP-Group-Advantage/templates/group-advantage.hbs`;
    return options;
  }
  /* -------------------------------------------- */
  /**
   * Provide data to the HTML template for rendering
   * @type {Object}
   */
  getData() {
    const data = super.getData();
    data.ally = 0;
    data.adversary = 0;
    data.canEdit =
      game.user.isGM;

    return data;
  }

  render(force=false, options={})
  {
    let userPosition = game.settings.get("group-advantage", "counterPosition");
    options.top = userPosition.top || window.innerHeight - 200
    options.left = userPosition.left || 250
    super.render(force, options)
  }

  async _render(...args)
  {
    await super._render(...args)
    delete ui.windows[this.appId]
  }

  setPosition(...args) {
    super.setPosition(...args);
    game.settings.set("group-advantage", "counterPosition", this.position)
  }

  close(){
    return
  }

  activateListeners(html) {
    super.activateListeners(html);

    new Draggable(this, html, html.find(".handle")[0], false)

    html.find('input').focusin(ev => {
      ev.target.select()
    })
    // Call setCounter when input is used
    this.input = html.find('input').change(async ev => {
      const type = $(ev.currentTarget).attr('data-type');
      GroupAdvantage.setCounter(ev.target.value, type);
    });

    // Call changeCounter when +/- is used
    html.find('.incr,.decr').mousedown(async ev => {
      let input = $(ev.target.parentElement).find("input")
      const type = input.attr('data-type');
      const multiplier = $(ev.currentTarget).hasClass('incr') ? 1 : -1;
      $(ev.currentTarget).toggleClass("clicked")
      let newValue = await GroupAdvantage.changeCounter(parseInt(input[0].value, 10) ,1 * multiplier, type);
      input[0].value = newValue
    });

    html.find('.incr,.decr').mouseup(ev => {
      $(ev.currentTarget).removeClass("clicked")
    });
  }

  // ************************* STATIC FUNCTIONS ***************************

  /**
   * Set the counter of (type) to (value)
   * @param value Value to set counter to
   * @param type  Type of counter, "ally" or "adversary"
   */
  static async setCounter(value, type) {
    value = Math.round(value);

    if (!game.user.isGM) {
      socket.executeForOthers(this.changeCounter, value, type);
    }
    return value;
  }

  /**
   * Change the counter of (type) by (value)
   * @param value Current value of input
   * @param diff How much to change the counter
   * @param type  Type of counter, "ally" or "adversary"
   */
  static async changeCounter(value, diff, type) {
    return await GroupAdvantage.setCounter(value + diff, type)
  }


  // static getValue(type)
  // {
  //     return game.settings.get("group-advantage", "counter", type);
  // }

  // get glory()
  // {
  //   return GroupAdvantage.getValue("glory")
  // }

  // get ruin()
  // {
  //   return GroupAdvantage.getValue("ruin")
  // }

}



Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(GroupAdvantage.ID);
});

Hooks.once('init', async function () {
  game.settings.register("group-advantage", "counterPosition", {});
  game.counter = new GroupAdvantage();
});

Hooks.once('ready', async function () {
  game.counter.render(true)
});

Hooks.once('socketlib.ready', () => {
  socket = socketlib.registerModule('WFRP-Group-Advantage');
  
})

