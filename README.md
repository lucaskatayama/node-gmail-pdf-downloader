# node-gmail-pdf-downloader
node-gmail-pdf-downloader

## Install packages
```bash
$ git clone git@github.com:lucaskatayama/node-gmail-pdf-downloader.git
$ cd node-gmail-pdf-downloader/
$ npm install
``` 

## Get Google OAuth API token
1. Follow **STEP 1** from here: [https://developers.google.com/gmail/api/quickstart/nodejs](https://developers.google.com/gmail/api/quickstart/nodejs).

2. Copy **client_secret.json** to the same folder of the project

## Running

Run authorization command:
```bash
$ node index.js -a
```
Follow instructions

Download PDF attachments based on a query **q**:
```bash
$ node index.js -d -q <query>
```
