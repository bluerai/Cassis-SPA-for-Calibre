'use strict'

import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import { join } from 'path';
import { logger } from '../log.js';
import crypto from 'crypto';

export let JWT = {};
const authfile = join(process.env.CASSIS_CONFIG, "jwt.json");
try {
  if (fs.existsSync(authfile)) {
    JWT = fs.readJsonSync(authfile)
    logger.info("Authorisation by jwt token");
  } else {
    logger.warn("No access Authorisation! " + authfile);
  }
} catch (error) {
  logger.error(error);
  logger.warn("No access authorisation!");
}

export const JWT_KEY = JWT.key;

//==== Actions ==================================================

export function verifyAction(req, res) {

  const token = req.headers.authorization?.split(' ')[1]

  if (!token || token == "null") {
    return res.render(import.meta.dirname + '/views/login', function (error, html) {
      if (error) { logger.error(error); logger.debug(error.stack); return }
      logger.info("/verify: No token");
      res.status(401).json({ error: 'No token', html: html });
    })
  }

  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err || !Object.keys(JWT.credentials).includes(decoded.username)) {
      res.render(import.meta.dirname + '/views/login', function (error, html) {
        if (error) { logger.error(error); logger.debug(error.stack); return }
        logger.info("/verify: Invalid token");
        res.status(401).json({ error: 'Invalid token', html: html });
      })

    } else {
      logger.info("/verify: " + decoded.username + ", expire at: " + new Date(decoded.exp * 1000).toLocaleString());
      res.status(200).json({ message: 'Token is valid', user: decoded });
    }
  })
};

export function loginAction(req, res) {
  const { username, password } = req.body;
  if ((username) && (username.length >= 3) && (password) && (password.length >= 12)
    && JWT.credentials[username] == password) {
    const token = jwt.sign({ username }, JWT_KEY, { expiresIn: "30d" });
    res.status(200).json({ token: token });

  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

export function protect(request, response, next) {
  if ((request.path.startsWith('/cover/')) ||
    (request.path.startsWith('/file/')) ||
    request.path === '/') {
    return next();
  }
  const token = request.headers.authorization?.split(' ')[1];
  logger.silly("Protected path: " + request.path + "; " + token);

  if (!token) {
    logger.debug("No Token !!!");
    if (verifySignature) { return next(); }
    return response.status(401).json({ error: 'No Authorisation' });
  }

  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err || !Object.keys(JWT.credentials).includes(decoded.username)) {
      logger.debug("protect: No Authorisation!");
      response.status(401).json({ error: 'No Authorisation' });

    } else {
      logger.debug("protect: Authorisation ok! - " + decoded.username + ", expires at: " + new Date(decoded.exp * 1000).toLocaleString());
      request.userId = decoded.username;
      next();
    }
  })
}

// Funktion zum Erstellen einer Signature
export const createSignature = (identifier, expiresIn) => {
  const expiration = Date.now() + expiresIn * 1000; // Gültigkeitsdauer in Millisekunden

  const signature = crypto
    .createHmac('sha256', JWT_KEY)
    .update(`${identifier}:${expiration}`)
    .digest('hex');

  return `?expires=${expiration}&signature=${signature}`;
};

// Funktion zum Überprüfen einer Signature
export const verifySignature = (req) => {

  const { expires, signature } = req.query;
  const identifier = parseInt(req.params.id, 10);

  if (!expires || !signature) { return false; }

  const expectedSignature = crypto
    .createHmac('sha256', JWT_KEY)
    .update(`${identifier}:${expires}`)
    .digest('hex');

  logger.silly("verifySignature: Book " + identifier + " expires at: " + new Date(Math.round((expires / 1000) * 1000)).toLocaleString());
  return signature === expectedSignature && Date.now() < parseInt(expires, 10);
};
