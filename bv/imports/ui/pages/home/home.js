import './home.html';

import { Meteor } from 'meteor/meteor';

import { Game} from '../../../api/game/model';


Template.App_home.onCreated(function () {
  this.autorun(() => {
    this.subscribe('game.public');
  });
});

Template.App_home.helpers({
  'games'() {
    return Game.find({}, {sort: {created: -1}});
  },
})
