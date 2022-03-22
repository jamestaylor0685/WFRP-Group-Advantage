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
    options.top = game.settings.get("ga", "counterPositionTop") || 200;
    options.left = game.settings.get("ga", "counterPositionLeft") || 250;
    if(game.user.isGM) {
      game.settings.set('ga', 'counterShown', true);
    }
    super.render(force, options)
  }

  async _render(...args)
  {
    await super._render(...args)
    delete ui.windows[this.appId]
  }

  setPosition(...args) {
    super.setPosition(...args);
    game.settings.set("ga", "counterPositionTop", this.position.top);
    game.settings.set("ga", "counterPositionLeft", this.position.left);
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
      this.setCounter(ev.target.value, type);
    });
  

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
   * @param {Number} value Current input value
   * @param {Number} diff The multiplier
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
   * @param {Number} value The new value to set
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

  isShown() {
    return this.data.shown; 
  }
}

Hooks.on('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(GroupAdvantage.ID);
});

Hooks.on('init', async function () {
  game.settings.register('ga', 'counterShown', {
    default: false,
    type: Boolean,
    scope: 'world',
    onChange: value => {
      if(value) {
        console.log('Advantage tracker shown');
      } else {
        console.log('Advantage tracker hidden');
      }
    }
  });
  game.settings.register('ga', 'allies', {
    scope: 'world',
    config: false,
    type: Number,
    onChange: value=> {
      console.log('allies advantage', value)
    } 
  });
  game.settings.register('ga', 'adversaries', {scope: 'world',
  config: false,
  type: Number,
  onChange: value=> {
    console.log('adversaries advantage', value)
  } });
  game.settings.register("ga", "counterPositionTop", {
    default: 200,
    scope: 'client',
    type: Number
  });
  game.settings.register("ga", "counterPositionLeft", {
    default: 250,
    scope: 'client',
    type: Number
  });
  game.counter = new GroupAdvantage();
});

Hooks.on('ready', async function() {
  console.warn('You are using the development code!');
  if(game.settings.get('ga', 'counterShown')) {
    game.counter.render(true);
  }
})

Hooks.on("updateCombat", function (combat, update, options, userId) {
  console.log("updateCombat");
  if (update.round > 0 && !game.settings.get('ga', 'counterShown')) {
    game.counter.render(true);
  }
});

Hooks.on('deleteCombat', async function () {
  game.counter.close()
  if(game.user.isGM) {
    game.settings.set('ga', 'counterShown', false);
    game.settings.set('ga', 'allies', 0);
    game.settings.set('ga', 'adversaries', 0);
  }
});

Hooks.on('socketlib.ready', () => {
  socket = socketlib.registerModule('wfrp-group-advantage');
  socket.register('updateClients', updateClients);
})

function updateClients(value, type) {
  console.warn('updating clients');
  game.counter.setCounter(value, type)
}