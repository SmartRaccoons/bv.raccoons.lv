import './games.html';

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Game} from '../../../api/game/model'


var call = function() {
  var args = Array.prototype.slice.call(arguments);
  var callback = null;
  if (typeof args[args.length - 1] === 'function') {
    callback = args.pop()
  }
  args.push(function (err) {
    if (err) {
      alert(err.error);
    }
    if (callback) {
      callback.apply(this, arguments);
    }
  });
  Meteor.call.apply(Meteor, args);
}

Template.App_game.onCreated(function () {
  Meteor.subscribe('game');
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
    call('game.remove', this._id);
  },
});
