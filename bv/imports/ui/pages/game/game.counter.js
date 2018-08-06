import './game.edit.html';
import './game.counter.html';


import { Game } from '../../../api/game/model'
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { game_counter_helpers } from './game.common';


Template.App_game_counter.onCreated(function () {
  let id = parseInt(this.data.id());
  this.autorun(() => {
    this.subscribe('game.public', id);
    this.subscribe('game.public', null, id);
    if (!Session.get('settings_follow')) {
      return;
    }
    let game = Game.findOne({id: parseInt(id)});
    if (game && game.ended) {
      let game_new = Game.findOne({owner: game.owner, started: {$gt: game.ended}}, {sort: {created: -1}});
      if (game_new) {
        FlowRouter.go('App.game.counter', { id: game_new.id });
      }
    }
  });
});

let settings = [
  {name: 'settings_switching', text: 'Switching', default: true},
  {name: 'settings_reverse_switch', text: 'Reverse switch', default: false},
  {name: 'settings_follow', text: 'Follow next game', default: false},
];
settings.forEach((v)=>{
  Session.setDefault(v.name, v.default);
});


Template.App_game_counter.helpers({
  'settings'() {
    return settings.map((v)=> {
      return Object.assign(v, {
        value: Session.get(v.name),
      });
    })
  },
  'game'() {
    return Game.findOne({id: parseInt(this.id())});
  },
  'switch_attr'(v) {
    if (!Session.get('settings_switching')) {
      return Session.get('settings_reverse_switch');
    }
    if (Session.get('settings_reverse_switch')) {
      v = !v;
    }
    return v;
  },
});

Template.App_game_counter.events(Object.assign({
  'click .game-settings button'(event) {
    Template.instance().$('.game-settings').hide();
    Template.instance().$('.game').attr('data-full', '');
  },
}, settings.reduce((acc, v)=> {
  acc['change [name="' + v.name + '"]'] = (function (name) {
    return function(event) {
      Session.set(name, event.target.checked);
    };
  }(v.name))
  return acc;
}, {})) );

Template.App_game_counter_team.helpers(game_counter_helpers);
