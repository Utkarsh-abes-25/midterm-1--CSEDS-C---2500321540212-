
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const publicDir = path.join(__dirname, 'public');
const dataFile = path.join(__dirname, 'books.json');

function getBooks() {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function saveBooks(books) {
    fs.writeFileSync(dataFile, JSON.stringify(books, null, 2));
}

function sendJSON(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {

    // GET: Display all books
    if (req.method === 'GET' && req.url === '/api/books') {
        return sendJSON(res, 200, getBooks());
    }

    // POST: Add new book
    if (req.method === 'POST' && req.url === '/api/books') {
        let body = '';

        req.on('data', chunk => body += chunk);

        req.on('end', () => {
            try {
                const data = JSON.parse(body);

                if (!data.title || !data.author) {
                    return sendJSON(res, 400, {
                        message: 'Title and author are required'
                    });
                }

                const books = getBooks();

                const newBook = {
                    id: Date.now().toString(),
                    title: data.title,
                    author: data.author,
                    category: data.category || 'General',
                    status: 'Available'
                };

                books.push(newBook);
                saveBooks(books);

                sendJSON(res, 201, {
                    message: 'Book added successfully',
                    book: newBook
                });

            } catch {
                sendJSON(res, 400, {
                    message: 'Invalid JSON data'
                });
            }
        });

        return;
    }

    // PUT: Issue or return book
    const actionMatch = req.url.match(
        /^\/api\/books\/(\d+)\/(issue|return)$/
    );

    if (req.method === 'PUT' && actionMatch) {
        const id = actionMatch[1];
        const action = actionMatch[2];

        const books = getBooks();
        const book = books.find(b => b.id === id);

        if (!book) {
            return sendJSON(res, 404, {
                message: 'Book not found'
            });
        }

        if (action === 'issue') {
            if (book.status === 'Issued') {
                return sendJSON(res, 400, {
                    message: 'Book is already issued'
                });
            }

            book.status = 'Issued';

        } else {
            if (book.status === 'Available') {
                return sendJSON(res, 400, {
                    message: 'Book is already available'
                });
            }

            book.status = 'Available';
        }

        saveBooks(books);

        return sendJSON(res, 200, {
            message: `Book ${action} successfully`,
            book
        });
    }

    // DELETE: Remove book
    const deleteMatch = req.url.match(
        /^\/api\/books\/(\d+)$/
    );

    if (req.method === 'DELETE' && deleteMatch) {
        const id = deleteMatch[1];
        const books = getBooks();

        const updatedBooks = books.filter(b => b.id !== id);

        if (books.length === updatedBooks.length) {
            return sendJSON(res, 404, {
                message: 'Book not found'
            });
        }

        saveBooks(updatedBooks);

        return sendJSON(res, 200, {
            message: 'Book deleted successfully'
        });
    }

    // Serve HTML, CSS and JS files
    if (req.method === 'GET') {
        const pathname = new URL(
            req.url, 'http://localhost'
        ).pathname;

        const requestedFile = pathname === '/'
            ? 'index.html'
            : decodeURIComponent(pathname.slice(1));

        const filePath = path.resolve(publicDir, requestedFile);

        if (!filePath.startsWith(publicDir + path.sep)) {
            res.writeHead(403);
            return res.end('Forbidden');
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                return res.end('File not found');
            }

            const ext = path.extname(filePath);

            const types = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'text/javascript'
            };

            res.writeHead(200, {
                'Content-Type': types[ext] ||
                    'application/octet-stream'
            });

            res.end(content);
        });

        return;
    }

    sendJSON(res, 404, {
        message: 'Route not found'
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
