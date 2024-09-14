const http = require('http');
const uuid = require('uuid');
const Koa = require('koa');
const cors = require('koa2-cors')
const Router = require('koa-router');
const koaBody = require('koa-body').default;
const WS = require('ws');

const app = new Koa();

const contacts = [];

class Clients {
  constructor(id, name, active, status = true) {
    this.id = id;
    this.name = name;
    this.active = active;
    this.status = status;
    this.msg = [];
  }
}

app.use(koaBody({
  text: true,
  urlencoded: true,
  multipart: true,
  json: true,
}));


function createMsg(userId, created, message) {
  return ({ userId, created, message });
}


app.use(
  cors({
    origin: '*',
    credentials: true,
    'Access-Control-Allow-Origin': true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

const router = new Router();

router.get('/contacts', async (ctx, next) => {
  ctx.response.body = contacts;
});
router.post('/contacts', async (ctx, next) => {
  contacts.push({ ...ctx.request.body, id: uuid.v4() });
  ctx.response.status = 204
});
router.put('/contacts', async (ctx, next) => {
  const index = contacts.findIndex((item) => item.active === true || item.active === 'true');
  contacts[index].active = false;

  ctx.response.status = 204
});
router.delete('/contacts/:id', async (ctx, next) => {
  const index = contacts.findIndex(({ id }) => id === ctx.params.id);
  if (index !== -1) {
    contacts.splice(index, 1);
  };
  ctx.response.status = 204
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws, req) => {

  const errCallback = (err) => {
    if (err) {
      throw new Error(err);
    }
  }

  ws.on('message', msg => {
    const request = JSON.parse(msg);

    if (request.event === 'createMessage') {
      const index = contacts.findIndex((item) => item.id === request.createMsg.idUser);
      contacts[index].msg.push(request.createMsg);
    }

    if (request.event === 'disableUser') {
      const index = contacts.findIndex((item) => item.id === request.removeId);
      if (index !== -1) {
        contacts.splice(index, 1);
      };
    }

    const data = JSON.stringify(
      {
        event: 'updateChat',
        message: contacts,
      }
    )
    ws.send(data);
  });

  ws.send('welcome', errCallback);
});

server.listen(port, () => console.log('Server started'));