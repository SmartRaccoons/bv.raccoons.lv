import config from '../../../config.js';


ServiceConfiguration.configurations.upsert({
    service: "facebook"
}, {
  $set: {
    appId: config.facebook.id,
    secret: config.facebook.secret
  }
});
import './register-api.js';
