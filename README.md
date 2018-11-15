## Common Voice [![Travis Status](https://travis-ci.org/mozilla/voice-web.svg?branch=master)](https://travis-ci.org/mozilla/voice-web)
This is a web, Android and iOS app for collecting speech
donations for the Common Voice project.

### Official Website
[voice.mozilla.org](https://voice.mozilla.org)

### Code of Conduct
By participating in this project, you're agreeing to uphold the [Mozilla Community Participation Guidelines](https://www.mozilla.org/en-US/about/governance/policies/participation/). If you need to report a problem, please see our [REPORTING.md](./REPORTING.md) guide.

### Contributing
From writing and reading sentences to enhancing our front-end architecture, there are many ways to get involved with Common Voice. For more information, check out [CONTRIBUTING.md](./CONTRIBUTING.md).

### Discussion
For general discussion (feedback, ideas, random musings), head to our [Discourse Category](https://discourse.mozilla-community.org/c/voice).

For technical problems or suggestions, please use the [GitHub issue tracker](https://github.com/mozilla/voice-web/issues).

Or come chat with us on Slack: [Invite Link](https://common-voice-slack-invite.herokuapp.com/)


### Run it locally

1. yarn install
2. npm install
3. place a config.json under server/ with db parameters and s3 parameters as described in docs/HOWTO_S3.md
``` 
you will need to configure a root password for mysql as well, so migrations can be processed 
```
4. npm run build
5. npm run start:prod
6. you are now up and running on localhost:9000

If you want to change transcript data you can find them under server data.

Data in your S3 bucket will be stored under a uuid per user(folder) and track (file.mp3) with a belonging .txt file which stores the transcript.

To import your voice-corpus with mozilla-deepspeech you'll need to tar.gz your bucket. After this you can use: https://github.com/mozilla/DeepSpeech/blob/master/bin/import_cv.py
to import it.
