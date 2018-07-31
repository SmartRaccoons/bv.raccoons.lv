import './home.html';

import { Meteor } from 'meteor/meteor';

import { Game} from '../../../api/game/model';


Template.App_home.onCreated(function () {
  Meteor.subscribe('game.public');
});

Template.App_home.helpers({
  'games'() {
    return Game.find({owner: Meteor.userId()}, {sort: {created: -1}});
  },
})
