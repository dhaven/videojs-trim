import videojs from 'video.js';

var ProgressControl = videojs.getComponent('ProgressControl');
var Component = videojs.getComponent('Component');
import clamp from './utils/clamp.js';
//import './customSeekBar.js';

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

CustomProgressControl.prototype.options_ = {
  children: ['CustomSeekBar']
};

Component.registerComponent('CustomProgressControl', CustomProgressControl);
export default CustomProgressControl;
