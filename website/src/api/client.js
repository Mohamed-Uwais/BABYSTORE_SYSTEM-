import axios from 'axios';
import { protectCheckout, deduplicateReads } from './requestSafety';
const client = axios.create({ baseURL: '/api/public', timeout: 30000 });
protectCheckout(client, '/checkout');
deduplicateReads(client);
export default client;
