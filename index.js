const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();

const db = mysql.createConnection({
    host : 'localhost',
    database : 'sakila',
    user : 'root',
    password : 'password'
});

app.use(express.json())
app.use(cors())

app.get("/", (req,res)=>{
    res.json("hello this is the backend");
});

app.get("/actors", (req,res)=>{
    const q = "SELECT * FROM actor LIMIT 50"
    db.query(q,(err, data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.get("/top5movies", (req,res)=>{
    const q = "SELECT f.title, f.description, rental_counts.rented FROM film AS f JOIN (SELECT i.film_id, COUNT(r.rental_id) AS rented FROM inventory AS i JOIN rental AS r ON r.inventory_id = i.inventory_id GROUP BY i.film_id ORDER BY rented DESC LIMIT 5 ) AS rental_counts ON f.film_id = rental_counts.film_id;"
    db.query(q,(err, data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

const handleTop5Actors = (req, res) => {
    const q = "SELECT top_actors.actor_id, top_actors.first_name, top_actors.last_name, top_actors.movie_count, (SELECT GROUP_CONCAT(rented_movies.title ORDER BY rented_movies.rental_count DESC SEPARATOR ', ') FROM (SELECT f.title, COUNT(*) AS rental_count FROM film AS f JOIN inventory AS i ON f.film_id = i.film_id JOIN rental AS r ON i.inventory_id = r.inventory_id WHERE f.film_id IN (SELECT fa.film_id FROM film_actor AS fa WHERE fa.actor_id = top_actors.actor_id) GROUP BY f.title ORDER BY rental_count DESC LIMIT 5) AS rented_movies) AS top_rented_movies FROM (SELECT a.actor_id, a.first_name, a.last_name, COUNT(*) AS movie_count FROM actor AS a JOIN film_actor AS fa ON a.actor_id = fa.actor_id GROUP BY a.actor_id, a.first_name, a.last_name ORDER BY movie_count DESC LIMIT 5) AS top_actors;"
    db.query(q,(err, data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
}

app.get("/top5actors", handleTop5Actors);

app.post("/customers", (req, res) => {
    const {
        customer_id,
        store_id,
        first_name,
        last_name,
        email,
        address_id,
        active,
        create_date,
        last_update,
    } = req.body; // Assuming you send these fields in the request body

    // Insert the new customer into your database
    const q = `
        INSERT INTO customer (
            customer_id,
            store_id,
            first_name,
            last_name,
            email,
            address_id,
            active,
            create_date,
            last_update
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        q,
        [
            customer_id,
            store_id,
            first_name,
            last_name,
            email,
            address_id,
            active,
            create_date,
            last_update
        ],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Internal server error" });
            }

            // Return a success response if the customer was added successfully
            return res.status(201).json({ message: "Customer created successfully", customerId: result.insertId });
        }
    );
});

app.delete('/customers/:customerId', (req, res) => {
    const customerId = req.params.customerId;

    const q = 'DELETE FROM customer WHERE customer_id = ?';

    db.query(q, [customerId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to delete customer' });
        }

        if (result.affectedRows === 0) {
            // No customer with the provided customer_id found
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.status(204).send(); // Send a successful response with no content
    });
});

app.put('/customers/:customerId', (req, res) => {
    const customerId = req.params.customerId;
    const { first_name, last_name } = req.body;

    const q = 'UPDATE customer SET first_name = ?, last_name = ? WHERE customer_id = ?';

    db.query(q, [first_name, last_name, customerId], (err,result) => {
        if(err) {
            console.error(err);
            return res.status(500).json({error: 'Failed to update customer' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.status(200).json({message: 'Customer update successfully' });
    });
});

const handleCustomersRoute = (req, res) => {
    const q = "SELECT c.customer_id, c.first_name, c.last_name, IFNULL(COUNT(r.rental_id), 0) AS count FROM customer AS c LEFT JOIN rental AS r ON r.customer_id = c.customer_id GROUP BY c.customer_id, c.first_name, c.last_name ORDER BY count DESC;"
    db.query(q,(err, data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
}
app.get("/customers", handleCustomersRoute);

const handleMoviesRoute = (req, res) => {
    const q = "SELECT f.film_id, f.title AS movie_title, f.description AS movie_description, GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') AS actor_names, c.name AS genre_name FROM film AS f JOIN film_actor AS fa ON f.film_id = fa.film_id JOIN actor AS a ON fa.actor_id = a.actor_id JOIN film_category AS fc ON f.film_id = fc.film_id JOIN category AS c ON fc.category_id = c.category_id GROUP BY f.film_id, f.title, f.description, c.name ORDER BY f.film_id;"
    db.query(q,(err, data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
}

app.get("/movies", handleMoviesRoute);

/*app.post("/actor", (req,res)=>{
    const q = "INSER INTO actor (`actor_id`,`first_name`,`last_name`,`last_update`) VALUES (?)";
    const values = [""];

    db.query(q,[values], (err,data) => {
        if (err) return res.json(err);
        return res.json("Actor has been created.");
    });
})*/

app.listen(5000, ()=>{
    console.log("Connected to backend!")
});

module.exports = {
    handleCustomersRoute,
    handleMoviesRoute,
    handleTop5Actors
};