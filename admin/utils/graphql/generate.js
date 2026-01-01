const { exec } = require('child_process');

exports.generate = () =>
  exec('yarn graphql-codegen', (error) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
  });
