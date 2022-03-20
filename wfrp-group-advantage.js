
class GroupAdvantage extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = 'ga';
    options.title = game.i18n.localize("ga.counter.title");
    options.template = `modules/wfrp-group-advantage/templates/group-advantage.hbs`;
    return options;
  }

  /* -------------------------------------------- */
  /**
   * Provide data to the HTML template for rendering
   * @type {Object}
   */
   getData() {
    const data = super.getData();
    data.ally = GroupAdvantage.getValue('allies') || 0;
    data.adversary = GroupAdvantage.getValue('adversaries') || 0;
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

  activateListeners(html) {
    super.activateListeners(html);

    new Draggable(this, html, html.find(".handle")[0], false)

    html.find('input').focusin(ev => {
      ev.target.select()
    })
  

    // Call changeCounter when +/- is used
    html.find('.incr,.decr').mousedown(async ev => {
      let input = $(ev.target.parentElement).find("input")
      const type = input.attr('data-type');
      const multiplier = $(ev.currentTarget).hasClass('incr') ? 1 : -1;
      $(ev.currentTarget).toggleClass("clicked");
      await this.changeCounter(parseInt(input[0].value, 10) ,1 * multiplier, type);
    });

    html.find('.incr,.decr').mouseup(ev => {
      $(ev.currentTarget).removeClass("clicked")
    });
  }

  /**
   * 
   * @param {int} value Current input value
   * @param {int} diff The multiplier
   * @param {String} type The type to set, allies or adversaries
   */
  async changeCounter(value, diff, type) {
    const newValue = value + diff;
    if(newValue >= 0) {
      return await this.setCounter(newValue, type);
    }
  }

  /**
   * 
   * @param {int} value The new value to set
   * @param {String} type The type to set, allies or adversaries
   */
  async setCounter(value, type) {
    document.querySelector(`[data-type="${type}"]`).value = value;
    if(game.user.isGM) {
      await game.settings.set('ga', type, value);
      await socket.executeForOthers('updateClients', value, type);
    }
    
    return value;
  }

  static getValue(type) {
    return game.settings.get("ga", type);
  }
}

Hooks.on('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(GroupAdvantage.ID);
});

Hooks.on('init', async function () {
  game.settings.register('ga', 'allies', {});
  game.settings.register('ga', 'adversaries', {});
  game.settings.register("ga", "counterPosition", {
    top: 200,
    left: 250
  });
  game.counter = new GroupAdvantage();
});

Hooks.on("updateCombat", function (combat, update, options, userId) {
  console.log("updateCombat");
  if (update.round > 0) {
    game.counter.render(true)
  }
});

Hooks.on('deleteCombat', async function () {
  game.counter.close()
  game.settings.set('ga', 'allies', 0);
  game.settings.set('ga', 'adversaries', 0);
});

Hooks.on('socketlib.ready', () => {
  socket = socketlib.registerModule('wfrp-group-advantage');
  socket.register('updateClients', updateClients);
})

function updateClients(value, type) {
  console.warn('updating clients');
  game.counter.setCounter(value, type)
}