import './game.stats.html';


import { Game } from '../../../api/game/model'
import { Template } from 'meteor/templating';


Template.App_game_stats.onCreated(function () {
  let id = parseInt(this.data.id());
  this.autorun(() => {
    this.subscribe('game.public', id);
  });
});


Template.App_game_stats.helpers({
  'game'() {
    return Game.findOne({id: parseInt(this.id())});
  },
});
