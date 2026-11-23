import { handleRequest } from '../app.js';

export default function atlas(req,res) {
  const url = new URL(req.url,'http://localhost');
  if (url.pathname === '/api/atlas') {
    const path = url.searchParams.get('atlasPath');
    if (path && /^[\w/-]+$/.test(path)) {
      url.searchParams.delete('atlasPath');
      req.url = '/api/'+path+url.search;
    }
  }
  return handleRequest(req,res);
}
