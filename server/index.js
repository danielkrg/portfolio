import dotenv from 'dotenv';
dotenv.config();

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import cors from 'cors';
import session from 'express-session';

import starSyncRouter from './apps/starsync/routes.js';
// import portfolioRouter from './apps/portfolio/routes.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
}));

// Mount routers
app.use('/api/starsync', starSyncRouter);
// app.use('/api/portfolio', portfolioRouter);

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, '../client/portfolio/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/portfolio/dist/index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));