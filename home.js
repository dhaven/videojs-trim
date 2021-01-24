// Get the Component base class from Video.js
var Component = videojs.getComponent('Component');
var Slider = videojs.getComponent('Slider');
var Player = videojs.getComponent('Player');
var SeekBar = videojs.getComponent('SeekBar');

var ProgressControl = videojs.getComponent('ProgressControl');

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

class CustomProgressControl extends ProgressControl {
  constructor(player, options) {
    super(player, options);
  }

  handleMouseMove(event) {
    const seekBar = this.getChild('CustomSeekBar');
    if (!seekBar) {
      return;
    }
    const playProgressBar = seekBar.getChild('playProgressBar');
    const mouseTimeDisplay = seekBar.getChild('mouseTimeDisplay');

    if (!playProgressBar && !mouseTimeDisplay) {
      return;
    }
    const seekBarEl = seekBar.el();
    const seekBarRect = videojs.dom.findPosition(seekBarEl);
    let seekBarPoint = videojs.dom.getPointerPosition(seekBarEl, event).x;
    seekBarPoint = clamp(seekBarPoint, 0, 1);
    if(seekBarPoint < this.player_.startTrim() || seekBarPoint > this.player_.endTrim()){
      return
    }else{
      if (mouseTimeDisplay) {
        mouseTimeDisplay.update(seekBarRect, seekBarPoint);
      }

      if (playProgressBar) {
        playProgressBar.update(seekBarRect, seekBar.getProgress());
      }
    }
  }

  handleMouseSeek(event) {
    const seekBar = this.getChild('CustomSeekBar');
    if (!seekBar) {
      return;
    }
    const seekBarEl = seekBar.el();
    let seekBarPoint = videojs.dom.getPointerPosition(seekBarEl, event).x;
    seekBarPoint = clamp(seekBarPoint, 0, 1);
    if(seekBarPoint <= this.player_.startTrim() || seekBarPoint >= this.player_.endTrim()){
      console.log("trigger seek event outside bounds")
    }else{
      console.log("trigger seek event inside bounds")
      seekBar.handleMouseMove(event);
    }
  }
  handleMouseDown(event) {
    const doc = this.el_.ownerDocument;
    const seekBar = this.getChild('CustomSeekBar');

    const seekBarEl = seekBar.el();
    let seekBarPoint = videojs.dom.getPointerPosition(seekBarEl, event).x;
    seekBarPoint = clamp(seekBarPoint, 0, 1);
    if(seekBarPoint <= this.player_.startTrim() || seekBarPoint >= this.player_.endTrim()){
      console.log("trigger mouse down event outside bounds")
    }else{
      console.log("trigger mouse down event inside bounds")
      seekBar.handleMouseDown(event);
      return;
    }

    this.on(doc, 'mousemove', this.throttledHandleMouseSeek);
    this.on(doc, 'touchmove', this.throttledHandleMouseSeek);
    this.on(doc, 'mouseup', this.handleMouseUp);
    this.on(doc, 'touchend', this.handleMouseUp);
  }
  handleMouseUp(event) {
    const doc = this.el_.ownerDocument;
    const seekBar = this.getChild('CustomSeekBar');

    if (seekBar) {
      seekBar.handleMouseUp(event);
    }

    this.off(doc, 'mousemove', this.throttledHandleMouseSeek);
    this.off(doc, 'touchmove', this.throttledHandleMouseSeek);
    this.off(doc, 'mouseup', this.handleMouseUp);
    this.off(doc, 'touchend', this.handleMouseUp);
  }
}

class CustomSeekBar extends SeekBar {
  constructor(player, options) {
    super(player, options);
  }

  update(event) {
    if(this.getProgress() >= this.player_.endTrim()){
      this.player_.pause();
    }else{
      super.update(event);
    }
  }
  handleMouseMove(event) {
    const seekBarEl = this.el();
    let seekBarPoint = videojs.dom.getPointerPosition(seekBarEl, event).x;
    seekBarPoint = clamp(seekBarPoint, 0, 1);
    if(seekBarPoint <= this.player_.startTrim() || seekBarPoint >= this.player_.endTrim()){
      console.log("mouse moved outside bounds")
    }else{
      console.log("mouse moved inside bounds")
      super.handleMouseMove(event);
    }
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

CustomProgressControl.prototype.options_ = {
  children: ['CustomSeekBar']
};

CustomSeekBar.prototype.options_ = {
  children: [
    'loadProgressBar',
    'playProgressBar'
  ],
  barName: 'playProgressBar'
};

// MouseTimeDisplay tooltips should not be added to a player on mobile devices
if (!videojs.browser.IS_IOS && !videojs.browser.IS_ANDROID) {
  CustomSeekBar.prototype.options_.children.splice(1, 0, 'mouseTimeDisplay');
}

Component.registerComponent('TrimButton', TrimButton);
Component.registerComponent('CustomSeekBar', CustomSeekBar);
Component.registerComponent('CustomProgressControl',CustomProgressControl)

player.getChild("ControlBar").addChild('CustomProgressControl')
Seekbar = player.getChild("ControlBar").getChild('CustomProgressControl').getChild("CustomSeekBar")
Seekbar.addChild("TrimButton",{orientationRight: true})
Seekbar.addChild("TrimButton",{orientationRight: false})
