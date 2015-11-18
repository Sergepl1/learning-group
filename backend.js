/**
 * Created by Серёга on 12.07.2015.
 */
var http = require('http');

var userService = function(){
  var counter = 4;
  var users = [
    { id: '1', name: 'Illya Klymov', phone: '+380504020799', role: 'Administrator' },
    { id: '2', name: 'Ivanov Ivan', phone: '+380670000002', role: 'Student', strikes: 1 },
    { id: '3', name: 'Petrov Petr', phone: '+380670000001', role: 'Support', location: 'Kiev' }
  ];

  return {
    getUsers: function(){
      return users;
    },
    addUser: function(data) {
      var parsedData = JSON.parse(data);
      if(parsedData.role === '' || parsedData.role === undefined){
        parsedData.role = 'Student';
        parsedData.id = counter++;
        users.push(parsedData);
        return {user: parsedData, code: 204};
      } else if (parsedData.role === 'Admin' || parsedData.role === 'Administrator' || parsedData.role === 'Support')	{
        parsedData.id = counter++;
        users.push(parsedData);
        return {user: parsedData, code: 204};
      } else{
        return {user: null, code: 401};
      }
      return {user: null, code: 401};
    },
    removeUser: function(id) {
      var c;
      for (c = 0; c < users.length; c++) {
        if (+id === +(users[c].id)) {
          users.splice(c, 1);
          return true;
        }
      }
      return false;
    },
    updateUser: function(id, data) {
      var c;
      var user = JSON.parse(data);
      for (c = 0; c < users.length; c++) {
        if (+id === +users[c].id) {
          users[c].name = user.name;
          users[c].phone = user.phone;
          users[c].role = user.role;
          users[c].strikes = user.strikes;
          users[c].name = user.location;
          if(users[c].role === 'Admin' || users[c].role === 'Administrator'){
            return 204;
          }
          return 204;
        }
      }
      return 404;
    }
  }
};

var service = userService();
var flag = false;

var POST = function(request, response){
  var chunks = '';
  switch(request.url) {
    case '/api/users':
      request.on('data', function(data) {
        chunks += data;
      });
      request.on('end', function() {
        var retval = service.addUser(chunks);
        response.writeHead(retval.code, {'Content-Type': 'application/json'});
        if(retval.code === 204){
          response.end(JSON.stringify(retval.user));
        } else {
          response.end();
        }
      });
      break;
    default:
      request.on('data', function(data) {
        console.log('Received body data. URL: ' + request.url + ' was not processed, METHOD: POST');
        console.log(data.toString());
      });

      request.on('end', function() {
        // empty 200 OK response for now
        response.writeHead(404, {'Content-Type': 'application/json'});
        response.end('POST not found: ' + request.url);
      });
  };
};

var handleGET = function(request, response){
  console.log('#GET ' + request.url);
  switch(request.url) {
    case '/api/users':
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end(JSON.stringify(service.getUsers()));
      break;
    case '/refreshAdmins':
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end();
      break;
    default:
      console.log('Received get request. URL: ' + request.url + ' was not processed, METHOD: GET');
      response.writeHead(404, {'Content-Type': 'application/json'});
      response.end('GET not found: ' + request.url);
  };
};

var handleDELETE = function(request, response){

  if(request.url.indexOf('/api/users') === 0){
    var id = +(request.url.split("/")[3]);
    var deleted = service.removeUser(id);
    response.writeHead(deleted ? 204 : 404, {'Content-Type': 'application/json'});
    response.end();
  } else{
    console.log('Received delete request. URL: ' + request.url + ' was not processed, METHOD: DELETE');
    response.writeHead(404, {'Content-Type': 'application/json'});
    response.end('DELETE not found: ' + request.url);
  }
};

var PUT = function(request, response){

  if(request.url.indexOf('/api/users') === 0){
    flag = true;
    var id = +(request.url.split("/")[3]);
    var chunks = '';
    request.on('data', function(data) {
      chunks += data;
    });
    request.on('end', function() {
      var status = service.updateUser(id, chunks);
      response.writeHead(status, {'Content-Type': 'application/json'});
      response.end();
    });
  } else{
    console.log('Received delete request. URL: ' + request.url + ' was not processed, METHOD: DELETE');
    response.writeHead(404, {'Content-Type': 'application/json'});
    response.end('DELETE not found: ' + request.url);
  }
};

var enableCrossDomain = function(response){

  response.setHeader('Accept', '*/*');

  // Website you wish to allow to connect
  response.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  response.setHeader('Access-Control-Allow-Credentials', true);
}

var checkContentType = function(request, response){
  var contentType = request.headers['content-type'];
  //console.log(request.headers);
  if(request.method != 'OPTIONS' && request.method != 'GET' && request.url != '/refreshAdmins' && (contentType === undefined || contentType === '' || contentType != 'application/json')){
    if(flag) return true;
    console.log(request.headers);
    response.writeHead(401, {'Content-Type': 'application/json'});
    response.end();
    return false;
  }
  return true;
}

var handleReq = function(request, response){

  console.log(request.url + ' : ' + request.method);

  enableCrossDomain(response);
  if(checkContentType(request, response) === false){
    return;
  }
  if(request.method == 'POST'){
    POST(request, response);
  } else if(request.method == 'GET') {
    handleGET(request, response);
  } else if(request.method == 'PUT'){
    PUT(request, response);
  } else {
    if(request.method == 'DELETE'){
      handleDELETE(request, response);
    } else{
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end();
    }
  }
};

var server = http.createServer(function(req, res) {
  handleReq(req, res);
});

if (module.parent) { module.exports = server } else { server.listen(20007); }