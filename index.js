const http = require("http");
const express = require("express");
const app = express();
const path = require("path");
const port = 8080;
const vocab = require('./public/vocab.json');
const server = http.createServer(app);
var io = require("socket.io")(server);

app.use(express.static('public'));
app.set('view engine', 'ejs');

io.on('connect', socket => {
    console.log('client connected');
    socket.on('comment', (data) => {
        // socket.broadcast.emit('remoteContent', data); => for reel tchat
        socket.emit('remoteContent', data);
    });
});

app.use(express.json());

// get vocab for spam model from server
app.get('/vocab', (req, res, next) => {
    res.status(200).json(vocab);
});

app.use('/', (req, res) => {
    res.render('index');
});

const listener = server.listen(port, () => { 
    console.log(`listening on port ${port}`);
});