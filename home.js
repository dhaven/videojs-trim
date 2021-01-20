// Get the Component base class from Video.js
var Component = videojs.getComponent('Component');
var Slider = videojs.getComponent('Slider');
var Player = videojs.getComponent('Player');
//var player = videojs('my-player');
//player.cache_.startTrimTime = 0;

const clamp = function(number, min, max) {
  number = Number(number);

  return Math.min(max, Math.max(min, isNaN(number) ? min : number));
};


class TrimPlayer extends Player {
  constructor(tag, options, ready) {
    super(tag,options,ready);
    this.cache_.startTrimTime = 0.0;
    this.on('durationchange', this.handleTechDurationChange);
  }

  handleTechDurationChange = function(){
    this.duration(this.techGet_('duration'));
    this.cache_.endTrimTime = this.cache_.duration;
  }

  startTrim(percentAsDecimal) { //aka player volume()
    let start;
    if (percentAsDecimal !== undefined) {
      // Force value to between 0 and 1
      start = Math.max(0, Math.min(1, parseFloat(percentAsDecimal)));
      this.cache_.startTrimTime = start;
      //console.log(this.cache_.startTrimTime)
      this.trigger('starttrimchange');
      return;
    }
    // Default to 1 when returning current volume.
    start = parseFloat(this.cache_.startTrimTime);
    return (isNaN(start)) ? 0 : start;
  }

  endTrim(percentAsDecimal) {
    let end;
    if (percentAsDecimal !== undefined) {
      // Force value to between 0 and 1
      end = Math.max(0, Math.min(1, parseFloat(percentAsDecimal)));
      this.cache_.endTrimTime = end;
      //console.log(this.cache_.startTrimTime)
      this.trigger('endtrimchange');
      return;
    }
    end = parseFloat(this.cache_.endTrimTime);
    return (isNaN(end)) ? 1 : end;
  }
}

var createPlayer = function(id, options, ready) {
  const normalizeId = (id) => id.indexOf('#') === 0 ? id.slice(1) : id;
  const el = (typeof id === 'string') ? videojs.dom.$('#' + normalizeId(id)) : id;
  if (!videojs.dom.isEl(el)) {
    throw new TypeError('The element or ID supplied is not valid. (videojs)');
  }
  options = {};

  videojs.hooks('beforesetup').forEach((hookFunction) => {
    const opts = hookFunction(el, videojs.mergeOptions(options));

    if (!isObject(opts) || Array.isArray(opts)) {
      log.error('please return an object in beforesetup hooks');
      return;
    }

    options = videojs.mergeOptions(options, opts);
  });

  player = new TrimPlayer(el, options, ready);

  videojs.hooks('setup').forEach((hookFunction) => hookFunction(player));

  return player;
}

player = createPlayer('my-player');

//console.log(player.cache_)

class TrimControl extends Component {
  constructor(player, options = {}) {
    options.vertical = options.vertical || false;
    if (typeof options.trimBar === 'undefined') {
      options.trimBar = options.trimBar || {};
      options.trimBar.vertical = options.vertical;
    }
    super(player,options);
  }
  createEl() {

    return super.createEl('div', {
      className: "vjs-trim-control vjs-control vjs-volume-horizontal"
    });
  }
}

class TrimBar extends Slider {
  constructor(player, options) {
    super(player, options);
  }
  createEl() {
    return super.createEl('div', {
      className: 'vjs-slider-bar vjs-trim-bar'
    }, {
      'aria-label': this.localize('Volume Level'),
      'aria-live': 'polite'
    });
  }
  getPercent() {
    return this.player_.startTrim();
  }
  handleMouseDown(event) {
    if (!videojs.dom.isSingleLeftClick(event)) {
      return;
    }
    //console.log("mouse down ! (trimBar)")
    //super.handleMouseDown(event);
  }
  handleMouseMove(event) {
    if (!videojs.dom.isSingleLeftClick(event)) {
      return;
    }
    //console.log("mouse move ! (trimBar)");
    this.player_.startTrim(this.calculateDistance(event));
  }

  calculateDistance(event) {
    const position = videojs.dom.getPointerPosition(this.el_, event);

    if (this.vertical()) {
      return position.y;
    }
    return position.x;
  }

  update() {
    if (!this.el_ || !this.bar) {
      return;
    }
    const progress = this.getProgress();

    if (progress === this.player_.cache_.startTrimTime_) {
      return progress;
    }
    //console.log("progress = " + progress)
    //console.log("this.player_.startTrimTime_ = " + this.player_.cache_.startTrimTime_)
    this.player_.cache_.startTrimTime_ = progress;

    this.requestNamedAnimationFrame('Slider#update', () => {
      // Set the new bar width or height
      const sizeKey = this.vertical() ? 'bottom' : 'left';

      // Convert to a percentage for css value
      //this.bar.el().style[sizeKey] = 100 - (progress * 100).toFixed(2) + '%'; keep this for endtrim
      this.bar.el().style[sizeKey] = (progress * 100).toFixed(2) + '%';
    });

    return progress;
  }
  getProgress() {
    return Number(clamp(this.getPercent(), 0, 1).toFixed(4));
  }
}

//represents either the start of the trim control or the end of the trim controle
class TrimButton extends Component {
  constructor(player, options = {}) {
    super(player,options);
    this.on('mousedown', this.handleMouseDown);
    this.on('touchstart', this.handleMouseDown);
    if (this.startTrimPlayerEvent) {
      this.on(this.player_, this.startTrimPlayerEvent, this.update);
    }
    if (this.endTrimPlayerEvent) {
      this.on(this.player_, this.endTrimPlayerEvent, this.update);
    }
    this.orientationRight(!!this.options_.orientationRight);
  }
  createEl() {
    return super.createEl('div', {
      className: 'vjs-trim-level',
      innerHTML: '<div class="vjs-start-trim-button"></div>'
    });
  }

  orientationRight(bool) {
    if (bool === undefined) {
      return this.orientationRight_ || false;
    }

    this.orientationRight_ = !!bool;

    if (this.orientationRight_) {
      this.addClass('vjs-trim-start');
    } else {
      this.addClass('vjs-trim-end');
    }
  }

  getPercent() {
    if(this.orientationRight()){
      return this.player_.startTrim()
    }else{
      return this.player_.endTrim()
    }
  }

  handleMouseDown(event) {
    const doc = this.el_.ownerDocument;
    if (!videojs.dom.isSingleLeftClick(event)) {
      return;
    }
    this.on(doc, 'mousemove', this.handleMouseMove);
    this.on(doc, 'mouseup', this.handleMouseUp);
    this.on(doc, 'touchmove', this.handleMouseMove);
    this.on(doc, 'touchend', this.handleMouseUp);

    this.handleMouseMove(event);
  }

  handleMouseMove(event){
    if (!videojs.dom.isSingleLeftClick(event)) {
      return;
    }
    this.orientationRight() ? this.player_.startTrim(this.calculateDistance(event)) : this.player_.endTrim(this.calculateDistance(event));
  }

  handleMouseUp(event){
    const doc = this.el_.ownerDocument;
    this.off(doc, 'mousemove', this.handleMouseMove);
    this.off(doc, 'mouseup', this.handleMouseUp);
    this.off(doc, 'touchmove', this.handleMouseMove);
    this.off(doc, 'touchend', this.handleMouseUp);

    this.update();

  }

  calculateDistance(event) {
    const position = videojs.dom.getPointerPosition(this.parentComponent_.el_, event);
    return position.x;
  }

  update() {
    const progress = this.getProgress();

    //if (progress === this.player_.cache_.startTrimTime_) {
      //return progress;
    //}
    //console.log("progress = " + progress)
    //console.log("this.player_.startTrimTime_ = " + this.player_.cache_.startTrimTime_)
    //this.player_.cache_.startTrimTime_ = progress;
    if(this.orientationRight()){
      this.requestNamedAnimationFrame('Slider#update', () => {
        const sizeKey = 'left'
        // Convert to a percentage for css value
        //this.bar.el().style[sizeKey] = 100 - (progress * 100).toFixed(2) + '%'; keep this for endtrim
        this.el().style[sizeKey] = (progress * 100).toFixed(2) + '%';
      });
    }else{
      this.requestNamedAnimationFrame('Slider#update', () => {
        const sizeKey = 'right'
        // Convert to a percentage for css value
        //this.bar.el().style[sizeKey] = 100 - (progress * 100).toFixed(2) + '%'; keep this for endtrim
        this.el().style[sizeKey] = 100 - (progress * 100).toFixed(2) + '%';
      });
    }
    return progress;
  }
  getProgress() {
    return Number(clamp(this.getPercent(), 0, 1).toFixed(4));
  }
}

/**
 * Call the update event for this Slider when this event happens on the player.
 *
 * @type {string}
 */
TrimButton.prototype.startTrimPlayerEvent = 'starttrimchange';
TrimButton.prototype.endTrimPlayerEvent = 'endtrimchange';

Component.registerComponent('TrimControl', TrimControl);
Component.registerComponent('TrimBar', TrimBar);
Component.registerComponent('TrimButton', TrimButton);

TrimControl.prototype.options_ = {
  children: [
    'trimBar'
  ]
};

TrimBar.prototype.options_ = {
  children: ['TrimButton', {
    name: 'TrimButton',
    orientationRight: true
  }, {
    name: 'TrimButton',
    orientationRight: false
  }],
  barName: 'TrimButton'
};
player.getChild("ControlBar").addChild("TrimControl");
