import config from '../../../config.js';


ServiceConfiguration.configurations.remove({
    service: "facebook"
});


ServiceConfiguration.configurations.insert({
    service: "facebook",
    appId: config.facebook.id,
    secret: config.facebook.secret
});
import './register-api.js';
