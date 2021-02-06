require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const winston = require('winston');
const { bookmarks } = require('./bookmarks');
const { v4: uuid } = require('uuid');
const { useWebUri } = require('valid-url'); 


const app = express();

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(express.json());

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'info.log' })
    ]
});
  
if (NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

app.use(function errorHandler(error, req, res, next) {
    let response
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' } }
    } else {
        console.error(error)
        response = { message: error.message, error }
    }
    res.status(500).json(response)
})

app.use(function validateBearerToken(req, res, next) {
    const apiToken = process.env.API_TOKEN
    const authToken = req.get('Authorization')
  
    if (!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error(`Unauthorized request to path: ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized request' })
    }
    // move to the next middleware
    next()
})

app.get('/bookmarks', (req, res) => {
    res.json(bookmarks);
});

app.get('/bookmarks/:bookmarks_id', (req, res) => {
    const { bookmark_id } = req.params;

    const bmark = bookmarks.find(b => b.id == bookmark_id)

    if (!bmark) {
      logger.error(`Bookmark with id ${bookmark_id} not found.`);
      return res.status(404).send('Bookmark Not Found');
    }

    res.json(bmark)
});

app.post('/add-bookmark', (req,res) => {
    const { title, url, rating, description } = req.body;

    if(!title) {
        logger.error("Title is required");
        return res
            .status(400)
            .send('Invalid data');
    }

    if(!url) {
        logger.error("Url is required");
        return res
            .status(400)
            .send('Invalid data');
    }

    if(!rating) {
        logger.error("Rating is required");
        return res
            .status(400)
            .send('Invalid data');
    }

    if(!description) {
        logger.error("Description is required");
        return res
            .status(400)
            .send('Invalid data');
    }

    if (!isWebUri(url)) {
        logger.error(`Invalid url '${url}' supplied`)
        return res.status(400).send(`'url' must be a valid URL`)
    }

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
        logger.error("Invalid rating rating supplied")
        return res.status(400).send("'rating' must be a number between 0 and 5.")
    }

    const id = uuid();
    const newBookmark = {
        id,
        title,
        url,
        rating,
        description,
    }

    bookmarks.push(newBookmark);

    res.send('All Validation Pass');
});

app.delete('/bookmarks/:bookmarks_id', (req, res) => {
    const { bookmark_id } = req.params

    const bmarkI = store.bookmarks.findIndex(b => b.id === bookmark_id)

    if (bmarkI === -1) {
      logger.error(`Bookmark with id ${bookmark_id} not found.`);
      return res.status(404).send('Bookmark Not Found');
    }

    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${bookmark_id} deleted.`);
    res.status(204).end();
});

module.exports = app