import videojs from 'video.js';

var SeekBar = videojs.getComponent('SeekBar');
var Component = videojs.getComponent('Component');
import clamp from './utils/clamp.js';

class CustomSeekBar extends SeekBar {
  constructor(player, options) {
    super(player, options);
    if (this.startTrimPlayerEvent) {
      this.on(this.player_, this.startTrimPlayerEvent, this.update);
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

  update(event) {
    if (!this.el_ || !this.bar) {
      return;
    }
    if(this.getProgress() >= this.player_.endTrim()){
      this.player_.pause();
    }else{
      const startTrimPosition = Number(clamp(this.player_.startTrim(), 0, 1).toFixed(4));
      const videoProgress = Number(clamp(this.getPercent(), 0, 1).toFixed(4));

      this.requestNamedAnimationFrame('Slider#update', () => {

        // Convert to a percentage for css value
        this.bar.el().style['left'] = (startTrimPosition * 100).toFixed(2) + '%';
        this.bar.el().style['width'] = (videoProgress * 100).toFixed(2) - (startTrimPosition * 100).toFixed(2) + '%';
      });

      return videoProgress;
    }
  }
}

CustomSeekBar.prototype.options_ = {
  children: [
    'loadProgressBar',
    'playProgressBar'
  ],
  barName: 'playProgressBar'
};

/**
 * Call the update event for this Slider when this event happens on the player.
 *
 * @type {string}
 */
 CustomSeekBar.prototype.startTrimPlayerEvent = 'starttrimchange';

// MouseTimeDisplay tooltips should not be added to a player on mobile devices
if (!videojs.browser.IS_IOS && !videojs.browser.IS_ANDROID) {
  CustomSeekBar.prototype.options_.children.splice(1, 0, 'mouseTimeDisplay');
}

Component.registerComponent('CustomSeekBar', CustomSeekBar);
export default CustomSeekBar;
