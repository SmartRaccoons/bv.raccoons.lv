import './game.stats.html';


import { Game } from '../../../api/game/model'
import { Template } from 'meteor/templating';


Template.App_game_stats.onCreated(function () {
  let id = parseInt(this.data.id());
  this.autorun(() => {
    this.subscribe('game.public', id);
  });
});

let z = (v)=> v < 10 ? '0' + v : v;

Template.App_game_stats.helpers({
  'game'() {
    return Game.findOne({id: parseInt(this.id())});
  },
  'format_date'(d) {
    return [
      [d.getFullYear(), z(d.getMonth()+1), z(d.getDate())].join('.'),
      [z(d.getHours()), z(d.getMinutes()), z(d.getSeconds())].join(':'),
    ].join(' ');
  },
  'format_length'() {
    return this.game_length().map(z).join(':');
  },
});
