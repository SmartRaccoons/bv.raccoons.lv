import './games.html';

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Game} from '../../../api/game/model'
import { call } from '../methods'


Template.App_game.onCreated(function () {
  Meteor.subscribe('game.private');
});


Template.App_game.helpers({
  games() {
    return Game.find({owner: Meteor.userId()}, {sort: {id: -1}})
  }
});

Template.App_game.events({
  'click .create'(){
    call('game.insert', function (err, id){
      FlowRouter.go('App.game.edit', {id: id});
    });
  }
});

Template.game.helpers({
  link() {
    return FlowRouter.path('App.game.edit', {id: this.id});
  }
});
Template.game.events({
  'click .delete'() {
    call('game.remove', {_id: this._id});
  },
});
