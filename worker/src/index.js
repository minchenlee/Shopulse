import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { products } from './routes/products.js';
import { users } from './routes/users.js';
import { chat } from './routes/chat.js';

const ALLOWED = ['http://localhost:5173', 'https://www.shopulse.xyz', 'https://shopulse.xyz'];

const app = new Hono();

app.use('*', cors({
  origin: (o) => (ALLOWED.includes(o) || /\.pages\.dev$/.test(o || '') ? o : ''),
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,
}));

app.get('/', (c) => c.text('shopulse-api ok'));
app.route('/products', products);
app.route('/user', users);
app.route('/chat', chat);

export default app;
