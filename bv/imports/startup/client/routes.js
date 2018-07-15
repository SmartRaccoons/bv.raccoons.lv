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
    BlazeLayout.render('App_body', { main: 'App_home' });
  },
});

login_required = FlowRouter.group({
  triggersEnter: [function(){
    if (!Meteor.loggingIn() && !Meteor.userId()){
      FlowRouter.go('App.home')
    }
  }]
})

// login_required.router('/app/games', {
//   name: 'App.games',
//   action() {
//     BlazeLayout.render('App_body', { main: 'App_games' });
//   }
// });
