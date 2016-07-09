var fs = require('fs');
var crypto = require('crypto');
var chalk = require('chalk');
var argv = require('minimist')(process.argv.slice(2));


var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var Gmail = require('node-gmail-api')

var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
var TOKEN_PATH = './token.json';


function help(){
  process.stdout.write(chalk.blue('Please follow ')+chalk.red('STEP 1')+chalk.blue(' here\n')); process.stdout.write('https://developers.google.com/gmail/api/quickstart/nodejs\n');
  process.stdout.write(chalk.blue('And copy client_secret.json here\n'));
  process.stdout.write('\n\n');
  process.stdout.write('Execute with -a for authorization');
  process.stdout.write('\n\n');
  process.stdout.write('Than with -d for download and -q to query');
  process.exit(0);
}
if(argv.h){
  help();
  process.exit(0);
}

if(argv.a){
  if(!fs.existsSync('client_secret.json')){
    help();
    process.exit(1);
  }

  if(fs.existsSync(TOKEN_PATH))
    fs.unlinkSync(TOKEN_PATH);

  fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    authorize(JSON.parse(content), function(){
      process.exit(0);
    });
  });
}

if(argv.d && argv.q){
  if(!fs.existsSync('client_secret.json')){
    help();
    process.exit(0);
  }
  else{
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
      if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
      }
      var credentials = JSON.parse(content);
      var clientSecret = credentials.installed.client_secret;
      var clientId = credentials.installed.client_id;
      var redirectUrl = credentials.installed.redirect_uris[0];
      var auth = new googleAuth();
      var token = fs.readFileSync(TOKEN_PATH, 'utf8');
      var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
      oauth2Client.credentials = JSON.parse(token);
      run(oauth2Client);
    });
  }
}



function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    }
  });
}

function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

function storeToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}


function getMeta(data){
  var f = ['Date', 'Subject', 'From']
  var meta = {};
  data.payload.headers.filter((h)=> f.indexOf(h.name) != -1).forEach((h) => {
    meta[h.name] = h.value;
  });
  return meta;
}



function run(auth) {
  var gmailAPI = google.gmail('v1');
  var gmail = new Gmail(auth.credentials.access_token);
  var s = gmail.messages(`has:attachment ${argv.q}`, {max: 9999999})
  var count = 0;
  if(!fs.existsSync('./files'))
    fs.mkdirSync('./files');
  s.on('data', function (d) {
    var parts = d.payload.parts.filter((me) => me.mimeType == 'application/pdf' );
    if(!parts || parts.length == 0 || !parts[0].body){
    }
    else {
      var meta = getMeta(d);
      parts.forEach(function(part, i){
        var metaCopy = JSON.parse(JSON.stringify(meta));
        count++;
        metaCopy['index'] = i;
        metaCopy['counter'] = count;
        var filename = part.filename;
        process.stdout.write(`DOWNLOADING ${filename}\n`)
        var aId = part.body.attachmentId;
        var mId = d.id;
        var params = {
          auth :auth,
          id : aId,
          messageId: mId,
          userId: 'me'
        };
        gmailAPI.users.messages.attachments.get(params, function(err, me){
          if(err){
            console.log(err);
          }
          else {
            var buf = Buffer.from(me.data, 'base64');
            metaCopy['filename'] = filename;
            var hash = crypto.createHash('sha256').update(JSON.stringify(metaCopy)).digest('hex');
            fs.writeFileSync(`./files/${hash}.pdf`, buf,  "binary");
            fs.writeFileSync(`./files/${hash}.txt`, JSON.stringify(metaCopy),  "utf8");
          }
        });
      });

    }
  });

  s.on('end', function(){
    process.stdout.write(`FINISHED ${count}\n`);
  });
}
