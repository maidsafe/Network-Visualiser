var logService = require('./service/LogService.js')

var saveLogs = 	function(req, res){
	logService.saveLog(req, res)
}

var search = function(req, res){
	logService.searchLog(req, res)
}

var getActiveVaults = 	function(req, res){
	logService.getActiveVaults(req, res)
}

var clearDB = 	function(req, res){
	logService.clearAll(req, res)
}

var history = function(req, res){
	logService.vaultHistory(req, res)
}

exports.register = 	function(server){
	server.post('/log', saveLogs);
	server.get('/vaults', getActiveVaults);
	server.get('/clearLogs', clearDB);
	server.get('/history', history);
	server.get('/search', search);
}