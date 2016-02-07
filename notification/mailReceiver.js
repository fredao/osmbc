"use strict";

var path          = require('path');
var config        = require('../config.js');
var should        = require('should');
var async         = require('async');
var debug         = require('debug')('OSMBC:notification:mailReceiver');
var nodemailer    = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var EmailTemplate = require('email-templates').EmailTemplate;

var messageCenter = require('../notification/messageCenter.js');
var messageFilter = require('../notification/messageFilter.js');
var articleModule = require('../model/article.js');
var blogModule = require('../model/blog.js');
var logModule  = require('../model/logModule.js');

var htmlToText = require('html-to-text');




var infoMailtemplateDir = path.join(__dirname, '..','email', 'infomail');
var infomail = new EmailTemplate(infoMailtemplateDir);

var infoMailBlogtemplateDir = path.join(__dirname, '..','email', 'infomailBlog');
var infomailBlog = new EmailTemplate(infoMailBlogtemplateDir);

var infoMailInfotemplateDir = path.join(__dirname, '..','email', 'infomailInfo');
var infomailInfo = new EmailTemplate(infoMailInfotemplateDir);

var welcomeMailtemplateDir = path.join(__dirname, '..','email', 'welcome');
var welcomemail = new EmailTemplate(welcomeMailtemplateDir);

var transporter = nodemailer.createTransport(smtpTransport(config.getValue("SMTP")));

var layout = {
  htmlroot : config.getValue("htmlroot"),
  url: config.getValue("url")
};



function sendMailWithLog(mailOptions,callback) {
  transporter.sendMail(mailOptions,function logMail(error,info){
    debug("logMail");
    var logObject = {
      table:"mail",
      to:mailOptions.to,
      subject:mailOptions.subject,
      text:mailOptions.text,
      error:error,
      response:(info)?info.response:"no response"
    };
    if (error) {
      logModule.log(logObject,function cb(){
        return callback();
      });
    } else {
      logModule.log(logObject,callback);
    }
  });
}
function MailReceiver(user) {
  debug("MailReceiver::MailReceiver");
  this.user = user;
}

MailReceiver.prototype.sendWelcomeMail = function sendWelcomeMail(inviter,callback) {
  debug("MailReceiver::sendWelcomeMail");


  var self = this;
  var data = {user:this.user,inviter:inviter,layout:layout};

  welcomemail.render(data, function (err, results) {
    if (err) return console.dir(err);
    //console.dir(self.user);
    results.text = htmlToText.fromString(results.html); 

    var mailOptions = {
        from: config.getValue("EmailSender"), // sender address 
        to: self.user.emailInvalidation, // list of receivers 
        subject: "Welcome to OSMBC", // Subject line 
        text: results.text,
        html: results.html
    };
     
    // send mail with defined transport object 
    sendMailWithLog(mailOptions,callback);
  }); 
};

MailReceiver.prototype.sendLanguageStatus = function sendLanguageStatus(user,blog,lang,status,callback) {
  debug("MailReceiver::sendLanguageStatus");

  var self = this;


  var subject = blog.name +"("+lang+") has been reviewed by user "+user.OSMUser;
  if (status === "startreview") {
    subject = blog.name +"("+lang+") review has been started";
  }
  if (status === "markexported") {
    subject = blog.name + "("+lang+") is exported to WordPress";
  }
  var data = {user:user,blog:blog,status:status,lang:lang,layout:layout};

  infomailInfo.render(data, function infomailRenderBlog(err, results) {
    debug('infomailRenderInfo');
    if (err) return console.dir(err);
    results.text = htmlToText.fromString(results.html); 

    var mailOptions = {
        from: config.getValue("EmailSender"), // sender address 
        to: self.user.email, // list of receivers 
        subject: subject, // Subject line 
        text: results.text,
        html: results.html
    };
     
    // send mail with defined transport object 
    sendMailWithLog(mailOptions,callback);
  });
};

MailReceiver.prototype.updateArticle = function updateArticle(user,article,change,callback) {
  debug("MailReceiver::updateArticle");

  should(typeof(change)).eql("object");
 

  var self = this;
  var newArticle = articleModule.create();
  var k;
  for (k in article) {
    newArticle[k] = article[k];
    if (change[k]) newArticle[k] = change[k];
  }
  for (k in change) {
    newArticle[k] = change[k];
  }


  var subject;
  var logblog = article.blog;
  if (change.blog) logblog = change.blog;

  if (!article.collection && change.collection) {
     subject = logblog + " added collection";
  }
  if (article.collection && change.collection) {
     subject = logblog + " changed collection";
  }
  if (!article.comment && change.comment) {
     subject = logblog + " added comment";
  }
  if (article.comment && change.comment) {
     subject = logblog + " changed comment";
  }


  var data = {user:this.user,changeby:user,article:article,newArticle:newArticle,layout:layout,logblog:logblog};

  infomail.render(data, function infomailRender(err, results) {
    debug('infomailRender');
    if (err) return console.dir(err);
    results.text = htmlToText.fromString(results.html); 

    var mailOptions = {
        from: config.getValue("EmailSender"), // sender address 
        to: self.user.email, // list of receivers 
        subject: subject, // Subject line 
        text: results.text,
        html: results.html
    };
     
    // send mail with defined transport object 
    sendMailWithLog(mailOptions,callback);
  });
};


MailReceiver.prototype.updateBlog = function updateBlog(user,blog,change,callback) {
  debug("MailReceiver::updateBlog");


  var self = this;
  var newBlog = blogModule.create();
  var k;
  for (k in blog) {
    newBlog[k] = blog[k];
    if (change[k]) newBlog[k] = change[k];
  }
  for (k in change) {
    newBlog[k] = change[k];
  }


  var subject;
  var blogName = blog.name;
  if (change.name) blogName = change.name;

  if (!blog.name && change.name) {
     subject = blogName + " was created";
  } else  {
     subject = blogName + " changed status";
  }
 

  var data = {user:this.user,changeby:user,blog:blog,newBlog:newBlog,layout:layout,blogName:blogName};

  infomailBlog.render(data, function infomailRenderBlog(err, results) {
    debug('infomailRenderBlog');
    if (err) return console.dir(err);
    results.text = htmlToText.fromString(results.html); 

    var mailOptions = {
        from: config.getValue("EmailSender"), // sender address 
        to: self.user.email, // list of receivers 
        subject: subject, // Subject line 
        text: results.text,
        html: results.html
    };
     
    // send mail with defined transport object 
    sendMailWithLog(mailOptions,callback);
  });
};
var userReceiverMap = {};


function MailUserReceiver() {
  debug('MailUserReceiver::MailUserReceiver');
}

MailUserReceiver.prototype.sendLanguageStatus = function sendLanguageStatus(user,blog,lang,status,callback) {
  debug('MailUserReceiver.prototype.sendLanguageStatus');
  async.forEachOf(userReceiverMap,function(value,key,cb) {
    value.sendLanguageStatus(user,blog,lang,status,cb);
  },function(err) {
    return callback(err);
  });
};

MailUserReceiver.prototype.updateArticle = function murUpdateArticle(user,article,change,callback) {
  debug('MailUserReceiver.prototype.updateArticle');
  async.forEachOf(userReceiverMap,function(value,key,cb) {
    debug('forEachOf'+key);
    value.updateArticle(user,article,change,cb);
  },function(err) {
    return callback(err);
  });
};
MailUserReceiver.prototype.updateBlog = function murUpdateBlog(user,blog,change,callback) {
  debug('MailUserReceiver.prototype.updateBlog');
  async.forEachOf(userReceiverMap,function(value,key,cb) {
    debug('forEachOf'+key);
    value.updateBlog(user,blog,change,cb);
  },function(err) {
    return callback(err);
  });
};

MailUserReceiver.prototype.sendInfo = function sendInfo(data,cb) {
  debug("MailUserReceiver.prototype.sendInfo");
  return cb();
};


function initialise(userList) {
  debug('initialise');
  userReceiverMap = {};
  for (var i=0;i<userList.length;i++) {
    var u = userList[i];
    if (u.access !== "full") continue;
    if (!u.email) return;
    if (u.email === "") return;
    userReceiverMap[u.OSMUser] = new messageFilter.UserConfigFilter(u,new MailReceiver(u));
  }
}

messageCenter.global.registerReceiver(new MailUserReceiver());

function updateUser(user) {
  debug('updateUser');
  delete userReceiverMap[user.OSMUser];
  if (user.access !== "full") return;
  if (!user.email) return;
  if (user.email === "") return;
  userReceiverMap[user.OSMUser] = new messageFilter.UserConfigFilter(user,new MailReceiver(user));
}


module.exports.MailReceiver = MailReceiver;
module.exports.initialise = initialise;
module.exports.updateUser = updateUser;

module.exports.for_test_only= {transporter:transporter};

 
// setup e-mail data with unicode symbols 