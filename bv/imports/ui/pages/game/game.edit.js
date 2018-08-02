import './game.edit.html';
import { Game, actions_default } from '../../../api/game/model';
import { Template } from 'meteor/templating';
import { settings_values } from '../../../api/game/settings';
import { call } from '../methods';
import { ModalPlayer } from '../team/player.edit';
import { ModalTeam } from '../team/team.edit';


Template.App_game_edit.onCreated(function () {
  Meteor.subscribe('user');
  let id = parseInt(this.data.id());
  this.autorun(() => {
    this.subscribe('game.private', id);
  });
});


Template.App_game_edit_player.helpers({
  actions() { return actions_default.filter((v)=> v.ev !== '');},
  last_check(action) {
    return (this.history_last &&
      this.history_last.team[0] === this.team_id &&
      this.history_last.team[1] === this.player &&
      this.history_last.action === action
    );
  },
  serve_check(player, ev) {
    return ((this.team_id * 2 + this.player) !== player && ['sa', 'se'].indexOf(ev) > -1 );
  },
});

Template.App_game_edit.helpers({
  settings_values: settings_values,
  'equal'(v1, v2) {
    return v1 === v2;
  },
  'sets_values'() {
     return Array.from({length: settings_values.sets.range[1] - settings_values.sets.range[0] + 1},(v,k)=> settings_values.sets.range[0] + k)
  },
  'game'() { return Game.findOne({id: parseInt(this.id())}); },
  'switch_attr'(v) {
    if (v) {
      return {'data-switch': ''};
    }
  },
});

Template.App_game_edit.events(Object.keys(settings_values).reduce((acc, pr)=> {
  acc['change [name="' + pr + '"]'] = ((pr)=> {
    return function(event) {
      let params = {};
      if (Array.isArray(settings_values[pr])) {
        if(settings_values[pr].length === 2) {
          params[pr] = event.target.checked;
        } else {
          params[pr] = event.target.value;
        }
      } else {
        params[pr] = parseInt(event.target.value);
      }
      call('game.update.settings', { _id: this._id, settings: Object.assign(this.settings, params) });
    };
  })(pr);
  return acc;
}, {}));

(function (){
  let team_get = (event)=> parseInt($(event.target).closest('[data-team]').attr('data-team'));
  let player_get = (event)=> parseInt($(event.target).closest('[data-player]').attr('data-player'));

  let long_press_fn = (events, fns, ms)=> {
    Object.keys(fns).forEach((element)=>{
      let timeout, long_press, click_prev;
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
      events['touchend ' + element] = events['mouseup ' + element] = (event)=> clearTimeout(timeout);
      events['touchstart ' + element] = events['mousedown ' + element] = function(event) {
        let args = Array.prototype.slice.call(arguments);
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
      call('game.update.point', {_id: this._id, team: [team_get(event)], action: ''});
    },
    'click .game-team-head-timeout'(event) {
      event.stopPropagation();
      call('game.update.timeout', {_id: this._id, team: team_get(event)});
    },
    'click .game-team-player-name button'(event) {
      call('game.update.serve', {_id: this._id, serve: [team_get(event), player_get(event)]});
    },
    'click .game-score-undo'(event) {
      call('game.update.undo', {_id: this._id});
    },
    'click .game-team-action button'(event) {
      call('game.update.point', {
        _id: this._id,
        team: [team_get(event), player_get(event)],
        action: $(event.target).attr('data-action'),
      });
    },
  }, {
    '.game-team-head'(event) {
      ModalTeam({_id: this._id, teams: this.teams[team_get(event)], team: team_get(event)});
    },
    '.game-team-player-name button'(event) {
      ModalPlayer({_id: this._id, team: team_get(event), player: player_get(event)});
    },
  }, 1000));
})();
