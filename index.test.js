const express = require('express');
const request = require('supertest');
const mysql = require('mysql2/promise'); // We use mysql2/promise for asynchronous database operations
const { handleCustomersRoute, handleMoviesRoute, handleTop5Actors } = require('./index'); // Import the route handler

const app = express();

// Replace the following with your database connection details
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'sakila',
};

// Define a test database connection pool
//const pool = mysql.createPool(dbConfig);

// Set up a mock route handler for testing purposes
app.get('/customers', handleCustomersRoute);

// Define your test
describe('GET /customers', () => {
  it('should respond with a list of customers', async () => {
    const response = await request(app).get('/customers');

    // Check the HTTP status code (assuming 200 for success)
    expect(response.status).toBe(200);

    // Check the response body (customize this as per your expected response)
    // For example, you can check if the response contains an array of customers
    expect(Array.isArray(response.body)).toBe(true);
  });
});

app.get('/movies', handleMoviesRoute);

// Define your test
describe('GET /movies', () => {
  it('should respond with a list of movies', async () => {
    const response = await request(app).get('/movies');

    // Check the HTTP status code (assuming 200 for success)
    expect(response.status).toBe(200);

    // Check the response body (customize this as per your expected response)
    // For example, you can check if the response contains an array of movies
    expect(Array.isArray(response.body)).toBe(true);
  });
});


app.get('/top5actors', handleTop5Actors);

// Define your test for the '/top5actors' route
describe('GET /top5actors', () => {
  it('should respond with a list of top 5 actors', async () => {
    const response = await request(app).get('/top5actors');

    // Check the HTTP status code (assuming 200 for success)
    expect(response.status).toBe(200);

    // Check the response body (customize this as per your expected response)
    // For example, you can check if the response contains an array of top 5 actors
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(5); // Assuming you expect exactly 5 actors
  });
});