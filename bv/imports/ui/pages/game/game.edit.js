import './game.edit.html';
import { Game } from '../../../api/game/model'
import { Template } from 'meteor/templating';
import { settings, values } from '../../../api/game/settings';


Template.App_game_edit.onCreated(function () {
  Meteor.subscribe('user');
  var id = parseInt(this.data.id());
  this.autorun(() => {
    this.subscribe('game.private', id);
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
});

Template.App_game_edit.events(Object.keys(values).reduce(function (acc, pr) {
  acc['change [name="' + pr + '"]'] = (function(pr) {
    return function (event) {
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
