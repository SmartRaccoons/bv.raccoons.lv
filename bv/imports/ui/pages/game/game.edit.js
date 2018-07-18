import './game.edit.html';
import { Game} from '../../../api/game/model'
import { Template } from 'meteor/templating';
import { settings } from '../../../api/game/settings';


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
  settings: settings_get
});

Template.App_game_edit.events({
  'change input[name="advantage"]'(event) {
    Meteor.call('user.update.settings', {
      advantage: !settings_get().advantage
    });
  },
});
