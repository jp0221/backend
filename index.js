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

const handleTop5Movies = (req, res) => {
    const q = "SELECT f.title, f.description, rental_counts.rented FROM film AS f JOIN (SELECT i.film_id, COUNT(r.rental_id) AS rented FROM inventory AS i JOIN rental AS r ON r.inventory_id = i.inventory_id GROUP BY i.film_id ORDER BY rented DESC LIMIT 5 ) AS rental_counts ON f.film_id = rental_counts.film_id;"
    db.query(q,(err, data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
}
app.get("/top5movies", handleTop5Movies);

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
    } = req.body;

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

            return res.status(201).json({ message: "Customer created successfully", customerId: result.insertId });
        }
    );
});

app.delete('/customers/:customerId', (req, res) => {
    const customerId = req.params.customerId;

    // An array of related tables
    const relatedTables = ['payment', 'rental'];

    const deleteRelatedRecords = (tableName, callback) => {
        const deleteQuery = `DELETE FROM ${tableName} WHERE customer_id = ?`;

        db.query(deleteQuery, [customerId], (err, result) => {
            if (err) {
                console.error(err);
                return callback(err);
            }

            return callback(null);
        });
    };

    const deleteRecordsSequentially = (index) => {
        if (index < relatedTables.length) {
            deleteRelatedRecords(relatedTables[index], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to delete related records' });
                }

                // Move to the next table
                deleteRecordsSequentially(index + 1);
            });
        } else {
            // All related records have been deleted, now delete the customer record
            const deleteCustomerQuery = 'DELETE FROM customer WHERE customer_id = ?';

            db.query(deleteCustomerQuery, [customerId], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Failed to delete customer' });
                }

                res.status(204).send();
            });
        }
    };

    // Start the process by deleting related records sequentially
    deleteRecordsSequentially(0);
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

app.put('/customers/return/:customerId', (req, res) => {
    const customerId = req.params.customerId;

    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const q = 'UPDATE rental SET return_date = ? WHERE customer_id = ? AND return_date IS NULL';

    db.query(q, [currentDate, customerId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update return date' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No pending rentals found for this customer' });
        }

        res.status(200).json({ message: 'Return date updated successfully', return_date: currentDate });
    });
});

const handleCustomersRoute = (req, res) => {
    const q = "SELECT c.customer_id, c.first_name, c.last_name, IFNULL(COUNT(r.rental_id), 0) AS count, MAX(IFNULL(r.return_date, 'null')) AS return_date, GROUP_CONCAT(m.title ORDER BY r.rental_date) AS rented_movies FROM customer AS c LEFT JOIN rental AS r ON r.customer_id = c.customer_id LEFT JOIN inventory AS i ON r.inventory_id = i.inventory_id LEFT JOIN film AS m ON i.film_id = m.film_id GROUP BY c.customer_id, c.first_name, c.last_name ORDER BY count DESC;"
    db.query(q,(err, data) => {
        if(err) return res.json(err);
        data.forEach((customer) => {
            if (customer.rented_movies !== 'null' && customer.rented_movies !== null) {
                customer.rented_movies = customer.rented_movies.split(',').filter(Boolean);
            } else {
                customer.rented_movies = [];
            }
        });
        return res.json(data);
    });
}
app.get("/customers", handleCustomersRoute);

const handleMoviesRoute = (req, res) => {
    const q = "SELECT f.film_id, f.title AS movie_title, f.description AS movie_description,f.rental_rate, GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') AS actor_names, c.name AS genre_name FROM film AS f JOIN film_actor AS fa ON f.film_id = fa.film_id JOIN actor AS a ON fa.actor_id = a.actor_id JOIN film_category AS fc ON f.film_id = fc.film_id JOIN category AS c ON fc.category_id = c.category_id GROUP BY f.film_id, f.title, f.description, f.rental_rate, c.name ORDER BY f.film_id;"
    db.query(q,(err, data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
}

app.get("/movies", handleMoviesRoute);

app.post("/rent-movie", (req, res) => {
    const { customerId, movieId } = req.body;
    const staffId = 1; // Set staff ID to 1
    const storeId = 1; // Set store ID to 1

    // Add code here to validate customer and movie IDs and check for movie availability.

    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const insertRentalQuery = `
        INSERT INTO rental (rental_date, inventory_id, customer_id, return_date, staff_id)
        SELECT ?, i.inventory_id, ?, NULL, ?
        FROM inventory AS i
        WHERE i.film_id = ? AND i.store_id = ?
        LIMIT 1;
    `;

    db.query(
        insertRentalQuery,
        [currentDate, customerId, staffId, movieId, storeId],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Failed to create rental" });
            }

            return res.status(201).json({ message: "Movie rented successfully" });
        }
    );
});

app.post("/rent-movie", (req, res) => {
    const { customerId, movieId } = req.body;
    const staffId = 1;
    const storeId = 1;

    const checkCustomerQuery = "SELECT customer_id FROM customer WHERE customer_id = ?";
    db.query(checkCustomerQuery, [customerId], (err, customerResult) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error checking customer" });
        }

        if (customerResult.length === 0) {
            return res.status(400).json({ error: "Customer not found" });
        }

        const checkMovieQuery = `
            SELECT i.inventory_id
            FROM inventory AS i
            WHERE i.film_id = ? AND i.store_id = ? AND
                i.inventory_id NOT IN (
                    SELECT r.inventory_id
                    FROM rental AS r
                    WHERE r.return_date IS NULL
                )
            LIMIT 1;
        `;
        db.query(checkMovieQuery, [movieId, storeId], (err, movieResult) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Error checking movie availability" });
            }

            if (movieResult.length === 0) {
                return res.status(400).json({ error: "Movie not available for rent" });
            }

            const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

            const insertRentalQuery = `
                INSERT INTO rental (rental_date, inventory_id, customer_id, return_date, staff_id)
                SELECT ?, ?, ?, NULL, ?
                LIMIT 1;
            `;

            db.query(
                insertRentalQuery,
                [currentDate, movieResult[0].inventory_id, customerId, staffId],
                (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: "Failed to create rental" });
                    }

                    return res.status(201).json({ message: "Movie rented successfully" });
                }
            );
        });
    });
});

const handleCustomerRentals = (req, res) => {
    const q = `SELECT c.customer_id, c.first_name, c.last_name, r.rental_date, f.title AS movie_title FROM customer AS c JOIN rental AS r ON c.customer_id = r.customer_id JOIN inventory AS i ON r.inventory_id = i.inventory_id JOIN film AS f ON i.film_id = f.film_id`;

    db.query(q, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error fetching customer rentals" });
        }

        res.json(data);
    });
};

app.get("/customer-rentals", handleCustomerRentals);


app.listen(5000, ()=>{
    console.log("Connected to backend!")
});

module.exports = {
    handleCustomersRoute,
    handleMoviesRoute,
    handleTop5Actors,
    handleTop5Movies,
    handleCustomerRentals
};