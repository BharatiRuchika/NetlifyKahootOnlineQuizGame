require('dotenv').config()

const express = require('express')
    ,session = require('express-session')
    ,jwt = require("jsonwebtoken")
    ,passport = require('passport')
    ,Auth0Stratagy = require('passport-auth0')
    ,massive = require('massive')
    ,bodyParser = require('body-parser')
    ,{Quiz} = require('./utils/quiz')

  const {
    SERVER_PORT,
    SESSION_SECRET,
    DOMAIN,
    CLIENT_ID,  
    CLIENT_SECRET,
    CALLBACK_URL,
    CONNECTION_STRING,
    FRONTEND_URL
} =  process.env;

var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require("cors");
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var addQuizRouter = require('./routes/addQuiz');
var quizQuestionsRouter = require('./routes/quizQuestions');
// const http = require("http");
var mongo = require("./connection");
const { Socket } = require('socket.io');
mongo.connect();

var app = express();
app.use(function (req, res, next) {
  
  res.setHeader('Access-Control-Allow-Origin', "http://localhost:3000","https://vercel.com");
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type Accept');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});
const corsOptions = {
  origin: true,
  credentials: true,
};

app.use(cors(corsOptions));
const  {createServer}  = require("http");
const {Server} = require("socket.io");
const httpServer = createServer(app);
const io = new Server(httpServer,{
  cors: {
    origin: true,
    credentials:true,      
    optionSuccessStatus:200
  }}
  );
const users = {};
var clients = {};
var hosts={};
var socketArray=[];
var hostObject={};
var hostArray=[];
var host=0;
io.on('connection', socket => {
 console.log("socketid",socket.id);
  console.log("connection established");
  socket.on('host-join', (data) => {
  host++;
  console.log("host",host);
  console.log("socketId",socket.id);
  hostArray.push(socket.id);
  console.log("hostArray",hostArray);
  console.log("host join");
  console.log("data",data);
  var selectedPin = data.pin;
  io.sockets.emit('host-joined',{id:socket.id})
  socket.join(selectedPin);  
})
  
    socket.on('player-joined', (data) => {
    users[socket.id] = socket.id;
    console.log("player joined");
    console.log("data",data);
    console.log("player",socket.id);
    var nickname = data.nickname;
    console.log("nickname",nickname);
    var selectedPin = data.selectedPin;
    console.log("SelectedPin",selectedPin);
    socket.join(selectedPin);
  })
 socket.on('player-add', (data)=> {
  console.log("player add");
  var pin = parseInt(data.selectedPin);
  console.log("selectedpin",typeof pin);
  console.log("player_data",data.nickname);
  console.log("player_data",socket.id);
  io.sockets.emit("hello");
  io.sockets.emit('room-joined', {name: data.nickname, id: socket.id,pin:data.selectedPin});
})

  socket.on('question-over', (data) => {
    console.log("question over call");
    console.log("pin",data.pin);
    io.sockets.emit('question-over');
  })
    socket.on('next-question', (data) => {
    console.log("next question called");
    console.log("pin",data);
    // socket.to(`${data.pin}`).emit('next-question');
    io.sockets.emit('next-question');
})
  socket.on('question-answered', (data) => {
    console.log("question answered called");
    console.log("pin",data.pin);
    console.log("data",data);
    io.sockets.emit('player-answer', {name : data.name, answer: data.answer})
  })
  socket.on('sent-info', (data) => {
    console.log("sent-info called");
    console.log("data",data);
    var new_id = data.id+""+data.pin;
    io.to(data.id).emit('sent-info', {answeredCorrect: data.answeredCorrect, score: data.score});
})
socket.on("game-over",()=>{
  io.sockets.emit('game-over')
})

socket.on('end', function (pin){
  console.log("socket disconnect");
  console.log("socketId",socket.id);
  const user = removeUser(socket.id);
  var getusers = getUsersInRoom(pin);
  console.log("users",getusers);
  socket.disconnect();
   
});
socket.on('destroy', function (data) {
  console.log("data",data);
  console.log('A user disconnected');
  io.sockets.emit('left', {id:socket.id});
  socket.leave(data); 
});
socket.on("pin-entered",(pin)=>{
  console.log("pin entered called");
  console.log(hostArray);
  console.log("pin",pin);
  socketArray.push(socket.id);
  var id = socketArray[0];
  if(host>=1){
    var i = 0;
  hostArray.map(hostId=>{
    console.log("im here");
    i++;
    console.log("i",i);
    console.log("lengty",hostArray.length);
    io.to(`${hostId}`).emit("pin-checked",{pin:pin,len:hostArray.length,clen:i});
  })
}else{
  console.log("im here");
  io.to(`${id}`).emit('host_presence');
}
})
    socket.on("valid",(valid)=>{
      console.log("valid called",valid);
      console.log("socketArray",socketArray);
      var id = socketArray[0];
      console.log("id",id);
      io.to(`${id}`).emit('valid',valid);
      socketArray=[];
    })
    socket.on("disconnect",function(){
      if(hosts[socket.id]==socket.id){
      host--;
    }
    io.sockets.emit('left',{id:socket.id})
  })
})



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// app.get('/',(req,res)=>{
//   console.log(res.send("App is working fine"));
// })

if (process.env.NODE_ENV === "production") {
  const path = require("path");
  app.use(express.static(path.join(__dirname, "client/build")));
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'))
  })
}

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use((req,res,next)=>{
  console.log("im here");
  const token = req.headers["auth-token"];
  console.log("token",token);
  if(token){
    console.log("im here also");
    try{
    req.user = jwt.verify(token,"GUvi!jdks");
    // console.log("users",user);
    next();
    }catch(err){
      res.sendStatus(401);
    }
  }else{
    res.sendStatus(401);
  }
  
})
app.use('/quiz', addQuizRouter);
app.use('/quizquestions',quizQuestionsRouter);
// catch 404 and forward to error handler
//console.log("port",process.env.HTTP_PORT)
const PORT = process.env.PORT||3001;
console.log(PORT);




httpServer.listen(PORT, () => {
 console.log("s Is Running Port: " + PORT);
});
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
