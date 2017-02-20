var http = require('http');
var fs = require('fs');
var xmlreader = require('xmlreader');

var viewLog = fs.createWriteStream('view.log', {flags: 'a'});

var login = function(req, res, abs_path, callback){
    var oa_ticket = req.cookies.TCOA_TICKET || '' 
    var ticket = oa_ticket || (req.query && req.query.ticket) || '';

    var d = new Date();
    var _time = [d.getFullYear(), d.getMonth()+1, d.getDate()].join('-') + ' ' + [d.getHours(), d.getMinutes(), d.getSeconds()].join(':') + ' ' ;
    //todo needmorei
    oa_ticket && viewLog.write(_time + oa_ticket + '\n\n');


    var username = req.session.username ;
    if (username) {
        callback(null, username)
        return  ;
    }


	if(ticket){
		var targetNamespace="http://indigo.oa.com/services/";
		var data ='<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><DecryptTicket xmlns="http://indigo.oa.com/services/"><encryptedTicket>'+ticket+'</encryptedTicket></DecryptTicket></soap:Body></soap:Envelope>';
		var options = {  
			host:'login.oa.com',  
			hostname: '',  
			port: '80',  
			path: '/services/passportservice.asmx?WSDL',  
			method: 'POST',  
			headers: {
			   "Host":"login.oa.com",  
			   "Content-Type": "text/xml; charset=utf-8",  
			   "SOAPAction": 'http://indigo.oa.com/services/DecryptTicket',  
			   "Content-Length": data.length  
			}  
		};  
		var dataReq = http.request(options, function(dataRes) {  
		 	dataRes.setEncoding('utf8');  
		 	dataRes.on('data', function (chunk) { 
		  		if(dataRes.statusCode==200){
		  			xmlreader.read(chunk, function(errors, response){
						//if(null !== errors ){ return; }
					 	var loginName = response['soap:Envelope']['soap:Body']['DecryptTicketResponse']['DecryptTicketResult']['LoginName'].text();
                        if (loginName) { req.session.username = loginName }
                        callback(errors, loginName);
					});  
		  		}
		 	});  
		});  
		dataReq.on('error', function(e) {  
            callback(e)
			//console.log('problem with request: ' + e.message);  
		});  
		dataReq.write(data);  
		dataReq.end();
	}else{
        callback(null, '')
		//var signinUrl = 'http://login.oa.com/modules/passport/signin.ashx?url={yourWebsite}';
		//var homeUrl = req.protocol + "://" + req.get('host') + abs_path;	
		//signinUrl = signinUrl.replace('{yourWebsite}', encodeURIComponent(homeUrl));	
		//res.redirect(signinUrl);
	}
}

module.exports = login ;
