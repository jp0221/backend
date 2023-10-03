const express = require('express');
const request = require('supertest');
const mysql = require('mysql2/promise'); 
const { handleCustomersRoute, handleMoviesRoute, handleTop5Actors } = require('./index');

const app = express();

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'sakila',
};


app.get('/customers', handleCustomersRoute);

describe('GET /customers', () => {
  it('should respond with a list of customers', async () => {
    const response = await request(app).get('/customers');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

app.get('/movies', handleMoviesRoute);

describe('GET /movies', () => {
  it('should respond with a list of movies', async () => {
    const response = await request(app).get('/movies');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});


app.get('/top5actors', handleTop5Actors);

describe('GET /top5actors', () => {
  it('should respond with a list of top 5 actors', async () => {
    const response = await request(app).get('/top5actors');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(5); 
  });
});