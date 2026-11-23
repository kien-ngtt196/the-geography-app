import http from 'node:http';
import { cleanExpired, handleRequest } from './app.js';
import { closeStorage } from './storage.js';

const cleanup = setInterval(()=>cleanExpired().catch(error=>console.error(error.code || error.name)),600000).unref();
export const server = http.createServer(handleRequest);
server.listen(Number(process.env.PORT || 3000),process.env.HOST || '127.0.0.1',()=>{
  const {address,port} = server.address();
  console.log('Địa lí Việt Nam · http://'+address+':'+port);
});
server.once('close',()=>{
  clearInterval(cleanup);
  closeStorage().catch(error=>console.error(error.code || error.name));
});
process.once('SIGTERM',()=>server.close());
