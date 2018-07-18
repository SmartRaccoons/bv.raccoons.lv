import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

// Import needed templates
import '../../ui/layouts/body/body.js';
import '../../ui/pages/home/home.js';
import '../../ui/pages/game/games.js';
import '../../ui/pages/not-found/not-found.js';


FlowRouter.notFound = {
  action() {
    BlazeLayout.render('App_body', { main: 'App_notFound' });
  },
};


FlowRouter.route('/', {
  name: 'App.home',
  action() {
    BlazeLayout.render('App_body', {
      main: 'App_home',
      app_games: FlowRouter.path('App.game'),
    });
  },
});


app_games = FlowRouter.group({
  prefix: '/app/game',
  triggersEnter: [function(){
    if (!Meteor.loggingIn() && !Meteor.userId()){
      FlowRouter.go('App.home');
    }
  }]
})
app_games.route('/', {
  name: 'App.game',
  action() {
    BlazeLayout.render('App_body', { main: 'App_game' });
  }
});
app_games.route('/:id', {
  name: 'App.game.edit',
  action() {

  }
});
