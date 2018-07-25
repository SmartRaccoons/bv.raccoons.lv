import './game.edit.html';
import { Game } from '../../../api/game/model'
import { Template } from 'meteor/templating';
import { settings, values } from '../../../api/game/settings';
import { call } from '../methods'


Template.App_game_edit.onCreated(function () {
  Meteor.subscribe('user');
  var id = parseInt(this.data.id());
  this.autorun(() => {
    this.subscribe('game.private');
  });
});

var settings_get = function () {
  var user = Meteor.user();
  return settings(user ? user.settings : {});
};

Template.App_game_edit.helpers({
  settings: settings_get,
  settings_values: values,
  'equal'(v1, v2) {
    return v1 === v2;
  },
  'sets'() {
     return Array.from({length: values.sets.range[1] - values.sets.range[0] + 1},(v,k)=> values.sets.range[0] + k)
  },
  'game'() {
    var game = Game.findOne({id: parseInt(this.id())});
    if (!game) {
      return {};
    }
    game.serve_player = game.serve[0] * 2 + game.serve[1];
    return Object.assign(game, [
      'sets_result',
      'sets_last',
      'edited',
    ].reduce((acc, v)=>{
      acc[v] = game[v]();
      return acc;
    }, {}));
  },
  'switch_attr'(v) {
    if (v) {
      return {'data-switch': ''};
    }
  },
});

Template.App_game_edit.events(Object.keys(values).reduce((acc, pr)=> {
  acc['change [name="' + pr + '"]'] = ((pr)=> {
    return (event)=> {
      var params = {};
      if (Array.isArray(values[pr])) {
        if(values[pr].length === 2) {
          params[pr] = event.target.checked;
        } else {
          params[pr] = event.target.value;
        }
      } else {
        params[pr] = parseInt(event.target.value);
      }
      Meteor.call('user.update.settings', Object.assign(settings_get(), params));
    };
  })(pr);
  return acc;
}, {}));

(function (){
  var team_get = (event)=> parseInt($(event.target).closest('[data-team]').attr('data-team'));
  var player_get = (event)=> parseInt($(event.target).closest('[data-player]').attr('data-player'));

  var long_press_fn = (events, fns, ms)=> {
    Object.keys(fns).forEach((element)=>{
      var timeout, long_press, click_prev;
      if (events['click ' + element]) {
        click_prev = events['click ' + element];
      }
      events['click ' + element] = function(event) {
        clearTimeout(timeout);
        if (long_press) {
          long_press = false;
          return;
        }
        if (click_prev) {
          click_prev.apply(this, arguments);
        }
      };
      events['mouseleave ' + element] = (event)=> clearTimeout(timeout);
      events['mouseup ' + element] = (event)=> clearTimeout(timeout);
      events['mousedown ' + element] = function(event) {
        var args = Array.prototype.slice.call(arguments);
        timeout = setTimeout(()=>{
          long_press = true;
          event.stopPropagation();
          fns[element].apply(this, args);
        }, ms);
      };
    });
    return events;
  };

  Template.App_game_edit.events(long_press_fn({
    'click .game-score-switch'() {
      call('game.update.switch', {_id: this._id});
    },
    'click .game-team-head'(event) {
      call('game.update.point', {_id: this._id, team: this.team});
    },
    'click .game-team-head-timeout'(event) {
      console.info('timeout');
      event.stopPropagation();
    },
    'click .game-team-player-name button'(event) {
      call('game.update.serve', {_id: this._id, serve: [team_get(event), player_get(event)]});
    },
    'click .game-score-undo'(event) {
      call('game.update.undo', {_id: this._id});
    },
  }, {
    '.game-team-head'(event) {
      console.info('head long press ' + team_get(event));
    },
    '.game-team-player-name button'(event) {
      console.info('player long press ' + team_get(event) + '-' + player_get(event));
    },
  }, 1000));
})();
