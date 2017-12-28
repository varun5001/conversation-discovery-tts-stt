/*eslint-disable unknown-require */
'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var request = require('request'); // request module
var DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
var Conversation = require('watson-developer-cloud/conversation/v1');
var watson = require('watson-developer-cloud');
var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());


var vcap = JSON.parse(process.env.VCAP_SERVICES);
//var weatherCompanyEndpoint = vcap.weatherinsights[0].credentials.url;
var sttEndpoint = vcap.speech_to_text[0].credentials.url;
var ttsEndpoint = vcap.text_to_speech[0].credentials.url;
// Create the service wrapper
var conversation = new Conversation({
	// If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
	// After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
	// username: '<username>',
	// password: '<password>',
	url: 'https://gateway.watsonplatform.net/conversation/api',
	version_date: '2016-10-21',
	version: 'v1'
});

//speech to text credentials
var stt_credentials = Object.assign({
	username: process.env.SPEECH_TO_TEXT_USERNAME || '<username>',
	password: process.env.SPEECH_TO_TEXT_PASSWORD || '<password>',
	url: process.env.SPEECH_TO_TEXT_URL || 'https://stream.watsonplatform.net/speech-to-text/api',
	version: 'v1',
}, vcap.speech_to_text[0].credentials);

//text to speech credentials
var tts_credentials = Object.assign({
	username: process.env.TEXT_TO_SPEECH_USERNAME || '<username>',
	password: process.env.TEXT_TO_SPEECH_PASSWORD || '<password>',
	url: process.env.TEXT_TO_SPEECH_URL || 'https://stream.watsonplatform.net/text-to-speech/api',
	version: 'v1',
}, vcap.text_to_speech[0].credentials);

//discovery credentials

var discovery = new DiscoveryV1({
	username: process.env.DISCOVERY_USERNAME,
	password: process.env.DISCOVERY_PASSWORD,
	version_date: process.env.DISCOVERY_VERSION_DATE
});

var params = {
	environment_id: process.env.DISCOVERY_ENIVORNMENT_ID,
	collection_id: process.env.DISCOVERY_COLLECTION_ID,
	natural_language_query: undefined,
	count: 1
};


/*
 * Function to update conversation dialog
 */
/*
function updateConversation(intent_update, output_rnr) {
	console.log('inside rip');
	console.log('intent:' + intent_update);
	console.log('output_rnr:' + output_rnr);
	var headers_conv = {
		'Content-Type': 'application/json',
		'Accept': 'application/json',
		'Authorization': 'Basic YWFjZWU2MTgtOTEwMS00N2NhLWEzZGQtMzBhOGJmMWMxZGMyOnQ3SW1XSkxrODJ4bQ=='
	};
	var dataString = '{ "output": { "text": {  "values": [' + output_rnr + '], "selection_policy": "sequential" }  }  }';
	var options_conv = {
		url: 'https://watson-api-explorer.mybluemix.net/conversation/api/v1/workspaces/ce88aa87-ad00-4d17-81e6-aa3d697b7765/dialog_nodes/' + intent_update + '?version=2017-05-26',
		method: 'POST',
		headers: headers_conv,
		body: dataString
	};

	function callback_conv(error, response, body) {
		if (!error && response.statusCode === 200) {
			console.log(body);
		} else {
			console.log('response body:' + response.body);
			console.log('error' + error);
		}
	}
	request(options_conv, callback_conv);
}
*/
app.post('/api/message', function(req, res) {
	var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
	if (!workspace || workspace === '<workspace-id>') {
		return res.json({
			'output': {
				'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable.'
			}
		});
	}
	var payload = {
		workspace_id: workspace,
		context: req.body.context || {},
		input: req.body.input || {}
	};

	// Send the input to the conversation service
	conversation.message(payload, function(err, data) {
		if (err) {
			return res.status(err.code || 500).json(err);
		}
		var response = data;
		var result = '';
		//build response when conversation is intiated
		if (!response.output) {
			response.output = {};

		} else {
			if (response.intents.length > 0) {
				var nodeID = '';
				var question = undefined;
				var entity = undefined;

				/*
				 * Dont send question to discovery if it is welcome node or intent is greeting in middle of conversation
				 * validate dialog node to send request to discovery service
				 */
				if (response.output.nodes_visited[0] === 'node_1_1504802492380') {

					question = response.input.text;
					params.natural_language_query = question;


					if (response.entities.length > 0) {
						entity = response.entities[0].value;
						params.natural_language_query = entity + ' ' + question;

					}
				}
				discovery.query(params, function(error, searchResponse) {
					if (error) {
						console.log('Error searching documents: ' + error);
					} else {
						if (JSON.stringify(searchResponse.matching_results) !== '0' && params.natural_language_query) {
							result = searchResponse.results[0].body;
							//score = searchResponse.results[0].result_metadata.score;
							response.output.text[0] = '';
						} else {
							result = '';
						}
						//add target attribute to all anchor tags in response
						result = result.replace(/<a /g, '<a target="blank" ');
						response.output.text[0] = result + response.output.text[0];
						//set question and entity after processing every request
						question = undefined;
						entity = undefined;
						params.natural_language_query = undefined;
						return res.json(response);
					}

				});


			} else {
				return res.json(response);
			}

		}

	});
});



// Text-to-Speech Integration
app.get('/api/text-to-speech/token', function(req, res, next) {
	watson.authorization(tts_credentials).getToken({
		url: tts_credentials.url
	}, function(error, token) {
		if (error) {
			console.log(error);
			if (error.code !== 401)
				return next(error);
		} else {
			res.send(token);
		}
	});
});

//Speech-to_text Integration
app.get('/api/speech-to-text/token', function(req, res, next) {
	watson.authorization(stt_credentials).getToken({
		url: stt_credentials.url
	}, function(error, token) {
		if (error) {
			console.log(error);
			if (error.code !== 401)
				return next(error);
		} else {
			res.send(token);
		}
	});
});

module.exports = app;