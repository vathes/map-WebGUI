const express = require('express');
const config = require('./config')
const fs = require('fs');
const util = require('util');
const bodyParser = require('body-parser');
const request = require('request');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const checkAuth = require('./middleware/check-auth');
// const serveStatic = require('serve-static')

const app = express();
app.use(bodyParser.json());


const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
// const readImage = util.promisify(fs.createReadStream)

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    next();
})
// app.use(express.static(path.join(__dirname + '/test')));

// configure backend address
flask_backend = process.env['PY_BACKEND'] || 'http://localhost:5000'


// app.use([checkAuth, serveStatic('static/plotImg')])


// =============================== login logic ================================= //
app.post('/login', (req, res) => {
    if (req.body.username === config.demoUsername && req.body.password === config.demoPassword) {
        const token = jwt.sign({username: req.body.username},
                                config.jwtSecret,
                                { expiresIn: "24h"});
        res.status(200).send({ message: 'successful login', token: token, expiresIn: 24 * 60 * 60 * 1000}); //return in millisec
    } else {
        // res.status(401).send({message : 'failed login'})
        res.status(200).send({ message: 'failed login' }) // frontside doesn't seem to receive the message sent back in 401 status thus the 200 status here - TO REVISIT
    }
    
});

// ======================== getting info from flask server ========================== //
app.get('/sessions', checkAuth, (req, res) => {
    // console.log('req.headers is', req.headers)
    // setup for proxy server
    var options = {
        // hostname: '127.0.0.1/',
        hostname: flask_backend.split(':')[1].split('//')[1],
        port: parseInt(flask_backend.split(':')[2]),
        path: 'v0/_q/sessionpage/?__order=session_date', //'v0/session',
        method: req.method,
        headers: req.headers
    };

    var proxy = http.request(options, function (proxy_res) {
        res.writeHead(proxy_res.statusCode, proxy_res.headers)
        proxy_res.pipe(res, {
            end: true
        });
    });

    // console.log(res)

    req.pipe(proxy, {
        end: true
    });
})

app.post('/sessions', checkAuth, (req, res) => {
    // request.post(flask_backend + '/v0/_q/sessionpage', { form: req.body }, function (error, httpResponse, body) {

    request.post(flask_backend + '/v0/_q/sessionpage', { form: req.body }, function (error, httpResponse, body) {
        if (error) {
            console.error('error: ', error);
            console.log('httpResponse:', httpResponse)
        }
        // console.log(body);
        res.send(body);
    })
})


// app.post('/mice', checkAuth, (req, res) => {
//     request.post(flask_backend + '/v0/_q/subjpage', {form: req.body}, function(error, httpResponse, body) {
//         if (error) {
//             console.error('error: ', error);
//         }

//         res.send(body);
//     })
// })



app.post('/plot/probeInsertions', checkAuth, (req, res) => {
    console.log('requesting for probe insertions');
    request.post(flask_backend + '/v0/_q/probe_insertions', { form: req.body }, function (error, httpResponse, body) {
        if (error) {
            console.error('error: ', error);
        }
        res.send(body);
    })
})

app.post('/plot/units', checkAuth, (req, res) => {
    request.post(flask_backend + '/v0/_q/units', { form: req.body }, function (error, httpResponse, body) {
        if (error) {
            console.error('error: ', error);
        }
        res.send(body);
    })
})

app.post('/plot/cluster', checkAuth, (req, res) => {
    const timeX = new Date()
    console.log('requesting cluster list: ', timeX);
    request.post(flask_backend + '/v0/_q/clusternavplot', { form: req.body }, function (error, httpResponse, body) {
        if (error) {
            console.error('error: ', error);
        }
        const timeY = new Date()
        console.log('cluster list took ', timeY - timeX, ' ms')
        res.send(body);
    })
})

app.post('/plot/probeTracks', checkAuth, (req, res) => {
    request.post(flask_backend + '/v0/_q/project_probe_tracks', { form: req.body }, function (error, httpResponse, body) {
        if (error) {
            console.error('error: ', error);
        }
        res.send(body);
    })
})




//Docker Healthcheck
app.get('/version', (req, res, next) => {
    res.send('Version: v1.0');    
});

// ============================================================= //


module.exports = app;
