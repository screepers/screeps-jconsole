'use strict';

const sockjs = require('sockjs-client');
const request = require('request');
const colors = require('colors');
const moment = require('moment');

let sock = new sockjs('https://screeps.com/socket');
let config = require('./console.json');
let id;

sock.onopen = function () {
    console.log('Socket connection opened, attempting to authenticate.'.yellow);
    let auth = {
        url: 'https://screeps.com/api/auth/signin',
        json: true,
        body: {
            email: config.user,
            password: config.password
        }
    };
    request.post(auth, function (err, httpResponse, body) {
        let token = body.token;
        let info = {
            url: 'https://screeps.com/api/auth/me',
            json: true,
            headers: {
                'X-Token': token,
                'X-Username': config.user,
            },
        };
        request.get(info, function (err, httpResponse, body) {
            sock.send('auth ' + token);
            id = body._id;
        });
    });
};
sock.onmessage = function (message) {
	var dateFormat = 'MM-DD HH:mm:ss';
	
    try {
        if(message.data.indexOf('auth ok') > -1) {
            sock.send('subscribe user:' + id + '/console');
            console.log(('Subscribed to console as '+ config.user).green);
        }
        
        let json;
        if(message.data[1]) {
            json = JSON.parse(message.data);
        }

        if(json[1]) {
            if(json[1].messages) {
                let messages = json[1].messages;
                if(messages.log) {
                    for(let log of messages.log) {
                        let when = moment(message.timeStamp);
						
                        if ( contains(log, ['danger', 'error']) ) {						
                            console.log(('[' + when.format(dateFormat) + ']').gray, log.red);
                        } else if ( contains(log, ['warning', 'problem']) ) {	
                            console.log(('[' + when.format(dateFormat) + ']').gray, log.yellow);
                        } else {
                            console.log(('[' + when.format(dateFormat) + ']').gray, log.white);							
                        }
                    }
                    for(let result of messages.results) {						
                        console.log(result);
                    }
                }
            } else if(json[1].error) {
                console.log(json[1].error.red);
            }
        }

    }
    catch (e) {
    }
};
sock.onclose = function () {
    console.log('Console connection closed.'.yellow);
    sock = new sockjs('https://screeps.com/socket');
};

var contains = function(str, array) {
	var search = str.toLowerCase();
	for ( var i = 0; i < array.length; i++ ) {
		if ( search.indexOf(array[i].toLowerCase()) >= 0 ) return true;
	}
	return false;
};