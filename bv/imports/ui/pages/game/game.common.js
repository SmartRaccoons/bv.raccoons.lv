export const game_counter_helpers =  {
  timeout_history() {
    if (this.history_last_timeout) {
      this.countdown = new ReactiveCountdown(30);
      this.countdown.start();
      return true;
    }
    return false;
  },
  timeout_countdown() {
    return this.countdown.get();
  },
};
