module.exports = {
  servers: {
    one: {
      host: 'bv.raccoons.lv',
      username: 'root',
      pem: '/Users/bambis/.ssh/id_rsa'
    }
  },

  app: {
    name: 'bv.raccoons.lv',
    path: '../',

    servers: {
      one: {},
    },

    buildOptions: {
      serverOnly: true,
    },

    env: {
      ROOT_URL: 'https://bv.raccoons.lv',
      MONGO_URL: 'mongodb://mongodb/meteor',
      MONGO_OPLOG_URL: 'mongodb://mongodb/local',
    },

    docker: {
      image: 'abernix/meteord:node-8.4.0-base',
    },
    enableUploadProgressBar: true
  },

  mongo: {
    version: '3.4.1',
    servers: {
      one: {}
    }
  },
  proxy: {
    domains: 'bv.raccoons.lv',
    ssl: {
      letsEncryptEmail: 'smart@raccoons.lv',
      forceSSL: true
    }
  }
};
