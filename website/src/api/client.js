import axios from 'axios';
import { protectCheckout, deduplicateReads } from './requestSafety';
const client = axios.create({ baseURL: '/api/public', timeout: 30000 });
// Keep the read-only preview context while navigating within the preview tab.
const preview=new URLSearchParams(window.location.search).get('preview');
client.interceptors.request.use(config=>{
  if(preview&&config.method==='get'&&/^\/(content|featured|blog)(\/|\?|$)/.test(config.url))config.params={...config.params,preview};
  return config;
});
protectCheckout(client, '/checkout');
deduplicateReads(client);
export default client;
