
/**
 * TODO
 * 
 * First functionality;
 * 
 * Create a popup with different views
 * IF player show only the ally advantage pool
 * IF GM show both ally and adversary pool
 * Add buttons to each field allowing simple increasing and decreasing, only to show to GM/assistant permissions
 * 
 * 
 */

class GroupAdvantage extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = 'ga';
    options.title = game.i18n.localize("ga.counter.title");
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
    data.ally = game.settings.get('ga', 'allies');
    data.adversary = game.settings.get('ga', 'adversaries');
    data.canEdit =
      game.user.isGM;

    return data;
  }

  render(force=false, options={})
  {
    let userPosition = game.settings.get("ga", "counterPosition");
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
    game.settings.set("ga", "counterPosition", this.position)
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
}

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(GroupAdvantage.ID);
});

Hooks.once('init', async function () {
  game.settings.register('ga', 'allies', {});
  game.settings.set('ga', 'allies', 0);
  game.settings.register('ga', 'adversaries', {});
  game.settings.set('ga', 'adversaries', 0);
  game.settings.register("ga", "counterPosition", {
    top: 200,
    left: 250
  });
  game.counter = new GroupAdvantage();
});

Hooks.once('ready', async function () {
  game.counter.render(true)
});

Hooks.once('socketlib.ready', () => {
  socket = socketlib.registerModule('WFRP-Group-Advantage');
  
})
